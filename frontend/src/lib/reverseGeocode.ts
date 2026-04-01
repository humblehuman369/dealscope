const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export interface GeocodedProperty {
  address: string;
  city: string;
  state: string;
  zip: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

/**
 * Reverse geocode coordinates to a street-level property address
 * via the Google Maps Geocoding API. Prefers `street_address`,
 * `premise`, or `subpremise` result types for parcel-level accuracy.
 */
export async function reverseGeocodeProperty(
  lat: number,
  lng: number,
  apiKey: string = GOOGLE_MAPS_API_KEY,
): Promise<GeocodedProperty | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat.toFixed(6)},${lng.toFixed(6)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.length) {
      return null;
    }

    const streetAddress =
      data.results.find(
        (r: { types: string[] }) =>
          r.types.includes('street_address') ||
          r.types.includes('premise') ||
          r.types.includes('subpremise'),
      ) || data.results[0];

    if (!streetAddress) return null;

    const components: Array<{ types: string[]; long_name: string; short_name: string }> =
      streetAddress.address_components;

    const get = (type: string, useShort = false) => {
      const comp = components.find((c) => c.types.includes(type));
      return (useShort ? comp?.short_name : comp?.long_name) || '';
    };

    const streetNumber = get('street_number');
    const route = get('route');

    return {
      address: streetNumber ? `${streetNumber} ${route}` : route,
      city: get('locality') || get('sublocality'),
      state: get('administrative_area_level_1', true),
      zip: get('postal_code'),
      formattedAddress: streetAddress.formatted_address || '',
      lat: streetAddress.geometry.location.lat,
      lng: streetAddress.geometry.location.lng,
    };
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return null;
  }
}
