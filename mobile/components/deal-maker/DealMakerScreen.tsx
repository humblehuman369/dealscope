/**
 * DealMakerScreen - Deal Maker Pro main container component
 * Orchestrates state management, calculations, and all child components
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text,
  ScrollView, 
  StyleSheet, 
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SegmentedControl from '@react-native-segmented-control/segmented-control';

import { calculateMortgagePayment } from '../analytics/calculations';

import { MetricsHeader } from './MetricsHeader';
import { WorksheetTab } from './WorksheetTab';
import { DealMakerSlider, formatSliderValue } from './DealMakerSlider';
import {
  DealMakerState,
  DealMakerMetrics,
  DealMakerScreenProps,
  TabId,
  TabConfig,
  TAB_CONFIGS,
  DEFAULT_DEAL_MAKER_STATE,
  BUY_PRICE_SLIDERS,
  FINANCING_SLIDERS,
  REHAB_VALUATION_SLIDERS,
  INCOME_SLIDERS,
  EXPENSES_SLIDERS,
  LoanType,
  DEAL_MAKER_PRO_COLORS,
} from './types';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DealMakerScreen({
  propertyAddress,
  listPrice,
  initialState,
  propertyTax,
  insurance,
  rentEstimate,
  onBackPress,
}: DealMakerScreenProps) {
  const insets = useSafeAreaInsets();

  // ==========================================================================
  // STATE
  // ==========================================================================

  const [state, setState] = useState<DealMakerState>(() => ({
    ...DEFAULT_DEAL_MAKER_STATE,
    buyPrice: listPrice ?? DEFAULT_DEAL_MAKER_STATE.buyPrice,
    annualPropertyTax: propertyTax ?? DEFAULT_DEAL_MAKER_STATE.annualPropertyTax,
    annualInsurance: insurance ?? DEFAULT_DEAL_MAKER_STATE.annualInsurance,
    monthlyRent: rentEstimate ?? DEFAULT_DEAL_MAKER_STATE.monthlyRent,
    arv: (listPrice ?? DEFAULT_DEAL_MAKER_STATE.buyPrice) * 1.2,
    ...initialState,
  }));

  const [activeTab, setActiveTab] = useState<TabId>('buyPrice');
  const [completedTabs, setCompletedTabs] = useState<Set<TabId>>(new Set());

  // ==========================================================================
  // CALCULATIONS
  // ==========================================================================

  const metrics = useMemo<DealMakerMetrics>(() => {
    return calculateDealMakerMetrics(state, listPrice);
  }, [state, listPrice]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const updateState = useCallback(<K extends keyof DealMakerState>(
    key: K,
    value: DealMakerState[K]
  ) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleTabToggle = useCallback((tabId: TabId) => {
    setActiveTab(prev => prev === tabId ? tabId : tabId);
  }, []);

  const handleContinue = useCallback((currentTabId: TabId) => {
    // Mark current tab as completed
    setCompletedTabs(prev => new Set(prev).add(currentTabId));

    // Move to next tab
    const tabOrder: TabId[] = ['buyPrice', 'financing', 'rehabValuation', 'income', 'expenses'];
    const currentIndex = tabOrder.indexOf(currentTabId);
    
    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    } else {
      // Last tab - handle finish
      handleFinish();
    }
  }, []);

  const handleFinish = useCallback(() => {
    // TODO: Save deal to database or navigate to summary
    console.log('Deal saved:', { state, metrics });
  }, [state, metrics]);

  // ==========================================================================
  // TAB CONFIGS WITH STATUS
  // ==========================================================================

  const tabConfigs = useMemo<TabConfig[]>(() => {
    return TAB_CONFIGS.map(config => ({
      ...config,
      status: completedTabs.has(config.id) 
        ? 'completed' 
        : config.id === activeTab 
          ? 'active' 
          : 'pending',
    }));
  }, [activeTab, completedTabs]);

  // ==========================================================================
  // LOAN TYPE HANDLER
  // ==========================================================================

  const loanTypeOptions = ['15-Year Fixed', '30-Year Fixed', 'ARM'];
  const loanTypeIndex = state.loanType === '15-year' ? 0 : state.loanType === '30-year' ? 1 : 2;

  const handleLoanTypeChange = useCallback((index: number) => {
    const loanTypes: LoanType[] = ['15-year', '30-year', 'arm'];
    const newType = loanTypes[index];
    updateState('loanType', newType);
    
    // Also update loan term based on type
    if (newType === '15-year') {
      updateState('loanTermYears', 15);
    } else if (newType === '30-year') {
      updateState('loanTermYears', 30);
    }
  }, [updateState]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DEAL_MAKER_PRO_COLORS.header} />

      {/* Fixed Header with Metrics */}
      <View style={{ paddingTop: insets.top, backgroundColor: DEAL_MAKER_PRO_COLORS.header }}>
        <MetricsHeader 
          state={state} 
          metrics={metrics} 
          listPrice={listPrice}
          propertyAddress={propertyAddress}
          onBackPress={onBackPress}
        />
      </View>

      {/* Scrollable Worksheet Tabs */}
      <KeyboardAvoidingView 
        style={styles.scrollContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Tab 1: Buy Price */}
          <WorksheetTab
            config={tabConfigs[0]}
            isExpanded={activeTab === 'buyPrice'}
            onToggle={() => handleTabToggle('buyPrice')}
            onContinue={() => handleContinue('buyPrice')}
            derivedOutput={{
              label: 'CASH NEEDED',
              value: formatSliderValue(metrics.cashNeeded, 'currency'),
            }}
          >
            {BUY_PRICE_SLIDERS.map(slider => (
              <DealMakerSlider
                key={slider.id}
                config={slider}
                value={state[slider.id] as number}
                onChange={(value) => updateState(slider.id, value)}
              />
            ))}
          </WorksheetTab>

          {/* Tab 2: Financing */}
          <WorksheetTab
            config={tabConfigs[1]}
            isExpanded={activeTab === 'financing'}
            onToggle={() => handleTabToggle('financing')}
            onContinue={() => handleContinue('financing')}
            derivedOutput={{
              label: 'MONTHLY PAYMENT',
              value: formatSliderValue(metrics.monthlyPayment, 'currency'),
            }}
          >
            {/* Loan Amount (calculated, display only) */}
            <View style={styles.calculatedRow}>
              <Text style={styles.calculatedLabel}>Loan Amount</Text>
              <Text style={styles.calculatedValue}>
                {formatSliderValue(metrics.loanAmount, 'currency')}
              </Text>
            </View>

            {/* Loan Type Segmented Control */}
            <View style={styles.segmentedContainer}>
              <Text style={styles.segmentedLabel}>Loan Type</Text>
              <SegmentedControl
                values={loanTypeOptions}
                selectedIndex={loanTypeIndex}
                onChange={(event) => handleLoanTypeChange(event.nativeEvent.selectedSegmentIndex)}
                style={styles.segmentedControl}
                tintColor={DEAL_MAKER_PRO_COLORS.ctaButton}
                fontStyle={{ fontSize: 13 }}
                activeFontStyle={{ fontSize: 13, fontWeight: '600' }}
              />
            </View>

            {/* Interest Rate and Loan Term Sliders */}
            {FINANCING_SLIDERS.map(slider => (
              <DealMakerSlider
                key={slider.id}
                config={slider}
                value={state[slider.id] as number}
                onChange={(value) => updateState(slider.id, value)}
              />
            ))}
          </WorksheetTab>

          {/* Tab 3: Rehab & Valuation */}
          <WorksheetTab
            config={tabConfigs[2]}
            isExpanded={activeTab === 'rehabValuation'}
            onToggle={() => handleTabToggle('rehabValuation')}
            onContinue={() => handleContinue('rehabValuation')}
            derivedOutput={{
              label: 'EQUITY CREATED',
              value: formatSliderValue(metrics.equityCreated, 'currency'),
            }}
          >
            {REHAB_VALUATION_SLIDERS.map(slider => (
              <DealMakerSlider
                key={slider.id}
                config={{
                  ...slider,
                  // Dynamic ARV range based on buy price
                  ...(slider.id === 'arv' && {
                    min: state.buyPrice,
                    max: state.buyPrice * 2,
                  }),
                }}
                value={state[slider.id] as number}
                onChange={(value) => updateState(slider.id, value)}
              />
            ))}
          </WorksheetTab>

          {/* Tab 4: Income */}
          <WorksheetTab
            config={tabConfigs[3]}
            isExpanded={activeTab === 'income'}
            onToggle={() => handleTabToggle('income')}
            onContinue={() => handleContinue('income')}
            derivedOutput={{
              label: 'GROSS MONTHLY INCOME',
              value: formatSliderValue(metrics.grossMonthlyIncome, 'currencyPerMonth'),
            }}
          >
            {INCOME_SLIDERS.map(slider => (
              <DealMakerSlider
                key={slider.id}
                config={slider}
                value={state[slider.id] as number}
                onChange={(value) => updateState(slider.id, value)}
              />
            ))}
          </WorksheetTab>

          {/* Tab 5: Expenses */}
          <WorksheetTab
            config={tabConfigs[4]}
            isExpanded={activeTab === 'expenses'}
            onToggle={() => handleTabToggle('expenses')}
            onContinue={() => handleContinue('expenses')}
            derivedOutput={{
              label: 'TOTAL MONTHLY EXPENSES',
              value: formatSliderValue(metrics.totalMonthlyExpenses, 'currencyPerMonth'),
            }}
            isLastTab
          >
            {EXPENSES_SLIDERS.map(slider => (
              <DealMakerSlider
                key={slider.id}
                config={slider}
                value={state[slider.id] as number}
                onChange={(value) => updateState(slider.id, value)}
              />
            ))}
          </WorksheetTab>

          {/* Bottom padding */}
          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// =============================================================================
