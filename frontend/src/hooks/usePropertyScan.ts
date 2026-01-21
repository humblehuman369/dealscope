'use client';

import { useState, useCallback } from 'react';
import { useGeolocation } from './useGeolocation';
import { useDeviceOrientation } from './useDeviceOrientation';
import { calculateTargetPoint, generateScanCone } from '@/lib/geoCalculations';

interface PropertyData {
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  yearBuilt?: number;
}

export interface ScanResult {
  property: PropertyData;
  confidence: number;
  scanTime: number;
  heading: number;
  distance: number;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

/**
 * Reverse geocode coordinates to get address using Google Maps API.
 */
async function reverseGeocode(lat: number, lng: number): Promise<PropertyData | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat.toFixed(6)},${lng.toFixed(6)}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.length) {
      return null;
    }

    // Find the street address result
    const streetAddress = data.results.find((r: { types: string[] }) => 
      r.types.includes('street_address') || 
      r.types.includes('premise') ||
      r.types.includes('subpremise')
    ) || data.results[0];

    if (!streetAddress) return null;

    const components = streetAddress.address_components;
    const getComponent = (type: string) => 
      components.find((c: { types: string[]; long_name: string }) => c.types.includes(type))?.long_name || '';

    const streetNumber = getComponent('street_number');
    const route = getComponent('route');
    const city = getComponent('locality') || getComponent('sublocality');
    const state = getComponent('administrative_area_level_1');
    const zip = getComponent('postal_code');

    return {
      address: streetNumber ? `${streetNumber} ${route}` : route,
      city,
      state,
      zip,
      lat: streetAddress.geometry.location.lat,
      lng: streetAddress.geometry.location.lng,
    };
  } catch (error) {
    console.error('Reverse geocode error:', error);
    return null;
  }
}

/**
 * Hook for performing property scans using GPS and compass.
 */
export function usePropertyScan() {
  const geolocation = useGeolocation();
  const orientation = useDeviceOrientation();
  
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const performScan = useCallback(async (
    estimatedDistance: number = 50,
    manualHeading?: number
  ) => {
    // Validate location is ready
    if (!geolocation.isReady || geolocation.latitude === null || geolocation.longitude === null) {
      setError('GPS not ready. Please wait for location lock.');
      return;
    }

    // Use manual heading, device heading, or default to North
    const heading = manualHeading ?? orientation.heading ?? 0;

    setIsScanning(true);
    setError(null);
    setResult(null);

    const startTime = Date.now();

    try {
      const userLat = geolocation.latitude;
      const userLng = geolocation.longitude;

      console.log(`Scanning from: ${userLat}, ${userLng} heading ${heading}°`);

      // Calculate target point based on heading and distance
      const targetPoint = calculateTargetPoint(userLat, userLng, heading, estimatedDistance);

      // Generate scan cone for better matching
      const scanPoints = generateScanCone(
        userLat,
        userLng,
        heading,
        Math.max(10, estimatedDistance - 20),
        estimatedDistance + 30,
        25
      );

      // First try the center target point
      let matchedProperty = await reverseGeocode(targetPoint.lat, targetPoint.lng);
      let confidence = 95;

      // If no match, try scan cone points
      if (!matchedProperty) {
        for (const point of scanPoints.slice(0, 10)) {
          matchedProperty = await reverseGeocode(point.lat, point.lng);
          if (matchedProperty) {
            confidence = Math.max(50, 90 - Math.abs(point.angle) * 2);
            break;
          }
        }
      }

      if (!matchedProperty) {
        throw new Error('No property found. Try adjusting distance or aim.');
      }

      const scanResult: ScanResult = {
        property: matchedProperty,
        confidence,
        scanTime: Date.now() - startTime,
        heading,
        distance: estimatedDistance,
      };

      setResult(scanResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed. Please try again.';
      setError(message);
      console.error('Property scan error:', err);
    } finally {
      setIsScanning(false);
    }
  }, [geolocation, orientation.heading]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    // Location state
    latitude: geolocation.latitude,
    longitude: geolocation.longitude,
    accuracy: geolocation.accuracy,
    isLocationReady: geolocation.isReady,
    locationError: geolocation.error,
    
    // Orientation state
    heading: orientation.heading,
    hasCompass: orientation.hasCompass,
    isOrientationSupported: orientation.isSupported,
    isMobileDevice: orientation.isMobileDevice,
    permissionRequested: orientation.permissionRequested,
    requestOrientationPermission: orientation.requestPermission,
    
    // Scan state
    isScanning,
    result,
    error,
    
    // Actions
    performScan,
    clearResult,
    refreshLocation: geolocation.refresh,
  };
}

