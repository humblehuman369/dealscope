import { useState, useCallback, useRef, useEffect } from 'react';
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
  
  // Use refs to always get the latest scanner values in callbacks
  // This prevents stale closure issues
  const scannerRef = useRef(scanner);
  useEffect(() => {
    scannerRef.current = scanner;
  }, [scanner]);

  const performScan = useCallback(async (
    estimatedDistance: number = 50, 
    overrideLocation?: { lat: number; lng: number; heading?: number }
  ) => {
    // Get the latest scanner values from ref
    const currentScanner = scannerRef.current;
    
    // If override location provided (for demo/testing), skip GPS check
    const useOverride = overrideLocation && overrideLocation.lat !== 0;
    
    console.log('performScan called with:', {
      distance: estimatedDistance,
      isLocationReady: currentScanner.isLocationReady,
      userLat: currentScanner.userLat,
      userLng: currentScanner.userLng,
      heading: currentScanner.heading,
      useOverride,
    });
    
    if (!useOverride) {
      // Validate scanner is ready for real scans
      if (!currentScanner.isLocationReady) {
        setError('GPS not ready. Please wait for location lock.');
        console.log('Scan failed: GPS not ready');
        return;
      }

      if (currentScanner.userLat === 0 || currentScanner.userLng === 0) {
        setError('Unable to determine your location');
        console.log('Scan failed: Location is 0,0');
        return;
      }
    }

    setIsScanning(true);
    setError(null);
    setResult(null);
    
    const startTime = Date.now();

    try {
      // Use override or real scanner values (from ref for latest values)
      const userLat = useOverride ? overrideLocation!.lat : currentScanner.userLat;
      const userLng = useOverride ? overrideLocation!.lng : currentScanner.userLng;
      const heading = useOverride && overrideLocation!.heading !== undefined 
        ? overrideLocation!.heading 
        : currentScanner.heading;

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
      // Use a NARROW cone (15°) for better accuracy - wide cones catch neighboring properties
      const scanPoints = generateScanCone(
        userLat,
        userLng,
        heading,
        Math.max(5, estimatedDistance - 15),  // Start closer to estimated distance
        estimatedDistance + 20,                // Less overshoot
        15 // NARROWER 15° cone angle for better accuracy (was 25°)
      );

      // Step 3: Query parcels in the target area
      // Use smaller radius (100m instead of 150m) to reduce false matches
      const parcels = await queryParcelsInArea(
        targetPoint.lat,
        targetPoint.lng,
        100 // Reduced from 150m to 100m for tighter matching
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
      
      // Pass parcel data for fallback estimation if API fails
      const analytics = await fetchPropertyAnalytics(fullAddress, {
        city: matchedParcel.city,
        state: matchedParcel.state,
        zip: matchedParcel.zip,
        lat: matchedParcel.lat,
        lng: matchedParcel.lng,
      });

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
        heading: heading, // Use the heading captured at scan start
        distance: estimatedDistance,
        savedId,
      };

      console.log('Scan successful:', {
        address: matchedParcel.address,
        confidence: scanResult.confidence,
        scanTime: scanResult.scanTime,
      });

      setResult(scanResult);

    } catch (err) {
      console.error('Property scan error:', err);
      
      // Provide more specific error messages based on error type
      let message: string;
      if (err instanceof Error) {
        message = err.message;
        
        // Add helpful hints for common errors
        if (message.includes('No properties found')) {
          message = 'No properties found at this location. Try moving closer or adjusting your aim.';
        } else if (message.includes('Could not identify')) {
          message = 'Unable to identify the exact property. Try reducing the distance setting.';
        } else if (message.includes('Backend service')) {
          // Analytics API is down but we have fallback data
          message = 'Using estimated data - full analysis unavailable.';
        }
      } else {
        message = 'Scan failed unexpectedly. Please try again.';
      }
      
      setError(message);
    } finally {
      setIsScanning(false);
    }
  }, [queryClient]); // Remove scanner from deps since we use ref

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    scanner,
    isScanning,
    result,
    error,
    performScan,
    clearResult,
    clearError,
  };
}
