/**
 * TenYearTab - 10-year wealth projections
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { YearProjection } from '../types';
import { formatCurrency, formatCompact, formatPercent } from '../calculations';

interface TenYearTabProps {
  projections: YearProjection[];
  initialInvestment: number;
  isDark?: boolean;
}

export function TenYearTab({ projections, initialInvestment, isDark = true }: TenYearTabProps) {
  const yearTen = projections[9];
  const totalReturn = yearTen 
    ? ((yearTen.totalWealth / initialInvestment) - 1) * 100 
    : 0;

  // Get key years for the chart (1, 2, 3, 5, 7, 10)
  const chartYears = [0, 1, 2, 4, 6, 9].map(i => projections[i]).filter(Boolean);
  const maxWealth = yearTen?.totalWealth || 1;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Summary Stats */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { 
          backgroundColor: isDark ? 'rgba(77,208,225,0.08)' : 'rgba(0,126,167,0.06)',
          borderColor: isDark ? 'rgba(77,208,225,0.15)' : 'rgba(0,126,167,0.12)',
        }]}>
          <Text style={[styles.summaryValue, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
            {formatCompact(yearTen?.totalWealth || 0)}
          </Text>
          <Text style={[styles.summaryLabel, { color: '#6b7280' }]}>
            Total Wealth @ Yr 10
          </Text>
        </View>
        
        <View style={[styles.summaryCard, { 
          backgroundColor: isDark ? 'rgba(77,208,225,0.08)' : 'rgba(0,126,167,0.06)',
          borderColor: isDark ? 'rgba(77,208,225,0.15)' : 'rgba(0,126,167,0.12)',
        }]}>
          <Text style={[styles.summaryValue, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
            {formatPercent(totalReturn, 0)}
          </Text>
          <Text style={[styles.summaryLabel, { color: '#6b7280' }]}>
            Total Return
          </Text>
        </View>
      </View>

      {/* Wealth Growth Chart */}
      <View style={[styles.card, { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }]}>
        <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#07172e' }]}>
          Wealth Growth
        </Text>
        
        <View style={styles.chartContainer}>
          {chartYears.map((projection, index) => {
            const height = (projection.totalWealth / maxWealth) * 100;
            return (
              <View key={index} style={styles.chartBarWrapper}>
                <View 
                  style={[
                    styles.chartBar, 
                    { 
                      height: `${height}%`,
                      backgroundColor: isDark ? '#4dd0e1' : '#007ea7',
                    }
                  ]} 
                />
              </View>
            );
          })}
        </View>
        
        <View style={styles.chartLabels}>
          {[1, 2, 3, 5, 7, 10].map((year, index) => (
            <Text key={index} style={[styles.chartLabel, { color: '#6b7280' }]}>
              Y{year}
            </Text>
          ))}
        </View>
      </View>

      {/* Year-by-Year Table */}
      <View style={[styles.card, { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }]}>
        <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#07172e' }]}>
          Year-by-Year
        </Text>
        
        {/* Table Header */}
        <View style={[styles.tableRow, styles.tableHeader, { 
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)',
        }]}>
          <Text style={[styles.tableHeaderCell, { color: '#6b7280' }]}>Year</Text>
          <Text style={[styles.tableHeaderCell, { color: '#6b7280' }]}>Cash Flow</Text>
          <Text style={[styles.tableHeaderCell, { color: '#6b7280' }]}>Equity</Text>
          <Text style={[styles.tableHeaderCell, { color: '#6b7280' }]}>Total</Text>
        </View>
        
        {/* Table Rows - Show key years */}
        {[0, 1, 2, 4, 9].map((index) => {
          const p = projections[index];
          if (!p) return null;
          return (
            <View 
              key={index} 
              style={[styles.tableRow, { 
                borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.04)',
              }]}
            >
              <Text style={[styles.tableCell, { color: isDark ? '#fff' : '#07172e' }]}>
                {p.year}
              </Text>
              <Text style={[styles.tableCell, styles.positive]}>
                {formatCompact(p.cumulativeCashFlow)}
              </Text>
              <Text style={[styles.tableCell, { color: isDark ? '#fff' : '#07172e' }]}>
                {formatCompact(p.equity)}
              </Text>
              <Text style={[styles.tableCell, styles.positive]}>
                {formatCompact(p.totalWealth)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Assumptions */}
      <View style={[styles.card, { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }]}>
        <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#07172e' }]}>
          Assumptions
        </Text>
        
        <View style={styles.assumptionsList}>
          <Text style={[styles.assumptionItem, { color: isDark ? '#aab2bd' : '#6b7280' }]}>
            • Appreciation: 3%/yr
          </Text>
          <Text style={[styles.assumptionItem, { color: isDark ? '#aab2bd' : '#6b7280' }]}>
            • Rent Growth: 3%/yr
          </Text>
          <Text style={[styles.assumptionItem, { color: isDark ? '#aab2bd' : '#6b7280' }]}>
            • Expense Growth: 2%/yr
          </Text>
          <Text style={[styles.assumptionItem, { color: isDark ? '#aab2bd' : '#6b7280' }]}>
            • Selling Costs: 6%
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
  },
  chartContainer: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  chartBarWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: 20,
    borderRadius: 4,
    minHeight: 4,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  chartLabel: {
    fontSize: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableHeader: {
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
  },
  positive: {
    color: '#22c55e',
    fontWeight: '600',
  },
  assumptionsList: {
    gap: 6,
  },
  assumptionItem: {
    fontSize: 12,
  },
});

