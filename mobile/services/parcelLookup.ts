/**
 * Parcel lookup service for property identification.
 * Uses Google Maps Reverse Geocoding to convert GPS coordinates to addresses.
 * 
 * IMPROVED: Multi-point sampling for better accuracy
 */

import axios from 'axios';
import { calculateBoundingBox, calculateTargetPoint, calculateDistance } from '../utils/geoCalculations';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app';
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

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
  // Scoring fields for candidate ranking
  distanceFromUser?: number;  // Distance from user in meters
  angleDeviation?: number;    // Degrees off from center of scan cone
  confidence?: number;        // Overall match confidence (0-1)
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
 * NEW: Query multiple properties along a scan direction.
 * Samples points at different distances and angles to find all nearby properties.
 * Returns deduplicated list of properties with distance and confidence scores.
 * 
 * @param userLat - User's current latitude
 * @param userLng - User's current longitude
 * @param heading - Compass heading in degrees
 * @param estimatedDistance - User's estimated distance to property
 * @param coneAngle - Half-angle of scan cone in degrees (default 20°)
 * @returns Array of unique properties, sorted by confidence
 */
export async function queryPropertiesAlongScanPath(
  userLat: number,
  userLng: number,
  heading: number,
  estimatedDistance: number,
  coneAngle: number = 20
): Promise<ParcelData[]> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'parcelLookup.ts:queryPropertiesAlongScanPath:entry',message:'Starting scan path query',data:{userLat,userLng,heading,estimatedDistance,coneAngle},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2-H4'})}).catch(()=>{});
  // #endregion
  
  const allProperties: Map<string, ParcelData> = new Map();
  const samplePromises: Promise<ParcelData[]>[] = [];
  
  // Sample distances: closer together near estimated distance, spread out at extremes
  // Focus 70% of samples around the estimated distance
  const minDist = Math.max(10, estimatedDistance - 30);
  const maxDist = estimatedDistance + 40;
  
  // Sample points at key distances
  const distances = [
    minDist,
    estimatedDistance - 15,
    estimatedDistance - 5,
    estimatedDistance,           // Primary target
    estimatedDistance + 5,
    estimatedDistance + 15,
    maxDist,
  ].filter(d => d >= 10 && d <= 250);
  
  // Sample angles: center, and slight left/right to catch adjacent properties
  const angles = [0, -10, 10, -20, 20].slice(0, coneAngle >= 15 ? 5 : 3);
  
  console.log(`[ScanPath] Sampling ${distances.length * angles.length} points along heading ${heading}°`);
  
  // Create sample requests
  for (const dist of distances) {
    for (const angleOffset of angles) {
      const adjustedHeading = (heading + angleOffset + 360) % 360;
      const targetPoint = calculateTargetPoint(userLat, userLng, adjustedHeading, dist);
      
      // Create geocoding request for this point
      samplePromises.push(
        googleReverseGeocode(targetPoint.lat, targetPoint.lng)
          .then(parcels => {
            // Attach distance and angle info to each result
            return parcels.map(p => ({
              ...p,
              distanceFromUser: dist,
              angleDeviation: Math.abs(angleOffset),
            }));
          })
          .catch(err => {
            console.log(`[ScanPath] Sample at ${dist}m/${angleOffset}° failed:`, err.message);
            return [];
          })
      );
    }
  }
  
  // Execute all requests in parallel (with some throttling to avoid rate limits)
  const results = await Promise.all(samplePromises);
  
  // #region agent log
  const successCount = results.filter(r => r.length > 0).length;
  const failCount = results.filter(r => r.length === 0).length;
  fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'parcelLookup.ts:queryPropertiesAlongScanPath:afterPromises',message:'All geocode requests completed',data:{totalRequests:results.length,successCount,failCount},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3-H5'})}).catch(()=>{});
  // #endregion
  
  // Deduplicate by address and keep the best scoring version
  for (const propertyList of results) {
    for (const property of propertyList) {
      const key = normalizeAddress(property.address);
      
      // Calculate confidence score
      const distanceScore = 1 - Math.min(1, Math.abs((property.distanceFromUser || estimatedDistance) - estimatedDistance) / 50);
      const angleScore = 1 - (property.angleDeviation || 0) / coneAngle;
      const confidence = distanceScore * 0.6 + angleScore * 0.4;
      
      property.confidence = confidence;
      
      // Keep the version with higher confidence
      const existing = allProperties.get(key);
      if (!existing || (existing.confidence || 0) < confidence) {
        allProperties.set(key, property);
      }
    }
  }
  
  // Convert to array and sort by confidence (highest first)
  const uniqueProperties = Array.from(allProperties.values())
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  
  console.log(`[ScanPath] Found ${uniqueProperties.length} unique properties`);
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'parcelLookup.ts:queryPropertiesAlongScanPath:exit',message:'Scan path query complete',data:{totalSamples:samplePromises.length,uniquePropertiesFound:uniqueProperties.length,firstAddress:uniqueProperties[0]?.address},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H5'})}).catch(()=>{});
  // #endregion
  
  return uniqueProperties;
}

/**
 * Normalize address for deduplication (remove case, extra spaces, etc.)
 */
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,#]/g, '')
    .trim();
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
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'parcelLookup.ts:googleReverseGeocode',message:'API call starting',data:{lat:latStr,lng:lngStr,hasApiKey:!!GOOGLE_MAPS_API_KEY,apiKeyLength:GOOGLE_MAPS_API_KEY?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H2'})}).catch(()=>{});
  // #endregion
  
  let response;
  try {
    response = await axios.get(url, { timeout: 10000 });
  } catch (axiosErr: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'parcelLookup.ts:googleReverseGeocode:catch',message:'Axios request failed',data:{error:axiosErr?.message,code:axiosErr?.code,lat:latStr,lng:lngStr},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    throw axiosErr;
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'parcelLookup.ts:googleReverseGeocode:response',message:'API response received',data:{status:response.data.status,resultsCount:response.data.results?.length,errorMessage:response.data.error_message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  
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

/**
 * Calculate the actual distance between two GPS points in meters.
 * Uses Haversine formula for accuracy.
 */
export function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return calculateDistance(lat1, lng1, lat2, lng2);
}