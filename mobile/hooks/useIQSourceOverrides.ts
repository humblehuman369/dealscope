/**
 * useIQSourceOverrides — bridges IQ Estimate Selector into the
 * 3-tier override chain: dealMakerOverrides ?? sourceOverrides ?? propertyInfo
 *
 * Returns source-selected value and rent that override the property defaults
 * when the user picks a non-IQ data source (Zillow, RentCast, Redfin).
 *
 * Matches frontend/src/app/strategy/page.tsx override chain.
 */

import { useCallback, useState } from 'react';
import type { DataSourceId, IQEstimateSources } from '../components/verdict-iq/IQEstimateSelector';

export interface SourceOverrides {
  monthlyRent: number | null;
  propertyValue: number | null;
}

export function useIQSourceOverrides(sources: IQEstimateSources) {
  const [overrides, setOverrides] = useState<SourceOverrides>({
    monthlyRent: null,
    propertyValue: null,
  });

  const handleSourceChange = useCallback(
    (type: 'value' | 'rent', _sourceId: DataSourceId, value: number | null) => {
      setOverrides((prev) => ({
        ...prev,
        ...(type === 'rent' ? { monthlyRent: value } : { propertyValue: value }),
      }));
    },
    [],
  );

  return { sourceOverrides: overrides, handleSourceChange };
}

/**
 * Resolve the effective value using the 3-tier chain:
 *   dealMakerOverride ?? sourceOverride ?? propertyDefault ?? fallback
 */
export function resolveOverrideChain(
  dealMakerValue: number | undefined | null,
  sourceValue: number | null,
  propertyValue: number | undefined | null,
  fallback: number = 0,
): number {
  return dealMakerValue ?? sourceValue ?? propertyValue ?? fallback;
}
