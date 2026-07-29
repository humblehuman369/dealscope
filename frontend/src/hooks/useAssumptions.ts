'use client'

import { create } from 'zustand'
import { apiRequest } from '@/lib/api-client'
import type { DealMakerUpdate } from '@/stores/dealMakerStore'
import { toast } from 'sonner'

const SAVE_DEBOUNCE_MS = 300

let saveTimeout: ReturnType<typeof setTimeout> | null = null

interface AssumptionsState {
  propertyId: string | null
  pendingUpdates: DealMakerUpdate
  lastGoodState: DealMakerUpdate
  /**
   * The payload of the save that failed. Rollback clears `pendingUpdates`, so
   * without this there would be nothing left for the toast's Retry to resend.
   */
  failedUpdates: DealMakerUpdate
  isSaving: boolean
  isDirty: boolean
  error: string | null

  // Actions
  setPropertyId: (id: string) => void
  updateField: <K extends keyof DealMakerUpdate>(field: K, value: DealMakerUpdate[K]) => void
  updateMultipleFields: (updates: DealMakerUpdate) => void
  saveToBackend: () => Promise<void>
  flushAndSave: () => Promise<void>
  debouncedSave: () => void
  retryLastSave: () => void
  revertToLastGood: () => void
  reset: () => void
}

export const useAssumptionsStore = create<AssumptionsState>((set, get) => ({
  propertyId: null,
  pendingUpdates: {},
  lastGoodState: {},
  failedUpdates: {},
  isSaving: false,
  isDirty: false,
  error: null,

  setPropertyId: (id) => {
    // This store is a singleton shared by every property, so the recovery state
    // has to be dropped with the rest: a stale lastGoodState would let
    // revertToLastGood replay the previous property's numbers into this deal.
    set({
      propertyId: id,
      pendingUpdates: {},
      lastGoodState: {},
      failedUpdates: {},
      isDirty: false,
      error: null,
    })
  },

  updateField: (field, value) => {
    const { pendingUpdates } = get()

    // Capture last good state before applying optimistic update
    const previousState = { ...pendingUpdates }

    const newPending = {
      ...pendingUpdates,
      [field]: value,
    }

    set({
      pendingUpdates: newPending,
      lastGoodState: previousState,
      isDirty: true,
    })

    get().debouncedSave()
  },

  updateMultipleFields: (updates) => {
    const { pendingUpdates } = get()

    // Capture last good state before applying optimistic update
    const previousState = { ...pendingUpdates }

    const newPending = {
      ...pendingUpdates,
      ...updates,
    }

    set({
      pendingUpdates: newPending,
      lastGoodState: previousState,
      isDirty: true,
    })

    get().debouncedSave()
  },

  saveToBackend: async () => {
    const { propertyId, pendingUpdates, lastGoodState, isDirty } = get()

    if (!propertyId || !isDirty || Object.keys(pendingUpdates).length === 0) {
      return
    }

    const attempted = { ...pendingUpdates }
    set({ isSaving: true, error: null })

    try {
      await apiRequest(`/api/v1/properties/saved/${propertyId}/deal-maker`, {
        method: 'PATCH',
        body: attempted,
      })

      // On success, clear pending state. Snapshot invalidation is handled by caller.
      set({
        pendingUpdates: {},
        lastGoodState: {},
        failedUpdates: {},
        isSaving: false,
        isDirty: false,
        error: null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save assumptions'

      // Rollback to last known good state (optimistic update failure)
      set({
        pendingUpdates: { ...lastGoodState },
        failedUpdates: attempted,
        isSaving: false,
        isDirty: true, // Allow user to retry
        error: message,
      })

      // Non-blocking user feedback
      toast.error('Changes could not be saved. Reverted to last saved values.', {
        action: {
          label: 'Retry',
          onClick: () => get().retryLastSave(),
        },
        duration: 6000,
      })

      console.error('Failed to save assumptions (rolled back):', error)
    }
  },

  debouncedSave: () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }
    saveTimeout = setTimeout(() => {
      get().saveToBackend()
    }, SAVE_DEBOUNCE_MS)
  },

  flushAndSave: async () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      saveTimeout = null
    }
    await get().saveToBackend()
  },

  retryLastSave: () => {
    const { isSaving, pendingUpdates, failedUpdates } = get()
    if (isSaving) return

    // Retry means "send the edit that failed", not "send whatever is pending" —
    // rollback has already emptied the latter, so reading it alone would make
    // the toast's Retry a no-op on the first edit to a property.
    set({
      pendingUpdates: { ...pendingUpdates, ...failedUpdates },
      isDirty: true,
    })
    get().saveToBackend()
  },

  revertToLastGood: () => {
    const { lastGoodState } = get()
    set({
      pendingUpdates: { ...lastGoodState },
      failedUpdates: {},
      isDirty: Object.keys(lastGoodState).length > 0,
      error: null,
    })
  },

  reset: () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      saveTimeout = null
    }
    set({
      propertyId: null,
      pendingUpdates: {},
      lastGoodState: {},
      failedUpdates: {},
      isSaving: false,
      isDirty: false,
      error: null,
    })
  },
}))

// Convenience hook for components
export function useAssumptions(propertyId: string | null) {
  const store = useAssumptionsStore()

  // Auto-set propertyId when it changes
  if (propertyId && store.propertyId !== propertyId) {
    store.setPropertyId(propertyId)
  }

  return {
    pendingUpdates: store.pendingUpdates,
    lastGoodState: store.lastGoodState,
    isSaving: store.isSaving,
    isDirty: store.isDirty,
    error: store.error,
    updateField: store.updateField,
    updateMultipleFields: store.updateMultipleFields,
    flushAndSave: store.flushAndSave,
    retryLastSave: store.retryLastSave,
    revertToLastGood: store.revertToLastGood,
    reset: store.reset,
  }
}
