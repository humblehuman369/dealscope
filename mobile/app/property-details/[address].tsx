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

  // Build property object from route params
  const property = {
    address: decodedAddress || 'Unknown Address',
    city: params.city || 'Boca Raton',
    state: params.state || 'FL',
    zip: params.zip || '33486',
    price: params.price ? parseInt(params.price, 10) : 821000,
    beds: params.beds ? parseInt(params.beds, 10) : 4,
    baths: params.baths ? parseFloat(params.baths) : 2,
    sqft: params.sqft ? parseInt(params.sqft, 10) : 1722,
    rent: params.rent ? parseInt(params.rent, 10) : 5555,
    yearBuilt: 1969,
    status: 'FOR SALE',
    images: Array(12).fill('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop&q=80'),
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
