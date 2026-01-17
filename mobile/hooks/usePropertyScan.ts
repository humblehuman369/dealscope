import { useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePropertyScanner } from './usePropertyScanner';
import { 
  calculateTargetPoint, 
  generateScanCone,
  calculateDistance 
} from '../utils/geoCalculations';
import { 
  queryParcelsInArea, 
  queryPropertiesAlongScanPath,
  findParcelAtPoint,
  ParcelData 
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

// Property candidate for selection
export interface PropertyCandidate {
  property: ParcelData;
  distanceFromUser: number;
  angleDeviation: number;
  confidence: number;
  isRecommended: boolean;
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

// Signal quality indicator
export interface SignalQuality {
  gps: 'excellent' | 'good' | 'poor';
  compass: 'stable' | 'unstable' | 'calibrating';
  overall: 'ready' | 'marginal' | 'not-ready';
  message: string;
}

/**
 * Calculate signal quality based on GPS accuracy and compass stability.
 */
function calculateSignalQuality(
  gpsAccuracy: number,
  needsCalibration: boolean,
  isLocationReady: boolean,
  isCompassReady: boolean
): SignalQuality {
  // GPS quality
  let gps: 'excellent' | 'good' | 'poor';
  if (gpsAccuracy < 5) gps = 'excellent';
  else if (gpsAccuracy < 15) gps = 'good';
  else gps = 'poor';

  // Compass quality
  let compass: 'stable' | 'unstable' | 'calibrating';
  if (!isCompassReady) compass = 'calibrating';
  else if (needsCalibration) compass = 'unstable';
  else compass = 'stable';

  // Overall quality
  let overall: 'ready' | 'marginal' | 'not-ready';
  let message: string;

  if (!isLocationReady) {
    overall = 'not-ready';
    message = 'Waiting for GPS signal...';
  } else if (gps === 'poor' || compass === 'calibrating') {
    overall = 'not-ready';
    message = gps === 'poor' ? 'GPS signal too weak' : 'Compass calibrating...';
  } else if (gps === 'good' && compass === 'unstable') {
    overall = 'marginal';
    message = 'Compass unstable - results may vary';
  } else if (gps === 'excellent' && compass === 'stable') {
    overall = 'ready';
    message = 'Excellent signal - ready to scan';
  } else {
    overall = 'ready';
    message = 'Good signal - ready to scan';
  }

  return { gps, compass, overall, message };
}

/**
 * Hook for performing property scans using GPS, compass, and parcel data.
 * IMPROVED: Returns multiple property candidates for user selection.
 * Automatically saves scan results to the local database.
 */
export function usePropertyScan() {
  const scanner = usePropertyScanner();
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [candidates, setCandidates] = useState<PropertyCandidate[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Signal quality derived from scanner state
  const signalQuality = calculateSignalQuality(
    scanner.accuracy,
    scanner.needsCalibration,
    scanner.isLocationReady,
    scanner.isCompassReady
  );
  
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
      accuracy: currentScanner.accuracy,
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
    setCandidates([]);
    setShowCandidates(false);
    
    const startTime = Date.now();

    try {
      // Use override or real scanner values (from ref for latest values)
      const userLat = useOverride ? overrideLocation!.lat : currentScanner.userLat;
      const userLng = useOverride ? overrideLocation!.lng : currentScanner.userLng;
      const heading = useOverride && overrideLocation!.heading !== undefined 
        ? overrideLocation!.heading 
        : currentScanner.heading;

      console.log(`[ImprovedScan] Scanning from: ${userLat.toFixed(6)}, ${userLng.toFixed(6)} heading ${heading}°`);
      console.log(`[ImprovedScan] GPS accuracy: ±${currentScanner.accuracy}m`);

      // IMPROVED: Use multi-point sampling to find all nearby properties
      // This queries multiple points along the scan direction to catch adjacent properties
      const properties = await queryPropertiesAlongScanPath(
        userLat,
        userLng,
        heading,
        estimatedDistance,
        20 // 20° cone angle for good coverage
      );

      if (properties.length === 0) {
        throw new Error('No properties found in scan area. Try adjusting distance or aim.');
      }

      console.log(`[ImprovedScan] Found ${properties.length} candidate properties`);

      // Convert to PropertyCandidate format with additional scoring
      const propertyCandidates: PropertyCandidate[] = properties.slice(0, 5).map((p, index) => ({
        property: p,
        distanceFromUser: p.distanceFromUser || estimatedDistance,
        angleDeviation: p.angleDeviation || 0,
        confidence: Math.round((p.confidence || 0.5) * 100),
        isRecommended: index === 0, // First one (highest confidence) is recommended
      }));

      // If we have multiple candidates with similar confidence, show selection UI
      const topConfidence = propertyCandidates[0]?.confidence || 0;
      const hasCloseCompetitors = propertyCandidates.length > 1 && 
        propertyCandidates[1]?.confidence > topConfidence - 15;

      if (hasCloseCompetitors && propertyCandidates.length > 1) {
        // Multiple good candidates - let user choose
        console.log(`[ImprovedScan] Multiple candidates with similar confidence - showing selection`);
        setCandidates(propertyCandidates);
        setShowCandidates(true);
        setIsScanning(false);
        return; // Wait for user selection
      }

      // Single clear winner - proceed with that property
      const matchedParcel = properties[0];
      const bestConfidence = matchedParcel.confidence || 0.8;

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
        } else if (message.includes('Property not found')) {
          message = 'Property not found in our database. Try a nearby address.';
        } else if (message.includes('Too many requests')) {
          message = 'Too many requests. Please wait a moment and try again.';
        } else if (message.includes('Analytics service error')) {
          message = 'Analytics service temporarily unavailable. Please try again later.';
        }
      } else {
        message = 'Scan failed unexpectedly. Please try again.';
      }
      
      setError(message);
    } finally {
      setIsScanning(false);
    }
  }, [queryClient]); // Remove scanner from deps since we use ref

  /**
   * Select a specific candidate from the candidate list.
   * This fetches analytics and creates the final scan result.
   */
  const selectCandidate = useCallback(async (candidate: PropertyCandidate) => {
    setIsScanning(true);
    setShowCandidates(false);
    setCandidates([]);
    setError(null);

    const startTime = Date.now();

    try {
      const matchedParcel = candidate.property;
      
      // Fetch investment analytics for the selected property
      const fullAddress = [
        matchedParcel.address,
        matchedParcel.city,
        matchedParcel.state,
        matchedParcel.zip
      ].filter(Boolean).join(', ');
      
      console.log('[SelectCandidate] Fetching analytics for:', fullAddress);
      
      const analytics = await fetchPropertyAnalytics(fullAddress, {
        city: matchedParcel.city,
        state: matchedParcel.state,
        zip: matchedParcel.zip,
        lat: matchedParcel.lat,
        lng: matchedParcel.lng,
      });

      // Save to local database
      let savedId: string | undefined;
      try {
        const propertyData = {
          bedrooms: analytics.property?.bedrooms,
          bathrooms: analytics.property?.bathrooms,
          sqft: analytics.property?.sqft,
          yearBuilt: analytics.property?.yearBuilt,
          lotSize: analytics.property?.lotSize,
          propertyType: analytics.property?.propertyType,
        };
        
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
        
        queryClient.invalidateQueries({ queryKey: dbQueryKeys.scannedProperties });
        queryClient.invalidateQueries({ queryKey: dbQueryKeys.databaseStats });
      } catch (dbError) {
        console.warn('Failed to save scan to database:', dbError);
      }

      const scanResult: ScanResult = {
        property: matchedParcel,
        analytics,
        confidence: candidate.confidence,
        scanTime: Date.now() - startTime,
        heading: scannerRef.current.heading,
        distance: candidate.distanceFromUser,
        savedId,
      };

      console.log('[SelectCandidate] Success:', matchedParcel.address);
      setResult(scanResult);

    } catch (err) {
      console.error('Select candidate error:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze property');
    } finally {
      setIsScanning(false);
    }
  }, [queryClient]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearCandidates = useCallback(() => {
    setCandidates([]);
    setShowCandidates(false);
  }, []);

  return {
    scanner,
    isScanning,
    result,
    error,
    candidates,
    showCandidates,
    signalQuality,
    performScan,
    selectCandidate,
    clearResult,
    clearError,
    clearCandidates,
  };
}
