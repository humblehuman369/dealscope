'use client';

import { useState, useCallback } from 'react';
import { useGeolocation } from './useGeolocation';
import { useDeviceOrientation } from './useDeviceOrientation';
import { calculateTargetPoint, generateScanCone } from '@/lib/geoCalculations';
import { reverseGeocodeProperty, type GeocodedProperty } from '@/lib/reverseGeocode';

export interface ScanResult {
  property: GeocodedProperty;
  confidence: number;
  scanTime: number;
  heading: number;
  distance: number;
}

/**
 * Hook for performing property scans using GPS and compass.
 */
export function usePropertyScan() {
  const geolocation = useGeolocation({ watchPosition: true });
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

      let matchedProperty = await reverseGeocodeProperty(targetPoint.lat, targetPoint.lng);
      let confidence = 95;

      if (!matchedProperty) {
        for (const point of scanPoints.slice(0, 10)) {
          matchedProperty = await reverseGeocodeProperty(point.lat, point.lng);
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

