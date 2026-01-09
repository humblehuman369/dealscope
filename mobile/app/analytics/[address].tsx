/**
 * PropertyAnalyticsScreen - Main analytics page with Deal Score and Strategy Selector
 * Route: /analytics/[address]
 * 
 * REDESIGNED: Now uses the new analytics components from redesign/
 */

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';

// NEW: Redesigned analytics components
import { StrategyAnalyticsView, PropertyData } from '../../components/analytics/redesign';

export default function PropertyAnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { address } = useLocalSearchParams<{ address: string }>();
  
  const decodedAddress = decodeURIComponent(address || '');

  // Mock property data - in real app, fetch from API
  const property = useMemo((): PropertyData => ({
    address: decodedAddress || '953 Banyan Dr',
    city: 'Delray Beach',
    state: 'FL',
    zipCode: '33483',
    listPrice: 350000,
    monthlyRent: 2800,
    averageDailyRate: 195,
    occupancyRate: 0.72,
    propertyTaxes: 4200,
    insurance: 2100,
    bedrooms: 4,
    bathrooms: 2,
    sqft: 1850,
    arv: 425000,
    photos: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=400&fit=crop',
    ],
    photoCount: 24,
  }), [decodedAddress]);

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
            >
              <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content - New Redesigned View */}
        <StrategyAnalyticsView
          property={property}
          isDark={isDark}
          onBack={handleBack}
          onSave={handleSave}
          onGenerateLOI={handleGenerateLOI}
          onShare={handleShare}
        />
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
