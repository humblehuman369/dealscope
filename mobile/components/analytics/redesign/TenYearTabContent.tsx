/**
 * TenYearTabContent - 10-Year Projection Analysis
 * Shows long-term wealth building projections
 * 
 * Now supports API-provided yearly projection data (Phase 1, Step 2)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TargetAssumptions, IQTargetResult, StrategyId, ProjectionsData } from './types';

interface TenYearTabContentProps {
  assumptions: TargetAssumptions;
  iqTarget: IQTargetResult;
  strategy: StrategyId;
  isDark?: boolean;
  // NEW: API-provided projections data
  apiProjections?: ProjectionsData | null;
  isLoading?: boolean;
}

export function TenYearTabContent({
  assumptions,
  iqTarget,
  strategy,
  isDark = true,
  apiProjections,
  isLoading = false,
}: TenYearTabContentProps) {
  // ============================================
  // 10-YEAR PROJECTIONS: Use API data if available
  // ============================================
  const projections = useMemo(() => {
    // If API data is available and has yearly data, use it
    if (apiProjections && apiProjections.yearlyData && apiProjections.yearlyData.length >= 10) {
      return {
        initialInvestment: apiProjections.initialInvestment,
        totalCashFlow: apiProjections.totalCashFlow,
        equityBuilt: apiProjections.equityBuilt,
        portfolioValue: apiProjections.portfolioValue,
        totalReturn: apiProjections.totalReturn,
        totalROI: apiProjections.totalROI,
        yearlyData: apiProjections.yearlyData,
        isFromApi: true,
      };
    }
    
    // ============================================
    // FALLBACK: Local calculation (old code, kept for Phase 3 cleanup)
    // ============================================
    const annualRentGrowth = apiProjections?.rentGrowthRate ?? 0.03; // 3% default
    const propertyAppreciation = apiProjections?.appreciationRate ?? 0.035; // 3.5% default
    const purchasePrice = iqTarget.targetPrice || assumptions.listPrice * 0.8; // Use API target
    const downPayment = purchasePrice * assumptions.downPaymentPct;
    const closingCosts = purchasePrice * assumptions.closingCostsPct;
    const initialInvestment = downPayment + closingCosts;
    
    let totalCashFlow = 0;
    let currentRent = assumptions.monthlyRent;
    let currentValue = purchasePrice;
    const yearlyData: Array<{
      year: number;
      cashFlow: number;
      propertyValue: number;
      equity: number;
      cumulativeCashFlow: number;
    }> = [];
    
    // Calculate loan paydown per year (simplified)
    const loanAmount = purchasePrice - downPayment;
    const monthlyRate = assumptions.interestRate / 12;
    const numPayments = assumptions.loanTermYears * 12;
    const monthlyPayment = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
      (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    let remainingLoan = loanAmount;
    
    for (let year = 1; year <= 10; year++) {
      // Update rent and property value
      if (year > 1) {
        currentRent *= (1 + annualRentGrowth);
        currentValue *= (1 + propertyAppreciation);
      }
      
      // Calculate yearly cash flow (simplified)
      const annualRent = currentRent * 12;
      const annualExpenses = (monthlyPayment * 12) + 
        assumptions.propertyTaxes + 
        assumptions.insurance + 
        (annualRent * assumptions.managementPct) +
        (annualRent * assumptions.maintenancePct);
      const yearlyCashFlow = annualRent * (1 - assumptions.vacancyRate) - annualExpenses;
      totalCashFlow += yearlyCashFlow;
      
      // Calculate loan paydown (simplified - actual would require full amortization)
      let yearPrincipal = 0;
      for (let month = 0; month < 12; month++) {
        const interestPayment = remainingLoan * monthlyRate;
        const principalPayment = monthlyPayment - interestPayment;
        yearPrincipal += principalPayment;
        remainingLoan -= principalPayment;
      }
      
      const equity = currentValue - remainingLoan;
      
      yearlyData.push({
        year,
        cashFlow: yearlyCashFlow,
        propertyValue: currentValue,
        equity,
        cumulativeCashFlow: totalCashFlow,
      });
    }
    
    const finalEquity = yearlyData[9]?.equity || 0;
    const finalPropertyValue = yearlyData[9]?.propertyValue || purchasePrice;
    const totalReturn = totalCashFlow + (finalEquity - initialInvestment);
    const totalROI = (totalReturn / initialInvestment) * 100;
    
    return {
      initialInvestment,
      totalCashFlow,
      equityBuilt: finalEquity - (purchasePrice - loanAmount),
      portfolioValue: finalPropertyValue,
      totalReturn,
      totalROI,
      yearlyData,
      isFromApi: false,
    };
  }, [assumptions, strategy, iqTarget, apiProjections]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return `$${Math.round(value).toLocaleString()}`;
  };

  return (
    <View style={styles.container}>
      {/* Hero ROI Card */}
      <LinearGradient
        colors={isDark 
          ? ['rgba(77,208,225,0.12)', 'rgba(4,101,242,0.08)']
          : ['rgba(0,126,167,0.08)', 'rgba(4,101,242,0.06)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroCard, { borderColor: isDark ? 'rgba(77,208,225,0.25)' : 'rgba(0,126,167,0.2)' }]}
      >
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={isDark ? '#4dd0e1' : '#007ea7'} />
          </View>
        )}
        <Text style={[styles.heroLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
          10-YEAR TOTAL ROI
        </Text>
        <Text style={[styles.heroValue, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
          {projections.totalROI.toFixed(0)}%
        </Text>
        <Text style={[styles.heroSubtitle, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(7,23,46,0.6)' }]}>
          On {formatCurrency(projections.initialInvestment)} initial investment
        </Text>
      </LinearGradient>

      {/* Summary Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          label="Total Cash Flow"
          value={formatCurrency(projections.totalCashFlow)}
          sublabel="10 years"
          isPositive={projections.totalCashFlow > 0}
          isDark={isDark}
        />
        <StatCard
          label="Equity Built"
          value={formatCurrency(projections.equityBuilt)}
          sublabel="Principal paydown + appreciation"
          isPositive
          isDark={isDark}
        />
        <StatCard
          label="Property Value"
          value={formatCurrency(projections.portfolioValue)}
          sublabel="Year 10"
          isDark={isDark}
        />
        <StatCard
          label="Total Return"
          value={formatCurrency(projections.totalReturn)}
          sublabel="Cash flow + equity"
          isPositive
          isDark={isDark}
        />
      </View>

      {/* Year by Year Breakdown */}
      <View style={[
        styles.tableCard,
        { 
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
        }
      ]}>
        <Text style={[styles.tableTitle, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
          Year-by-Year Breakdown
        </Text>
        
        <View style={[styles.tableHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)' }]}>
          <Text style={[styles.headerCell, styles.yearCol, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>Yr</Text>
          <Text style={[styles.headerCell, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>Cash Flow</Text>
          <Text style={[styles.headerCell, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>Value</Text>
          <Text style={[styles.headerCell, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>Equity</Text>
        </View>
        
        <ScrollView style={styles.tableBody} nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {projections.yearlyData.map((row, idx) => (
            <View 
              key={idx}
              style={[
                styles.tableRow,
                { borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.04)' },
                idx === 9 && styles.lastRow,
              ]}
            >
              <Text style={[styles.cell, styles.yearCol, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(7,23,46,0.6)' }]}>
                {row.year}
              </Text>
              <Text style={[
                styles.cell, 
                { color: row.cashFlow >= 0 ? '#22c55e' : '#ef4444' }
              ]}>
                {row.cashFlow >= 0 ? '+' : ''}{formatCurrency(row.cashFlow).replace('$', '$')}
              </Text>
              <Text style={[styles.cell, { color: isDark ? '#fff' : '#07172e' }]}>
                {formatCurrency(row.propertyValue)}
              </Text>
              <Text style={[styles.cell, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
                {formatCurrency(row.equity)}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Insight */}
      <View style={[
        styles.insightCard,
        { 
          backgroundColor: isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.06)',
          borderColor: isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.12)',
        }
      ]}>
        <Text style={styles.insightIcon}>💡</Text>
        <Text style={[styles.insightText, { color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(7,23,46,0.8)' }]}>
          After 10 years, your <Text style={{ color: '#22c55e', fontWeight: '600' }}>{formatCurrency(projections.initialInvestment)}</Text> investment 
          grows to <Text style={{ color: '#22c55e', fontWeight: '600' }}>{formatCurrency(projections.totalReturn)}</Text> in total returns — 
          that's a <Text style={{ color: '#22c55e', fontWeight: '600' }}>{projections.totalROI.toFixed(0)}% ROI</Text>.
        </Text>
      </View>
    </View>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  isPositive,
  isDark,
}: {
  label: string;
  value: string;
  sublabel?: string;
  isPositive?: boolean;
  isDark: boolean;
}) {
  return (
    <View style={[
      styles.statCard,
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }
    ]}>
      <Text style={[
        styles.statValue,
        { color: isPositive ? '#22c55e' : (isDark ? '#4dd0e1' : '#007ea7') }
      ]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(7,23,46,0.7)' }]}>
        {label}
      </Text>
      {sublabel && (
        <Text style={[styles.statSublabel, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)' }]}>
          {sublabel}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  
  // Hero Card
  heroCard: {
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroValue: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 52,
  },
  heroSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  statSublabel: {
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  
  // Table
  tableCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  tableTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  headerCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'right',
  },
  yearCol: {
    flex: 0.4,
    textAlign: 'left',
  },
  tableBody: {
    maxHeight: 250,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  cell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'right',
  },
  
  // Insight
  insightCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  insightIcon: {
    fontSize: 16,
  },
  insightText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
