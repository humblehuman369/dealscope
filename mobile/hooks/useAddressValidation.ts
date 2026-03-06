import { useMutation } from '@tanstack/react-query';
import api from '@/services/api';

export interface ValidatedAddress {
  isValid: boolean;
  formattedAddress: string;
  standardizedAddress?: {
    streetNumber: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  issues: Array<{ type: string; message: string }>;
}

/**
 * Validates an address via the backend proxy for Google Address Validation.
 * Falls back gracefully — if validation endpoint is unavailable,
 * the address passes through to property search directly.
 */
export function useAddressValidation() {
  return useMutation<ValidatedAddress, Error, string>({
    mutationFn: async (address: string) => {
      try {
        const { data } = await api.post<ValidatedAddress>(
          '/api/v1/address/validate',
          { address: [address] },
        );
        return data;
      } catch {
        return {
          isValid: true,
          formattedAddress: address.trim(),
          issues: [],
        };
      }
    },
  });
}
