/**
 * Google Places Autocomplete service for mobile.
 *
 * Uses the Places API (New) Autocomplete endpoint directly —
 * native apps have no CORS restrictions, so no proxy is needed.
 *
 * Requires EXPO_PUBLIC_GOOGLE_PLACES_API_KEY in .env.
 */

import Constants from 'expo-constants';

const API_KEY =
  Constants.expoConfig?.extra?.googlePlacesApiKey ??
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ??
  '';

const AUTOCOMPLETE_URL =
  'https://maps.googleapis.com/maps/api/place/autocomplete/json';

const PLACE_DETAILS_URL =
  'https://maps.googleapis.com/maps/api/place/details/json';

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface AutocompleteResponse {
  predictions: PlacePrediction[];
  status: string;
}

interface PlaceDetailsResponse {
  result: {
    formatted_address: string;
    geometry?: {
      location: { lat: number; lng: number };
    };
  };
  status: string;
}

let _debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Fetch address autocomplete suggestions from Google Places.
 * Restricted to US addresses, type=address.
 * Returns empty array if API key is missing.
 */
export async function fetchPlacePredictions(
  input: string,
): Promise<PlacePrediction[]> {
  if (!API_KEY || input.trim().length < 3) return [];

  const params = new URLSearchParams({
    input,
    types: 'address',
    components: 'country:us',
    key: API_KEY,
  });

  try {
    const res = await fetch(`${AUTOCOMPLETE_URL}?${params}`);
    const data: AutocompleteResponse = await res.json();
    if (data.status === 'OK') return data.predictions;
    return [];
  } catch {
    return [];
  }
}

/**
 * Debounced version — cancels previous pending request.
 */
export function fetchPlacePredictionsDebounced(
  input: string,
  callback: (predictions: PlacePrediction[]) => void,
  delayMs = 300,
): void {
  if (_debounceTimer) clearTimeout(_debounceTimer);
  if (input.trim().length < 3) {
    callback([]);
    return;
  }
  _debounceTimer = setTimeout(async () => {
    const results = await fetchPlacePredictions(input);
    callback(results);
  }, delayMs);
}

/**
 * Get the formatted address for a place_id.
 */
export async function getPlaceDetails(
  placeId: string,
): Promise<string | null> {
  if (!API_KEY) return null;

  const params = new URLSearchParams({
    place_id: placeId,
    fields: 'formatted_address',
    key: API_KEY,
  });

  try {
    const res = await fetch(`${PLACE_DETAILS_URL}?${params}`);
    const data: PlaceDetailsResponse = await res.json();
    if (data.status === 'OK') return data.result.formatted_address;
    return null;
  } catch {
    return null;
  }
}

export function isPlacesConfigured(): boolean {
  return API_KEY.length > 0;
}
