/**
 * MetricsHeader - Deal Maker Pro header
 * EXACT implementation from design files - no modifications
 * 
 * Design specs:
 * - Header bg: #0A1628
 * - Address: 11px, color #94A3B8, letter-spacing 0.02em
 * - Title: 22px, font-weight 800, letter-spacing 0.05em
 *   - DEAL: white, MAKER: #00D4FF, PRO: white
 * - Metrics grid: 2 columns, gap 6px 24px
 * - Metric label: 12px, color #94A3B8
 * - Metric value: 13px, font-weight 600, white
 *   - Deal Gap: #00D4FF, Annual Profit: #06B6D4
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { MetricsHeaderProps } from './types';
import { BackIcon } from './icons';

export function MetricsHeader({ 
  state, 
  metrics, 
  propertyAddress,
  onBackPress,
}: MetricsHeaderProps) {
  return (
    <View style={styles.header}>
      {/* Header Top: Back button + Title Area */}
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
          <Text style={styles.title}>
            <Text style={styles.titleDeal}>DEAL </Text>
            <Text style={styles.titleMaker}>MAKER </Text>
            <Text style={styles.titlePro}>PRO</Text>
          </Text>
        </View>
      </View>

      {/* Metrics Grid - 2 columns */}
      <View style={styles.metricsRow}>
        {/* Row 1 */}
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Buy Price</Text>
          <Text style={styles.metricValue}>{formatCurrency(state.buyPrice)}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Cash Needed</Text>
          <Text style={styles.metricValue}>{formatCurrency(metrics.cashNeeded)}</Text>
        </View>
        
        {/* Row 2 */}
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Deal Gap</Text>
          <Text style={[styles.metricValue, styles.metricValueCyan]}>
            {formatPercentWithSign(metrics.dealGap)}
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Annual Profit</Text>
          <Text style={[styles.metricValue, styles.metricValueTeal]}>
            {formatCurrency(metrics.annualProfit)}
          </Text>
        </View>
        
        {/* Row 3 */}
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>CAP Rate</Text>
          <Text style={styles.metricValue}>{formatPercent(metrics.capRate)}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>COC Return</Text>
          <Text style={styles.metricValue}>{formatPercent(metrics.cocReturn)}</Text>
        </View>
      </View>
    </View>
  );
}

// Formatters
function formatCurrency(value: number): string {
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

// Styles - EXACT from design files
const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0A1628',
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
    marginRight: 32,
  },
  address: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
    letterSpacing: 0.22, // 0.02em * 11
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.1, // 0.05em * 22
  },
  titleDeal: {
    color: 'white',
  },
  titleMaker: {
    color: '#00D4FF',
  },
  titlePro: {
    color: 'white',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  metricItem: {
    width: '50%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
    paddingRight: 24,
  },
  metricLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
    fontVariant: ['tabular-nums'],
  },
  metricValueCyan: {
    color: '#00D4FF',
  },
  metricValueTeal: {
    color: '#06B6D4',
  },
});

export default MetricsHeader;
