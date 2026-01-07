/**
 * MetricCard Component
 * Displays a single metric with optional benchmark indicator
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { colors } from '@/theme/colors';

interface MetricCardProps {
  label: string;
  value: string;
  subLabel?: string;
  icon?: string;
  benchmark?: {
    target: number;
    current: number;
    format?: 'percentage' | 'currency' | 'number';
  };
  trend?: 'up' | 'down' | 'neutral';
  size?: 'small' | 'medium' | 'large';
  highlighted?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subLabel,
  icon,
  benchmark,
  trend,
  size = 'medium',
  highlighted = false,
}) => {
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;

  // Determine benchmark status
  const meetsBenchmark = benchmark ? benchmark.current >= benchmark.target : undefined;

  // Get trend indicator
  const getTrendIndicator = () => {
    if (!trend || trend === 'neutral') return null;
    return trend === 'up' ? '↑' : '↓';
  };

  const getTrendColor = () => {
    if (!trend) return theme.text;
    return trend === 'up' ? colors.success : trend === 'down' ? colors.error : theme.text;
  };

  const sizeStyles = {
    small: { padding: 10, valueSize: 18, labelSize: 10 },
    medium: { padding: 14, valueSize: 22, labelSize: 11 },
    large: { padding: 18, valueSize: 28, labelSize: 12 },
  };

  const s = sizeStyles[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: highlighted
            ? `${colors.primary}15`
            : theme.surface,
          borderColor: highlighted ? colors.primary : theme.border,
          padding: s.padding,
        },
      ]}
    >
      {/* Icon & Label Row */}
      <View style={styles.labelRow}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text
          style={[styles.label, { color: theme.textSecondary, fontSize: s.labelSize }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>

      {/* Value */}
      <View style={styles.valueRow}>
        <Text
          style={[
            styles.value,
            { color: getTrendColor(), fontSize: s.valueSize },
          ]}
        >
          {value}
        </Text>
        {getTrendIndicator() && (
          <Text style={[styles.trendIndicator, { color: getTrendColor() }]}>
            {getTrendIndicator()}
          </Text>
        )}
      </View>

      {/* Sub-label or Benchmark */}
      {(subLabel || benchmark) && (
        <View style={styles.footer}>
          {benchmark !== undefined && (
            <View style={styles.benchmarkRow}>
              <View
                style={[
                  styles.benchmarkDot,
                  { backgroundColor: meetsBenchmark ? colors.success : colors.warning },
                ]}
              />
              <Text
                style={[
                  styles.benchmarkText,
                  { color: meetsBenchmark ? colors.success : colors.warning },
                ]}
              >
                {meetsBenchmark ? 'Meets target' : `Target: ${benchmark.target}${benchmark.format === 'percentage' ? '%' : ''}`}
              </Text>
            </View>
          )}
          {subLabel && (
            <Text style={[styles.subLabel, { color: theme.textSecondary }]}>
              {subLabel}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 100,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  icon: {
    fontSize: 12,
  },
  label: {
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontWeight: '700',
  },
  trendIndicator: {
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    marginTop: 6,
  },
  benchmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  benchmarkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  benchmarkText: {
    fontSize: 10,
    fontWeight: '500',
  },
  subLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});

export default MetricCard;

