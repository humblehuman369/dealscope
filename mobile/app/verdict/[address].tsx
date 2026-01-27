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
import type { NavItemId } from '../../components/header';
import { StrategyId } from '../../components/analytics/redesign/types';

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
    const encodedAddress = encodeURIComponent(property.address);
    
    const redesignStrategyMap: Record<IQStrategy['id'], StrategyId> = {
      'long-term-rental': 'ltr',
      'short-term-rental': 'str',
      'brrrr': 'brrrr',
      'fix-and-flip': 'flip',
      'house-hack': 'house_hack',
      'wholesale': 'wholesale',
    };
    
    // Navigate to the Analysis IQ page with selected strategy
    const redesignStrategy = redesignStrategyMap[strategy.id];
    router.push({
      pathname: '/analysis-iq/[address]',
      params: {
        address: encodedAddress,
        strategy: redesignStrategy,
        price: String(property.price),
        beds: String(property.beds),
        baths: String(property.baths),
        sqft: String(property.sqft),
      },
    } as any);
  }, [property, router]);

  const handleCompareAll = useCallback(() => {
    // Navigate to Analysis IQ page for strategy comparison
    const encodedAddress = encodeURIComponent(property.address);
    router.push({
      pathname: '/analysis-iq/[address]',
      params: {
        address: encodedAddress,
        price: String(property.price),
        beds: String(property.beds),
        baths: String(property.baths),
        sqft: String(property.sqft),
        tab: 'compare',
      },
    } as any);
  }, [property, router]);

  // Handle navigation from CompactHeader
  const handleNavChange = useCallback((navId: NavItemId) => {
    const encodedAddress = encodeURIComponent(property.address);
    switch (navId) {
      case 'search':
        router.push('/(tabs)/search');
        break;
      case 'home':
        router.push('/(tabs)');
        break;
      case 'analysis':
        router.push({
          pathname: '/analysis-iq/[address]',
          params: {
            address: encodedAddress,
            price: String(property.price),
            beds: String(property.beds),
            baths: String(property.baths),
            sqft: String(property.sqft),
          },
        } as any);
        break;
      case 'deal-maker':
        router.push({
          pathname: '/deal-maker/[address]',
          params: { address: encodedAddress },
        } as any);
        break;
    }
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
        onNavChange={handleNavChange}
        isDark={isDark}
      />
    </>
  );
}
