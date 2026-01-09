/**
 * IQTargetHero - The crown jewel hero component
 * Shows the IQ Target Price with animated glow and discount badge
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IQTargetResult, StrategyId } from './types';

interface IQTargetHeroProps {
  iqTarget: IQTargetResult;
  strategy: StrategyId;
  isDark?: boolean;
}

// Strategy-specific labels
const STRATEGY_LABELS: Record<StrategyId, string> = {
  ltr: 'IQ TARGET PRICE',
  str: 'STR TARGET PRICE',
  brrrr: 'BRRRR TARGET',
  flip: 'MAX PURCHASE PRICE',
  house_hack: 'HOUSE HACK TARGET',
  wholesale: 'MAX ALLOWABLE OFFER',
};

export function IQTargetHero({ iqTarget, strategy, isDark = true }: IQTargetHeroProps) {
  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatCompact = (value: number): string =>
    Math.abs(value) >= 1000000
      ? `$${(value / 1000000).toFixed(1)}M`
      : Math.abs(value) >= 1000
      ? `$${Math.round(value / 1000)}K`
      : formatCurrency(value);

  const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

  const label = STRATEGY_LABELS[strategy] || 'IQ TARGET PRICE';

  return (
    <View style={styles.container}>
      {/* Glow effect background */}
      <View style={styles.glowContainer}>
        <LinearGradient
          colors={['rgba(77, 208, 225, 0.15)', 'rgba(77, 208, 225, 0.05)', 'transparent']}
          style={styles.glow}
        />
      </View>

      {/* Badge */}
      <View style={styles.badgeContainer}>
        <LinearGradient
          colors={isDark ? ['#0097a7', '#4dd0e1'] : ['#007ea7', '#0097a7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.badge}
        >
          <Text style={styles.badgeText}>{label}</Text>
        </LinearGradient>
      </View>

      {/* Target Price */}
      <Text style={styles.targetPrice}>{formatCurrency(iqTarget.targetPrice)}</Text>

      {/* Discount Badge */}
      <View style={styles.discountContainer}>
        <Text style={styles.discountText}>
          {formatCompact(iqTarget.discountFromList)} below list ({formatPercent(iqTarget.discountPercent)})
        </Text>
      </View>

      {/* Rationale */}
      <Text style={[styles.rationale, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(7,23,46,0.6)' }]}>
        {iqTarget.rationale}
      </Text>

      {/* Strategy-specific hero metric for BRRRR */}
      {strategy === 'brrrr' && iqTarget.cashRecoveryPercent !== undefined && (
        <View style={styles.heroMetric}>
          <Text style={[styles.heroMetricLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
            CASH RECOVERY AT REFINANCE
          </Text>
          <Text style={styles.heroMetricValue}>
            {iqTarget.cashRecoveryPercent >= 100 ? '100%' : `${Math.round(iqTarget.cashRecoveryPercent)}%`}
          </Text>
          <Text style={[styles.heroMetricSub, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
            {iqTarget.cashLeftInDeal !== undefined && iqTarget.cashLeftInDeal <= 0
              ? '$0 left in deal'
              : `${formatCompact(iqTarget.cashLeftInDeal || 0)} left in deal`}
          </Text>
          {iqTarget.cashRecoveryPercent >= 100 && (
            <View style={styles.infiniteBadge}>
              <Text style={styles.infiniteBadgeText}>∞ RETURNS</Text>
            </View>
          )}
        </View>
      )}

      {/* Strategy-specific for Flip */}
      {strategy === 'flip' && iqTarget.netProfit !== undefined && (
        <View style={styles.heroMetric}>
          <Text style={[styles.heroMetricLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
            PROJECTED NET PROFIT
          </Text>
          <Text style={[styles.heroMetricValue, { color: iqTarget.netProfit > 0 ? '#22c55e' : '#ef4444' }]}>
            {formatCurrency(iqTarget.netProfit)}
          </Text>
          {iqTarget.roi !== undefined && (
            <Text style={[styles.heroMetricSub, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
              {formatPercent(iqTarget.roi)} ROI
            </Text>
          )}
        </View>
      )}

      {/* Strategy-specific for Wholesale */}
      {strategy === 'wholesale' && iqTarget.assignmentFee !== undefined && (
        <View style={styles.heroMetric}>
          <Text style={[styles.heroMetricLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
            ASSIGNMENT FEE POTENTIAL
          </Text>
          <Text style={[styles.heroMetricValue, { color: '#22c55e' }]}>
            {formatCurrency(iqTarget.assignmentFee)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    position: 'relative',
  },
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  badgeContainer: {
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  targetPrice: {
    fontSize: 42,
    fontWeight: '800',
    color: '#22c55e',
    marginBottom: 8,
  },
  discountContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  discountText: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '600',
  },
  rationale: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300,
  },
  heroMetric: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    width: '100%',
  },
  heroMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  heroMetricValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#22c55e',
  },
  heroMetricSub: {
    fontSize: 12,
    marginTop: 4,
  },
  infiniteBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  infiniteBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
