'use client'

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { SAVED_PROPERTIES_KEYS } from '@/hooks/useSavedProperties'
import { strategyStateToDealMakerUpdate } from '@/lib/strategyWorksheetPersistence'
import type { AnyStrategyState, StrategyType } from '@/features/deal-maker/components/types'

export interface UseSaveStrategyWorksheetOptions {
  savedPropertyId: string | null
  strategyType: StrategyType
  getWorksheetState: () => AnyStrategyState | null
}

export function useSaveStrategyWorksheet({
  savedPropertyId,
  strategyType,
  getWorksheetState,
}: UseSaveStrategyWorksheetOptions) {
  const queryClient = useQueryClient()
  const [isSavingWorksheet, setIsSavingWorksheet] = useState(false)

  const saveWorksheet = useCallback(async (): Promise<boolean> => {
    if (!savedPropertyId) {
      toast.error('Save the property to DealVault first')
      return false
    }

    const state = getWorksheetState()
    if (!state) {
      toast.error('Worksheet is not ready yet')
      return false
    }

    const patchBody = strategyStateToDealMakerUpdate(strategyType, state)
    if (Object.keys(patchBody).length === 0) {
      toast.error('No worksheet values to save')
      return false
    }

    setIsSavingWorksheet(true)
    try {
      await api.patch(`/api/v1/properties/saved/${savedPropertyId}/deal-maker`, patchBody)

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['deal-maker', 'snapshot', savedPropertyId],
        }),
        queryClient.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEYS.detail(savedPropertyId) }),
        queryClient.invalidateQueries({ queryKey: SAVED_PROPERTIES_KEYS.all }),
      ])

      toast.success('Worksheet saved to DealVault', {
        action: {
          label: 'View dashboard',
          onClick: () => {
            window.location.href = '/dashboard'
          },
        },
      })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save worksheet'
      toast.error(message, {
        action: {
          label: 'Retry',
          onClick: () => {
            void saveWorksheet()
          },
        },
      })
      return false
    } finally {
      setIsSavingWorksheet(false)
    }
  }, [savedPropertyId, strategyType, getWorksheetState, queryClient])

  return { saveWorksheet, isSavingWorksheet }
}
