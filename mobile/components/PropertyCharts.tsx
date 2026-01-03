/**
 * Property Analysis Charts using react-native-chart-kit.
 * Displays cash flow projections and strategy comparisons.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';

import { colors } from '../theme/colors';
import { InvestmentAnalytics, formatCurrency } from '../services/analytics';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - 64;

interface PropertyChartsProps {
  analytics: InvestmentAnalytics;
}

const chartConfig = {
  backgroundColor: '#fff',
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: colors.primary[600],
  },
  propsForBackgroundLines: {
    strokeDasharray: '4,4',
    stroke: colors.gray[200],
  },
};

/**
 * Cash Flow Projection Chart - shows annual cash flow over 5 years.
 */
export function CashFlowProjectionChart({ analytics }: PropertyChartsProps) {
  const data = useMemo(() => {
    const annualRentGrowth = 0.025; // 2.5% annual rent growth
    const cashFlow = analytics.strategies.longTermRental?.primaryValue || 0;
    
    const values: number[] = [];
    for (let year = 1; year <= 5; year++) {
      const yearlyGrowthFactor = Math.pow(1 + annualRentGrowth, year - 1);
      values.push(Math.round(cashFlow * yearlyGrowthFactor * 12)); // Annual
    }
    
    return {
      labels: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5'],
      datasets: [{ data: values.map(v => Math.max(0, v)) }], // Chart needs positive values
    };
  }, [analytics]);

  const allNegative = data.datasets[0].data.every(v => v === 0);

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>5-Year Cash Flow Projection</Text>
      <Text style={styles.chartSubtitle}>Annual cash flow with 2.5% rent growth</Text>
      
      {allNegative ? (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Negative cash flow projected</Text>
        </View>
      ) : (
        <BarChart
          data={data}
          width={chartWidth}
          height={180}
          yAxisLabel="$"
          yAxisSuffix=""
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
          }}
          style={styles.chart}
          showValuesOnTopOfBars
          fromZero
        />
      )}
    </View>
  );
}

/**
 * Strategy Comparison Bar Chart - compares all strategies.
 */
export function StrategyComparisonChart({ analytics }: PropertyChartsProps) {
  const { data, bestStrategy } = useMemo(() => {
    const strategies = [
      { name: 'LTR', value: analytics.strategies.longTermRental?.primaryValue || 0 },
      { name: 'STR', value: analytics.strategies.shortTermRental?.primaryValue || 0 },
      { name: 'BRRRR', value: analytics.strategies.brrrr?.primaryValue || 0 },
      { name: 'Flip', value: analytics.strategies.fixAndFlip?.primaryValue || 0 },
      { name: 'Hack', value: analytics.strategies.houseHack?.primaryValue || 0 },
    ];
    
    const sorted = [...strategies].sort((a, b) => b.value - a.value);
    const best = sorted[0];
    
    return {
      data: {
        labels: strategies.map(s => s.name),
        datasets: [{ data: strategies.map(s => Math.max(0, s.value)) }],
      },
      bestStrategy: best,
    };
  }, [analytics]);

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Strategy Comparison</Text>
      <Text style={styles.chartSubtitle}>Monthly cash flow by investment strategy</Text>
      
      <BarChart
        data={data}
        width={chartWidth}
        height={200}
        yAxisLabel="$"
        yAxisSuffix=""
        chartConfig={chartConfig}
        style={styles.chart}
        showValuesOnTopOfBars
        fromZero
      />
      
      {bestStrategy && bestStrategy.value > 0 && (
        <View style={styles.bestStrategyBadge}>
          <Text style={styles.bestStrategyLabel}>Best Strategy:</Text>
          <Text style={styles.bestStrategyValue}>
            {bestStrategy.name} ({formatCurrency(bestStrategy.value)}/mo)
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Cash-on-Cash Return Comparison.
 */
export function CashOnCashChart({ analytics }: PropertyChartsProps) {
  const data = useMemo(() => {
    const strategies = [
      { name: 'LTR', value: (analytics.strategies.longTermRental?.secondaryValue || 0) * 100 },
      { name: 'STR', value: (analytics.strategies.shortTermRental?.secondaryValue || 0) * 100 },
      { name: 'BRRRR', value: (analytics.strategies.brrrr?.secondaryValue || 0) * 100 },
      { name: 'Hack', value: (analytics.strategies.houseHack?.secondaryValue || 0) * 100 },
    ];
    
    return {
      labels: strategies.map(s => s.name),
      datasets: [{ data: strategies.map(s => Math.max(0, s.value)) }],
    };
  }, [analytics]);

  const targetReturn = 8;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Cash-on-Cash Return</Text>
      <Text style={styles.chartSubtitle}>Return on invested capital by strategy</Text>
      
      <BarChart
        data={data}
        width={chartWidth}
        height={180}
        yAxisLabel=""
        yAxisSuffix="%"
        chartConfig={{
          ...chartConfig,
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        }}
        style={styles.chart}
        showValuesOnTopOfBars
        fromZero
      />
      
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.warning.main }]} />
          <Text style={styles.legendText}>Target: 8% CoC Return</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Combined charts section for property detail screen.
 */
export function PropertyChartsSection({ analytics }: PropertyChartsProps) {
  return (
    <View style={styles.chartsSection}>
      <Text style={styles.sectionTitle}>Investment Analysis</Text>
      
      <CashFlowProjectionChart analytics={analytics} />
      <StrategyComparisonChart analytics={analytics} />
      <CashOnCashChart analytics={analytics} />
    </View>
  );
}

const styles = StyleSheet.create({
  chartsSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
    marginHorizontal: 16,
    marginBottom: 12,
  },
  chartContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: colors.gray[500],
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 12,
  },
  noDataContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 12,
  },
  noDataText: {
    fontSize: 14,
    color: colors.gray[500],
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLine: {
    width: 16,
    height: 3,
    borderRadius: 1,
  },
  legendText: {
    fontSize: 11,
    color: colors.gray[600],
  },
  bestStrategyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.primary[50],
    borderRadius: 8,
  },
  bestStrategyLabel: {
    fontSize: 12,
    color: colors.gray[600],
  },
  bestStrategyValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary[700],
  },
});

export default PropertyChartsSection;
