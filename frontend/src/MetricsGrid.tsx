// ============================================
// MetricsGrid Component
// ============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../hooks/usePropertyAnalytics';
import { colors, typography, spacing, radius, benchmarks } from '../constants/theme';
import { CalculatedMetrics } from '../types/analytics';
import { formatCurrency, formatPercent, formatDecimal } from '../utils/formatters';

interface MetricConfig {
  id: string;
  label: string;
  getValue: (metrics: CalculatedMetrics) => number;
  format: (value: number) => string;
  getBenchmark: (value: number) => { met: boolean; label: string };
  infoText: string;
}

const METRICS_CONFIG: MetricConfig[] = [
  {
    id: 'cashOnCash',
    label: 'Cash-on-Cash',
    getValue: (m) => m.cashOnCash,
    format: (v) => formatPercent(v),
    getBenchmark: (v) => ({
      met: v >= benchmarks.cashOnCash.good,
      label: `${v >= benchmarks.cashOnCash.good ? '✓' : '⚠'} ${v >= benchmarks.cashOnCash.good ? 'Above' : 'Below'} ${benchmarks.cashOnCash.good}%`,
    }),
    infoText: 'Annual cash flow divided by total cash invested',
  },
  {
    id: 'monthlyCashFlow',
    label: 'Monthly Cash Flow',
    getValue: (m) => m.monthlyCashFlow,
    format: (v) => formatCurrency(v),
    getBenchmark: (v) => ({
      met: v > 0,
      label: v > 0 ? '✓ Positive' : '⚠ Negative',
    }),
    infoText: 'Net income after all expenses including mortgage',
  },
  {
    id: 'capRate',
    label: 'Cap Rate',
    getValue: (m) => m.capRate,
    format: (v) => formatPercent(v),
    getBenchmark: (v) => ({
      met: v >= benchmarks.capRate.good,
      label: `${v >= benchmarks.capRate.good ? '✓' : '⚠'} ${v >= benchmarks.capRate.good ? 'Above' : 'Below'} ${benchmarks.capRate.good}%`,
    }),
    infoText: 'NOI divided by purchase price (ignores financing)',
  },
  {
    id: 'dscr',
    label: 'DSCR',
    getValue: (m) => m.dscr,
    format: (v) => formatDecimal(v),
    getBenchmark: (v) => ({
      met: v >= benchmarks.dscr.good,
      label: `${v >= benchmarks.dscr.good ? '✓' : '⚠'} ${v >= benchmarks.dscr.good ? 'Above' : 'Below'} ${benchmarks.dscr.good}`,
    }),
    infoText: 'Debt Service Coverage Ratio - NOI divided by debt payments',
  },
];

interface MetricsGridProps {
  metrics: CalculatedMetrics;
  onMetricPress?: (metricId: string) => void;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({
  metrics,
  onMetricPress,
}) => {
  const { isDark, colors: themeColors } = useTheme();

  const getValueColor = (config: MetricConfig, value: number): string => {
    const { met } = config.getBenchmark(value);
    return met ? colors.success : colors.warning;
  };

  return (
    <View style={styles.container}>
      {METRICS_CONFIG.map((config, index) => {
        const value = config.getValue(metrics);
        const benchmark = config.getBenchmark(value);
        const valueColor = getValueColor(config, value);

        return (
          <TouchableOpacity
            key={config.id}
            style={[
              styles.metricBox,
              {
                backgroundColor: isDark
                  ? colors.dark.surface
                  : colors.light.surface,
                borderColor: isDark
                  ? colors.dark.border
                  : colors.light.border,
              },
            ]}
            onPress={() => onMetricPress?.(config.id)}
            activeOpacity={0.7}
          >
            {/* Value */}
            <Text
              style={[
                styles.value,
                { color: value > 0 || config.id === 'dscr' ? valueColor : themeColors.text },
              ]}
            >
              {config.format(value)}
            </Text>

            {/* Label */}
            <Text style={[styles.label, { color: themeColors.textMuted }]}>
              {config.label}
            </Text>

            {/* Benchmark */}
            <Text
              style={[
                styles.benchmark,
                { color: benchmark.met ? colors.success : colors.warning },
              ]}
            >
              {benchmark.label}
            </Text>

            {/* Info icon */}
            <View style={styles.infoIcon}>
              <Text style={[styles.infoText, { color: themeColors.textMuted }]}>
                ⓘ
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Additional 2-metric row for detailed views
interface MetricRowProps {
  metrics: CalculatedMetrics;
  metricIds: [string, string];
  onMetricPress?: (metricId: string) => void;
}

export const MetricRow: React.FC<MetricRowProps> = ({
  metrics,
  metricIds,
  onMetricPress,
}) => {
  const { isDark, colors: themeColors } = useTheme();

  return (
    <View style={styles.row}>
      {metricIds.map((id) => {
        const config = METRICS_CONFIG.find((c) => c.id === id);
        if (!config) return null;

        const value = config.getValue(metrics);
        const benchmark = config.getBenchmark(value);

        return (
          <TouchableOpacity
            key={id}
            style={[
              styles.rowMetric,
              {
                backgroundColor: isDark
                  ? colors.dark.surface
                  : colors.light.surface,
                borderColor: isDark
                  ? colors.dark.border
                  : colors.light.border,
              },
            ]}
            onPress={() => onMetricPress?.(id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.rowValue,
                {
                  color: benchmark.met ? colors.success : themeColors.text,
                },
              ]}
            >
              {config.format(value)}
            </Text>
            <Text style={[styles.rowLabel, { color: themeColors.textMuted }]}>
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Single metric card (for larger display)
interface MetricCardProps {
  label: string;
  value: string;
  benchmark?: string;
  isMet?: boolean;
  subtitle?: string;
  onPress?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  benchmark,
  isMet = true,
  subtitle,
  onPress,
}) => {
  const { isDark, colors: themeColors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark
            ? colors.dark.surface
            : colors.light.surface,
          borderColor: isDark ? colors.dark.border : colors.light.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Text style={[styles.cardLabel, { color: themeColors.textMuted }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.cardValue,
          { color: isMet ? colors.success : themeColors.text },
        ]}
      >
        {value}
      </Text>
      {benchmark && (
        <Text
          style={[
            styles.cardBenchmark,
            { color: isMet ? colors.success : colors.warning },
          ]}
        >
          {benchmark}
        </Text>
      )}
      {subtitle && (
        <Text style={[styles.cardSubtitle, { color: themeColors.textMuted }]}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  metricBox: {
    width: '48%',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
  },
  value: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xxs,
  },
  label: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xxs,
  },
  benchmark: {
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.medium,
  },
  infoIcon: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  infoText: {
    fontSize: typography.sizes.caption,
  },
  // Row styles
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  rowMetric: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  rowValue: {
    fontSize: typography.sizes.h4,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xxs,
  },
  rowLabel: {
    fontSize: typography.sizes.caption,
  },
  // Card styles
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs,
  },
  cardValue: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xxs,
  },
  cardBenchmark: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
  },
  cardSubtitle: {
    fontSize: typography.sizes.micro,
    marginTop: spacing.xs,
  },
});

export default MetricsGrid;
