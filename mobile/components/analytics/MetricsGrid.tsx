/**
 * MetricsGrid - 2x2 grid of key metrics with benchmarks
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalculatedMetrics } from './types';
import { formatCurrency, formatPercent } from './calculations';

interface MetricsGridProps {
  metrics: CalculatedMetrics;
  isDark?: boolean;
  onMetricPress?: (metricId: string) => void;
}

interface MetricConfig {
  id: string;
  label: string;
  getValue: (m: CalculatedMetrics) => string;
  getRawValue: (m: CalculatedMetrics) => number;
  benchmark: {
    threshold: number;
    comparison: 'above' | 'below';
    label: string;
  };
}

const METRICS: MetricConfig[] = [
  {
    id: 'coc',
    label: 'Cash-on-Cash',
    getValue: (m) => formatPercent(m.cashOnCash),
    getRawValue: (m) => m.cashOnCash,
    benchmark: { threshold: 12, comparison: 'above', label: '> 12%' },
  },
  {
    id: 'cashFlow',
    label: 'Monthly Cash Flow',
    getValue: (m) => formatCurrency(m.monthlyCashFlow),
    getRawValue: (m) => m.monthlyCashFlow,
    benchmark: { threshold: 0, comparison: 'above', label: 'Positive' },
  },
  {
    id: 'capRate',
    label: 'Cap Rate',
    getValue: (m) => formatPercent(m.capRate),
    getRawValue: (m) => m.capRate,
    benchmark: { threshold: 8, comparison: 'above', label: '> 8%' },
  },
  {
    id: 'dscr',
    label: 'DSCR',
    getValue: (m) => m.dscr.toFixed(2),
    getRawValue: (m) => m.dscr,
    benchmark: { threshold: 1.25, comparison: 'above', label: '> 1.25' },
  },
];

export function MetricsGrid({ metrics, isDark = true, onMetricPress }: MetricsGridProps) {
  return (
    <View style={styles.container}>
      {METRICS.map((metric, index) => {
        const value = metric.getRawValue(metrics);
        const meetsBenchmark = metric.benchmark.comparison === 'above'
          ? value >= metric.benchmark.threshold
          : value <= metric.benchmark.threshold;

        return (
          <TouchableOpacity
            key={metric.id}
            style={[
              styles.metricBox,
              { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
              }
            ]}
            onPress={() => onMetricPress?.(metric.id)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.value,
              { color: meetsBenchmark ? '#22c55e' : (isDark ? '#fff' : '#07172e') }
            ]}>
              {metric.getValue(metrics)}
            </Text>
            
            <Text style={[styles.label, { color: isDark ? '#6b7280' : '#6b7280' }]}>
              {metric.label}
            </Text>
            
            <View style={styles.benchmarkRow}>
              <Text style={[
                styles.benchmarkText,
                { color: meetsBenchmark ? '#22c55e' : '#f97316' }
              ]}>
                {meetsBenchmark ? '✓' : '⚠'} {metric.benchmark.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricBox: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 6,
  },
  benchmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benchmarkText: {
    fontSize: 9,
    fontWeight: '600',
  },
});

