/**
 * Property Analysis Charts using victory-native.
 * Displays cash flow projections and strategy comparisons.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { 
  VictoryChart, 
  VictoryLine, 
  VictoryBar, 
  VictoryAxis, 
  VictoryTheme,
  VictoryTooltip,
  VictoryVoronoiContainer,
  VictoryLabel,
  VictoryGroup,
  VictoryLegend,
} from 'victory-native';

import { colors } from '../theme/colors';
import { InvestmentAnalytics, formatCurrency } from '../services/analytics';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - 32;

interface PropertyChartsProps {
  analytics: InvestmentAnalytics;
}

/**
 * Cash Flow Projection Chart - shows monthly cash flow over 5 years.
 */
export function CashFlowProjectionChart({ analytics }: PropertyChartsProps) {
  const data = useMemo(() => {
    const monthlyRent = analytics.pricing.rentEstimate;
    const annualAppreciation = 0.03; // 3% annual appreciation
    const annualRentGrowth = 0.025; // 2.5% annual rent growth
    const cashFlow = analytics.strategies.longTermRental?.primaryValue || 0;
    
    // Generate 5 years of monthly cash flow projections
    const projections: { x: number; y: number }[] = [];
    let currentCashFlow = cashFlow;
    
    for (let year = 1; year <= 5; year++) {
      // Apply rent growth annually
      const yearlyGrowthFactor = Math.pow(1 + annualRentGrowth, year - 1);
      const adjustedCashFlow = cashFlow * yearlyGrowthFactor;
      
      projections.push({
        x: year,
        y: Math.round(adjustedCashFlow * 12), // Annual cash flow
      });
    }
    
    return projections;
  }, [analytics]);

  const maxValue = Math.max(...data.map(d => Math.abs(d.y)));
  const isAllPositive = data.every(d => d.y >= 0);
  const isAllNegative = data.every(d => d.y <= 0);

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>5-Year Cash Flow Projection</Text>
      <Text style={styles.chartSubtitle}>Annual cash flow with 2.5% rent growth</Text>
      
      <VictoryChart
        width={chartWidth}
        height={200}
        padding={{ left: 60, right: 20, top: 20, bottom: 40 }}
        theme={VictoryTheme.material}
        domainPadding={{ x: 30, y: 20 }}
      >
        <VictoryAxis
          label="Year"
          tickValues={[1, 2, 3, 4, 5]}
          style={{
            axis: { stroke: colors.gray[300] },
            tickLabels: { fill: colors.gray[600], fontSize: 11 },
            axisLabel: { fill: colors.gray[500], fontSize: 12, padding: 30 },
          }}
        />
        <VictoryAxis
          dependentAxis
          tickFormat={(t) => `$${(t / 1000).toFixed(0)}k`}
          style={{
            axis: { stroke: colors.gray[300] },
            tickLabels: { fill: colors.gray[600], fontSize: 11 },
            grid: { stroke: colors.gray[200], strokeDasharray: '4,4' },
          }}
        />
        <VictoryBar
          data={data}
          style={{
            data: {
              fill: ({ datum }) => datum.y >= 0 ? colors.profit.main : colors.loss.main,
              width: 40,
            },
          }}
          cornerRadius={{ top: 4 }}
          labels={({ datum }) => formatCurrency(datum.y)}
          labelComponent={
            <VictoryLabel
              dy={-10}
              style={{ fontSize: 10, fill: colors.gray[700], fontWeight: '600' }}
            />
          }
        />
      </VictoryChart>
      
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.profit.main }]} />
          <Text style={styles.legendText}>Positive Cash Flow</Text>
        </View>
        {!isAllPositive && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.loss.main }]} />
            <Text style={styles.legendText}>Negative Cash Flow</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Strategy Comparison Bar Chart - compares all strategies.
 */
