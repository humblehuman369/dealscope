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
  isSaving: false,
  isDirty: false,
  error: null,

  setPropertyId: (id) => {
    set({ propertyId: id, pendingUpdates: {}, isDirty: false, error: null })
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

    set({ isSaving: true, error: null })

    try {
      await apiRequest(`/api/v1/properties/saved/${propertyId}/deal-maker`, {
        method: 'PATCH',
        body: pendingUpdates,
      })

      // On success, clear pending state. Snapshot invalidation is handled by caller.
      set({
        pendingUpdates: {},
        lastGoodState: {},
        isSaving: false,
        isDirty: false,
        error: null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save assumptions'

      // Rollback to last known good state (optimistic update failure)
      set({
        pendingUpdates: { ...lastGoodState },
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
    // Re-trigger a save using the current pendingUpdates
    const { isSaving } = get()
    if (!isSaving) {
      get().saveToBackend()
    }
  },

  revertToLastGood: () => {
    const { lastGoodState } = get()
    set({
      pendingUpdates: { ...lastGoodState },
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