// CALCULATIONS
// =============================================================================

function calculateDealMakerMetrics(
  state: DealMakerState,
  listPrice?: number
): DealMakerMetrics {
  const {
    buyPrice,
    downPaymentPercent,
    closingCostsPercent,
    interestRate,
    loanTermYears,
    rehabBudget,
    arv,
    monthlyRent,
    otherIncome,
    vacancyRate,
    maintenanceRate,
    managementRate,
    annualPropertyTax,
    annualInsurance,
    monthlyHoa,
  } = state;

  // Buy Price calculations
  const downPaymentAmount = buyPrice * downPaymentPercent;
  const closingCostsAmount = buyPrice * closingCostsPercent;
  const cashNeeded = downPaymentAmount + closingCostsAmount;

  // Financing calculations
  const loanAmount = buyPrice - downPaymentAmount;
  const monthlyPayment = calculateMortgagePayment(loanAmount, interestRate, loanTermYears);

  // Rehab & Valuation calculations
  const totalInvestment = buyPrice + rehabBudget;
  const equityCreated = arv - totalInvestment;

  // Income calculations
  const grossMonthlyIncome = monthlyRent + otherIncome;

  // Expenses calculations
  const vacancy = grossMonthlyIncome * vacancyRate;
  const maintenance = grossMonthlyIncome * maintenanceRate;
  const management = grossMonthlyIncome * managementRate;
  const propertyTaxMonthly = annualPropertyTax / 12;
  const insuranceMonthly = annualInsurance / 12;

  const monthlyOperatingExpenses = vacancy + maintenance + management + 
    propertyTaxMonthly + insuranceMonthly + monthlyHoa;
  const totalMonthlyExpenses = monthlyOperatingExpenses + monthlyPayment;

  // Key metrics
  const annualNOI = (grossMonthlyIncome - monthlyOperatingExpenses) * 12;
  const annualCashFlow = (grossMonthlyIncome - totalMonthlyExpenses) * 12;
  const annualProfit = annualCashFlow;

  const capRate = buyPrice > 0 ? annualNOI / buyPrice : 0;
  const cocReturn = cashNeeded > 0 ? annualCashFlow / cashNeeded : 0;

  // Deal Gap calculation (how much discount needed to breakeven)
  const effectiveListPrice = listPrice ?? buyPrice;
  const discountFromList = effectiveListPrice > 0 
    ? (effectiveListPrice - buyPrice) / effectiveListPrice 
    : 0;
  const dealGap = discountFromList; // positive = buying below list

  // Deal Score (0-100 based on profitability)
  const dealScore = calculateDealScore(cocReturn, capRate, annualCashFlow);
  const dealGrade = getDealGrade(dealScore);
  const profitQuality = getProfitQualityGrade(cocReturn);

  return {
    cashNeeded,
    downPaymentAmount,
    closingCostsAmount,
    loanAmount,
    monthlyPayment,
    equityCreated,
    totalInvestment,
    grossMonthlyIncome,
    totalMonthlyExpenses,
    monthlyOperatingExpenses,
    dealGap,
    annualProfit,
    capRate,
    cocReturn,
    dealScore,
    dealGrade,
    profitQuality,
  };
}

