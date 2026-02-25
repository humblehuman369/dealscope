/**
 * ReturnFactors — Profit Score factor breakdown.
 *
 * Displays: Cap Rate, Cash-on-Cash, DSCR, Annual ROI, Annual Profit.
 * Matches frontend/src/components/iq-verdict/ReturnFactors.tsx.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export interface ReturnFactorsData {
  strategyName: string;
  capRate: number | null;
  cashOnCash: number | null;
  dscr: number | null;
  annualRoi: number | null;
  annualProfit: number | null;
}

interface ReturnFactorsProps {
  factors: ReturnFactorsData;
}

const COLORS = {
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  gray: '#94a3b8',
};

function formatPercent(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value.toFixed(1)}%`;
}

function formatCurrency(value: number | null): string {
  if (value === null) return 'N/A';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

function formatDSCR(value: number | null): string {
  if (value === null) return 'N/A';
  return value.toFixed(2);
}

function capRateColor(v: number | null) {
  if (v === null) return COLORS.gray;
  if (v >= 8) return COLORS.green;
  if (v >= 6) return COLORS.amber;
  return COLORS.red;
}

function cocColor(v: number | null) {
  if (v === null) return COLORS.gray;
  if (v >= 10) return COLORS.green;
  if (v >= 5) return COLORS.amber;
  return COLORS.red;
}

function dscrColor(v: number | null) {
  if (v === null) return COLORS.gray;
  if (v >= 1.25) return COLORS.green;
  if (v >= 1.0) return COLORS.amber;
  return COLORS.red;
}

function cashFlowColor(v: number | null) {
  if (v === null) return COLORS.gray;
  if (v > 0) return COLORS.green;
  if (v === 0) return COLORS.amber;
  return COLORS.red;
}

export function ReturnFactors({ factors }: ReturnFactorsProps) {
  const { isDark } = useTheme();
  const textColor = isDark ? '#e2e8f0' : '#334155';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  const rows: { icon: string; label: string; value: string; color: string }[] = [
    { icon: 'analytics-outline', label: 'Cap Rate', value: formatPercent(factors.capRate), color: capRateColor(factors.capRate) },
    { icon: 'trending-up-outline', label: 'Cash on Cash', value: formatPercent(factors.cashOnCash), color: cocColor(factors.cashOnCash) },
    { icon: 'shield-outline', label: 'DSCR', value: formatDSCR(factors.dscr), color: dscrColor(factors.dscr) },
    { icon: 'cash-outline', label: 'Annual ROI', value: formatCurrency(factors.annualRoi), color: cashFlowColor(factors.annualRoi) },
    { icon: 'cash-outline', label: 'Annual Profit', value: formatCurrency(factors.annualProfit), color: cashFlowColor(factors.annualProfit) },
  ];

  return (
    <View>
      <Text style={[styles.header, { color: mutedColor }]}>
        Profit Score Factors ({factors.strategyName})
      </Text>
      {rows.map((row, i) => (
        <View
          key={row.label}
          style={[
            styles.row,
            i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: borderColor },
          ]}
        >
          <View style={styles.labelGroup}>
            <Ionicons name={row.icon as any} size={14} color={mutedColor} />
            <Text style={[styles.label, { color: textColor }]}>{row.label}</Text>
          </View>
          <Text style={[styles.value, { color: row.color }]}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ReturnFactors;
