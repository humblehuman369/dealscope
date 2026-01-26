/**
 * MetricsHeader - Deal Maker Pro header with title, address, and 2x3 metrics grid
 * Matches the exact design specification with precise colors and typography
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { MetricsHeaderProps, DEAL_MAKER_PRO_COLORS } from './types';
import { BackIcon } from './icons';

// =============================================================================
// COMPONENT
// =============================================================================

export function MetricsHeader({ 
  state, 
  metrics, 
  listPrice,
  propertyAddress,
  onBackPress,
}: MetricsHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Top Row: Back button + Title Area */}
      <View style={styles.headerTop}>
        {onBackPress && (
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={onBackPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <BackIcon size={20} color="white" />
          </TouchableOpacity>
        )}
        
        <View style={styles.headerTitleArea}>
          {/* Address */}
          {propertyAddress && (
            <Text style={styles.address} numberOfLines={1}>
              {propertyAddress}
            </Text>
          )}
          
          {/* DEAL MAKER PRO Title */}
          <View style={styles.titleRow}>
            <Text style={styles.titleDeal}>DEAL </Text>
            <Text style={styles.titleMaker}>MAKER </Text>
            <Text style={styles.titlePro}>PRO</Text>
          </View>
        </View>
      </View>

      {/* Metrics Grid - 2 columns, 3 rows */}
      <View style={styles.metricsRow}>
        {/* Left Column */}
        <View style={styles.metricsColumn}>
          <MetricRow 
            label="Buy Price" 
            value={formatCurrency(state.buyPrice)} 
          />
          <MetricRow 
            label="Deal Gap" 
            value={formatPercentWithSign(metrics.dealGap)} 
            valueColor={DEAL_MAKER_PRO_COLORS.dealGapCyan}
          />
          <MetricRow 
            label="CAP Rate" 
            value={formatPercent(metrics.capRate)} 
          />
        </View>

        {/* Right Column */}
        <View style={styles.metricsColumn}>
          <MetricRow 
            label="Cash Needed" 
            value={formatCurrency(metrics.cashNeeded)} 
          />
          <MetricRow 
            label="Annual Profit" 
            value={formatCurrency(metrics.annualProfit)} 
            valueColor={DEAL_MAKER_PRO_COLORS.annualProfitTeal}
          />
          <MetricRow 
            label="COC Return" 
            value={formatPercent(metrics.cocReturn)} 
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
    <View style={styles.metricItem}>
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

// =============================================================================
// STYLES - Exact match to design specification
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: DEAL_MAKER_PRO_COLORS.header,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  headerTitleArea: {
    flex: 1,
    alignItems: 'center',
    marginRight: 32, // Balance for back button
  },
  address: {
    fontSize: 11,
    color: DEAL_MAKER_PRO_COLORS.metricLabel,
    marginBottom: 2,
    letterSpacing: 0.02 * 11,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleDeal: {
    fontSize: 22,
    fontWeight: '800',
    color: DEAL_MAKER_PRO_COLORS.titleWhite,
    letterSpacing: 0.05 * 22,
  },
  titleMaker: {
    fontSize: 22,
    fontWeight: '800',
    color: DEAL_MAKER_PRO_COLORS.titleCyan,
    letterSpacing: 0.05 * 22,
  },
  titlePro: {
    fontSize: 22,
    fontWeight: '800',
    color: DEAL_MAKER_PRO_COLORS.titleWhite,
    letterSpacing: 0.05 * 22,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
  },
  metricsColumn: {
    flex: 1,
    gap: 6,
  },
  metricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  metricLabel: {
    fontSize: 12,
    color: DEAL_MAKER_PRO_COLORS.metricLabel,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600',
    color: DEAL_MAKER_PRO_COLORS.metricValue,
    fontVariant: ['tabular-nums'],
  },
});

export default MetricsHeader;
