/**
 * LoanTab - Loan details, amortization, and payoff timeline
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { AnalyticsInputs, CalculatedMetrics, AmortizationRow } from '../types';
import { formatCurrency, formatCompact, formatPercent, calculateAmortizationSchedule, aggregateAmortizationByYear } from '../calculations';

type AmortizationView = 'yearly' | 'monthly';

interface LoanTabProps {
  inputs: AnalyticsInputs;
  metrics: CalculatedMetrics;
  isDark?: boolean;
}

export function LoanTab({ inputs, metrics, isDark = true }: LoanTabProps) {
  const [amortView, setAmortView] = useState<AmortizationView>('yearly');

  const monthlySchedule = useMemo(
    () => calculateAmortizationSchedule(metrics.loanAmount, inputs.interestRate, inputs.loanTermYears),
    [metrics.loanAmount, inputs.interestRate, inputs.loanTermYears],
  );
  const annualSchedule = useMemo(
    () => aggregateAmortizationByYear(monthlySchedule),
    [monthlySchedule],
  );

  const totalInterest = monthlySchedule.reduce((sum, row) => sum + row.interest, 0);
  const totalPaid = metrics.loanAmount + totalInterest;
  const principalPercent = (metrics.loanAmount / totalPaid) * 100;

  // Key years for annual view
  const keyYears = [0, 1, 4, 9, inputs.loanTermYears - 1].map(i => annualSchedule[i]).filter(Boolean);

  // Key months for monthly view (first 12 months + every 12th month thereafter)
  const keyMonths = useMemo(() => {
    if (amortView !== 'monthly') return [];
    const result: AmortizationRow[] = [];
    for (let i = 0; i < monthlySchedule.length; i++) {
      if (i < 12 || (i + 1) % 12 === 0) {
        result.push(monthlySchedule[i]);
      }
    }
    return result;
  }, [amortView, monthlySchedule]);

  // Donut chart dimensions
  const size = 100;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const principalDash = (circumference * principalPercent) / 100;

  // Payoff date
  const payoffDate = new Date();
  payoffDate.setFullYear(payoffDate.getFullYear() + inputs.loanTermYears);
  const payoffDateStr = payoffDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Loan Summary */}
      <View style={styles.summaryGrid}>
        <SummaryBox 
          label="Loan Amount" 
          value={formatCompact(metrics.loanAmount)} 
          isDark={isDark} 
        />
        <SummaryBox 
          label="Interest Rate" 
          value={formatPercent(inputs.interestRate)} 
          isDark={isDark} 
        />
        <SummaryBox 
          label="Loan Term" 
          value={`${inputs.loanTermYears} yrs`} 
          isDark={isDark} 
        />
        <SummaryBox 
          label="Monthly P&I" 
          value={formatCurrency(metrics.mortgagePayment)} 
          isDark={isDark} 
        />
      </View>

      {/* Total Over Loan Life */}
      <View style={[styles.card, { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }]}>
        <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#07172e' }]}>
          Total Over Loan Life
        </Text>
        
        <View style={styles.donutRow}>
          {/* Donut Chart */}
          <View style={styles.donutContainer}>
            <Svg width={size} height={size}>
              <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
                {/* Interest (background) */}
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="#4dd0e1"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                {/* Principal */}
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="#0465f2"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - principalDash}
                />
              </G>
            </Svg>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#0465f2' }]} />
              <View>
                <Text style={[styles.legendValue, { color: isDark ? '#fff' : '#07172e' }]}>
                  {formatCompact(metrics.loanAmount)}
                </Text>
                <Text style={[styles.legendLabel, { color: '#6b7280' }]}>
                  Principal ({Math.round(principalPercent)}%)
                </Text>
              </View>
            </View>
            
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4dd0e1' }]} />
              <View>
                <Text style={[styles.legendValue, { color: isDark ? '#fff' : '#07172e' }]}>
                  {formatCompact(totalInterest)}
                </Text>
                <Text style={[styles.legendLabel, { color: '#6b7280' }]}>
                  Interest ({Math.round(100 - principalPercent)}%)
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.totalBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(7,23,46,0.03)' }]}>
          <Text style={[styles.totalLabel, { color: '#6b7280' }]}>Total:</Text>
          <Text style={[styles.totalValue, { color: isDark ? '#fff' : '#07172e' }]}>
            {formatCurrency(totalPaid)}
          </Text>
        </View>
      </View>

      {/* Amortization Schedule */}
      <View style={[styles.card, { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }]}>
        {/* Header row with toggle */}
        <View style={styles.amortHeader}>
          <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#07172e', marginBottom: 0 }]}>
            Amortization
          </Text>
          <View style={[styles.toggleRow, { 
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.06)',
          }]}>
            <TouchableOpacity
              style={[styles.toggleBtn, amortView === 'yearly' && styles.toggleBtnActive]}
              onPress={() => setAmortView('yearly')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.toggleText,
                { color: amortView === 'yearly' ? '#fff' : '#6b7280' },
              ]}>
                Yearly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, amortView === 'monthly' && styles.toggleBtnActive]}
              onPress={() => setAmortView('monthly')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.toggleText,
                { color: amortView === 'monthly' ? '#fff' : '#6b7280' },
              ]}>
                Monthly
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Table Header */}
        <View style={[styles.tableRow, styles.tableHeader, { 
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)',
        }]}>
          <Text style={[styles.tableHeaderCell, { color: '#6b7280' }]}>
            {amortView === 'yearly' ? 'Year' : 'Mo'}
          </Text>
          <Text style={[styles.tableHeaderCell, { color: '#6b7280' }]}>Principal</Text>
          <Text style={[styles.tableHeaderCell, { color: '#6b7280' }]}>Interest</Text>
          <Text style={[styles.tableHeaderCell, { color: '#6b7280' }]}>Balance</Text>
        </View>
        
        {/* Yearly View */}
        {amortView === 'yearly' && keyYears.map((row, index) => (
          <View 
            key={`yr-${index}`} 
            style={[styles.tableRow, { 
              borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.04)',
            }]}
          >
            <Text style={[styles.tableCell, { color: isDark ? '#fff' : '#07172e' }]}>
              {row.year}
            </Text>
            <Text style={[styles.tableCell, { color: '#0465f2' }]}>
              {formatCompact(row.principal)}
            </Text>
            <Text style={[styles.tableCell, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
              {formatCompact(row.interest)}
            </Text>
            <Text style={[styles.tableCell, { color: isDark ? '#fff' : '#07172e' }]}>
              {formatCompact(row.balance)}
            </Text>
          </View>
        ))}

        {/* Monthly View */}
        {amortView === 'monthly' && keyMonths.map((row) => (
          <View 
            key={`mo-${row.month}`} 
            style={[styles.tableRow, { 
              borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.04)',
            }]}
          >
            <Text style={[styles.tableCell, { color: isDark ? '#fff' : '#07172e' }]}>
              {row.month}
            </Text>
            <Text style={[styles.tableCell, { color: '#0465f2' }]}>
              {formatCurrency(row.principal)}
            </Text>
            <Text style={[styles.tableCell, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
              {formatCurrency(row.interest)}
            </Text>
            <Text style={[styles.tableCell, { color: isDark ? '#fff' : '#07172e' }]}>
              {formatCompact(row.balance)}
            </Text>
          </View>
        ))}
      </View>

      {/* Payoff Timeline */}
      <View style={[styles.insightCard, { 
        backgroundColor: isDark ? 'rgba(77,208,225,0.08)' : 'rgba(0,126,167,0.05)',
        borderColor: isDark ? 'rgba(77,208,225,0.2)' : 'rgba(0,126,167,0.15)',
      }]}>
        <Text style={styles.insightIcon}>🎯</Text>
        <View style={styles.insightContent}>
          <Text style={[styles.insightTitle, { color: isDark ? '#fff' : '#07172e' }]}>
            Payoff Date: {payoffDateStr}
          </Text>
          <Text style={[styles.insightSubtitle, { color: '#6b7280' }]}>
            {inputs.loanTermYears * 12} payments remaining
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function SummaryBox({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <View style={[styles.summaryBox, { 
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(7,23,46,0.02)',
    }]}>
      <Text style={[styles.summaryValue, { color: isDark ? '#fff' : '#07172e' }]}>
        {value}
      </Text>
      <Text style={[styles.summaryLabel, { color: '#6b7280' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  summaryBox: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 10,
    marginTop: 2,
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
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  donutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  legendLabel: {
    fontSize: 10,
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
  },
  totalLabel: {
    fontSize: 13,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  amortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#0465f2',
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
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
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  insightIcon: {
    fontSize: 20,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  insightSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});

