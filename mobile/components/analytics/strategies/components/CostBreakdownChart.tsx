/**
 * CostBreakdownChart Component
 * Visual breakdown of costs/income with stacked bars
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { colors } from '@/theme/colors';
import { formatCurrency } from '../../formatters';

interface BreakdownItem {
  label: string;
  value: number;
  color: string;
}

interface CostBreakdownChartProps {
  title: string;
  items: BreakdownItem[];
  total?: number;
  showPercentages?: boolean;
  variant?: 'horizontal' | 'vertical';
}

export const CostBreakdownChart: React.FC<CostBreakdownChartProps> = ({
  title,
  items,
  total: providedTotal,
  showPercentages = true,
  variant = 'horizontal',
}) => {
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;

  const total = providedTotal ?? items.reduce((sum, item) => sum + item.value, 0);
  const maxValue = Math.max(...items.map((i) => i.value));

  if (variant === 'vertical') {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        
        {/* Stacked Bar */}
        <View style={styles.stackedBar}>
          {items.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            if (percentage < 1) return null;
            
            return (
              <View
                key={index}
                style={[
                  styles.stackedSegment,
                  {
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {items.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            
            return (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>
                  {item.label}
                </Text>
                <Text style={[styles.legendValue, { color: theme.text }]}>
                  {formatCurrency(item.value)}
                </Text>
                {showPercentages && (
                  <Text style={[styles.legendPercent, { color: theme.textSecondary }]}>
                    {percentage.toFixed(0)}%
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Total */}
        <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
          <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Total</Text>
          <Text style={[styles.totalValue, { color: theme.text }]}>{formatCurrency(total)}</Text>
        </View>
      </View>
    );
  }

  // Horizontal bars
  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      
      {items.map((item, index) => {
        const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        const percentOfTotal = total > 0 ? (item.value / total) * 100 : 0;
        
        return (
          <View key={index} style={styles.barRow}>
            <View style={styles.barHeader}>
              <View style={styles.barLabelRow}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={[styles.barLabel, { color: theme.textSecondary }]}>
                  {item.label}
                </Text>
              </View>
              <Text style={[styles.barValue, { color: theme.text }]}>
                {formatCurrency(item.value)}
                {showPercentages && (
                  <Text style={[styles.barPercent, { color: theme.textSecondary }]}>
                    {' '}({percentOfTotal.toFixed(0)}%)
                  </Text>
                )}
              </Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.max(2, percentage)}%`,
                    backgroundColor: item.color,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}

      {/* Total */}
      <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
        <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Total</Text>
        <Text style={[styles.totalValue, { color: theme.text }]}>{formatCurrency(total)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
  },
  stackedBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
  },
  stackedSegment: {
    height: '100%',
  },
  legend: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 12,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  legendPercent: {
    fontSize: 11,
    width: 35,
    textAlign: 'right',
  },
  barRow: {
    marginBottom: 12,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  barLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  barLabel: {
    fontSize: 12,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  barPercent: {
    fontSize: 11,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default CostBreakdownChart;