export function StrategyComparisonChart({ analytics }: PropertyChartsProps) {
  const data = useMemo(() => {
    const strategies = [
      { 
        name: 'LTR', 
        fullName: 'Long-Term',
        value: analytics.strategies.longTermRental?.primaryValue || 0,
      },
      { 
        name: 'STR', 
        fullName: 'Short-Term',
        value: analytics.strategies.shortTermRental?.primaryValue || 0,
      },
      { 
        name: 'BRRRR', 
        fullName: 'BRRRR',
        value: analytics.strategies.brrrr?.primaryValue || 0,
      },
      { 
        name: 'Flip', 
        fullName: 'Fix & Flip',
        value: analytics.strategies.fixAndFlip?.primaryValue || 0,
      },
      { 
        name: 'Hack', 
        fullName: 'House Hack',
        value: analytics.strategies.houseHack?.primaryValue || 0,
      },
      { 
        name: 'Whole', 
        fullName: 'Wholesale',
        value: analytics.strategies.wholesale?.primaryValue || 0,
      },
    ];
    
    return strategies.map((s, i) => ({
      x: s.name,
      y: s.value,
      fullName: s.fullName,
    }));
  }, [analytics]);

  // Find best and worst strategies
  const sortedByValue = [...data].sort((a, b) => b.y - a.y);
  const bestStrategy = sortedByValue[0];

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Strategy Comparison</Text>
      <Text style={styles.chartSubtitle}>Monthly cash flow by investment strategy</Text>
      
      <VictoryChart
        width={chartWidth}
        height={220}
        padding={{ left: 60, right: 20, top: 20, bottom: 50 }}
        theme={VictoryTheme.material}
        domainPadding={{ x: 20, y: 20 }}
      >
        <VictoryAxis
          style={{
            axis: { stroke: colors.gray[300] },
            tickLabels: { 
              fill: colors.gray[600], 
              fontSize: 10,
              angle: -45,
              textAnchor: 'end',
            },
          }}
        />
        <VictoryAxis
          dependentAxis
          tickFormat={(t) => `$${(t / 1000).toFixed(0)}k`}
          style={{
            axis: { stroke: colors.gray[300] },
            tickLabels: { fill: colors.gray[600], fontSize: 11 },
            grid: { stroke: colors.gray[200], strokeDasharray: '4,4' },
          }}
        />
        <VictoryBar
          data={data}
          style={{
            data: {
              fill: ({ datum }) => {
                if (datum.x === bestStrategy?.x) return colors.primary[600];
                return datum.y >= 0 ? colors.profit.main : colors.loss.main;
              },
              width: 35,
            },
          }}
          cornerRadius={{ top: 4 }}
        />
      </VictoryChart>
      
      {bestStrategy && (
        <View style={styles.bestStrategyBadge}>
          <Text style={styles.bestStrategyLabel}>Best Strategy:</Text>
          <Text style={styles.bestStrategyValue}>
            {bestStrategy.fullName} ({formatCurrency(bestStrategy.y)}/mo)
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Cash-on-Cash Return Comparison Chart.
 */
export function CashOnCashChart({ analytics }: PropertyChartsProps) {
  const data = useMemo(() => {
    const strategies = [
      { 
        name: 'LTR',
        value: analytics.strategies.longTermRental?.secondaryValue || 0,
      },
      { 
        name: 'STR',
        value: analytics.strategies.shortTermRental?.secondaryValue || 0,
      },
      { 
        name: 'BRRRR',
        value: analytics.strategies.brrrr?.secondaryValue || 0,
      },
      { 
        name: 'Hack',
        value: analytics.strategies.houseHack?.secondaryValue || 0,
      },
    ];
    
    return strategies.map(s => ({
      x: s.name,
      y: s.value * 100, // Convert to percentage
    }));
  }, [analytics]);

  // Target line at 8%
  const targetReturn = 8;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Cash-on-Cash Return</Text>
      <Text style={styles.chartSubtitle}>Return on invested capital by strategy</Text>
      
      <VictoryChart
        width={chartWidth}
        height={180}
        padding={{ left: 60, right: 20, top: 20, bottom: 40 }}
        theme={VictoryTheme.material}
        domainPadding={{ x: 40, y: 20 }}
      >
        <VictoryAxis
          style={{
            axis: { stroke: colors.gray[300] },
            tickLabels: { fill: colors.gray[600], fontSize: 11 },
          }}
        />
        <VictoryAxis
          dependentAxis
          tickFormat={(t) => `${t.toFixed(0)}%`}
          style={{
            axis: { stroke: colors.gray[300] },
            tickLabels: { fill: colors.gray[600], fontSize: 11 },
            grid: { stroke: colors.gray[200], strokeDasharray: '4,4' },
          }}
        />
        {/* Target line at 8% */}
        <VictoryLine
          data={[
            { x: data[0]?.x || 'LTR', y: targetReturn },
            { x: data[data.length - 1]?.x || 'Hack', y: targetReturn },
          ]}
          style={{
            data: { stroke: colors.warning.main, strokeDasharray: '6,3', strokeWidth: 2 },
          }}
        />
        <VictoryBar
          data={data}
          style={{
            data: {
              fill: ({ datum }) => datum.y >= targetReturn ? colors.profit.main : colors.info.main,
              width: 40,
            },
          }}
          cornerRadius={{ top: 4 }}
          labels={({ datum }) => `${datum.y.toFixed(1)}%`}
          labelComponent={
            <VictoryLabel
              dy={-8}
              style={{ fontSize: 10, fill: colors.gray[700], fontWeight: '600' }}
            />
          }
        />
      </VictoryChart>
      
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.warning.main }]} />
          <Text style={styles.legendText}>8% Target Return</Text>
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
    marginBottom: 8,
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

