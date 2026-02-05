/**
 * PropertyAnalyticsScreen - Main analytics page with Deal Score and Strategy Selector
 * Route: /analytics/[address]
 * 
 * REDESIGNED: Now uses the new analytics components from redesign/
 * Property data is fetched from URL params passed by navigation.
 */

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';

// NEW: Redesigned analytics components
import { StrategyAnalyticsView, PropertyData, AnalysisProvider } from '../../components/analytics/redesign';
import { StrategyId } from '../../components/analytics/redesign/types';

export default function PropertyAnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { 
    address, 
    strategy,
    price,
    beds,
    baths,
    sqft,
    rent,
    adr, // average daily rate
    occupancy,
    tax,
    insurance: insuranceParam,
    arv: arvParam,
    city,
    state,
    zip,
    image,
  } = useLocalSearchParams<{ 
    address: string; 
    strategy?: StrategyId;
    price?: string;
    beds?: string;
    baths?: string;
    sqft?: string;
    rent?: string;
    adr?: string;
    occupancy?: string;
    tax?: string;
    insurance?: string;
    arv?: string;
    city?: string;
    state?: string;
    zip?: string;
    image?: string;
  }>();
  
  const decodedAddress = decodeURIComponent(address || '');

  // Parse URL params for property data with sensible defaults
  const listPrice = price ? parseFloat(price) : 350000;
  const bedroomCount = beds ? parseInt(beds, 10) : 3;
  const bathroomCount = baths ? parseFloat(baths) : 2;
  const sqftValue = sqft ? parseInt(sqft, 10) : 1500;
  
  // Income estimates
  const monthlyRent = rent ? parseFloat(rent) : Math.round(listPrice * 0.008);
  const averageDailyRate = adr ? parseFloat(adr) : 195;
  const occupancyRate = occupancy ? parseFloat(occupancy) : 0.72;
  
  // Expense estimates
  const propertyTaxes = tax ? parseFloat(tax) : Math.round(listPrice * 0.012);
  const insurance = insuranceParam ? parseFloat(insuranceParam) : Math.round(1500 + sqftValue * 3);
  
  // ARV estimate for BRRRR/Flip strategies
  const arv = arvParam ? parseFloat(arvParam) : Math.round(listPrice * 1.2);

  // Build property data from URL params
  const property = useMemo((): PropertyData => ({
    address: decodedAddress || 'Unknown Address',
    city: city || 'Unknown',
    state: state || 'FL',
    zipCode: zip || '00000',
    listPrice,
    monthlyRent,
    averageDailyRate,
    occupancyRate,
    propertyTaxes,
    insurance,
    bedrooms: bedroomCount,
    bathrooms: bathroomCount,
    sqft: sqftValue,
    arv,
    photos: image 
      ? [image] 
      : ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=400&fit=crop'],
    photoCount: 1,
  }), [
    decodedAddress, 
    city, 
    state, 
    zip, 
    listPrice, 
    monthlyRent, 
    averageDailyRate, 
    occupancyRate, 
    propertyTaxes, 
    insurance, 
    bedroomCount, 
    bathroomCount, 
    sqftValue, 
    arv, 
    image
  ]);

  // Navigation handlers
  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleSave = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: Implement save functionality
  }, []);

  const handleGenerateLOI = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Navigate to LOI generation
  }, []);

  const handleShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Implement share functionality
  }, []);

  // Theme colors
  const bgColor = isDark ? '#07172e' : '#f8fafc';
  const textColor = isDark ? '#fff' : '#07172e';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity 
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.05)' }]}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={20} color={textColor} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: textColor }]}>Property Analytics</Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.05)' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({
                  pathname: '/deal-maker/[address]',
                  params: {
                    address: decodedAddress,
                    listPrice: String(property.listPrice),
                    rent: String(property.monthlyRent),
                    tax: String(property.propertyTaxes),
                    insurance: String(property.insurance),
                  },
                });
              }}
            >
              <Ionicons name="calculator-outline" size={18} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.05)' }]}
            >
              <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content - New Redesigned View */}
        <AnalysisProvider property={property} initialStrategyId={strategy ?? null}>
          <StrategyAnalyticsView
            property={property}
            isDark={isDark}
            onBack={handleBack}
            onSave={handleSave}
            onGenerateLOI={handleGenerateLOI}
            onShare={handleShare}
            initialStrategyId={strategy ?? null}
          />
        </AnalysisProvider>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
