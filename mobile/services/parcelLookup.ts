/**
 * Parcel lookup service for property identification.
 * Queries parcel boundaries and property data from various sources.
 */

import axios from 'axios';
import { calculateBoundingBox } from '../utils/geoCalculations';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.investiq.com';

export interface ParcelData {
  apn: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  geometry?: GeoJSONPolygon;
  propertyDetails?: {
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    yearBuilt?: number;
    lotSize?: number;
    propertyType?: string;
    lastSaleDate?: string;
    lastSalePrice?: number;
  };
}

interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

/**
 * Query parcels within a specified area.
 * 
 * @param centerLat - Center latitude
 * @param centerLng - Center longitude
 * @param radiusMeters - Search radius in meters
 * @returns Array of parcels in the area
 */
export async function queryParcelsInArea(
  centerLat: number,
  centerLng: number,
  radiusMeters: number = 100
): Promise<ParcelData[]> {
  const bbox = calculateBoundingBox(centerLat, centerLng, radiusMeters);

  try {
    const response = await axios.get(`${API_BASE_URL}/api/parcels/search`, {
      params: {
        minLat: bbox.minLat,
        maxLat: bbox.maxLat,
        minLng: bbox.minLng,
        maxLng: bbox.maxLng,
        limit: 50,
      },
      timeout: 10000,
    });

    return response.data.parcels || [];
  } catch (error) {
    console.error('Parcel lookup error:', error);
    
    // Fallback: Try reverse geocoding if parcel lookup fails
    return await reverseGeocodeToParcel(centerLat, centerLng);
  }
}

/**
 * Lookup a specific parcel by coordinates.
 */
export async function lookupParcelByCoords(
  lat: number,
  lng: number
): Promise<ParcelData | null> {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/parcels/lookup`, {
      params: { lat, lng },
      timeout: 10000,
    });

    return response.data.parcel || null;
  } catch (error) {
    console.error('Parcel lookup error:', error);
    return null;
  }
}

/**
 * Find which parcel contains a specific point using
 * point-in-polygon calculation.
 */
export function findParcelAtPoint(
  lat: number,
  lng: number,
  parcels: ParcelData[]
): ParcelData | null {
  for (const parcel of parcels) {
    // If we have geometry, use point-in-polygon
    if (parcel.geometry) {
      if (isPointInPolygon([lng, lat], parcel.geometry.coordinates[0])) {
        return parcel;
      }
    } else {
      // Fallback: Check if point is close to parcel center
      const distance = Math.sqrt(
        Math.pow(lat - parcel.lat, 2) + Math.pow(lng - parcel.lng, 2)
      );
      
      // Within ~50m (roughly 0.0005 degrees)
      if (distance < 0.0005) {
        return parcel;
      }
    }
  }
  
  return null;
}

/**
 * Ray casting algorithm for point-in-polygon test.
 * Determines if a point is inside a polygon.
 */
function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Fallback: Use reverse geocoding to get address from coordinates.
 * Returns a single parcel-like object.
 */
async function reverseGeocodeToParcel(
  lat: number,
  lng: number
): Promise<ParcelData[]> {
  try {
    // Use our backend's reverse geocoding endpoint
    const response = await axios.get(`${API_BASE_URL}/api/geocode/reverse`, {
      params: { lat, lng },
      timeout: 10000,
    });

    if (response.data.address) {
      return [{
        apn: '',
        address: response.data.address,
        city: response.data.city || '',
        state: response.data.state || '',
        zip: response.data.zip || '',
        lat,
        lng,
      }];
    }

    return [];
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return [];
  }
}

/**
 * Get detailed property information from address.
 */
export async function getPropertyDetails(
  address: string
): Promise<ParcelData | null> {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/property/details`, {
      params: { address },
      timeout: 15000,
    });

    return response.data.property || null;
  } catch (error) {
    console.error('Property details error:', error);
    return null;
  }
}

