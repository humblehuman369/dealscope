/**
 * PropertyAnalyticsScreen - Main analytics page with Deal Score
 * Route: /analytics/[address]
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';

// Analytics components
import {
  AnalyticsInputs,
  DEFAULT_INPUTS,
  SLIDER_GROUPS,
  calculateMetrics,
  calculateDealScore,
  generateInsights,
  projectTenYears,
  formatCurrency,
} from '../../components/analytics';

import { DealScoreCard } from '../../components/analytics/DealScoreCard';
import { MetricsGrid } from '../../components/analytics/MetricsGrid';
import { SmartInsights } from '../../components/analytics/SmartInsights';
import { TuneSliders } from '../../components/analytics/TuneSliders';
import { BestStrategyCard, STRATEGIES } from '../../components/analytics/BestStrategyCard';
import { PropertyMiniCard } from '../../components/analytics/PropertyMiniCard';

export default function PropertyAnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { address } = useLocalSearchParams<{ address: string }>();
  
  const decodedAddress = decodeURIComponent(address || '');

  // Mock property data - in real app, fetch from API
  const property = useMemo(() => ({
    address: decodedAddress || '3742 Old Lighthouse Cir',
    city: 'Jupiter',
    state: 'FL',
    price: 617670,
  }), [decodedAddress]);

  // Analytics inputs state
  const [inputs, setInputs] = useState<AnalyticsInputs>({
    ...DEFAULT_INPUTS,
    purchasePrice: property.price,
    monthlyRent: Math.round(property.price * 0.006), // Rough rent estimate
  });

  // Calculate metrics
  const metrics = useMemo(() => calculateMetrics(inputs), [inputs]);
  const dealScore = useMemo(() => calculateDealScore(metrics), [metrics]);
  const insights = useMemo(() => generateInsights(metrics, inputs), [metrics, inputs]);

  // Handle input changes
  const handleInputChange = useCallback((key: keyof AnalyticsInputs, value: number) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  }, []);

  // Navigate to breakdown
  const handleViewBreakdown = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/analytics/breakdown/[address]',
      params: { address: encodeURIComponent(decodedAddress) },
    });
  }, [router, decodedAddress]);

  // Theme colors
  const bgColor = isDark ? '#07172e' : '#f8fafc';
  const textColor = isDark ? '#fff' : '#07172e';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity 
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.05)' }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={textColor} />
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.05)' }]}>
              <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.05)' }]}>
              <Text style={{ fontSize: 16 }}>🔖</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Property Mini Card */}
          <View style={styles.section}>
            <PropertyMiniCard property={property} isDark={isDark} />
          </View>

          {/* Deal Score Card */}
          <View style={styles.section}>
            <DealScoreCard score={dealScore} isDark={isDark} />
          </View>

          {/* Metrics Grid */}
          <View style={styles.section}>
            <MetricsGrid metrics={metrics} isDark={isDark} />
          </View>

          {/* Smart Insights */}
          <View style={styles.section}>
            <SmartInsights insights={insights} isDark={isDark} />
          </View>

          {/* Best Strategy */}
          <View style={styles.section}>
            <BestStrategyCard
              strategy={{
                ...STRATEGIES.longTermRental,
                roi: metrics.cashOnCash,
              }}
              isDark={isDark}
            />
          </View>

          {/* Tune Sliders */}
          <View style={styles.section}>
            <TuneSliders
              groups={SLIDER_GROUPS}
              inputs={inputs}
              onInputChange={handleInputChange}
              isDark={isDark}
            />
          </View>

          {/* CTA Button */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleViewBreakdown}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isDark ? ['#0097a7', '#4dd0e1'] : ['#007ea7', '#0097a7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaIcon}>📊</Text>
                <Text style={styles.ctaText}>View Full Breakdown</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 14,
  },
  ctaButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  ctaIcon: {
    fontSize: 16,
  },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

