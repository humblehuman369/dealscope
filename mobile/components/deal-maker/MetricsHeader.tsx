/**
 * MetricsHeader - Fixed header with 6 key metrics and 2 score badges
 * Layout matches the Deal Maker mockup design
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import { MetricsHeaderProps, DealMakerMetrics, DealMakerState } from './types';
import { ScoreBadge, getScoreGrade } from './ScoreBadge';
import { formatSliderValue } from './DealMakerSlider';

// =============================================================================
// COMPONENT
// =============================================================================

export function MetricsHeader({ state, metrics, listPrice }: MetricsHeaderProps) {
  // Derive profit quality grade from COC Return
  const profitGrade = getProfitQualityGrade(metrics.cocReturn);

  return (
    <View style={styles.container}>
      {/* Title */}
      <View style={styles.titleRow}>
        <Text style={styles.titleDeal}>DEAL</Text>
        <Text style={styles.titleMaker}>MAKER</Text>
      </View>

      {/* Metrics + Badges Row */}
      <View style={styles.metricsRow}>
        {/* Left: 6 Metrics */}
        <View style={styles.metricsColumn}>
          <MetricRow 
            label="Buy Price" 
            value={formatCurrency(state.buyPrice)} 
          />
          <MetricRow 
            label="Cash Needed" 
            value={formatCurrency(metrics.cashNeeded)} 
          />
          <MetricRow 
            label="Deal Gap" 
            value={formatPercentWithSign(metrics.dealGap)} 
            valueColor={metrics.dealGap >= 0 ? colors.profit.main : colors.loss.main}
          />
          <MetricRow 
            label="Annual Profit" 
            value={formatCurrency(metrics.annualProfit)} 
            valueColor={metrics.annualProfit >= 0 ? colors.profit.main : colors.loss.main}
          />
          <MetricRow 
            label="CAP Rate" 
            value={formatPercent(metrics.capRate)} 
          />
          <MetricRow 
            label="COC Return" 
            value={formatPercent(metrics.cocReturn)} 
          />
        </View>

        {/* Right: 2 Score Badges */}
        <View style={styles.badgesColumn}>
          <ScoreBadge 
            type="dealScore" 
            score={metrics.dealScore} 
            size="medium" 
          />
          <View style={styles.badgeSpacer} />
          <ScoreBadge 
            type="profitQuality" 
            grade={profitGrade} 
            size="medium" 
          />
        </View>
      </View>
    </View>
  );
}

// =============================================================================
// METRIC ROW
// =============================================================================

interface MetricRowProps {
  label: string;
  value: string;
  valueColor?: string;
}

function MetricRow({ label, value, valueColor }: MetricRowProps) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, valueColor && { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

// =============================================================================
// FORMATTERS
// =============================================================================

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
      notation: 'compact',
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatPercentWithSign(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(0)}%`;
}

function getProfitQualityGrade(cocReturn: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  const cocPercent = cocReturn * 100;
  if (cocPercent >= 12) return 'A+';
  if (cocPercent >= 10) return 'A';
  if (cocPercent >= 8) return 'B';
  if (cocPercent >= 5) return 'C';
  if (cocPercent >= 2) return 'D';
  return 'F';
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.navy[900],
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  titleDeal: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 1,
  },
  titleMaker: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.accent[500],
    letterSpacing: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricsColumn: {
    flex: 1,
    paddingRight: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  metricLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '700',
  },
  badgesColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 16,
    marginLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    minWidth: 80,
  },
  badgeSpacer: {
    height: 12,
  },
});

export default MetricsHeader;
