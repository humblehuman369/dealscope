import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import api from '@/services/api';
import type { PropertyResponse } from '@dealscope/shared';

type PropertyResponseCompat = PropertyResponse & Record<string, any>;

const PROPERTY_KEY = 'property-search';
const PROPERTY_STALE_TIME = 5 * 60_000; // 5 min

function canonicalizeAddressForIdentity(address: string): string {
  return address
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/,\s*USA$/i, '');
}

function finiteOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function validatePropertyResponse(
  data: PropertyResponseCompat,
): PropertyResponseCompat {
  const v = data.valuations as Record<string, any> | undefined;
  if (v) {
    for (const k of [
      'zestimate',
      'current_value_avm',
      'market_price',
      'tax_assessed_value',
      'value_iq_estimate',
      'rentcast_avm',
      'redfin_estimate',
      'realtor_estimate',
    ]) {
      if (v[k] != null) v[k] = finiteOrNull(v[k]);
    }
  }

  const r = data.rentals as Record<string, any> | undefined;
  if (r) {
    if (r.monthly_rent_ltr != null) r.monthly_rent_ltr = finiteOrNull(r.monthly_rent_ltr);
    const rs = r.rental_stats as Record<string, any> | undefined;
    if (rs) {
      for (const k of [
        'iq_estimate',
        'zillow_estimate',
        'rentcast_estimate',
        'redfin_estimate',
        'realtor_estimate',
      ]) {
        if (rs[k] != null) rs[k] = finiteOrNull(rs[k]);
      }
    }
  }

  return data;
}

export interface FetchPropertyOptions {
  city?: string;
  state?: string;
  zip_code?: string;
}

export function usePropertyData() {
  const queryClient = useQueryClient();

  const fetchProperty = useCallback(
    async (
      address: string,
      opts?: FetchPropertyOptions,
    ): Promise<PropertyResponseCompat> => {
      const canonicalAddress = canonicalizeAddressForIdentity(address);
      const keyParts = [
        canonicalAddress,
        opts?.city,
        opts?.state,
        opts?.zip_code,
      ].filter(Boolean);
      return queryClient.ensureQueryData({
        queryKey: [PROPERTY_KEY, ...keyParts],
        queryFn: async () => {
          const body: Record<string, string> = {
            address: canonicalAddress,
            search_source: 'mobile',
          };
          if (opts?.city) body.city = opts.city;
          if (opts?.state) body.state = opts.state;
          if (opts?.zip_code) body.zip_code = opts.zip_code;
          const { data } = await api.post<PropertyResponseCompat>(
            '/api/v1/properties/search',
            body,
          );
          return validatePropertyResponse(data);
        },
        staleTime: PROPERTY_STALE_TIME,
      });
    },
    [queryClient],
  );

  const getCached = useCallback(
    (address: string): PropertyResponseCompat | undefined => {
      const canonicalAddress = canonicalizeAddressForIdentity(address);
      return queryClient.getQueryData<PropertyResponseCompat>([
        PROPERTY_KEY,
        canonicalAddress,
      ]);
    },
    [queryClient],
  );

  const invalidate = useCallback(
    (address: string, opts?: FetchPropertyOptions) => {
      const canonicalAddress = canonicalizeAddressForIdentity(address);
      const keyParts = [
        canonicalAddress,
        opts?.city,
        opts?.state,
        opts?.zip_code,
      ].filter(Boolean);
      queryClient.invalidateQueries({
        queryKey: [PROPERTY_KEY, ...keyParts],
      });
    },
    [queryClient],
  );

  return { fetchProperty, getCached, invalidate };
}
