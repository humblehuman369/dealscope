/**
 * IQ Analyzing Screen Route
 * Route: /analyzing/[address]
 * 
 * Loading screen shown while IQ analyzes all 6 strategies
 * Automatically transitions to verdict screen after animation
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import {
  IQAnalyzingScreen,
  IQProperty,
} from '../../components/analytics/iq-verdict';
import { usePropertyStore } from '../../stores';

export default function AnalyzingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    address: string;
    price?: string;
    beds?: string;
    baths?: string;
    sqft?: string;
    monthlyRent?: string;
    city?: string;
    state?: string;
    zip?: string;
    lat?: string;
    lng?: string;
  }>();

  const decodedAddress = decodeURIComponent(params.address || '');

  // Debug logging
  console.log('[IQ Analyzing] Screen mounted with params:', params);

  // Build property object from route params
  const property = useMemo((): IQProperty => ({
    address: decodedAddress || 'Unknown Address',
    city: params.city || '',
    state: params.state || '',
    zip: params.zip || '',
    price: params.price ? parseInt(params.price, 10) : 350000,
    beds: params.beds ? parseInt(params.beds, 10) : 3,
    baths: params.baths ? parseFloat(params.baths) : 2,
    sqft: params.sqft ? parseInt(params.sqft, 10) : 1500,
    latitude: params.lat ? parseFloat(params.lat) : undefined,
    longitude: params.lng ? parseFloat(params.lng) : undefined,
  }), [params, decodedAddress]);

  // Record this search in the property store
  const addRecentSearch = usePropertyStore((s) => s.addRecentSearch);
  useEffect(() => {
    addRecentSearch({
      address: property.address,
      propertyId: encodeURIComponent(property.address),
      price: property.price,
      beds: property.beds,
      baths: property.baths,
    });
  }, [property.address]);

  // Handle analysis complete - navigate to verdict screen
  const handleAnalysisComplete = useCallback(() => {
    const encodedAddress = encodeURIComponent(property.address);
    
    // Build query params to pass property data to verdict screen
    const queryParams = new URLSearchParams({
      price: property.price.toString(),
      beds: property.beds.toString(),
      baths: property.baths.toString(),
      sqft: (property.sqft || 0).toString(),
    });

    if (params.monthlyRent) {
      queryParams.set('monthlyRent', params.monthlyRent);
    }
    if (property.city) {
      queryParams.set('city', property.city);
    }
    if (property.state) {
      queryParams.set('state', property.state);
    }
    if (property.zip) {
      queryParams.set('zip', property.zip);
    }
    if (params.lat) {
      queryParams.set('lat', params.lat);
    }
    if (params.lng) {
      queryParams.set('lng', params.lng);
    }

    // Replace current screen with verdict screen (no back to analyzing)
    // Using type assertion to handle new route until types are regenerated
    router.replace(`/verdict-iq/${encodedAddress}?${queryParams.toString()}` as any);
  }, [property, params.monthlyRent, router]);

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          gestureEnabled: false, // Prevent going back during analysis
        }} 
      />
      <IQAnalyzingScreen
        property={property}
        onAnalysisComplete={handleAnalysisComplete}
        minimumDisplayTime={2800}
      />
    </>
  );
}
