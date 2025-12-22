/**
 * Parcel lookup service for property identification.
 * Uses Google Maps Reverse Geocoding to convert GPS coordinates to addresses.
 */

import axios from 'axios';
import { calculateBoundingBox } from '../utils/geoCalculations';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app';
const GOOGLE_MAPS_API_KEY = 'AIzaSyCKp7Tt4l2zu2h2EV6PXPz7xbZLoPrtziw';

// Enable mock data in development when API is unreachable
const USE_MOCK_DATA_ON_ERROR = false; // Disable mock data - use real Google Maps API

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
 * Generate mock parcel data for development/demo purposes.
 */
function generateMockParcels(centerLat: number, centerLng: number): ParcelData[] {
  const streetNames = ['Oak', 'Maple', 'Pine', 'Cedar', 'Birch', 'Elm', 'Willow'];
  const streetTypes = ['St', 'Ave', 'Dr', 'Ln', 'Way', 'Ct'];
  
  const parcels: ParcelData[] = [];
  const numParcels = 3 + Math.floor(Math.random() * 5);
  
  for (let i = 0; i < numParcels; i++) {
    const offset = 0.0002 * (i + 1);
    const streetNum = 100 + Math.floor(Math.random() * 900);
    const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
    const streetType = streetTypes[Math.floor(Math.random() * streetTypes.length)];
    
    parcels.push({
      apn: `${Math.floor(Math.random() * 900000) + 100000}`,
      address: `${streetNum} ${streetName} ${streetType}`,
      city: 'Demo City',
      state: 'FL',
      zip: '33000',
      lat: centerLat + offset * (Math.random() - 0.5),
      lng: centerLng + offset * (Math.random() - 0.5),
      propertyDetails: {
        bedrooms: 2 + Math.floor(Math.random() * 3),
        bathrooms: 1.5 + Math.floor(Math.random() * 2),
        sqft: 1200 + Math.floor(Math.random() * 1500),
        yearBuilt: 1980 + Math.floor(Math.random() * 40),
        lotSize: 5000 + Math.floor(Math.random() * 5000),
        propertyType: 'Single Family',
      },
    });
  }
  
  return parcels;
}

/**
 * Query parcels within a specified area using Google Maps Reverse Geocoding.
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
  try {
    // Use Google Maps Reverse Geocoding to get the address at these coordinates
    const parcels = await googleReverseGeocode(centerLat, centerLng);
    
    if (parcels.length > 0) {
      console.log('Google Maps found address:', parcels[0].address);
      return parcels;
    }
    
    // If no results, return empty
    console.log('No address found at coordinates');
    return [];
  } catch (error) {
    console.error('Google Maps geocoding error:', error);
    
    // Fallback to mock data if Google Maps fails
    if (USE_MOCK_DATA_ON_ERROR) {
      console.log('Using mock parcel data as fallback');
      return generateMockParcels(centerLat, centerLng);
    }
    
    return [];
  }
}

/**
 * Use Google Maps Reverse Geocoding API to convert coordinates to address.
 * Coordinates are passed with 6 decimal precision for ~0.11m accuracy.
 */
async function googleReverseGeocode(lat: number, lng: number): Promise<ParcelData[]> {
  // Ensure 6 decimal precision in API call (Google Maps supports up to 8)
  const latStr = lat.toFixed(6);
  const lngStr = lng.toFixed(6);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latStr},${lngStr}&key=${GOOGLE_MAPS_API_KEY}`;
  
  const response = await axios.get(url, { timeout: 10000 });
  
  if (response.data.status !== 'OK' || !response.data.results?.length) {
    console.log('Google Maps response status:', response.data.status);
    return [];
  }
  
  // Get the most specific result (usually a street address)
  const results = response.data.results;
  const parcels: ParcelData[] = [];
  
  // Find the street address result
  const streetAddress = results.find((r: any) => 
    r.types.includes('street_address') || 
    r.types.includes('premise') ||
    r.types.includes('subpremise')
  ) || results[0];
  
  if (streetAddress) {
    // Parse address components
    const components = streetAddress.address_components;
    const getComponent = (type: string) => 
      components.find((c: any) => c.types.includes(type))?.long_name || '';
    
    const streetNumber = getComponent('street_number');
    const route = getComponent('route');
    const city = getComponent('locality') || getComponent('sublocality');
    const state = getComponent('administrative_area_level_1');
    const zip = getComponent('postal_code');
    
    parcels.push({
      apn: '',
      address: streetNumber ? `${streetNumber} ${route}` : route,
      city,
      state,
      zip,
      lat: streetAddress.geometry.location.lat,
      lng: streetAddress.geometry.location.lng,
    });
  }
  
  return parcels;
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

