'use client'

import { create } from 'zustand'
import { apiRequest } from '@/lib/api-client'
import type { DealMakerUpdate } from '@/stores/dealMakerStore'

const SAVE_DEBOUNCE_MS = 300

let saveTimeout: ReturnType<typeof setTimeout> | null = null

interface AssumptionsState {
  propertyId: string | null
  pendingUpdates: DealMakerUpdate
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
  reset: () => void
}

export const useAssumptionsStore = create<AssumptionsState>((set, get) => ({
  propertyId: null,
  pendingUpdates: {},
  isSaving: false,
  isDirty: false,
  error: null,

  setPropertyId: (id) => {
    set({ propertyId: id, pendingUpdates: {}, isDirty: false, error: null })
  },

  updateField: (field, value) => {
    const { pendingUpdates } = get()

    const newPending = {
      ...pendingUpdates,
      [field]: value,
    }

    set({
      pendingUpdates: newPending,
      isDirty: true,
    })

    get().debouncedSave()
  },

  updateMultipleFields: (updates) => {
    const { pendingUpdates } = get()

    const newPending = {
      ...pendingUpdates,
      ...updates,
    }

    set({
      pendingUpdates: newPending,
      isDirty: true,
    })

    get().debouncedSave()
  },

  saveToBackend: async () => {
    const { propertyId, pendingUpdates, isDirty } = get()

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
        isSaving: false,
        isDirty: false,
        error: null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save assumptions'
      set({
        error: message,
        isSaving: false,
      })
      console.error('Failed to save assumptions:', error)
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
    isSaving: store.isSaving,
    isDirty: store.isDirty,
    error: store.error,
    updateField: store.updateField,
    updateMultipleFields: store.updateMultipleFields,
    flushAndSave: store.flushAndSave,
    reset: store.reset,
  }
}