function calculateDealScore(cocReturn: number, capRate: number, annualCashFlow: number): number {
  // Weighted scoring based on key metrics
  let score = 0;

  // Cash on Cash (40 points max)
  const cocPercent = cocReturn * 100;
  if (cocPercent >= 15) score += 40;
  else if (cocPercent >= 10) score += 35;
  else if (cocPercent >= 8) score += 30;
  else if (cocPercent >= 5) score += 20;
  else if (cocPercent >= 2) score += 10;
  else if (cocPercent > 0) score += 5;

  // CAP Rate (30 points max)
  const capPercent = capRate * 100;
  if (capPercent >= 10) score += 30;
  else if (capPercent >= 8) score += 25;
  else if (capPercent >= 6) score += 20;
  else if (capPercent >= 4) score += 10;
  else if (capPercent > 0) score += 5;

  // Cash Flow (30 points max)
  if (annualCashFlow >= 12000) score += 30;
  else if (annualCashFlow >= 6000) score += 25;
  else if (annualCashFlow >= 3000) score += 20;
  else if (annualCashFlow >= 1200) score += 10;
  else if (annualCashFlow > 0) score += 5;

  return Math.min(100, score);
}

function getDealGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 85) return 'A+';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B';
  if (score >= 40) return 'C';
  if (score >= 25) return 'D';
  return 'F';
}

function getProfitQualityGrade(cocReturn: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  const cocPercent = cocReturn * 100;
  if (cocPercent >= 12) return 'A+';
  if (cocPercent >= 10) return 'A';
  if (cocPercent >= 8) return 'B';
  if (cocPercent >= 5) return 'C';
  if (cocPercent >= 2) return 'D';
  return 'F';
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DEAL_MAKER_PRO_COLORS.contentBg,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 16,
  },
  calculatedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: DEAL_MAKER_PRO_COLORS.summaryBorder,
  },
  calculatedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: DEAL_MAKER_PRO_COLORS.inputLabel,
  },
  calculatedValue: {
    fontSize: 16,
    fontWeight: '700',
    color: DEAL_MAKER_PRO_COLORS.inputValue,
  },
  segmentedContainer: {
    marginBottom: 20,
  },
  segmentedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: DEAL_MAKER_PRO_COLORS.inputLabel,
    marginBottom: 8,
  },
  segmentedControl: {
    height: 36,
  },
});

export default DealMakerScreen;
