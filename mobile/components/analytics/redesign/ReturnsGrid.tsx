/**
 * ReturnsGrid - 4-metric profitability grid
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ReturnMetric } from './types';

interface ReturnsGridProps {
  metrics: ReturnMetric[];
  badge?: string;
  isDark?: boolean;
}

export function ReturnsGrid({ metrics, badge, isDark = true }: ReturnsGridProps) {
  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(7,23,46,0.02)',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }
    ]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
          RETURNS AT TARGET
        </Text>
        {badge && (
          <View style={[styles.badge, { backgroundColor: '#22c55e' }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>

      <View style={styles.grid}>
        {metrics.map((metric) => (
          <View key={metric.id} style={[
            styles.metricBox,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.03)' }
          ]}>
            <Text style={[
              styles.metricValue,
              { color: getStatusColor(metric.status, isDark) }
            ]}>
              {metric.value}
            </Text>
            {metric.subValue && (
              <Text style={[styles.metricSubValue, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)' }]}>
                {metric.subValue}
              </Text>
            )}
            <Text style={[styles.metricLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
              {metric.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function getStatusColor(status: ReturnMetric['status'], isDark: boolean): string {
  switch (status) {
    case 'positive':
      return '#22c55e';
    case 'negative':
      return '#ef4444';
    default:
      return isDark ? '#fff' : '#07172e';
  }
}

// Helper to create LTR returns
export function createLTRReturns(
  monthlyCashFlow: number,
  cashOnCash: number,
  capRate: number,
  dscr: number
): ReturnMetric[] {
  const formatCurrency = (v: number) => `$${Math.round(v).toLocaleString()}`;
  const formatPercent = (v: number) => `${(v * 100).toFixed(1)}%`;

  return [
    {
      id: 'cashflow',
      label: 'Monthly Cash Flow',
      value: formatCurrency(monthlyCashFlow),
      subValue: `${formatCurrency(monthlyCashFlow * 12)}/yr`,
      status: monthlyCashFlow > 0 ? 'positive' : 'negative',
    },
    {
      id: 'coc',
      label: 'Cash-on-Cash',
      value: formatPercent(cashOnCash),
      status: cashOnCash >= 0.08 ? 'positive' : cashOnCash >= 0.04 ? 'neutral' : 'negative',
    },
    {
      id: 'cap',
      label: 'Cap Rate',
      value: formatPercent(capRate),
      status: capRate >= 0.06 ? 'positive' : capRate >= 0.04 ? 'neutral' : 'negative',
    },
    {
      id: 'dscr',
      label: 'DSCR',
      value: dscr.toFixed(2),
      status: dscr >= 1.25 ? 'positive' : dscr >= 1.0 ? 'neutral' : 'negative',
    },
  ];
}

// Helper for STR returns
export function createSTRReturns(
  monthlyCashFlow: number,
  cashOnCash: number,
  annualRevenue: number,
  occupancyRate: number
): ReturnMetric[] {
  const formatCurrency = (v: number) => `$${Math.round(v).toLocaleString()}`;
  const formatPercent = (v: number) => `${(v * 100).toFixed(0)}%`;

  return [
    {
      id: 'cashflow',
      label: 'Monthly Cash Flow',
      value: formatCurrency(monthlyCashFlow),
      status: monthlyCashFlow > 0 ? 'positive' : 'negative',
    },
    {
      id: 'coc',
      label: 'Cash-on-Cash',
      value: `${(cashOnCash * 100).toFixed(1)}%`,
      status: cashOnCash >= 0.12 ? 'positive' : cashOnCash >= 0.08 ? 'neutral' : 'negative',
    },
    {
      id: 'revenue',
      label: 'Annual Revenue',
      value: formatCurrency(annualRevenue),
      status: 'neutral',
    },
    {
      id: 'occupancy',
      label: 'Occupancy',
      value: formatPercent(occupancyRate),
      status: occupancyRate >= 0.7 ? 'positive' : occupancyRate >= 0.5 ? 'neutral' : 'negative',
    },
  ];
}

// Helper for BRRRR returns
export function createBRRRRReturns(
  cashRecoveryPct: number,
  equityCreated: number,
  cashLeftInDeal: number,
  monthlyCashFlow: number
): ReturnMetric[] {
  const formatCurrency = (v: number) => `$${Math.round(v).toLocaleString()}`;
  const formatPercent = (v: number) => `${(v * 100).toFixed(0)}%`;

  return [
    {
      id: 'recovery',
      label: 'Cash Recovery',
      value: cashRecoveryPct >= 100 ? '100%+' : formatPercent(cashRecoveryPct / 100),
      subValue: cashRecoveryPct >= 100 ? '∞ Returns' : undefined,
      status: cashRecoveryPct >= 100 ? 'positive' : cashRecoveryPct >= 80 ? 'neutral' : 'negative',
    },
    {
      id: 'equity',
      label: 'Equity Created',
      value: formatCurrency(equityCreated),
      status: 'positive',
    },
    {
      id: 'left',
      label: 'Cash Left in Deal',
      value: formatCurrency(cashLeftInDeal),
      status: cashLeftInDeal <= 0 ? 'positive' : 'neutral',
    },
    {
      id: 'cashflow',
      label: 'Monthly CF',
      value: formatCurrency(monthlyCashFlow),
      status: monthlyCashFlow > 0 ? 'positive' : 'negative',
    },
  ];
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricBox: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricSubValue: {
    fontSize: 10,
    marginTop: 2,
  },
  metricLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
});
