/**
 * IQVerdictScreen - The key innovation screen
 * Shows ranked strategy recommendations with Deal Score after property scan
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  IQ_COLORS,
  IQProperty,
  IQAnalysisResult,
  IQStrategy,
  getBadgeColors,
  getRankColor,
  getDealScoreColor,
  formatPrice,
} from './types';
import { IQButton } from './IQButton';

interface IQVerdictScreenProps {
  property: IQProperty;
  analysis: IQAnalysisResult;
  onBack: () => void;
  onViewStrategy: (strategy: IQStrategy) => void;
  onCompareAll: () => void;
  isDark?: boolean;
}

export function IQVerdictScreen({
  property,
  analysis,
  onBack,
  onViewStrategy,
  onCompareAll,
  isDark = false,
}: IQVerdictScreenProps) {
  const topStrategy = analysis.strategies[0];

  const handleViewStrategy = useCallback(
    (strategy: IQStrategy) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onViewStrategy(strategy);
    },
    [onViewStrategy]
  );

  const handleViewTopStrategy = useCallback(() => {
    handleViewStrategy(topStrategy);
  }, [handleViewStrategy, topStrategy]);

  const handleCompareAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCompareAll();
  }, [onCompareAll]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack();
  }, [onBack]);

  // Theme colors
  const theme = {
    background: isDark ? '#07172e' : IQ_COLORS.light,
    cardBg: isDark ? 'rgba(255,255,255,0.05)' : IQ_COLORS.white,
    text: isDark ? '#fff' : IQ_COLORS.deepNavy,
    textSecondary: isDark ? IQ_COLORS.slateLight : IQ_COLORS.slate,
    border: isDark ? 'rgba(255,255,255,0.1)' : IQ_COLORS.border,
    headerBg: isDark ? '#0a1f3a' : IQ_COLORS.white,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={theme.textSecondary} />
          <Text style={[styles.backText, { color: theme.textSecondary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.logo, { color: theme.text }]}>
          Invest<Text style={styles.logoAccent}>IQ</Text>
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Property Summary Bar */}
        <View style={[styles.propertySummary, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}>
          <View style={[styles.propertyImagePlaceholder, { backgroundColor: theme.border }]}>
            <Ionicons name="home" size={24} color={theme.textSecondary} />
          </View>
          <View style={styles.propertyInfo}>
            <Text style={[styles.propertyAddress, { color: theme.text }]} numberOfLines={1}>
              {property.address}
            </Text>
            <Text style={[styles.propertyMeta, { color: theme.textSecondary }]}>
              {property.beds} bd · {Math.round(property.baths * 10) / 10} ba · {property.sqft?.toLocaleString() || '—'} sqft
            </Text>
          </View>
          <Text style={styles.propertyPrice}>{formatPrice(property.price)}</Text>
        </View>

        {/* IQ Verdict Hero - Gradient Fade */}
        <LinearGradient
          colors={
            isDark
              ? ['transparent', IQ_COLORS.pacificTeal + '25', IQ_COLORS.pacificTeal + '25', 'transparent']
              : [IQ_COLORS.light, IQ_COLORS.pacificTeal + '18', IQ_COLORS.pacificTeal + '18', IQ_COLORS.light]
          }
          locations={[0, 0.3, 0.7, 1]}
          style={styles.verdictHero}
        >
          <Text style={styles.verdictLabel}>IQ VERDICT</Text>

          <TouchableOpacity 
            style={[styles.scoreContainer, { backgroundColor: theme.cardBg }]}
            onPress={handleViewTopStrategy}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.scoreNumber,
                { color: getDealScoreColor(analysis.dealScore) },
              ]}
            >
              {analysis.dealScore}
            </Text>
            <View style={styles.scoreTextContainer}>
              <Text style={[styles.scoreVerdict, { color: theme.text }]}>
                {analysis.dealVerdict}
              </Text>
              <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>
                Deal Score
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.verdictDescription, { color: theme.textSecondary }]}>
            {analysis.verdictDescription}
          </Text>
        </LinearGradient>

        {/* Strategy Rankings */}
        <View style={styles.strategiesSection}>
          <Text style={styles.sectionLabel}>IQ RANKED STRATEGIES</Text>

          {analysis.strategies.map((strategy, index) => {
            const isTop = index === 0;
            const badgeColors = strategy.badge ? getBadgeColors(strategy.rank) : null;

            return (
              <TouchableOpacity
                key={strategy.id}
                style={[
                  styles.strategyCard,
                  { backgroundColor: theme.cardBg, borderColor: theme.border },
                  isTop && styles.strategyCardTop,
                ]}
                onPress={() => handleViewStrategy(strategy)}
                activeOpacity={0.7}
              >
                {/* Rank Indicator */}
                <View
                  style={[
                    styles.rankIndicator,
                    { backgroundColor: getRankColor(strategy.rank) },
                  ]}
                >
                  <Text
                    style={[
                      styles.rankNumber,
                      { color: strategy.rank <= 3 ? IQ_COLORS.white : IQ_COLORS.slate },
                    ]}
                  >
                    {strategy.rank}
                  </Text>
                </View>

                {/* Strategy Info */}
                <View style={styles.strategyInfo}>
                  <View style={styles.strategyNameRow}>
                    <Text style={[styles.strategyName, { color: theme.text }]}>
                      {strategy.icon} {strategy.name}
                    </Text>
                    {strategy.badge && badgeColors && (
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: badgeColors.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: badgeColors.text },
                          ]}
                        >
                          {strategy.badge}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                    {strategy.metricLabel}
                  </Text>
                </View>

                {/* Metric Value */}
                <View style={styles.metricContainer}>
                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color:
                          strategy.rank <= 3
                            ? theme.text
                            : theme.textSecondary,
                      },
                    ]}
                  >
                    {strategy.metric}
                  </Text>
                  <Text style={[styles.scoreSmall, { color: theme.textSecondary }]}>
                    Score: {strategy.score}
                  </Text>
                </View>

                {/* Chevron */}
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom CTAs - Fixed */}
      <View style={[styles.bottomCTA, { backgroundColor: theme.headerBg, borderTopColor: theme.border }]}>
        <IQButton
          title={`View ${topStrategy.name} Analysis →`}
          onPress={handleViewTopStrategy}
          variant="primary"
          isDark={isDark}
          style={styles.primaryButtonStyle}
        />
        <IQButton
          title="Compare All Strategies"
          onPress={handleCompareAll}
          variant="text"
          isDark={isDark}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    gap: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
  },
  logo: {
    fontSize: 18,
    fontWeight: '700',
  },
  logoAccent: {
    color: IQ_COLORS.pacificTeal,
  },
  headerSpacer: {
    width: 60,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Property Summary
  propertySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  propertyImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  propertyAddress: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  propertyMeta: {
    fontSize: 12,
  },
  propertyPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: IQ_COLORS.pacificTeal,
  },

  // Verdict Hero - Gradient Fade
  verdictHero: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  verdictLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: IQ_COLORS.pacificTeal,
    letterSpacing: 1,
    marginBottom: 14,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 40,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  scoreNumber: {
    fontSize: 36,
    fontWeight: '800',
    marginRight: 12,
  },
  scoreTextContainer: {
    alignItems: 'flex-start',
  },
  scoreVerdict: {
    fontSize: 16,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 11,
  },
  verdictDescription: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },

  // Strategies Section
  strategiesSection: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: IQ_COLORS.pacificTeal,
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Strategy Card
  strategyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  strategyCardTop: {
    borderWidth: 2,
    borderColor: IQ_COLORS.success,
    shadowColor: IQ_COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  rankIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  strategyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  strategyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    flexWrap: 'wrap',
    gap: 8,
  },
  strategyName: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 11,
  },
  metricContainer: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  scoreSmall: {
    fontSize: 10,
  },

  // Bottom CTA - Soft Teal (matches verdict section gradient)
  bottomCTA: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  primaryButtonStyle: {
    marginBottom: 10,
  },
});

export default IQVerdictScreen;
