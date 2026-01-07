/**
 * CashFlowTab - Line-by-line breakdown of monthly income and expenses
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AnalyticsInputs, CalculatedMetrics } from '../types';
import { formatCurrency, formatPercent, calculateMortgagePayment } from '../calculations';

interface CashFlowTabProps {
  inputs: AnalyticsInputs;
  metrics: CalculatedMetrics;
  isDark?: boolean;
}

export function CashFlowTab({ inputs, metrics, isDark = true }: CashFlowTabProps) {
  const {
    monthlyRent,
    otherIncome,
    vacancyRate,
    maintenanceRate,
    managementRate,
    annualPropertyTax,
    annualInsurance,
    monthlyHoa,
  } = inputs;

  // Calculate individual expense items
  const grossIncome = monthlyRent + otherIncome;
  const vacancy = grossIncome * vacancyRate;
  const maintenance = grossIncome * maintenanceRate;
  const management = grossIncome * managementRate;
  const propertyTax = annualPropertyTax / 12;
  const insurance = annualInsurance / 12;
  const mortgage = metrics.mortgagePayment;

  const totalExpenses = vacancy + maintenance + management + propertyTax + insurance + monthlyHoa + mortgage;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Monthly Income */}
      <View style={[styles.card, { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }]}>
        <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#07172e' }]}>
          Monthly Income
        </Text>
        
        <FlowRow 
          label="Gross Rental Income" 
          value={monthlyRent} 
          type="income" 
          isDark={isDark} 
        />
        {otherIncome > 0 && (
          <FlowRow 
            label="Other Income" 
            value={otherIncome} 
            type="income" 
            isDark={isDark} 
          />
        )}
        
        <View style={[styles.totalRow, { borderColor: isDark ? 'rgba(77,208,225,0.3)' : 'rgba(0,126,167,0.2)' }]}>
          <Text style={[styles.totalLabel, { color: isDark ? '#fff' : '#07172e' }]}>
            Total Income
          </Text>
          <Text style={[styles.totalValue, { color: isDark ? '#fff' : '#07172e' }]}>
            {formatCurrency(grossIncome)}
          </Text>
        </View>
      </View>

      {/* Monthly Expenses */}
      <View style={[styles.card, { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }]}>
        <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#07172e' }]}>
          Monthly Expenses
        </Text>
        
        <FlowRow 
          label={`Vacancy (${formatPercent(vacancyRate * 100, 0)})`} 
          value={vacancy} 
          type="expense" 
          isDark={isDark} 
        />
        {management > 0 && (
          <FlowRow 
            label={`Property Management (${formatPercent(managementRate * 100, 0)})`} 
            value={management} 
            type="expense" 
            isDark={isDark} 
          />
        )}
        <FlowRow 
          label={`Maintenance (${formatPercent(maintenanceRate * 100, 0)})`} 
          value={maintenance} 
          type="expense" 
          isDark={isDark} 
        />
        <FlowRow 
          label="Property Tax" 
          value={propertyTax} 
          type="expense" 
          isDark={isDark} 
        />
        <FlowRow 
          label="Insurance" 
          value={insurance} 
          type="expense" 
          isDark={isDark} 
        />
        {monthlyHoa > 0 && (
          <FlowRow 
            label="HOA Fees" 
            value={monthlyHoa} 
            type="expense" 
            isDark={isDark} 
          />
        )}
        <FlowRow 
          label="Mortgage (P&I)" 
          value={mortgage} 
          type="expense" 
          isDark={isDark} 
        />
        
        <View style={[styles.totalRow, { borderColor: isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)' }]}>
          <Text style={[styles.totalLabel, { color: isDark ? '#fff' : '#07172e' }]}>
            Total Expenses
          </Text>
          <Text style={[styles.totalValue, { color: '#ef4444' }]}>
            -{formatCurrency(totalExpenses)}
          </Text>
        </View>
      </View>

      {/* Net Cash Flow */}
      <View style={[styles.card, styles.cashFlowCard, { 
        backgroundColor: metrics.monthlyCashFlow >= 0 
          ? isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.08)'
          : isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)',
        borderColor: metrics.monthlyCashFlow >= 0 
          ? 'rgba(34,197,94,0.2)' 
          : 'rgba(239,68,68,0.2)',
      }]}>
        <Text style={[styles.cashFlowLabel, { color: isDark ? '#fff' : '#07172e' }]}>
          Net Monthly Cash Flow
        </Text>
        <Text style={[
          styles.cashFlowValue,
          { color: metrics.monthlyCashFlow >= 0 ? '#22c55e' : '#ef4444' }
        ]}>
          {formatCurrency(metrics.monthlyCashFlow)}
        </Text>
      </View>

      {/* Key Returns */}
      <View style={[styles.card, { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }]}>
        <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#07172e' }]}>
          Key Returns
        </Text>
        
        <View style={styles.metricsGrid}>
          <MetricBox 
            label="Cash-on-Cash" 
            value={formatPercent(metrics.cashOnCash)} 
            benchmark="✓ > 12%"
            isGood={metrics.cashOnCash >= 12}
            isDark={isDark}
          />
          <MetricBox 
            label="Cap Rate" 
            value={formatPercent(metrics.capRate)} 
            benchmark="✓ > 8%"
            isGood={metrics.capRate >= 8}
            isDark={isDark}
          />
          <MetricBox 
            label="DSCR" 
            value={metrics.dscr.toFixed(2)} 
            benchmark="✓ > 1.25"
            isGood={metrics.dscr >= 1.25}
            isDark={isDark}
          />
          <MetricBox 
            label="Annual CF" 
            value={formatCurrency(metrics.annualCashFlow)} 
            isGood={metrics.annualCashFlow > 0}
            isDark={isDark}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function FlowRow({ 
  label, 
  value, 
  type, 
  isDark 
}: { 
  label: string; 
  value: number; 
  type: 'income' | 'expense'; 
  isDark: boolean;
}) {
  return (
    <View style={[styles.flowRow, { borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.04)' }]}>
      <Text style={[styles.flowLabel, { color: isDark ? '#aab2bd' : '#6b7280' }]}>
        {label}
      </Text>
      <Text style={[
        styles.flowValue,
        { color: type === 'income' ? '#22c55e' : '#ef4444' }
      ]}>
        {type === 'income' ? '+' : '-'}{formatCurrency(value)}
      </Text>
    </View>
  );
}

function MetricBox({ 
  label, 
  value, 
  benchmark, 
  isGood,
  isDark 
}: { 
  label: string; 
  value: string; 
  benchmark?: string;
  isGood: boolean;
  isDark: boolean;
}) {
  return (
    <View style={[styles.metricBox, { 
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(7,23,46,0.02)',
    }]}>
      <Text style={[styles.metricValue, { color: isGood ? '#22c55e' : (isDark ? '#fff' : '#07172e') }]}>
        {value}
      </Text>
      <Text style={[styles.metricLabel, { color: '#6b7280' }]}>{label}</Text>
      {benchmark && (
        <Text style={[styles.metricBenchmark, { color: isGood ? '#22c55e' : '#f97316' }]}>
          {benchmark}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 12,
  },
  flowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  flowLabel: {
    fontSize: 13,
  },
  flowValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  cashFlowCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  cashFlowLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  cashFlowValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricBox: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  metricBenchmark: {
    fontSize: 9,
    marginTop: 4,
  },
});

