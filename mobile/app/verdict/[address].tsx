/**
 * IQ Verdict Screen Route
 * Route: /verdict/[address]
 * 
 * Shows the IQ Verdict with ranked strategy recommendations after analysis
 */

import React, { useCallback, useMemo } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import { useTheme } from '../../context/ThemeContext';
import {
  IQVerdictScreen,
  IQStrategy,
  IQProperty,
  useIQAnalysis,
  createIQInputsFromProperty,
  STRATEGY_SCREEN_MAP,
  ID_TO_STRATEGY_TYPE,
} from '../../components/analytics/iq-verdict';

export default function VerdictScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
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

  // Create analytics inputs from property
  const inputs = useMemo(() => createIQInputsFromProperty({
    price: property.price,
    monthlyRent: params.monthlyRent ? parseInt(params.monthlyRent, 10) : undefined,
    beds: property.beds,
    baths: property.baths,
    sqft: property.sqft,
  }), [property, params.monthlyRent]);

  // Get IQ analysis
  const { analysis } = useIQAnalysis(inputs);

  // Navigation handlers
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleViewStrategy = useCallback((strategy: IQStrategy) => {
    const basePath = STRATEGY_SCREEN_MAP[strategy.id];
    const encodedAddress = encodeURIComponent(property.address);
    
    // Navigate to the appropriate strategy worksheet
    // Pass along property details as query params
    const strategyType = ID_TO_STRATEGY_TYPE[strategy.id];
    
    if (strategyType === 'longTermRental') {
      // Go to main analytics page for LTR
      router.push(`/analytics/${encodedAddress}?price=${property.price}&beds=${property.beds}&baths=${property.baths}&sqft=${property.sqft}`);
    } else {
      // Go to specific strategy page
      router.push(`${basePath}/${encodedAddress}?price=${property.price}&beds=${property.beds}&baths=${property.baths}&sqft=${property.sqft}`);
    }
  }, [property, router]);

  const handleCompareAll = useCallback(() => {
    // Navigate to analytics page which has strategy comparison
    const encodedAddress = encodeURIComponent(property.address);
    router.push(`/analytics/${encodedAddress}?price=${property.price}&beds=${property.beds}&baths=${property.baths}&sqft=${property.sqft}&tab=compare`);
  }, [property, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <IQVerdictScreen
        property={property}
        analysis={analysis}
        onBack={handleBack}
        onViewStrategy={handleViewStrategy}
        onCompareAll={handleCompareAll}
        isDark={isDark}
      />
    </>
  );
}
