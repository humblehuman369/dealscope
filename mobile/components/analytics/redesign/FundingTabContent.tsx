/**
 * FundingTabContent - Comprehensive Funding/Loan analysis
 * Includes loan terms, summary stats, P&I chart, and amortization table
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { TargetAssumptions, TuneGroup } from './types';
import { TuneSectionNew, createSliderConfig, formatCurrency, formatPercent } from './TuneSectionNew';

interface FundingTabContentProps {
  assumptions: TargetAssumptions;
  onAssumptionChange: (key: keyof TargetAssumptions, value: number) => void;
  isDark?: boolean;
}

export function FundingTabContent({
  assumptions,
  onAssumptionChange,
  isDark = true,
}: FundingTabContentProps) {
  // Calculate loan details
  const loanDetails = useMemo(() => {
    const purchasePrice = assumptions.listPrice * 0.8; // At IQ Target (20% discount)
    const downPaymentAmount = purchasePrice * assumptions.downPaymentPct;
    const loanAmount = purchasePrice - downPaymentAmount;
    const closingCosts = purchasePrice * assumptions.closingCostsPct;
    const totalCashNeeded = downPaymentAmount + closingCosts;
    
    // Monthly P&I calculation
    const monthlyRate = assumptions.interestRate / 12;
    const numPayments = assumptions.loanTermYears * 12;
    const monthlyPI = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    // Total interest over life of loan
    const totalPayments = monthlyPI * numPayments;
    const totalInterest = totalPayments - loanAmount;
    
    // Generate amortization schedule (yearly summary)
    const amortization = generateAmortizationSchedule(
      loanAmount,
      assumptions.interestRate,
      assumptions.loanTermYears
    );
    
    return {
      purchasePrice,
      downPaymentAmount,
      loanAmount,
      closingCosts,
      totalCashNeeded,
      monthlyPI,
      totalPayments,
      totalInterest,
      principalPercent: (loanAmount / totalPayments) * 100,
      interestPercent: (totalInterest / totalPayments) * 100,
      amortization,
    };
  }, [assumptions]);

  // Tune groups for financing
  const tuneGroups = useMemo((): TuneGroup[] => [
    {
      id: 'loan_terms',
      title: 'Loan Terms',
      sliders: [
        createSliderConfig('downPaymentPct', 'Down Payment', assumptions.downPaymentPct, 0.05, 0.30, 0.01, 
          (v) => `${formatCurrency(assumptions.listPrice * 0.8 * v)} (${formatPercent(v, 0)})`),
        createSliderConfig('interestRate', 'Interest Rate', assumptions.interestRate, 0.04, 0.10, 0.00125, 
          (v) => formatPercent(v, 3)),
        createSliderConfig('loanTermYears', 'Loan Term', assumptions.loanTermYears, 15, 30, 5, 
          (v) => `${v} years`),
      ],
    },
  ], [assumptions]);

  return (
    <View style={styles.container}>
      {/* Loan Terms Tune Section */}
      <TuneSectionNew
        groups={tuneGroups}
        onSliderChange={onAssumptionChange}
        isDark={isDark}
      />

      {/* Loan Summary Grid */}
      <View style={[styles.section, styles.loanSummary]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
          Loan Summary
        </Text>
        <View style={styles.summaryGrid}>
          <SummaryStat
            label="Loan Amount"
            value={formatCurrency(loanDetails.loanAmount)}
            isDark={isDark}
          />
          <SummaryStat
            label="Monthly P&I"
            value={formatCurrency(loanDetails.monthlyPI)}
            isDark={isDark}
          />
          <SummaryStat
            label="Total Interest"
            value={formatCurrency(loanDetails.totalInterest)}
            isDark={isDark}
            isNegative
          />
          <SummaryStat
            label="Total Payments"
            value={formatCurrency(loanDetails.totalPayments)}
            isDark={isDark}
          />
        </View>
      </View>

      {/* Principal vs Interest Chart */}
      <View style={[
        styles.section,
        styles.chartCard,
        { 
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.1)',
        }
      ]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
          Principal vs Interest
        </Text>
        <View style={styles.chartContainer}>
          <DonutChart
            principalPercent={loanDetails.principalPercent}
            interestPercent={loanDetails.interestPercent}
            isDark={isDark}
          />
          <View style={styles.chartLegend}>
            <LegendItem
              color="#22c55e"
              label="Principal"
              value={formatCurrency(loanDetails.loanAmount)}
              percent={loanDetails.principalPercent}
              isDark={isDark}
            />
            <LegendItem
              color="#f97316"
              label="Interest"
              value={formatCurrency(loanDetails.totalInterest)}
              percent={loanDetails.interestPercent}
              isDark={isDark}
            />
          </View>
        </View>
      </View>

      {/* Amortization Table */}
      <View style={[
        styles.section,
        styles.amortizationCard,
        { 
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.1)',
        }
      ]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
          Amortization Schedule
        </Text>
        
        {/* Table Header */}
        <View style={[styles.tableHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)' }]}>
          <Text style={[styles.tableHeaderCell, styles.yearCol, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>Year</Text>
          <Text style={[styles.tableHeaderCell, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>Principal</Text>
          <Text style={[styles.tableHeaderCell, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>Interest</Text>
          <Text style={[styles.tableHeaderCell, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>Balance</Text>
        </View>
        
        {/* Table Rows (show first 10 years) */}
        <ScrollView style={styles.tableBody} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {loanDetails.amortization.slice(0, 10).map((row, idx) => (
            <View 
              key={idx} 
              style={[
                styles.tableRow,
                { borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.04)' }
              ]}
            >
              <Text style={[styles.tableCell, styles.yearCol, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(7,23,46,0.6)' }]}>
                {row.year}
              </Text>
              <Text style={[styles.tableCell, { color: '#22c55e' }]}>
                {formatCurrency(row.principal, true)}
              </Text>
              <Text style={[styles.tableCell, { color: '#f97316' }]}>
                {formatCurrency(row.interest, true)}
              </Text>
              <Text style={[styles.tableCell, { color: isDark ? '#fff' : '#07172e' }]}>
                {formatCurrency(row.balance, true)}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Cash to Close Summary */}
      <View style={[
        styles.section,
        styles.cashCloseCard,
        { 
          backgroundColor: isDark ? 'rgba(77,208,225,0.08)' : 'rgba(0,126,167,0.06)',
          borderColor: isDark ? 'rgba(77,208,225,0.2)' : 'rgba(0,126,167,0.15)',
        }
      ]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
          Cash to Close
        </Text>
        <View style={styles.cashCloseRow}>
          <Text style={[styles.cashCloseLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(7,23,46,0.7)' }]}>
            Down Payment
          </Text>
          <Text style={[styles.cashCloseValue, { color: isDark ? '#fff' : '#07172e' }]}>
            {formatCurrency(loanDetails.downPaymentAmount)}
          </Text>
        </View>
        <View style={styles.cashCloseRow}>
          <Text style={[styles.cashCloseLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(7,23,46,0.7)' }]}>
            Closing Costs ({formatPercent(assumptions.closingCostsPct, 0)})
          </Text>
          <Text style={[styles.cashCloseValue, { color: isDark ? '#fff' : '#07172e' }]}>
            {formatCurrency(loanDetails.closingCosts)}
          </Text>
        </View>
        <View style={[styles.cashCloseRow, styles.cashCloseTotal, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(7,23,46,0.1)' }]}>
          <Text style={[styles.cashCloseTotalLabel, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
            Total Cash Needed
          </Text>
          <Text style={[styles.cashCloseTotalValue, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
            {formatCurrency(loanDetails.totalCashNeeded)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// Helper Components

function SummaryStat({ 
  label, 
  value, 
  isDark,
  isNegative,
}: { 
  label: string; 
  value: string; 
  isDark: boolean;
  isNegative?: boolean;
}) {
  return (
    <View style={[
      styles.summaryStatCard,
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }
    ]}>
      <Text style={[
        styles.summaryStatValue, 
        { color: isNegative ? '#f97316' : (isDark ? '#4dd0e1' : '#007ea7') }
      ]}>
        {value}
      </Text>
      <Text style={[styles.summaryStatLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
        {label}
      </Text>
    </View>
  );
}

function DonutChart({ 
  principalPercent, 
  interestPercent,
  isDark,
}: { 
  principalPercent: number; 
  interestPercent: number;
  isDark: boolean;
}) {
  const size = 120;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const principalOffset = 0;
  const interestOffset = circumference * (1 - principalPercent / 100);
  
  return (
    <View style={styles.donutContainer}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)'}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Interest (orange) */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f97316"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={0}
            strokeLinecap="round"
          />
          {/* Principal (green) */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#22c55e"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={interestOffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={[styles.donutCenterLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
          P vs I
        </Text>
      </View>
    </View>
  );
}

function LegendItem({
  color,
  label,
  value,
  percent,
  isDark,
}: {
  color: string;
  label: string;
  value: string;
  percent: number;
  isDark: boolean;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <View style={styles.legendText}>
        <Text style={[styles.legendLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(7,23,46,0.7)' }]}>
          {label}
        </Text>
        <Text style={[styles.legendValue, { color: isDark ? '#fff' : '#07172e' }]}>
          {value}
        </Text>
        <Text style={[styles.legendPercent, { color }]}>
          {percent.toFixed(1)}%
        </Text>
      </View>
    </View>
  );
}

// Helper function to generate amortization schedule
function generateAmortizationSchedule(
  loanAmount: number,
  annualRate: number,
  years: number
): Array<{ year: number; principal: number; interest: number; balance: number }> {
  const monthlyRate = annualRate / 12;
  const numPayments = years * 12;
  const monthlyPayment = loanAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  let balance = loanAmount;
  const schedule: Array<{ year: number; principal: number; interest: number; balance: number }> = [];
  
  for (let year = 1; year <= years; year++) {
    let yearPrincipal = 0;
    let yearInterest = 0;
    
    for (let month = 1; month <= 12; month++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      
      yearPrincipal += principalPayment;
      yearInterest += interestPayment;
      balance -= principalPayment;
    }
    
    schedule.push({
      year,
      principal: yearPrincipal,
      interest: yearInterest,
      balance: Math.max(0, balance),
    });
  }
  
  return schedule;
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  section: {
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  
  // Loan Summary Grid
  loanSummary: {},
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryStatCard: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  summaryStatLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  
  // Chart Card
  chartCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  donutContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  chartLegend: {
    flex: 1,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 11,
    marginBottom: 1,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  legendPercent: {
    fontSize: 10,
    fontWeight: '600',
  },
  
  // Amortization Card
  amortizationCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'right',
  },
  yearCol: {
    flex: 0.5,
    textAlign: 'left',
  },
  tableBody: {
    maxHeight: 200,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  tableCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'right',
  },
  
  // Cash to Close
  cashCloseCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  cashCloseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  cashCloseLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  cashCloseValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  cashCloseTotal: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  cashCloseTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  cashCloseTotalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});
