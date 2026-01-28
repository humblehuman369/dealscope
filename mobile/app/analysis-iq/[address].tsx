/**
 * Analysis IQ Screen
 * 
 * New analysis page with CompactHeader, Profit Quality, and Metrics Accordions.
 * Route: /analysis-iq/[address]
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../context/ThemeContext';
import { CompactHeader, PropertyData, NavItemId } from '../../components/header';
import { 
  ProfitQualityCard, 
  ProfitQualityData, 
  MetricsAccordion, 
  MetricItem 
} from '../../components/analytics';

// Mock data
const MOCK_PROPERTY: PropertyData = {
  address: '1451 Sw 10th St',
  city: 'Boca Raton',
  state: 'FL',
  zip: '33486',
  beds: 4,
  baths: 2,
  sqft: 1722,
  price: 821000,
  rent: 3200,
  status: 'OFF-MARKET',
  image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&h=150&fit=crop',
};

const MOCK_PROFIT_QUALITY: ProfitQualityData = {
  score: 78,
  strategyFit: 'Good Fit',
  riskLevel: 'Low',
  protection: 'Fair',
  insight: 'This deal shows strong fundamentals with healthy returns.',
  factors: [
    { label: 'Cap Rate vs Market', value: '+0.8%', isPositive: true },
    { label: 'Cash Flow Margin', value: '$285/mo', isPositive: true },
    { label: 'DSCR Threshold', value: '1.05x', isPositive: false },
    { label: 'Price vs Comps', value: '-4%', isPositive: true },
  ],
};

const MOCK_RETURN_METRICS: MetricItem[] = [
  { label: 'Cap Rate', sublabel: 'Acceptable', value: '6.1%', grade: 'B', gradeLabel: 'MODERATE' },
  { label: 'Cash-on-Cash', sublabel: 'Weak', value: '1.1%', grade: 'D', gradeLabel: 'WEAK' },
  { label: 'Equity Capture', sublabel: 'Fair Value', value: '6%', grade: 'C', gradeLabel: 'POTENTIAL' },
];

const MOCK_CASH_FLOW_RISK: MetricItem[] = [
  { label: 'Cash Flow Yield', sublabel: 'Weak', value: '1.1%', grade: 'D', gradeLabel: 'WEAK' },
  { label: 'DSCR', sublabel: 'Tight', value: '1.05', grade: 'C', gradeLabel: 'POTENTIAL' },
  { label: 'Expense Ratio', sublabel: 'Efficient', value: '27%', grade: 'A', gradeLabel: 'STRONG' },
  { label: 'Breakeven Occ.', sublabel: 'Tight', value: '95%', grade: 'C', gradeLabel: 'POTENTIAL' },
];

const MOCK_AT_A_GLANCE: MetricItem[] = [
  { label: 'Monthly Cash Flow', sublabel: 'Net Operating', value: '$285', grade: 'B', gradeLabel: 'MODERATE' },
  { label: 'Annual ROI', sublabel: 'Year 1', value: '8.2%', grade: 'B', gradeLabel: 'MODERATE' },
  { label: '5-Year Equity', sublabel: 'Projected', value: '$124K', grade: 'A', gradeLabel: 'STRONG' },
];

export default function AnalysisIQScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useTheme();
  const { address } = useLocalSearchParams<{ address: string }>();
  
  const [currentStrategy, setCurrentStrategy] = useState('Long-term');
  const [activeNav, setActiveNav] = useState<NavItemId>('analysis');
  
  const decodedAddress = decodeURIComponent(address || '');

  // Update property with decoded address if available
  const property: PropertyData = {
    ...MOCK_PROPERTY,
    ...(decodedAddress && { address: decodedAddress }),
  };

  // Handlers
  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleStrategyChange = useCallback((strategy: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStrategy(strategy);
  }, []);

  const handleNavChange = useCallback((navId: NavItemId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveNav(navId);
    
    // Navigate based on nav item
    const encodedAddress = encodeURIComponent(property.address);
    switch (navId) {
      case 'search':
        router.push('/search');
        break;
      case 'home':
        router.push({
          pathname: '/property-details/[address]',
          params: {
            address: encodedAddress,
            price: String(property.price),
            beds: String(property.beds),
            baths: String(property.baths),
            sqft: String(property.sqft),
          },
        });
        break;
      case 'analysis':
        // Already on analysis page
        break;
      case 'deals':
        router.push({
          pathname: '/deal-maker/[address]',
          params: { address: encodedAddress },
        });
        break;
      // Other nav items to be connected later
      default:
        break;
    }
  }, [router, property.address]);

  const handleContinueToAnalysis = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to full analytics view with all strategy details
    const strategyMap: Record<string, string> = {
      'Long-term': 'ltr',
      'Short-term': 'str',
      'BRRRR': 'brrrr',
      'Fix & Flip': 'flip',
      'House Hack': 'house_hack',
      'Wholesale': 'wholesale',
    };
    router.push({
      pathname: '/analytics/[address]',
      params: { 
        address: encodeURIComponent(property.address),
        strategy: strategyMap[currentStrategy] || 'ltr',
      },
    });
  }, [router, property.address, currentStrategy]);

  const handleExportPDF = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: Implement PDF export
  }, []);

  // Theme colors
  const bgColor = isDark ? '#07172e' : '#F1F5F9';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        {/* Compact Header */}
        <CompactHeader
          property={property}
          pageTitle="ANALYSIS"
          pageTitleAccent="IQ"
          currentStrategy={currentStrategy}
          onStrategyChange={handleStrategyChange}
          onBack={handleBack}
          activeNav={activeNav}
          onNavChange={handleNavChange}
          onThemeToggle={toggleTheme}
        />

        {/* Scrollable Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Profit Quality Card */}
          <ProfitQualityCard data={MOCK_PROFIT_QUALITY} isDark={isDark} />

          {/* Return Metrics Accordion */}
          <MetricsAccordion
            title="Return Metrics"
            icon="trending-up-outline"
            metrics={MOCK_RETURN_METRICS}
            defaultExpanded={true}
            isDark={isDark}
          />

          {/* Cash Flow & Risk Accordion */}
          <MetricsAccordion
            title="Cash Flow & Risk"
            icon="cash-outline"
            metrics={MOCK_CASH_FLOW_RISK}
            defaultExpanded={true}
            isDark={isDark}
          />

          {/* At-a-Glance Accordion */}
          <MetricsAccordion
            title="At-a-Glance"
            icon="grid-outline"
            metrics={MOCK_AT_A_GLANCE}
            defaultExpanded={false}
            isDark={isDark}
            subtitle="Performance breakdown"
          />
        </ScrollView>

        {/* Bottom CTAs */}
        <View style={[styles.bottomCTAs, { paddingBottom: insets.bottom + 16 }]}>
          {/* Primary CTA */}
          <TouchableOpacity 
            style={styles.primaryCTABtn}
            onPress={handleContinueToAnalysis}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#0891B2', '#0e7490']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryCTAGradient}
            >
              <Text style={styles.primaryCTAText}>Continue to Analysis</Text>
              <Ionicons name="arrow-forward" size={18} color="white" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary CTA */}
          <TouchableOpacity 
            style={styles.secondaryCTABtn}
            onPress={handleExportPDF}
          >
            <Ionicons name="download-outline" size={16} color="#64748B" />
            <Text style={styles.secondaryCTAText}>Export PDF Report</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  bottomCTAs: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  primaryCTABtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  primaryCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  primaryCTAText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryCTABtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  secondaryCTAText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
});
