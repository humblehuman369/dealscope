import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePropertyScanner } from './usePropertyScanner';
import { 
  calculateTargetPoint, 
  generateScanCone 
} from '../utils/geoCalculations';
import { 
  queryParcelsInArea, 
  findParcelAtPoint 
} from '../services/parcelLookup';
import { fetchPropertyAnalytics, InvestmentAnalytics } from '../services/analytics';
import { saveScannedProperty } from '../database';
import { dbQueryKeys } from './useDatabase';

interface PropertyData {
  apn: string;
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
  lotSize?: number;
}

interface StrategyResult {
  primaryValue: number;
  primaryLabel: string;
  secondaryValue: number;
  secondaryLabel: string;
  isProfit: boolean;
}

export interface ScanResult {
  property: PropertyData;
  analytics: InvestmentAnalytics;
  confidence: number;
  scanTime: number;
  heading: number;
  distance: number;
  savedId?: string; // ID of the saved record in database
}

/**
 * Hook for performing property scans using GPS, compass, and parcel data.
 * Automatically saves scan results to the local database.
 */
export function usePropertyScan() {
  const scanner = usePropertyScanner();
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const performScan = useCallback(async (
    estimatedDistance: number = 50, 
    overrideLocation?: { lat: number; lng: number; heading?: number }
  ) => {
    // If override location provided (for demo/testing), skip GPS check
    const useOverride = overrideLocation && overrideLocation.lat !== 0;
    
    if (!useOverride) {
      // Validate scanner is ready for real scans
      if (!scanner.isLocationReady) {
        setError('GPS not ready. Please wait for location lock.');
        return;
      }

      if (scanner.userLat === 0 || scanner.userLng === 0) {
        setError('Unable to determine your location');
        return;
      }
    }

    setIsScanning(true);
    setError(null);
    setResult(null);
    
    const startTime = Date.now();

    try {
      // Use override or real scanner values
      const userLat = useOverride ? overrideLocation!.lat : scanner.userLat;
      const userLng = useOverride ? overrideLocation!.lng : scanner.userLng;
      const heading = useOverride && overrideLocation!.heading !== undefined 
        ? overrideLocation!.heading 
        : scanner.heading;

      console.log(`Scanning from: ${userLat}, ${userLng} heading ${heading}°`);

      // Step 1: Calculate target point based on heading and distance
      const targetPoint = calculateTargetPoint(
        userLat,
        userLng,
        heading,
        estimatedDistance
      );

      console.log(`Target point: ${targetPoint.lat}, ${targetPoint.lng}`);

      // Step 2: Generate scan cone for property matching
      const scanPoints = generateScanCone(
        userLat,
        userLng,
        heading,
        Math.max(10, estimatedDistance - 20),
        estimatedDistance + 30,
        25 // 25° cone angle for better accuracy
      );

      // Step 3: Query parcels in the target area
      const parcels = await queryParcelsInArea(
        targetPoint.lat,
        targetPoint.lng,
        150 // 150m radius
      );

      if (parcels.length === 0) {
        throw new Error('No properties found in scan area. Try adjusting distance.');
      }

      // Step 4: Find the most likely property using scan cone
      let matchedParcel = null;
      let bestConfidence = 0;

      // First, check the center target point
      const centerMatch = findParcelAtPoint(targetPoint.lat, targetPoint.lng, parcels);
      if (centerMatch) {
        matchedParcel = centerMatch;
        bestConfidence = 0.95;
      }

      // If no center match, search the scan cone
      if (!matchedParcel) {
        for (const point of scanPoints) {
          const parcel = findParcelAtPoint(point.lat, point.lng, parcels);
          if (parcel) {
            // Calculate confidence based on distance from center
            const latDiff = Math.abs(point.lat - targetPoint.lat);
            const lngDiff = Math.abs(point.lng - targetPoint.lng);
            const distanceFromCenter = Math.sqrt(latDiff ** 2 + lngDiff ** 2);
            
            // Closer to center = higher confidence
            const confidence = Math.max(0.5, 1 - distanceFromCenter * 5000);
            
            if (confidence > bestConfidence) {
              matchedParcel = parcel;
              bestConfidence = confidence;
            }
          }
        }
      }

      if (!matchedParcel) {
        throw new Error('Could not identify property. Try moving closer or adjusting aim.');
      }

      // Step 5: Fetch investment analytics for the matched property
      // Build full address string for API
      const fullAddress = [
        matchedParcel.address,
        matchedParcel.city,
        matchedParcel.state,
        matchedParcel.zip
      ].filter(Boolean).join(', ');
      
      console.log('Fetching analytics for:', fullAddress);
      const analytics = await fetchPropertyAnalytics(fullAddress);

      // Step 6: Save to local database
      let savedId: string | undefined;
      try {
        // Prepare property data for storage
        const propertyData = {
          bedrooms: analytics.property?.bedrooms,
          bathrooms: analytics.property?.bathrooms,
          sqft: analytics.property?.sqft,
          yearBuilt: analytics.property?.yearBuilt,
          lotSize: analytics.property?.lotSize,
          propertyType: analytics.property?.propertyType,
        };
        
        // Prepare analytics data for storage
        const analyticsData = {
          listPrice: analytics.pricing?.listPrice,
          estimatedValue: analytics.pricing?.estimatedValue,
          rentEstimate: analytics.pricing?.rentEstimate,
          strEstimate: analytics.pricing?.strEstimate,
          strategies: analytics.strategies,
        };
        
        savedId = await saveScannedProperty(
          matchedParcel.address,
          matchedParcel.city,
          matchedParcel.state,
          matchedParcel.zip,
          matchedParcel.lat,
          matchedParcel.lng,
          propertyData,
          analyticsData
        );
        
        console.log('Saved scan to database with ID:', savedId);
        
        // Invalidate queries to refresh the history list
        queryClient.invalidateQueries({ queryKey: dbQueryKeys.scannedProperties });
        queryClient.invalidateQueries({ queryKey: dbQueryKeys.databaseStats });
      } catch (dbError) {
        console.warn('Failed to save scan to database:', dbError);
        // Don't fail the scan if database save fails
      }

      // Step 7: Build result
      const scanResult: ScanResult = {
        property: matchedParcel,
        analytics,
        confidence: Math.round(bestConfidence * 100),
        scanTime: Date.now() - startTime,
        heading: scanner.heading,
        distance: estimatedDistance,
        savedId,
      };

      setResult(scanResult);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed. Please try again.';
      setError(message);
      console.error('Property scan error:', err);
    } finally {
      setIsScanning(false);
    }
  }, [scanner, queryClient]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    scanner,
    isScanning,
    result,
    error,
    performScan,
    clearResult,
  };
}
