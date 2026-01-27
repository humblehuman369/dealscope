/**
 * IQVerdictScreen - Redesigned IQ Verdict page for Mobile
 * Exact implementation from design files
 * 
 * Design specs:
 * - Max width: 480px centered (on tablets)
 * - Background: #F1F5F9
 * - Font: Inter / System
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
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

  // Build address parts
  const addressLine1 = property.address;
  const addressLine2 = [property.city, property.state, property.zip].filter(Boolean).join(', ');

  // Calculate prices
  const breakevenPrice = property.price * 1.1;
  const buyPrice = breakevenPrice * 0.95;
  const wholesalePrice = breakevenPrice * 0.70;
  const estValue = property.price;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={COLORS.surface400} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.logo}>
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
        {/* Property Card */}
        <View style={styles.propertyCard}>
          <View style={styles.propertyHeader}>
            {/* Property Image */}
            <View style={styles.propertyImageContainer}>
              {property.imageUrl ? (
                <Image 
                  source={{ uri: property.imageUrl }} 
                  style={styles.propertyImage}
                />
              ) : (
                <Ionicons name="home" size={24} color={COLORS.surface400} />
              )}
            </View>

            {/* Property Info */}
            <View style={styles.propertyInfo}>
              <Text style={styles.propertyAddress} numberOfLines={1}>
                {addressLine1}
              </Text>
              <Text style={styles.propertyLocation} numberOfLines={1}>
                {addressLine2}
              </Text>
              <Text style={styles.propertyDetails}>
                {property.beds} bd · {Math.round(property.baths * 10) / 10} ba · {property.sqft?.toLocaleString() || '—'} sqft
              </Text>
            </View>

            {/* Property Value */}
            <View style={styles.propertyValue}>
              <View style={styles.marketBadge}>
                <Text style={styles.marketBadgeText}>OFF-MARKET</Text>
              </View>
              <Text style={styles.estValue}>{formatPrice(estValue)}</Text>
              <Text style={styles.estLabel}>Est. Value</Text>
            </View>
          </View>
        </View>

        {/* IQ Verdict Card */}
        <View style={styles.verdictCard}>
          {/* Verdict Header - Score LEFT, Prices RIGHT */}
          <View style={styles.verdictHeader}>
            {/* Score Container */}
            <View style={styles.scoreContainer}>
              <Text style={styles.verdictLabel}>IQ VERDICT</Text>
              <View style={[styles.scoreRing, { borderColor: getScoreColor(analysis.dealScore), backgroundColor: `${getScoreColor(analysis.dealScore)}14` }]}>
                <Text style={[styles.scoreValue, { color: getScoreColor(analysis.dealScore) }]}>
                  {analysis.dealScore}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowFactors(!showFactors)}
                style={styles.viewFactors}
              >
                <Text style={styles.viewFactorsText}>View Factors</Text>
                <Ionicons 
                  name={showFactors ? "chevron-up" : "chevron-down"} 
                  size={12} 
                  color={COLORS.surface400} 
                />
              </TouchableOpacity>
            </View>

            {/* Prices */}
            <View style={styles.verdictPrices}>
              {/* Breakeven Price */}
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Breakeven Price</Text>
                <Text style={styles.priceValue}>{formatPrice(Math.round(breakevenPrice))}</Text>
              </View>

              {/* Buy Price - Highlighted */}
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, styles.priceLabelHighlight]}>Buy Price</Text>
                <Text style={[styles.priceValue, styles.priceValueHighlight]}>{formatPrice(Math.round(buyPrice))}</Text>
              </View>

              {/* Wholesale Price */}
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Wholesale Price</Text>
                <Text style={styles.priceValue}>{formatPrice(Math.round(wholesalePrice))}</Text>
              </View>
            </View>
          </View>

          {/* Verdict Description */}
          <View style={styles.verdictDescriptionContainer}>
            <Text style={styles.verdictDescription}>
              {analysis.verdictDescription || 'Excellent potential across multiple strategies.'}
            </Text>
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>Continue to Analysis</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.ctaDivider}>or</Text>
          <Text style={styles.ctaSubtitle}>Select a Strategy</Text>
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
                  isTopPick && styles.strategyCardTopPick,
                ]}
                onPress={() => handleViewStrategy(strategy)}
                activeOpacity={0.7}
              >
                <View style={styles.strategyContent}>
                  {/* Strategy Info */}
                  <View style={styles.strategyInfo}>
                    <Text style={styles.strategyName}>{strategy.name}</Text>
                    {strategy.badge && (
                      <View style={[
                        styles.strategyBadge,
                        { backgroundColor: strategy.badge === 'Strong' ? `${COLORS.green}1F` : `${COLORS.teal}1F` }
                      ]}>
                        <Text style={[
                          styles.strategyBadgeText,
                          { color: strategy.badge === 'Strong' ? COLORS.green : COLORS.teal }
                        ]}>
                          {strategy.badge}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Metrics */}
                  <View style={styles.strategyMetrics}>
                    <Text style={[styles.strategyReturn, { color: getReturnColor(metricValue) }]}>
                      {strategy.metric}
                    </Text>
                    <Text style={[styles.strategyGrade, { color: getGradeColor(gradeDisplay.grade) }]}>
                      {gradeDisplay.label} {gradeDisplay.grade}
                    </Text>
                  </View>

                  {/* Chevron */}
                  <Ionicons name="chevron-forward" size={20} color={COLORS.surface300} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Export Link */}
        <TouchableOpacity style={styles.exportLink}>
          <Ionicons name="download-outline" size={18} color={COLORS.surface500} />
          <Text style={styles.exportLinkText}>Export PDF Report</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES - Exact from design files
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface200,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.surface400,
  },
  logo: {
    fontSize: 20,
    fontWeight: '800',
  },
  logoInvest: {
    color: COLORS.navy,
  },
  logoIQ: {
    color: COLORS.teal,
  },
  headerSpacer: {
    width: 60,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  // Property Card
  propertyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  propertyHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  propertyImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: COLORS.surface200,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  propertyImage: {
    width: 64,
    height: 64,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyAddress: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 2,
  },
  propertyLocation: {
    fontSize: 13,
    color: COLORS.surface500,
    marginBottom: 4,
  },
  propertyDetails: {
    fontSize: 12,
    color: COLORS.surface400,
  },
  propertyValue: {
    alignItems: 'flex-end',
  },
  marketBadge: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  marketBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.45,
  },
  estValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.teal,
  },
  estLabel: {
    fontSize: 11,
    color: COLORS.surface400,
  },

  // Verdict Card
  verdictCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  verdictHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  scoreContainer: {
    flex: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verdictLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.teal,
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
  viewFactors: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewFactorsText: {
    fontSize: 12,
    color: COLORS.surface400,
  },
  verdictPrices: {
    flex: 65,
    justifyContent: 'center',
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
  },
  priceLabel: {
    fontSize: 13,
    color: COLORS.surface500,
  },
  priceLabelHighlight: {
    color: COLORS.teal,
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
    fontVariant: ['tabular-nums'],
  },
  priceValueHighlight: {
    color: COLORS.teal,
  },
  verdictDescriptionContainer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface100,
  },
  verdictDescription: {
    fontSize: 14,
    color: COLORS.surface500,
    textAlign: 'center',
    lineHeight: 22,
  },

  // CTA Section
  ctaSection: {
    marginBottom: 20,
  },
  ctaButton: {
    backgroundColor: COLORS.teal,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  ctaDivider: {
    fontSize: 13,
    color: COLORS.surface400,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  ctaSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.navy,
    textAlign: 'center',
    marginTop: 4,
  },

  // Strategy Cards
  strategySection: {
    marginBottom: 20,
  },
  strategyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 8,
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
    padding: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  strategyInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  strategyName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.navy,
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
    letterSpacing: 0.27,
  },
  strategyMetrics: {
    alignItems: 'flex-end',
  },
  strategyReturn: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
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
    gap: 8,
    paddingVertical: 12,
  },
  exportLinkText: {
    fontSize: 14,
    color: COLORS.surface500,
  },
});

export default IQVerdictScreen;
