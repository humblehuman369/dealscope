/**
 * StrategyHeader Component
 * Displays strategy title, score badge, and key metric
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { colors } from '@/theme/colors';
import { StrategyType } from '../../types';

interface StrategyHeaderProps {
  strategyType: StrategyType;
  score: number;
  grade: string;
  gradeColor: string;
  primaryMetric: {
    label: string;
    value: string;
    subValue?: string;
  };
}

const STRATEGY_INFO: Record<StrategyType, { icon: string; label: string; color: string }> = {
  longTermRental: { icon: '🏠', label: 'Long-Term Rental', color: '#3b82f6' },
  shortTermRental: { icon: '🏖️', label: 'Short-Term Rental', color: '#f59e0b' },
  brrrr: { icon: '♻️', label: 'BRRRR', color: '#22c55e' },
  fixAndFlip: { icon: '🔨', label: 'Fix & Flip', color: '#ef4444' },
  houseHack: { icon: '🏡', label: 'House Hack', color: '#8b5cf6' },
  wholesale: { icon: '📝', label: 'Wholesale', color: '#06b6d4' },
};

export const StrategyHeader: React.FC<StrategyHeaderProps> = ({
  strategyType,
  score,
  grade,
  gradeColor,
  primaryMetric,
}) => {
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;
  const strategyInfo = STRATEGY_INFO[strategyType];

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Strategy Badge */}
      <View style={[styles.strategyBadge, { backgroundColor: `${strategyInfo.color}15` }]}>
        <Text style={styles.strategyIcon}>{strategyInfo.icon}</Text>
        <Text style={[styles.strategyLabel, { color: strategyInfo.color }]}>
          {strategyInfo.label}
        </Text>
      </View>

      {/* Score and Primary Metric */}
      <View style={styles.metricsRow}>
        {/* Score Circle */}
        <View style={styles.scoreContainer}>
          <View style={[styles.scoreCircle, { borderColor: gradeColor }]}>
            <Text style={[styles.scoreValue, { color: gradeColor }]}>{score}</Text>
            <Text style={[styles.gradeLabel, { color: gradeColor }]}>{grade}</Text>
          </View>
          <Text style={[styles.scoreText, { color: theme.textSecondary }]}>Deal Score</Text>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Primary Metric */}
        <View style={styles.primaryMetric}>
          <Text style={[styles.metricValue, { color: theme.text }]}>
            {primaryMetric.value}
          </Text>
          {primaryMetric.subValue && (
            <Text style={[styles.metricSubValue, { color: colors.success }]}>
              {primaryMetric.subValue}
            </Text>
          )}
          <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
            {primaryMetric.label}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  strategyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  strategyIcon: {
    fontSize: 16,
  },
  strategyLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    flex: 1,
  },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  gradeLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: -2,
  },
  scoreText: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 60,
    marginHorizontal: 20,
  },
  primaryMetric: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  metricSubValue: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default StrategyHeader;

