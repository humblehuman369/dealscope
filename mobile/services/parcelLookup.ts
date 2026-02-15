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

// Geohash-based cache for geocoding results (reduces redundant API calls)
// Cache TTL is 30 minutes (1800000ms)
const GEOCODE_CACHE_TTL_MS = 30 * 60 * 1000;
const geocodeCache = new Map<string, { data: ParcelData[]; timestamp: number }>();

/**
 * Calculate a geohash for caching purposes.
 * Precision 8 gives ~38m x 19m cells which is appropriate for geocoding.
 */
function calculateGeohashForCache(lat: number, lng: number, precision: number = 8): string {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let hash = '';
  let bit = 0;
  let ch = 0;
  let isLng = true;

  while (hash.length < precision) {
    if (isLng) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        ch |= 1 << (4 - bit);
        minLng = mid;
      } else {
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        ch |= 1 << (4 - bit);
        minLat = mid;
      } else {
        maxLat = mid;
      }
    }
    isLng = !isLng;
    if (bit < 4) {
      bit++;
    } else {
      hash += base32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

/**
 * Get cached geocode result if available and not expired.
 */
function getCachedGeocode(lat: number, lng: number): ParcelData[] | null {
  const geohash = calculateGeohashForCache(lat, lng);
  const cached = geocodeCache.get(geohash);
  
  if (cached && (Date.now() - cached.timestamp) < GEOCODE_CACHE_TTL_MS) {
    if (__DEV__) console.log(`[GeoCache] Cache hit for geohash ${geohash}`);
    return cached.data;
  }
  
  return null;
}

/**
 * Store geocode result in cache.
 */
function setCachedGeocode(lat: number, lng: number, data: ParcelData[]): void {
  const geohash = calculateGeohashForCache(lat, lng);
  geocodeCache.set(geohash, { data, timestamp: Date.now() });
  
  // Clean up old entries if cache is too large (max 500 entries)
  if (geocodeCache.size > 500) {
    const now = Date.now();
    for (const [key, value] of geocodeCache.entries()) {
      if (now - value.timestamp > GEOCODE_CACHE_TTL_MS) {
        geocodeCache.delete(key);
      }
    }
  }
}

/**
 * Clear the geocode cache.
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
  if (__DEV__) console.log('[GeoCache] Cache cleared');
}

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
      if (__DEV__) console.log('Google Maps found address:', parcels[0].address);
      return parcels;
    }
    
    // If no results, return empty
    if (__DEV__) console.log('No address found at coordinates');
    return [];
  } catch (error) {
    console.error('Google Maps geocoding error:', error);
    
    // Fallback to mock data if Google Maps fails
    if (USE_MOCK_DATA_ON_ERROR) {
      if (__DEV__) console.log('Using mock parcel data as fallback');
      return generateMockParcels(centerLat, centerLng);
    }
    
    return [];
  }
}

/**
 * Query multiple properties along a scan direction.
 * OPTIMIZED: Reduced from 35 to 15 sample points (5 distances × 3 angles)
 * Uses geohash-based caching to reduce redundant API calls.
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
  if (__DEV__) console.log('[ScanPath] Entry', JSON.stringify({userLat,userLng,heading,estimatedDistance,coneAngle}));
  
  const allProperties: Map<string, ParcelData> = new Map();
  const samplePromises: Promise<ParcelData[]>[] = [];
  
  // OPTIMIZED: Reduced to 5 key distances (was 7)
  // Focus samples around the estimated distance with wider spread
  const distances = [
    Math.max(10, estimatedDistance - 20),   // Near bound
    estimatedDistance - 5,                   // Slightly closer
    estimatedDistance,                       // Primary target
    estimatedDistance + 10,                  // Slightly farther
    Math.min(250, estimatedDistance + 30),  // Far bound
  ].filter(d => d >= 10 && d <= 250);
  
  // OPTIMIZED: Reduced to 3 angles (was 5)
  // Center + left/right to catch adjacent properties
  const angles = [0, -15, 15];
  
  if (__DEV__) console.log(`[ScanPath] Sampling ${distances.length * angles.length} points along heading ${heading}°`);
  
  // Track cache hits for logging
  let cacheHits = 0;
  
  // Create sample requests with caching
  for (const dist of distances) {
    for (const angleOffset of angles) {
      const adjustedHeading = (heading + angleOffset + 360) % 360;
      const targetPoint = calculateTargetPoint(userLat, userLng, adjustedHeading, dist);
      
      // Check cache first
      const cached = getCachedGeocode(targetPoint.lat, targetPoint.lng);
      if (cached !== null) {
        cacheHits++;
        // Use cached result directly
        samplePromises.push(
          Promise.resolve(cached.map(p => ({
            ...p,
            distanceFromUser: dist,
            angleDeviation: Math.abs(angleOffset),
          })))
        );
      } else {
        // Create geocoding request for this point
        samplePromises.push(
          googleReverseGeocodeWithCache(targetPoint.lat, targetPoint.lng)
            .then(parcels => {
              // Attach distance and angle info to each result
              return parcels.map(p => ({
                ...p,
                distanceFromUser: dist,
                angleDeviation: Math.abs(angleOffset),
              }));
            })
            .catch(err => {
              if (__DEV__) console.log(`[ScanPath] Sample at ${dist}m/${angleOffset}° failed:`, err.message);
              return [];
            })
        );
      }
    }
  }
  
  // Execute all requests in parallel
  const results = await Promise.all(samplePromises);
  
  const successCount = results.filter(r => r.length > 0).length;
  const failCount = results.filter(r => r.length === 0).length;
  if (__DEV__) console.log(`[ScanPath] Results: ${successCount} success, ${failCount} fail, ${cacheHits} cache hits`);
  
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
  
  if (__DEV__) console.log(`[ScanPath] Found ${uniqueProperties.length} unique properties`);
  
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
 * Use Google Maps Reverse Geocoding API with caching.
 * Checks cache first, then makes API call if needed.
 */
async function googleReverseGeocodeWithCache(lat: number, lng: number): Promise<ParcelData[]> {
  // Check cache first
  const cached = getCachedGeocode(lat, lng);
  if (cached !== null) {
    return cached;
  }
  
  // Make API call and cache result
  const result = await googleReverseGeocode(lat, lng);
  setCachedGeocode(lat, lng, result);
  
  return result;
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
  
  let response;
  try {
    response = await axios.get(url, { timeout: 10000 });
  } catch (axiosErr: any) {
    if (__DEV__) console.log('[Geocode] API error:', axiosErr?.message);
    throw axiosErr;
  }
  
  if (response.data.status !== 'OK' || !response.data.results?.length) {
    if (__DEV__) console.log('[Geocode] Response status:', response.data.status);
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