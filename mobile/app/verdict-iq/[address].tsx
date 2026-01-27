/**
 * IQ Verdict Screen with CompactHeader
 * Route: /verdict-iq/[address]
 * 
 * Shows the IQ Verdict with ranked strategy recommendations
 * Uses the new CompactHeader design
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../context/ThemeContext';
import { CompactHeader, PropertyData, NavItemId } from '../../components/header';
import { colors } from '../../theme/colors';

// Types
interface IQStrategy {
  id: string;
  name: string;
  type?: string;
  metric: string;
  metricValue: number;
  score: number;
  badge: string | null;
}

// Helper functions
const getScoreColor = (score: number): string => {
  if (score >= 70) return colors.profit.main;
  if (score >= 50) return '#0891B2';
  if (score >= 30) return colors.warning.main;
  return colors.loss.main;
};

const getGradeFromScore = (score: number): { label: string; grade: string } => {
  if (score >= 85) return { label: 'STRONG', grade: 'A+' };
  if (score >= 70) return { label: 'GOOD', grade: 'A' };
  if (score >= 55) return { label: 'MODERATE', grade: 'B' };
  if (score >= 40) return { label: 'POTENTIAL', grade: 'C' };
  if (score >= 25) return { label: 'WEAK', grade: 'D' };
  return { label: 'POOR', grade: 'F' };
};

const getGradeColor = (grade: string): string => {
  if (grade.includes('A')) return colors.profit.main;
  if (grade.includes('B')) return '#0891B2';
  if (grade.includes('C')) return colors.warning.main;
  return colors.loss.main;
};

const formatPrice = (price: number): string => {
  return '$' + price.toLocaleString();
};

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

const MOCK_STRATEGIES: IQStrategy[] = [
  { id: 'long-term-rental', name: 'Long-Term Rental', type: 'Annual', metric: '8.2%', metricValue: 8.2, score: 78, badge: 'Best Match' },
  { id: 'short-term-rental', name: 'Short-Term Rental', type: 'Vacation', metric: '12.5%', metricValue: 12.5, score: 72, badge: 'Strong' },
  { id: 'brrrr', name: 'BRRRR', metric: '15.8%', metricValue: 15.8, score: 68, badge: null },
  { id: 'fix-and-flip', name: 'Fix & Flip', metric: '$52K', metricValue: 52000, score: 55, badge: null },
  { id: 'house-hack', name: 'House Hack', metric: '65%', metricValue: 65, score: 48, badge: null },
  { id: 'wholesale', name: 'Wholesale', metric: '$18K', metricValue: 18000, score: 35, badge: null },
];

export default function VerdictIQScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useTheme();
  const { address } = useLocalSearchParams<{ address: string }>();

  const [currentStrategy, setCurrentStrategy] = useState('Long-term');
  const [activeNav, setActiveNav] = useState<NavItemId>('analysis');
  const [showFactors, setShowFactors] = useState(false);

  const decodedAddress = decodeURIComponent(address || '');

  // Property data
  const property: PropertyData = {
    ...MOCK_PROPERTY,
    ...(decodedAddress && { address: decodedAddress }),
  };

  // Calculate prices
  const dealScore = 78;
  const breakevenPrice = property.price * 1.1;
  const buyPrice = breakevenPrice * 0.95;
  const wholesalePrice = breakevenPrice * 0.70;

  const topStrategy = MOCK_STRATEGIES[0];

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
        router.push('/(tabs)/home');
        break;
      case 'analysis':
        router.push({
          pathname: '/analysis-iq/[address]',
          params: { address: encodedAddress },
        });
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
    router.push({
      pathname: '/analysis-iq/[address]',
      params: { address: encodeURIComponent(property.address) },
    });
  }, [router, property.address]);

  const handleViewStrategy = useCallback((strategy: IQStrategy) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to Analysis IQ with the selected strategy
    router.push({
      pathname: '/analysis-iq/[address]',
      params: { 
        address: encodeURIComponent(property.address),
        strategy: strategy.id,
      },
    });
  }, [router, property.address]);

  const handleExportPDF = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: Implement PDF export
  }, []);

  // Theme colors
  const bgColor = isDark ? '#07172e' : '#F1F5F9';
  const cardBg = isDark ? '#0F1D32' : 'white';
  const textColor = isDark ? 'white' : '#0A1628';
  const mutedColor = isDark ? 'rgba(255,255,255,0.6)' : '#64748B';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.container, { backgroundColor: bgColor }]}>
        {/* Compact Header */}
        <CompactHeader
          property={property}
          pageTitle="VERDICT"
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
          {/* IQ Verdict Card */}
          <View style={[styles.verdictCard, { backgroundColor: cardBg }]}>
            {/* Header Row: Score + Prices */}
            <View style={styles.verdictHeader}>
              {/* Score Container */}
              <View style={styles.scoreContainer}>
                <Text style={[styles.verdictLabel, { color: '#0891B2' }]}>IQ VERDICT</Text>
                <View style={[styles.scoreRing, { borderColor: getScoreColor(dealScore) }]}>
                  <Text style={[styles.scoreValue, { color: getScoreColor(dealScore) }]}>
                    {dealScore}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.viewFactorsBtn}
                  onPress={() => setShowFactors(!showFactors)}
                >
                  <Text style={[styles.viewFactorsText, { color: mutedColor }]}>View Factors</Text>
                  <Ionicons
                    name={showFactors ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color={mutedColor}
                  />
                </TouchableOpacity>
              </View>

              {/* Prices Column */}
              <View style={styles.pricesContainer}>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: mutedColor }]}>Breakeven</Text>
                  <Text style={[styles.priceValue, { color: textColor }]}>
                    {formatPrice(Math.round(breakevenPrice))}
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabelHighlight, { color: '#0891B2' }]}>Buy Price</Text>
                  <Text style={[styles.priceValueHighlight, { color: '#0891B2' }]}>
                    {formatPrice(Math.round(buyPrice))}
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: mutedColor }]}>Wholesale</Text>
                  <Text style={[styles.priceValue, { color: textColor }]}>
                    {formatPrice(Math.round(wholesalePrice))}
                  </Text>
                </View>
              </View>
            </View>

            {/* Verdict Description */}
            <View style={styles.verdictDescContainer}>
              <Text style={[styles.verdictDesc, { color: mutedColor }]}>
                Excellent potential across multiple strategies. {topStrategy.name} shows best returns.
              </Text>
            </View>
          </View>

          {/* CTA Section */}
          <View style={styles.ctaSection}>
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
            <Text style={[styles.ctaDivider, { color: mutedColor }]}>or</Text>
            <Text style={[styles.ctaSubtitle, { color: textColor }]}>Select a Strategy</Text>
          </View>

          {/* Strategy List */}
          <View style={styles.strategySection}>
            {MOCK_STRATEGIES.map((strategy, index) => {
              const gradeDisplay = getGradeFromScore(strategy.score);
              const isTopPick = index === 0 && strategy.score >= 70;

              return (
                <TouchableOpacity
                  key={strategy.id}
                  style={[
                    styles.strategyCard,
                    { backgroundColor: cardBg },
                    isTopPick && styles.strategyCardTopPick,
                  ]}
                  onPress={() => handleViewStrategy(strategy)}
                  activeOpacity={0.7}
                >
                  <View style={styles.strategyContent}>
                    <View style={styles.strategyInfo}>
                      <Text style={[styles.strategyName, { color: textColor }]}>
                        {strategy.name}
                      </Text>
                      {strategy.type && (
                        <Text style={[styles.strategyType, { color: mutedColor }]}>
                          {strategy.type}
                        </Text>
                      )}
                      {strategy.badge && (
                        <View style={[
                          styles.strategyBadge,
                          {
                            backgroundColor: strategy.badge === 'Best Match'
                              ? `${colors.profit.main}20`
                              : `${colors.primary[500]}20`
                          }
                        ]}>
                          <Text style={[
                            styles.strategyBadgeText,
                            {
                              color: strategy.badge === 'Best Match'
                                ? colors.profit.main
                                : colors.primary[500]
                            }
                          ]}>
                            {strategy.badge}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.strategyMetrics}>
                      <Text style={[styles.strategyReturn, { color: getScoreColor(strategy.score) }]}>
                        {strategy.metric}
                      </Text>
                      <Text style={[styles.strategyGrade, { color: getGradeColor(gradeDisplay.grade) }]}>
                        {gradeDisplay.label} {gradeDisplay.grade}
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Export Link */}
          <TouchableOpacity style={styles.exportLink} onPress={handleExportPDF}>
            <Ionicons name="download-outline" size={18} color={mutedColor} />
            <Text style={[styles.exportLinkText, { color: mutedColor }]}>Export PDF Report</Text>
          </TouchableOpacity>
        </ScrollView>
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
    padding: 16,
  },

  // Verdict Card
  verdictCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  verdictHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  scoreContainer: {
    flex: 1,
    alignItems: 'center',
  },
  verdictLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  scoreRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  viewFactorsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewFactorsText: {
    fontSize: 12,
  },
  pricesContainer: {
    flex: 1.5,
    justifyContent: 'center',
    gap: 10,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 13,
  },
  priceLabelHighlight: {
    fontSize: 13,
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  priceValueHighlight: {
    fontSize: 16,
    fontWeight: '700',
  },
  verdictDescContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
  },
  verdictDesc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  // CTA Section
  ctaSection: {
    marginBottom: 20,
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
  ctaDivider: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  ctaSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },

  // Strategy Cards
  strategySection: {
    gap: 8,
    marginBottom: 16,
  },
  strategyCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  strategyCardTopPick: {
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  strategyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  strategyInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  strategyName: {
    fontSize: 15,
    fontWeight: '600',
  },
  strategyType: {
    fontSize: 12,
  },
  strategyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  strategyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  strategyMetrics: {
    alignItems: 'flex-end',
  },
  strategyReturn: {
    fontSize: 16,
    fontWeight: '700',
  },
  strategyGrade: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Export Link
  exportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  exportLinkText: {
    fontSize: 14,
  },
});
