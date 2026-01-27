/**
 * IQVerdictScreen - Redesigned IQ Verdict page for Mobile
 * Fully responsive implementation with dynamic font sizes (v2)
 * 
 * Design specs:
 * - Responsive font scaling based on device screen size
 * - Dark property header banner
 * - Background: #F1F5F9
 * - Font: Inter / System
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  PixelRatio,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  IQ_COLORS,
  IQProperty,
  IQAnalysisResult,
  IQStrategy,
  formatPrice,
} from './types';
import { IQButton } from './IQButton';

// =============================================================================
// RESPONSIVE SCALING - Dynamic font sizes based on screen dimensions
// =============================================================================

// Base design dimensions (iPhone 14 Pro)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

// Responsive scaling hook that updates on dimension changes (e.g., rotation)
function useResponsiveScaling() {
  const { width, height } = useWindowDimensions();
  
  return useMemo(() => {
    const widthScale = width / BASE_WIDTH;
    const heightScale = height / BASE_HEIGHT;
    const scale = Math.min(widthScale, heightScale);
    
    // Responsive size function - scales with screen size
    const rs = (size: number): number => {
      const newSize = size * scale;
      return Math.round(PixelRatio.roundToNearestPixel(newSize));
    };

    // Responsive font size - slightly more conservative scaling for readability
    const rf = (size: number): number => {
      const newSize = size * Math.min(scale, 1.15); // Cap scaling at 115% for readability
      return Math.round(PixelRatio.roundToNearestPixel(newSize));
    };

    // Moderate scale for spacing (less aggressive than font scaling)
    const rsp = (size: number): number => {
      const newSize = size * Math.min(scale, 1.1);
      return Math.round(PixelRatio.roundToNearestPixel(newSize));
    };
    
    return { rs, rf, rsp, scale };
  }, [width, height]);
}

// Static versions for StyleSheet (uses initial dimensions, acceptable for base styles)
const staticRs = (size: number): number => Math.round(size);
const staticRsp = (size: number): number => Math.round(size);

// =============================================================================
// BRAND COLORS - From design files
// =============================================================================
const COLORS = {
  navy: '#0A1628',
  teal: '#0891B2',
  tealLight: '#06B6D4',
  cyan: '#00D4FF',
  rose: '#E11D48',
  warning: '#F59E0B',
  green: '#10B981',
  surface50: '#F8FAFC',
  surface100: '#F1F5F9',
  surface200: '#E2E8F0',
  surface300: '#CBD5E1',
  surface400: '#94A3B8',
  surface500: '#64748B',
  surface600: '#475569',
  surface700: '#334155',
  white: '#FFFFFF',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
const getReturnColor = (value: number): string => {
  if (value >= 50) return COLORS.green;
  if (value > 0) return COLORS.teal;
  return COLORS.rose;
};

const getGradeColor = (grade: string): string => {
  if (grade.includes('A')) return COLORS.green;
  if (grade.includes('B')) return COLORS.teal;
  if (grade.includes('C')) return COLORS.warning;
  return COLORS.rose;
};

const getScoreColor = (score: number): string => {
  if (score >= 70) return COLORS.green;
  if (score >= 50) return COLORS.teal;
  if (score >= 30) return COLORS.warning;
  return COLORS.rose;
};

const scoreToGradeLabel = (score: number): { label: string; grade: string } => {
  if (score >= 85) return { label: 'STRONG', grade: 'A+' };
  if (score >= 70) return { label: 'GOOD', grade: 'A' };
  if (score >= 55) return { label: 'MODERATE', grade: 'B' };
  if (score >= 40) return { label: 'POTENTIAL', grade: 'C' };
  if (score >= 25) return { label: 'WEAK', grade: 'D' };
  return { label: 'POOR', grade: 'F' };
};

// =============================================================================
// PROPS
// =============================================================================
interface IQVerdictScreenProps {
  property: IQProperty;
  analysis: IQAnalysisResult;
  onBack: () => void;
  onViewStrategy: (strategy: IQStrategy) => void;
  onCompareAll: () => void;
  isDark?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================
export function IQVerdictScreen({
  property,
  analysis,
  onBack,
  onViewStrategy,
  onCompareAll,
  isDark = false,
}: IQVerdictScreenProps) {
  // Use dynamic responsive scaling that updates on dimension changes
  const { rs, rf, rsp } = useResponsiveScaling();
  
  const [showFactors, setShowFactors] = useState(false);
  const topStrategy = analysis.strategies.reduce((best, s) => s.score > best.score ? s : best, analysis.strategies[0]);

  const handleViewStrategy = useCallback(
    (strategy: IQStrategy) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onViewStrategy(strategy);
    },
    [onViewStrategy]
  );

  const handleContinue = useCallback(() => {
    handleViewStrategy(topStrategy);
  }, [handleViewStrategy, topStrategy]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  }, [onBack]);

  // Build full address
  const fullAddress = [
    property.address,
    property.city,
    [property.state, property.zip].filter(Boolean).join(' ')
  ].filter(Boolean).join(', ');

  // Calculate prices
  const breakevenPrice = property.price * 1.1;
  const buyPrice = breakevenPrice * 0.95;
  const wholesalePrice = breakevenPrice * 0.70;
  const estValue = property.price;

  // Dynamic sizes for score ring
  const scoreRingSize = rs(80);
  const scoreRingBorder = rs(4);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={rs(18)} color={COLORS.surface400} />
          <Text style={[styles.backText, { fontSize: rf(13) }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.logo, { fontSize: rf(18) }]}>
          <Text style={styles.logoInvest}>Invest</Text>
          <Text style={styles.logoIQ}>IQ</Text>
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Property Card - Dark Header Style */}
        <View style={[styles.propertyCard, { paddingHorizontal: rsp(20), paddingTop: rsp(16), paddingBottom: rsp(20) }]}>
          <View style={[styles.propertyRow, { gap: rsp(16) }]}>
            {/* Left: Property Image */}
            <View style={[styles.propertyImageContainer, { width: rs(88), height: rs(88), borderRadius: rs(12), borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }]}>
              {property.imageUrl ? (
                <Image 
                  source={{ uri: property.imageUrl }} 
                  style={{ width: rs(88), height: rs(88), borderRadius: rs(10) }}
                />
              ) : (
                <View style={styles.placeholderContent}>
                  <Ionicons name="home" size={rs(24)} color={COLORS.cyan} />
                  <Text style={[styles.placeholderText, { fontSize: rf(10) }]}>HOUSE</Text>
                  <Text style={[styles.placeholderText, { fontSize: rf(10) }]}>PHOTO</Text>
                </View>
              )}
            </View>
            
            {/* Middle: Address & Details */}
            <View style={styles.propertyMiddle}>
              <Text style={[styles.propertyAddressMain, { fontSize: rf(18) }]} numberOfLines={1}>
                {property.address}
              </Text>
              <Text style={[styles.propertyCity, { fontSize: rf(15), marginBottom: rsp(8) }]} numberOfLines={1}>
                {[property.city, [property.state, property.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
              </Text>
              <Text style={[styles.propertyDetailsWhite, { fontSize: rf(13) }]}>
                {property.beds} bd · {Math.round(property.baths * 10) / 10} ba · {property.sqft?.toLocaleString() || '—'} sqft
              </Text>
            </View>
            
            {/* Right: Est. Value & Badge */}
            <View style={styles.propertyRight}>
              <View style={styles.propertyValueRight}>
                <Text style={[styles.estValue, { fontSize: rf(20) }]}>{formatPrice(estValue)}</Text>
                <Text style={[styles.estLabel, { fontSize: rf(11) }]}>Est. Value</Text>
              </View>
              <Text style={[styles.offMarketText, { fontSize: rf(10) }]}>OFF-MARKET</Text>
            </View>
          </View>
        </View>

        {/* Content Area with padding */}
        <View style={[styles.contentArea, { padding: rsp(16) }]}>
          {/* IQ Verdict Card */}
          <View style={[styles.verdictCard, { padding: rsp(24), marginBottom: rsp(16) }]}>
            {/* Verdict Header - Score LEFT, Prices RIGHT */}
            <View style={[styles.verdictHeader, { gap: rsp(16), marginBottom: rsp(20) }]}>
              {/* Score Container */}
              <View style={styles.scoreContainer}>
                <Text style={[styles.verdictLabel, { fontSize: rf(10), marginBottom: rsp(8) }]}>IQ VERDICT</Text>
                <View style={[
                  styles.scoreRing, 
                  { 
                    width: scoreRingSize, 
                    height: scoreRingSize, 
                    borderRadius: Math.round(scoreRingSize / 2),
                    borderWidth: scoreRingBorder,
                    borderColor: getScoreColor(analysis.dealScore), 
                    backgroundColor: `${getScoreColor(analysis.dealScore)}14`,
                    marginBottom: rsp(8),
                  }
                ]}>
                  <Text style={[styles.scoreValue, { fontSize: rf(28), color: getScoreColor(analysis.dealScore) }]}>
                    {analysis.dealScore}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowFactors(!showFactors)}
                  style={styles.viewFactors}
                >
                  <Text style={[styles.viewFactorsText, { fontSize: rf(12) }]}>View Factors</Text>
                  <Ionicons 
                    name={showFactors ? "chevron-up" : "chevron-down"} 
                    size={rs(12)} 
                    color={COLORS.surface400} 
                  />
                </TouchableOpacity>
              </View>

              {/* Prices */}
              <View style={[styles.verdictPrices, { gap: rsp(12) }]}>
                {/* Breakeven */}
                <View style={[styles.priceRow, { gap: rsp(16) }]}>
                  <Text style={[styles.priceLabel, { fontSize: rf(13) }]}>Breakeven</Text>
                  <Text style={[styles.priceValue, { fontSize: rf(16) }]}>{formatPrice(Math.round(breakevenPrice))}</Text>
                </View>

                {/* Buy Price - Highlighted */}
                <View style={[styles.priceRow, { gap: rsp(16) }]}>
                  <Text style={[styles.priceLabel, styles.priceLabelHighlight, { fontSize: rf(13) }]}>Buy Price</Text>
                  <Text style={[styles.priceValue, styles.priceValueHighlight, { fontSize: rf(16) }]}>{formatPrice(Math.round(buyPrice))}</Text>
                </View>

                {/* Wholesale */}
                <View style={[styles.priceRow, { gap: rsp(16) }]}>
                  <Text style={[styles.priceLabel, { fontSize: rf(13) }]}>Wholesale</Text>
                  <Text style={[styles.priceValue, { fontSize: rf(16) }]}>{formatPrice(Math.round(wholesalePrice))}</Text>
                </View>
              </View>
            </View>

            {/* Verdict Description */}
            <View style={[styles.verdictDescriptionContainer, { paddingTop: rsp(16) }]}>
              <Text style={[styles.verdictDescription, { fontSize: rf(14), lineHeight: rf(22) }]}>
                {analysis.verdictDescription || 'Excellent potential across multiple strategies.'}
              </Text>
            </View>
          </View>

          {/* CTA Section */}
          <View style={[styles.ctaSection, { marginBottom: rsp(20) }]}>
            <TouchableOpacity 
              style={[styles.ctaButton, { paddingVertical: rsp(16), marginBottom: rsp(12) }]}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={[styles.ctaButtonText, { fontSize: rf(16) }]}>Continue to Analysis</Text>
              <Ionicons name="arrow-forward" size={rs(20)} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={[styles.ctaDivider, { fontSize: rf(13) }]}>or</Text>
            <Text style={[styles.ctaSubtitle, { fontSize: rf(15), marginTop: rsp(4) }]}>Select a Strategy</Text>
          </View>

          {/* Strategy List */}
          <View style={styles.strategySection}>
            {analysis.strategies.map((strategy) => {
              const isTopPick = strategy.id === topStrategy.id && strategy.score >= 70;
              const gradeDisplay = scoreToGradeLabel(strategy.score);
              const metricValue = strategy.metricValue;

              return (
                <TouchableOpacity
                  key={strategy.id}
                  style={[
                    styles.strategyCard,
                    { marginBottom: rsp(8) },
                    isTopPick && styles.strategyCardTopPick,
                  ]}
                  onPress={() => handleViewStrategy(strategy)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.strategyContent, { padding: rsp(14), paddingHorizontal: rsp(16) }]}>
                    {/* Strategy Info */}
                    <View style={styles.strategyInfo}>
                      <Text style={[styles.strategyName, { fontSize: rf(15) }]}>{strategy.name}</Text>
                      {strategy.type && (
                        <Text style={[styles.strategyType, { fontSize: rf(12) }]}>{strategy.type}</Text>
                      )}
                      {strategy.badge && (
                        <View style={[
                          styles.strategyBadge,
                          { 
                            backgroundColor: strategy.badge === 'Strong' ? `${COLORS.green}1F` : `${COLORS.teal}1F`,
                            paddingHorizontal: rsp(6),
                            paddingVertical: rsp(3),
                          }
                        ]}>
                          <Text style={[
                            styles.strategyBadgeText,
                            { color: strategy.badge === 'Strong' ? COLORS.green : COLORS.teal, fontSize: rf(9) }
                          ]}>
                            {strategy.badge}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Metrics */}
                    <View style={styles.strategyMetrics}>
                      <Text style={[styles.strategyReturn, { color: getReturnColor(metricValue), fontSize: rf(16) }]}>
                        {strategy.metric}
                      </Text>
                      <Text style={[styles.strategyGrade, { color: getGradeColor(gradeDisplay.grade), fontSize: rf(10) }]}>
                        {gradeDisplay.label} {gradeDisplay.grade}
                      </Text>
                    </View>

                    {/* Chevron */}
                    <Ionicons name="chevron-forward" size={rs(20)} color={COLORS.surface300} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Export Link */}
          <TouchableOpacity style={[styles.exportLink, { paddingVertical: rsp(12) }]}>
            <Ionicons name="download-outline" size={rs(18)} color={COLORS.surface500} />
            <Text style={[styles.exportLinkText, { fontSize: rf(14) }]}>Export PDF Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES - Base styles (sizes applied dynamically via inline styles)
// =============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface100,
  },

  // Header
  header: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: staticRsp(16),
    paddingVertical: staticRsp(10),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface200,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: staticRsp(4),
  },
  backText: {
    fontWeight: '500',
    color: COLORS.surface400,
  },
  logo: {
    fontWeight: '800',
  },
  logoInvest: {
    color: COLORS.navy,
  },
  logoIQ: {
    color: COLORS.teal,
  },
  headerSpacer: {
    width: staticRs(50),
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: staticRsp(24),
  },

  // Property Card - Dark Header Style
  propertyCard: {
    backgroundColor: COLORS.navy,
  },
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  propertyImageContainer: {
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  placeholderContent: {
    alignItems: 'center',
  },
  placeholderText: {
    color: COLORS.surface400,
    fontWeight: '500',
  },
  propertyMiddle: {
    flex: 1,
    justifyContent: 'center',
  },
  propertyAddressMain: {
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  propertyCity: {
    fontWeight: '600',
    color: COLORS.tealLight,
  },
  propertyRight: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  propertyValueRight: {
    alignItems: 'flex-end',
  },
  estValue: {
    fontWeight: '700',
    color: COLORS.cyan,
    fontVariant: ['tabular-nums'],
  },
  estLabel: {
    color: COLORS.surface400,
    fontStyle: 'italic',
  },
  propertyDetails: {
    color: COLORS.surface400,
  },
  propertyDetailsWhite: {
    color: COLORS.white,
  },
  offMarketText: {
    color: COLORS.surface400,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  // Content Area
  contentArea: {},

  // Verdict Card
  verdictCard: {
    backgroundColor: COLORS.white,
    borderRadius: staticRs(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  verdictHeader: {
    flexDirection: 'row',
  },
  scoreContainer: {
    flex: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verdictLabel: {
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.teal,
  },
  scoreRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontWeight: '800',
  },
  viewFactors: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: staticRsp(4),
  },
  viewFactorsText: {
    color: COLORS.surface400,
  },
  verdictPrices: {
    flex: 65,
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  priceLabel: {
    color: COLORS.surface500,
  },
  priceLabelHighlight: {
    color: COLORS.teal,
    fontWeight: '600',
  },
  priceValue: {
    fontWeight: '700',
    color: COLORS.navy,
    fontVariant: ['tabular-nums'],
  },
  priceValueHighlight: {
    color: COLORS.teal,
  },
  verdictDescriptionContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.surface100,
  },
  verdictDescription: {
    color: COLORS.surface500,
    textAlign: 'center',
  },

  // CTA Section
  ctaSection: {},
  ctaButton: {
    backgroundColor: COLORS.teal,
    borderRadius: staticRs(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: staticRsp(8),
  },
  ctaButtonText: {
    fontWeight: '600',
    color: COLORS.white,
  },
  ctaDivider: {
    color: COLORS.surface400,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  ctaSubtitle: {
    fontWeight: '600',
    color: COLORS.navy,
    textAlign: 'center',
  },

  // Strategy Cards
  strategySection: {},
  strategyCard: {
    backgroundColor: COLORS.white,
    borderRadius: staticRs(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  strategyCardTopPick: {
    shadowColor: COLORS.green,
    shadowOpacity: 0.3,
    borderWidth: 2,
    borderColor: COLORS.green,
  },
  strategyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: staticRsp(12),
  },
  strategyInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: staticRsp(8),
  },
  strategyName: {
    fontWeight: '600',
    color: COLORS.navy,
  },
  strategyType: {
    color: COLORS.surface400,
  },
  strategyBadge: {
    borderRadius: staticRs(4),
  },
  strategyBadgeText: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.27,
  },
  strategyMetrics: {
    alignItems: 'flex-end',
  },
  strategyReturn: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  strategyGrade: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.27,
  },

  // Export Link
  exportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: staticRsp(8),
  },
  exportLinkText: {
    color: COLORS.surface500,
  },
});

export default IQVerdictScreen;
