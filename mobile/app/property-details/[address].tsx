/**
 * Property Details Screen Route
 * Route: /property-details/[address]
 * 
 * Displays detailed property information with image gallery,
 * property facts, features, and bottom action bar.
 */

import React, { useCallback } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { PropertyDetailsScreen } from '../../components/property';

export default function PropertyDetailsRoute() {
  const router = useRouter();
  const { isDark } = useTheme();
  const params = useLocalSearchParams<{
    address: string;
    zpid?: string;
    propertyId?: string;
    price?: string;
    beds?: string;
    baths?: string;
    sqft?: string;
    rent?: string;
    city?: string;
    state?: string;
    zip?: string;
    lat?: string;
    lng?: string;
  }>();

  const decodedAddress = decodeURIComponent(params.address || '');

  // Build property object from route params — no hardcoded fallbacks
  const property = {
    address: decodedAddress || 'Unknown Address',
    zpid: params.zpid ?? null,
    propertyId: params.propertyId ?? null,
    city: params.city ?? '',
    state: params.state ?? '',
    zip: params.zip ?? '',
    price: params.price ? parseInt(params.price, 10) : 0,
    beds: params.beds ? parseInt(params.beds, 10) : 0,
    baths: params.baths ? parseFloat(params.baths) : 0,
    sqft: params.sqft ? parseInt(params.sqft, 10) : 0,
    rent: params.rent ? parseInt(params.rent, 10) : 0,
    yearBuilt: 0,
    status: 'FOR SALE',
    images: [] as string[],
    latitude: params.lat ? parseFloat(params.lat) : undefined,
    longitude: params.lng ? parseFloat(params.lng) : undefined,
  };

  // Navigation handlers
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleAnalyze = useCallback(() => {
    const addressParam = property.address;
    router.push({
      pathname: '/verdict-iq/[address]',
      params: {
        address: addressParam,
        price: String(property.price),
        beds: String(property.beds),
        baths: String(property.baths),
        sqft: String(property.sqft),
        city: property.city,
        state: property.state,
        zip: property.zip,
      },
    } as any);
  }, [router, property]);

  const handleSave = useCallback(() => {
    console.log('Save property');
    // TODO: Implement save functionality
  }, []);

  const handleShare = useCallback(() => {
    console.log('Share property');
    // TODO: Implement share functionality
  }, []);

  const handleStrategyChange = useCallback((strategy: string) => {
    console.log('Strategy changed to:', strategy);
  }, []);

  const handleNavChange = useCallback((navId: string) => {
    const addressParam = property.address;
    switch (navId) {
      case 'search':
        router.push('/(tabs)/search');
        break;
      case 'home':
        // Stay on property details (home icon navigates here)
        break;
      case 'analysis':
        router.push({
          pathname: '/strategy-iq/[address]',
          params: {
            address: addressParam,
            price: String(property.price),
            beds: String(property.beds),
            baths: String(property.baths),
            sqft: String(property.sqft),
          },
        } as any);
        break;
      case 'deals':
        router.push({
          pathname: '/deal-maker/[address]',
          params: { address: addressParam },
        } as any);
        break;
      default:
        console.log('Navigate to:', navId);
    }
  }, [router, property]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PropertyDetailsScreen
        property={property}
        onBack={handleBack}
        onAnalyze={handleAnalyze}
        onSave={handleSave}
        onShare={handleShare}
        onStrategyChange={handleStrategyChange}
        onNavChange={handleNavChange}
        isDark={isDark}
      />
    </>
  );
}
