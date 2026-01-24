/**
 * IQTargetHero - The crown jewel hero component
 * Shows the IQ Buy Price with animated glow and discount badge
 * Design matches: investiq-property-analytics-complete-redesign (final).html
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IQTargetResult, StrategyId } from './types';

interface IQTargetHeroProps {
  iqTarget: IQTargetResult;
  strategy: StrategyId;
  isDark?: boolean;
}

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
      ? `$${Math.round(value / 1000).toLocaleString()}K`
      : formatCurrency(value);

  const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

  return (
    <View style={styles.container}>
      {/* Glow effect background */}
      <LinearGradient
        colors={['rgba(34, 197, 94, 0.15)', 'rgba(77, 208, 225, 0.1)', 'transparent']}
        style={styles.glowBackground}
      />

      {/* IQ Target Badge */}
      <View style={styles.badgeContainer}>
        <View style={styles.badge}>
          <Text style={styles.badgeEmoji}>🎯</Text>
          <Text style={styles.badgeText}>IQ BUY PRICE</Text>
        </View>
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>Your Profitable Entry Point</Text>

      {/* Buy Price - Large Green */}
      <Text style={styles.targetPrice}>{formatCurrency(iqTarget.targetPrice)}</Text>

      {/* Discount Info */}
      <Text style={styles.discountText}>
        {formatCompact(iqTarget.discountFromList)} below list ({formatPercent(iqTarget.discountPercent)})
      </Text>

      {/* Rationale with highlighted metrics */}
      <Text style={[styles.rationale, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(7,23,46,0.7)' }]}>
        At this price, you achieve{' '}
        <Text style={styles.highlightGreen}>{iqTarget.highlightedMetric}</Text>
        {' '}with{' '}
        <Text style={styles.highlightCyan}>{iqTarget.secondaryMetric}</Text>
        {' '}return
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
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  glowBackground: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    bottom: -100,
    opacity: 0.5,
  },
  badgeContainer: {
    marginBottom: 10,
    zIndex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeEmoji: {
    fontSize: 12,
  },
  badgeText: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
    zIndex: 1,
  },
  targetPrice: {
    fontSize: 40,
    fontWeight: '800',
    color: '#22c55e',
    marginBottom: 6,
    zIndex: 1,
    letterSpacing: -1,
  },
  discountText: {
    color: '#4dd0e1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    zIndex: 1,
  },
  rationale: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    zIndex: 1,
  },
  highlightGreen: {
    color: '#22c55e',
    fontWeight: '600',
  },
  highlightCyan: {
    color: '#4dd0e1',
    fontWeight: '600',
  },
  heroMetric: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    width: '100%',
    zIndex: 1,
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
