/**
 * Analysis IQ Screen
 * 
 * New analysis page with CompactHeader, Profit Quality, and Metrics Accordions.
 * Route: /analysis-iq/[address]
 * 
 * Fetches real data from the analysis API.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
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
import { usePropertyAnalysis, IQVerdictResponse } from '../../hooks/usePropertyAnalysis';
import { PropertyData as AnalyticsPropertyData } from '../../components/analytics/redesign/types';

// =============================================================================
// TYPES from analytics components
// =============================================================================

type MetricGrade = 'A' | 'B' | 'C' | 'D';
type MetricGradeLabel = 'STRONG' | 'MODERATE' | 'POTENTIAL' | 'WEAK';

// =============================================================================
// HELPER FUNCTIONS - Transform API data to component props
// =============================================================================

function scoreToGrade(score: number): MetricGrade {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

function scoreToGradeLabel(score: number): MetricGradeLabel {
  if (score >= 80) return 'STRONG';
  if (score >= 60) return 'MODERATE';
  if (score >= 40) return 'POTENTIAL';
  return 'WEAK';
}

function scoreToSublabel(score: number): string {
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Acceptable';
  if (score >= 40) return 'Fair';
  return 'Weak';
}

function buildProfitQualityData(raw: IQVerdictResponse | null, dealScore: number): ProfitQualityData {
  if (!raw) {
    return {
      score: 0,
      strategyFit: 'Fair',
      riskLevel: 'Moderate',
      protection: 'Fair',
      insight: 'Fetching property analysis...',
      factors: [],
    };
  }

  const returnFactors = raw.returnFactors;
  const opportunityFactors = raw.opportunityFactors;
  
  // Map to allowed values: 'Poor' | 'Fair' | 'Good Fit' | 'Great'
  const strategyFit: ProfitQualityData['strategyFit'] = dealScore >= 70 ? 'Good Fit' : (dealScore >= 50 ? 'Fair' : 'Poor');
  // Map to allowed values: 'High' | 'Moderate' | 'Low'
  const riskLevel: ProfitQualityData['riskLevel'] = (returnFactors?.dscr ?? 1) >= 1.25 ? 'Low' : ((returnFactors?.dscr ?? 1) >= 1.0 ? 'Moderate' : 'High');
  // Map to allowed values: 'Poor' | 'Fair' | 'Good'
  const protection: ProfitQualityData['protection'] = opportunityFactors?.dealGap && opportunityFactors.dealGap > 5 ? 'Good' : 'Fair';
  
  const factors: ProfitQualityData['factors'] = [];
  
  if (returnFactors?.capRate) {
    const capRatePct = returnFactors.capRate * 100;
    const diff = capRatePct - 5.5; // vs average 5.5%
    factors.push({
      label: 'Cap Rate vs Market',
      value: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`,
      isPositive: diff > 0,
    });
  }
  
  if (raw.strategies[0]?.monthlyCashFlow !== undefined && raw.strategies[0].monthlyCashFlow !== null) {
    const cf = raw.strategies[0].monthlyCashFlow;
    factors.push({
      label: 'Cash Flow Margin',
      value: `$${Math.round(cf)}/mo`,
      isPositive: cf > 0,
    });
  }
  
  if (returnFactors?.dscr) {
    factors.push({
      label: 'DSCR Threshold',
      value: `${returnFactors.dscr.toFixed(2)}x`,
      isPositive: returnFactors.dscr >= 1.25,
    });
  }
  
  if (raw.discountPercent) {
    factors.push({
      label: 'Price vs Comps',
      value: `-${raw.discountPercent.toFixed(0)}%`,
      isPositive: raw.discountPercent > 0,
    });
  }

  return {
    score: dealScore,
    strategyFit,
    riskLevel,
    protection,
    insight: raw.verdictDescription || 'Analysis complete.',
    factors,
  };
}

function buildReturnMetrics(raw: IQVerdictResponse | null): MetricItem[] {
  if (!raw || !raw.returnFactors) {
    return [
      { label: 'Cap Rate', sublabel: 'Loading...', value: '—', grade: 'C', gradeLabel: 'POTENTIAL' },
      { label: 'Cash-on-Cash', sublabel: 'Loading...', value: '—', grade: 'C', gradeLabel: 'POTENTIAL' },
      { label: 'Equity Capture', sublabel: 'Loading...', value: '—', grade: 'C', gradeLabel: 'POTENTIAL' },
    ];
  }

  const { capRate, cashOnCash } = raw.returnFactors;
  
  const capRateScore = capRate ? capRate * 100 * 10 : 0;
  const cocScore = cashOnCash ? cashOnCash * 100 * 10 : 0;
  const equityScore = raw.discountPercent ? raw.discountPercent * 10 : 50;

  return [
    { 
      label: 'Cap Rate', 
      sublabel: scoreToSublabel(capRateScore), 
      value: capRate ? `${(capRate * 100).toFixed(1)}%` : '—', 
      grade: scoreToGrade(capRateScore), 
      gradeLabel: scoreToGradeLabel(capRateScore) 
    },
    { 
      label: 'Cash-on-Cash', 
      sublabel: scoreToSublabel(cocScore), 
      value: cashOnCash ? `${(cashOnCash * 100).toFixed(1)}%` : '—', 
      grade: scoreToGrade(cocScore), 
      gradeLabel: scoreToGradeLabel(cocScore) 
    },
    { 
      label: 'Equity Capture', 
      sublabel: scoreToSublabel(equityScore), 
      value: `${raw.discountPercent?.toFixed(0) ?? '—'}%`, 
      grade: scoreToGrade(equityScore), 
      gradeLabel: scoreToGradeLabel(equityScore) 
    },
  ];
}

function buildCashFlowRiskMetrics(raw: IQVerdictResponse | null): MetricItem[] {
  if (!raw || !raw.returnFactors) {
    return [
      { label: 'Cash Flow Yield', sublabel: 'Loading...', value: '—', grade: 'C', gradeLabel: 'POTENTIAL' },
      { label: 'DSCR', sublabel: 'Loading...', value: '—', grade: 'C', gradeLabel: 'POTENTIAL' },
    ];
  }

  const { cashOnCash, dscr } = raw.returnFactors;
  
  const cfYieldScore = cashOnCash ? cashOnCash * 100 * 10 : 0;
  const dscrScore = dscr ? Math.min(100, (dscr - 0.8) * 50) : 0;

  return [
    { 
      label: 'Cash Flow Yield', 
      sublabel: scoreToSublabel(cfYieldScore), 
      value: cashOnCash ? `${(cashOnCash * 100).toFixed(1)}%` : '—', 
      grade: scoreToGrade(cfYieldScore), 
      gradeLabel: scoreToGradeLabel(cfYieldScore) 
    },
    { 
      label: 'DSCR', 
      sublabel: dscr && dscr >= 1.25 ? 'Strong' : (dscr && dscr >= 1.0 ? 'Tight' : 'Risk'), 
      value: dscr ? dscr.toFixed(2) : '—', 
      grade: scoreToGrade(dscrScore), 
      gradeLabel: scoreToGradeLabel(dscrScore) 
    },
  ];
}

function buildAtAGlanceMetrics(raw: IQVerdictResponse | null, projections: any): MetricItem[] {
  if (!raw) {
    return [
      { label: 'Monthly Cash Flow', sublabel: 'Loading...', value: '—', grade: 'C', gradeLabel: 'POTENTIAL' },
      { label: 'Annual ROI', sublabel: 'Loading...', value: '—', grade: 'C', gradeLabel: 'POTENTIAL' },
      { label: '5-Year Equity', sublabel: 'Loading...', value: '—', grade: 'C', gradeLabel: 'POTENTIAL' },
    ];
  }

  const monthlyCF = raw.strategies[0]?.monthlyCashFlow ?? 0;
  const annualRoi = raw.returnFactors?.annualRoi ?? 0;
  const fiveYearEquity = projections?.equityBuilt ?? (raw.purchasePrice * 0.3);
  
  const cfScore = monthlyCF > 200 ? 80 : (monthlyCF > 0 ? 60 : 40);
  const roiScore = Math.min(80, annualRoi * 100 * 5);
  const equityScore = 75; // Default good score for equity projection

  return [
    { 
      label: 'Monthly Cash Flow', 
      sublabel: 'Net Operating', 
      value: `$${Math.round(monthlyCF)}`, 
      grade: scoreToGrade(cfScore), 
      gradeLabel: scoreToGradeLabel(cfScore) 
    },
    { 
      label: 'Annual ROI', 
      sublabel: 'Year 1', 
      value: `${(annualRoi * 100).toFixed(1)}%`, 
      grade: scoreToGrade(roiScore), 
      gradeLabel: scoreToGradeLabel(roiScore) 
    },
    { 
      label: '5-Year Equity', 
      sublabel: 'Projected', 
      value: `$${Math.round(fiveYearEquity / 1000)}K`, 
      grade: scoreToGrade(equityScore), 
      gradeLabel: scoreToGradeLabel(equityScore) 
    },
  ];
}

export default function AnalysisIQScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useTheme();
  const { 
    address,
    price,
    beds,
    baths,
    sqft,
    rent,
    city,
    state,
    zip,
    status,
    image,
  } = useLocalSearchParams<{ 
    address: string;
    price?: string;
    beds?: string;
    baths?: string;
    sqft?: string;
    rent?: string;
    city?: string;
    state?: string;
    zip?: string;
    status?: string;
    image?: string;
  }>();
  
  const [currentStrategy, setCurrentStrategy] = useState('Long-term');
  const [activeNav, setActiveNav] = useState<NavItemId>('analysis');
  
  const decodedAddress = decodeURIComponent(address || '');

  // Parse URL params for property data
  const listPrice = price ? parseFloat(price) : 350000;
  const bedroomCount = beds ? parseInt(beds, 10) : 3;
  const bathroomCount = baths ? parseFloat(baths) : 2;
  const sqftValue = sqft ? parseInt(sqft, 10) : 1500;
  const monthlyRent = rent ? parseFloat(rent) : Math.round(listPrice * 0.008);
  
  // Estimate taxes and insurance if not provided
  const propertyTaxes = Math.round(listPrice * 0.012);
  const insurance = Math.round(1500 + sqftValue * 3);

  // Build property data for API hook
  const analyticsPropertyData = useMemo((): AnalyticsPropertyData => ({
    address: decodedAddress || 'Unknown Address',
    city: city || 'Unknown',
    state: state || 'FL',
    zipCode: zip || '00000',
    listPrice,
    monthlyRent,
    propertyTaxes,
    insurance,
    bedrooms: bedroomCount,
    bathrooms: bathroomCount,
    sqft: sqftValue,
    arv: Math.round(listPrice * 1.2),
    averageDailyRate: 195,
    occupancyRate: 0.72,
    photos: image ? [image] : [],
    photoCount: 1,
  }), [decodedAddress, city, state, zip, listPrice, monthlyRent, propertyTaxes, insurance, bedroomCount, bathroomCount, sqftValue, image]);

  // Fetch real analysis data from API
  const analysisResult = usePropertyAnalysis(analyticsPropertyData);
  const { raw, dealScore, projections, isLoading, error } = analysisResult;

  // Build property data for header component
  const property: PropertyData = useMemo(() => ({
    address: decodedAddress || 'Unknown Address',
    city: city || 'Unknown',
    state: state || 'FL',
    zip: zip || '00000',
    beds: bedroomCount,
    baths: bathroomCount,
    sqft: sqftValue,
    price: listPrice,
    rent: monthlyRent,
    status: (status?.toUpperCase() as 'ACTIVE' | 'PENDING' | 'OFF-MARKET') || 'OFF-MARKET',
    image: image || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&h=150&fit=crop',
  }), [decodedAddress, city, state, zip, bedroomCount, bathroomCount, sqftValue, listPrice, monthlyRent, status, image]);

  // Build derived data from API response
  const profitQualityData = useMemo(() => buildProfitQualityData(raw, dealScore.score), [raw, dealScore.score]);
  const returnMetrics = useMemo(() => buildReturnMetrics(raw), [raw]);
  const cashFlowRiskMetrics = useMemo(() => buildCashFlowRiskMetrics(raw), [raw]);
  const atAGlanceMetrics = useMemo(() => buildAtAGlanceMetrics(raw, projections), [raw, projections]);

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
    const addressParam = property.address;
    switch (navId) {
      case 'search':
        router.push('/search');
        break;
      case 'home':
        router.push({
          pathname: '/property-details/[address]',
          params: {
            address: addressParam,
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
          params: { address: addressParam },
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
        address: property.address,
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

  // Loading state
  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.loadingContainer, { backgroundColor: bgColor }]}>
          <ActivityIndicator size="large" color="#0891B2" />
          <Text style={[styles.loadingText, { color: isDark ? '#fff' : '#07172e' }]}>
            Analyzing property...
          </Text>
        </View>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.loadingContainer, { backgroundColor: bgColor }]}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={[styles.errorText, { color: isDark ? '#fff' : '#07172e' }]}>
            Unable to analyze property
          </Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => analysisResult.refetch()}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

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
          {/* Profit Quality Card - Uses API data */}
          <ProfitQualityCard data={profitQualityData} isDark={isDark} />

          {/* Return Metrics Accordion - Uses API data */}
          <MetricsAccordion
            title="Return Metrics"
            icon="trending-up-outline"
            metrics={returnMetrics}
            defaultExpanded={true}
            isDark={isDark}
          />

          {/* Cash Flow & Risk Accordion - Uses API data */}
          <MetricsAccordion
            title="Cash Flow & Risk"
            icon="cash-outline"
            metrics={cashFlowRiskMetrics}
            defaultExpanded={true}
            isDark={isDark}
          />

          {/* At-a-Glance Accordion - Uses API data */}
          <MetricsAccordion
            title="At-a-Glance"
            icon="grid-outline"
            metrics={atAGlanceMetrics}
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0891B2',
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
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
