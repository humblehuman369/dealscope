/**
 * IQ Analyzing Screen Route
 * Route: /analyzing/[address]
 * 
 * Loading screen shown while IQ analyzes all 6 strategies
 * Automatically transitions to verdict screen after animation
 */

import React, { useCallback, useMemo } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import {
  IQAnalyzingScreen,
  IQProperty,
} from '../../components/analytics/iq-verdict';

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
  }>();

  const decodedAddress = decodeURIComponent(params.address || '');

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
  }), [params, decodedAddress]);

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

    // Replace current screen with verdict screen (no back to analyzing)
    router.replace(`/verdict/${encodedAddress}?${queryParams.toString()}`);
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
