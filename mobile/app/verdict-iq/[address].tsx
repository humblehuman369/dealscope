/**
 * VerdictIQ Screen - Decision-Grade UI
 * Route: /verdict-iq/[address]
 * 
 * Complete VerdictIQ analysis page with high-contrast, decision-grade design
 * Fetches real data from the analysis API.
 */

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { decisionGrade } from '../../theme/colors';
import {
  NavTabs,
  NavTabId,
  PropertyContextBar,
  PropertyContextData,
  VerdictHero,
  InvestmentAnalysis,
  IQPriceId,
  IQPriceOption,
  MetricData,
  FinancialBreakdown,
  BreakdownGroup,
  DealGap,
  AtAGlance,
  GlanceMetric,
  PerformanceBenchmarks,
  BenchmarkGroup,
  rf,
  rs,
} from '../../components/verdict-iq';
import { usePropertyAnalysis, IQVerdictResponse } from '../../hooks/usePropertyAnalysis';
import { PropertyData } from '../../components/analytics/redesign/types';

// =============================================================================
// CONSTANTS
// =============================================================================

const STRATEGIES = [
  'Long-term Rental',
  'Short-term Rental',
  'BRRRR',
  'Fix & Flip',
  'House Hack',
  'Wholesale',
];

// =============================================================================
// HELPER FUNCTIONS - Transform API data to component props
// =============================================================================

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${Math.round(value).toLocaleString()}`;
  }
  return `$${Math.round(value)}`;
}

function formatCurrencyCompact(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function getColorFromScore(score: number): 'teal' | 'amber' | 'negative' {
  if (score >= 60) return 'teal';
  if (score >= 40) return 'amber';
  return 'negative';
}

function buildIQPrices(
  breakevenPrice: number,
  targetPrice: number,
  listPrice: number
): IQPriceOption[] {
  const wholesalePrice = Math.round(targetPrice * 0.70); // 30% below target
  return [
    { id: 'breakeven', label: 'BREAKEVEN', value: breakevenPrice, subtitle: 'Max price for $0 cashflow' },
    { id: 'target', label: 'TARGET BUY', value: targetPrice, subtitle: 'Positive Cashflow' },
    { id: 'wholesale', label: 'WHOLESALE', value: wholesalePrice, subtitle: '30% net discount for assignment' },
  ];
}

function buildMetricsFromAPI(
  raw: IQVerdictResponse | null,
  targetPrice: number,
  downPaymentPct: number = 0.20,
  closingCostsPct: number = 0.03
): MetricData[] {
  const cashNeeded = Math.round(targetPrice * (downPaymentPct + closingCostsPct));
  
  if (!raw || !raw.returnFactors) {
    return [
      { label: 'CASH FLOW', value: '—' },
      { label: 'CASH NEEDED', value: formatCurrencyCompact(cashNeeded) },
      { label: 'CAP RATE', value: '—' },
    ];
  }
  
  const monthlyCashFlow = raw.strategies[0]?.monthlyCashFlow ?? 0;
  const capRate = raw.returnFactors.capRate ?? 0;
  
  return [
    { label: 'CASH FLOW', value: `$${Math.round(monthlyCashFlow)}/mo` },
    { label: 'CASH NEEDED', value: formatCurrencyCompact(cashNeeded) },
    { label: 'CAP RATE', value: `${(capRate * 100).toFixed(1)}%` },
  ];
}

function buildConfidenceMetrics(raw: IQVerdictResponse | null): Array<{ label: string; value: number; color: 'teal' | 'amber' | 'negative' }> {
  if (!raw || !raw.opportunityFactors) {
    return [
      { label: 'Deal Probability', value: 0, color: 'negative' },
      { label: 'Market Alignment', value: 0, color: 'negative' },
      { label: 'Price Confidence', value: 0, color: 'negative' },
    ];
  }
  
  const dealGap = raw.opportunityFactors.dealGap ?? 0;
  const motivation = raw.opportunityFactors.motivation ?? 50;
  
  // Calculate scores from opportunity factors
  const dealProbability = Math.min(100, Math.max(0, 50 + dealGap * 5));
  const marketAlignment = motivation;
  const priceConfidence = raw.opportunity?.score ?? 65;
  
  return [
    { label: 'Deal Probability', value: Math.round(dealProbability), color: getColorFromScore(dealProbability) },
    { label: 'Market Alignment', value: Math.round(marketAlignment), color: getColorFromScore(marketAlignment) },
    { label: 'Price Confidence', value: Math.round(priceConfidence), color: getColorFromScore(priceConfidence) },
  ];
}

function buildPurchaseTerms(
  targetPrice: number,
  downPaymentPct: number = 0.20,
  interestRate: number = 0.073,
  loanTermYears: number = 30
): BreakdownGroup {
  const downPayment = targetPrice * downPaymentPct;
  const loanAmount = targetPrice - downPayment;
  const monthlyRate = interestRate / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  return {
    title: 'Purchase Terms',
    adjustLabel: 'Adjust Terms',
    rows: [
      { label: 'Down Payment', value: formatCurrencyCompact(downPayment) },
      { label: 'Down Payment %', value: formatPercent(downPaymentPct) },
      { label: 'Loan Amount', value: formatCurrencyCompact(loanAmount) },
      { label: 'Interest Rate', value: formatPercent(interestRate) },
      { label: 'Loan Term (Years)', value: String(loanTermYears) },
      { label: 'Monthly Payment (P&I)', value: formatCurrencyCompact(monthlyPI) },
    ],
  };
}

function buildIncomeSection(monthlyRent: number, vacancyRate: number = 0.05): BreakdownGroup {
  const annualRent = monthlyRent * 12;
  const vacancyLoss = annualRent * vacancyRate;
  const effectiveIncome = annualRent - vacancyLoss;
  
  return {
    title: 'Income',
    adjustLabel: 'Adjust Income',
    rows: [
      { label: 'Gross Scheduled Rent', value: formatCurrencyCompact(annualRent) },
      { label: 'Less: Vacancy Allowance', value: `(${formatCurrencyCompact(vacancyLoss)})`, isNegative: true },
      { label: 'Other Income', value: '$0' },
    ],
    totalRow: { label: 'Effective Gross Income', value: formatCurrencyCompact(effectiveIncome) },
  };
}

function buildOperatingExpenses(
  propertyTaxes: number,
  insurance: number,
  monthlyRent: number,
  maintenancePct: number = 0.05,
  hoa: number = 0
): BreakdownGroup {
  const maintenance = monthlyRent * 12 * maintenancePct;
  const capex = monthlyRent * 12 * maintenancePct;
  const totalExpenses = propertyTaxes + insurance + hoa + maintenance + capex;
  
  return {
    title: 'Operating Expenses',
    adjustLabel: 'Adjust Expenses',
    rows: [
      { label: 'Property Taxes', value: formatCurrencyCompact(propertyTaxes) },
      { label: 'Insurance', value: formatCurrencyCompact(insurance) },
      { label: 'HOA Fees', value: hoa > 0 ? formatCurrencyCompact(hoa) : '—' },
      { label: 'Property Management', value: '—' },
      { label: 'Maintenance & Repairs', value: formatCurrencyCompact(maintenance) },
      { label: 'Utilities', value: '$0' },
      { label: 'Capex Reserve', value: formatCurrencyCompact(capex) },
    ],
    totalRow: { label: 'Total Operating Expenses', value: formatCurrencyCompact(totalExpenses) },
  };
}

function buildDebtService(monthlyPI: number): BreakdownGroup {
  return {
    title: 'Debt Service',
    rows: [
      { label: 'Annual Mortgage (P&I)', value: formatCurrencyCompact(monthlyPI * 12) },
    ],
  };
}

function buildGlanceMetrics(raw: IQVerdictResponse | null): GlanceMetric[] {
  if (!raw || !raw.returnFactors) {
    return [
      { label: 'Returns', value: 0, color: 'negative' },
      { label: 'Cash Flow', value: 0, color: 'negative' },
      { label: 'Equity Gain', value: 0, color: 'negative' },
      { label: 'Debt Safety', value: 0, color: 'negative' },
      { label: 'Cost Control', value: 50, color: 'amber' },
      { label: 'Downside Risk', value: 50, color: 'amber' },
    ];
  }
  
  const returnScore = raw.returnRating?.score ?? 50;
  const dscr = raw.returnFactors.dscr ?? 1.0;
  const cashFlow = raw.strategies[0]?.monthlyCashFlow ?? 0;
  
  // Derive scores from API data
  const cashFlowScore = cashFlow > 200 ? 75 : (cashFlow > 0 ? 50 : 20);
  const equityScore = Math.min(100, returnScore + 10);
  const debtSafetyScore = Math.min(100, dscr * 50);
  
  return [
    { label: 'Returns', value: returnScore, color: getColorFromScore(returnScore) },
    { label: 'Cash Flow', value: cashFlowScore, color: getColorFromScore(cashFlowScore) },
    { label: 'Equity Gain', value: equityScore, color: getColorFromScore(equityScore) },
    { label: 'Debt Safety', value: Math.round(debtSafetyScore), color: getColorFromScore(debtSafetyScore) },
    { label: 'Cost Control', value: 55, color: 'amber' },
    { label: 'Downside Risk', value: 30, color: 'amber' },
  ];
}

function buildBenchmarkGroups(raw: IQVerdictResponse | null): BenchmarkGroup[] {
  if (!raw || !raw.returnFactors) {
    return [
      { title: 'Returns', metrics: [] },
      { title: 'Cash Flow & Risk', metrics: [] },
    ];
  }
  
  const { capRate, cashOnCash, dscr, annualRoi } = raw.returnFactors;
  
  return [
    {
      title: 'Returns',
      metrics: [
        { 
          label: 'Cash on Cash Return', 
          value: cashOnCash ? `${(cashOnCash * 100).toFixed(1)}%` : '—', 
          position: cashOnCash ? Math.min(100, cashOnCash * 100 * 10) : 50, 
          color: getColorFromScore(cashOnCash ? cashOnCash * 100 * 10 : 0) 
        },
        { 
          label: 'Cap Rate', 
          value: capRate ? `${(capRate * 100).toFixed(1)}%` : '—', 
          position: capRate ? Math.min(100, capRate * 100 * 10) : 50, 
          color: getColorFromScore(capRate ? capRate * 100 * 10 : 0) 
        },
        { 
          label: 'Annual ROI', 
          value: annualRoi ? `${(annualRoi * 100).toFixed(0)}%` : '—', 
          position: annualRoi ? Math.min(100, annualRoi * 100 * 1.5) : 50, 
          color: getColorFromScore(annualRoi ? annualRoi * 100 : 0) 
        },
      ],
    },
    {
      title: 'Cash Flow & Risk',
      metrics: [
        { 
          label: 'Debt Service Coverage', 
          value: dscr ? dscr.toFixed(2) : '—', 
          position: dscr ? Math.min(100, (dscr - 0.8) * 100) : 50, 
          color: dscr && dscr >= 1.25 ? 'teal' : (dscr && dscr >= 1.0 ? 'amber' : 'negative') 
        },
      ],
    },
  ];
}

// =============================================================================
// SCREEN COMPONENT
// =============================================================================

export default function VerdictIQScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { 
    address, 
    lat, 
    lng,
    price,
    beds,
    baths,
    sqft,
    rent,
    city,
    state,
    zip,
    status,
    image,
  } = useLocalSearchParams<{ 
    address: string; 
    lat?: string; 
    lng?: string;
    price?: string;
    beds?: string;
    baths?: string;
    sqft?: string;
    rent?: string;
    city?: string;
    state?: string;
    zip?: string;
    status?: string;
    image?: string;
  }>();

  // State
  const [activeTab, setActiveTab] = useState<NavTabId>('analyze');
  const [currentStrategy, setCurrentStrategy] = useState('Long-term Rental');
  const [selectedIQPrice, setSelectedIQPrice] = useState<IQPriceId>('target');
  const [financialBreakdownOpen, setFinancialBreakdownOpen] = useState(true);
  const [glanceOpen, setGlanceOpen] = useState(true);

  const decodedAddress = decodeURIComponent(address || '');
  
  // Parse URL params for property data
  const listPrice = price ? parseFloat(price) : 350000;
  const bedroomCount = beds ? parseInt(beds, 10) : 3;
  const bathroomCount = baths ? parseFloat(baths) : 2;
  const sqftValue = sqft ? parseInt(sqft, 10) : 1500;
  const monthlyRent = rent ? parseFloat(rent) : Math.round(listPrice * 0.008);
  
  // Estimate taxes and insurance if not provided
  const propertyTaxes = Math.round(listPrice * 0.012);
  const insurance = Math.round(1500 + sqftValue * 3);

  // Build property data for API hook
  const propertyData = useMemo((): PropertyData => ({
    address: decodedAddress || 'Unknown Address',
    city: city || 'Unknown',
    state: state || 'FL',
    zipCode: zip || '00000',
    listPrice,
    monthlyRent,
    propertyTaxes,
    insurance,
    bedrooms: bedroomCount,
    bathrooms: bathroomCount,
    sqft: sqftValue,
    arv: Math.round(listPrice * 1.2),
    averageDailyRate: 195,
    occupancyRate: 0.72,
    photos: image ? [image] : [],
    photoCount: 1,
  }), [decodedAddress, city, state, zip, listPrice, monthlyRent, propertyTaxes, insurance, bedroomCount, bathroomCount, sqftValue, image]);

  // Fetch real analysis data from API
  const analysisResult = usePropertyAnalysis(propertyData);
  const { raw, targetPrice, breakevenPrice, discountPercent, dealScore, isLoading, error } = analysisResult;

  // Property context data for UI components
  const property: PropertyContextData = useMemo(() => ({
    street: decodedAddress || 'Unknown Address',
    city: city || 'Unknown',
    state: state || 'FL',
    zip: zip || '00000',
    beds: bedroomCount,
    baths: bathroomCount,
    sqft: sqftValue,
    price: listPrice,
    status: (status as 'active' | 'pending' | 'off-market') || 'off-market',
    image: image || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&h=150&fit=crop',
  }), [decodedAddress, city, state, zip, bedroomCount, bathroomCount, sqftValue, listPrice, status, image]);

  // Build derived data from API response
  const iqPrices = useMemo(() => buildIQPrices(breakevenPrice, targetPrice, listPrice), [breakevenPrice, targetPrice, listPrice]);
  const metrics = useMemo(() => buildMetricsFromAPI(raw, targetPrice), [raw, targetPrice]);
  const confidenceMetrics = useMemo(() => buildConfidenceMetrics(raw), [raw]);
  const purchaseTerms = useMemo(() => buildPurchaseTerms(targetPrice), [targetPrice]);
  const incomeSection = useMemo(() => buildIncomeSection(monthlyRent), [monthlyRent]);
  const operatingExpenses = useMemo(() => buildOperatingExpenses(propertyTaxes, insurance, monthlyRent), [propertyTaxes, insurance, monthlyRent]);
  const debtService = useMemo(() => {
    const loanAmount = targetPrice * 0.80;
    const monthlyRate = 0.073 / 12;
    const numPayments = 360;
    const monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    return buildDebtService(monthlyPI);
  }, [targetPrice]);
  const glanceMetrics = useMemo(() => buildGlanceMetrics(raw), [raw]);
  const benchmarkGroups = useMemo(() => buildBenchmarkGroups(raw), [raw]);
  
  // Calculate NOI and cash flow from API data
  const noiValue = useMemo(() => {
    const annualRent = monthlyRent * 12 * 0.95; // After vacancy
    const totalExpenses = propertyTaxes + insurance + (monthlyRent * 12 * 0.10);
    return annualRent - totalExpenses;
  }, [monthlyRent, propertyTaxes, insurance]);
  
  const cashFlowValues = useMemo(() => {
    const loanAmount = targetPrice * 0.80;
    const monthlyRate = 0.073 / 12;
    const numPayments = 360;
    const monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    const annualDebtService = monthlyPI * 12;
    const annualCashFlow = noiValue - annualDebtService;
    const monthlyCashFlow = annualCashFlow / 12;
    return {
      annual: { 
        label: 'Pre-Tax Cash Flow', 
        value: annualCashFlow >= 0 ? formatCurrencyCompact(annualCashFlow) : `(${formatCurrencyCompact(Math.abs(annualCashFlow))})`,
        isNegative: annualCashFlow < 0 
      },
      monthly: { 
        label: 'Monthly Cash Flow', 
        value: monthlyCashFlow >= 0 ? formatCurrencyCompact(monthlyCashFlow) : `(${formatCurrencyCompact(Math.abs(monthlyCashFlow))})`,
        isNegative: monthlyCashFlow < 0 
      },
    };
  }, [noiValue, targetPrice]);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleTabChange = useCallback((tabId: NavTabId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tabId);

    const addressParam = property.street;
    
    switch (tabId) {
      case 'analyze':
        // Already on analyze (VerdictIQ)
        break;
      case 'details':
        router.push({
          pathname: '/property-details/[address]',
          params: {
            address: addressParam,
            price: String(property.price),
            beds: String(property.beds),
            baths: String(property.baths),
            sqft: String(property.sqft),
            lat: lat,
            lng: lng,
          },
        });
        break;
      case 'saleComps':
        Alert.alert('Sale Comps', 'Sale Comps feature coming soon');
        break;
      case 'rentComps':
        Alert.alert('Rent Comps', 'Rent Comps feature coming soon');
        break;
      case 'dashboard':
        router.push('/(tabs)/dashboard');
        break;
    }
  }, [router, property]);

  const handleStrategyChange = useCallback((strategy: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStrategy(strategy);
  }, []);

  const handleIQPriceChange = useCallback((id: IQPriceId) => {
    setSelectedIQPrice(id);
  }, []);

  const handleChangeTerms = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Adjust Terms', 'Opens financing terms adjustment modal');
  }, []);

  const handleHowCalculated = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'How BREAKEVEN is Calculated',
      'Breakeven price is the maximum purchase price that results in $0 monthly cashflow after all expenses, including mortgage payment, taxes, insurance, maintenance, and vacancy allowance.',
      [{ text: 'Got it' }]
    );
  }, []);

  const handleHowVerdictWorks = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'How VerdictIQ Works',
      'VerdictIQ analyzes multiple factors including deal probability, market alignment, and price confidence to give you a comprehensive score (0-100) for any investment opportunity.',
      [{ text: 'Got it' }]
    );
  }, []);

  const handleHowWeScore = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'How We Score',
      'Scores are calculated based on:\n\n• Deal Probability: Likelihood of closing at target price\n• Market Alignment: How well the deal fits current market conditions\n• Price Confidence: Accuracy of our pricing models',
      [{ text: 'Got it' }]
    );
  }, []);

  const handleAdjustTerms = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Adjust Purchase Terms', 'Opens purchase terms adjustment modal');
  }, []);

  const handleAdjustIncome = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Adjust Income', 'Opens income adjustment modal');
  }, []);

  const handleAdjustExpenses = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Adjust Expenses', 'Opens expenses adjustment modal');
  }, []);

  const handleGotoDealMaker = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/deal-maker/[address]',
      params: { address: property.street },
    });
  }, [router, property.street]);

  const handleExportAnalysis = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Export Analysis', 'PDF export feature coming soon');
  }, []);

  const handleHowToReadBenchmarks = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'How to Read Benchmarks',
      'The center line represents the national average for each metric.\n\n• Markers to the RIGHT are ABOVE average (better)\n• Markers to the LEFT are BELOW average\n\nTeal = Strong, Amber = Moderate, Red = Weak',
      [{ text: 'Got it' }]
    );
  }, []);

  // =============================================================================
  // RENDER
  // =============================================================================

  // Loading state
  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={decisionGrade.pacificTeal} />
          <Text style={styles.loadingText}>Analyzing property...</Text>
        </View>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
          <Ionicons name="alert-circle-outline" size={48} color={decisionGrade.negative} />
          <Text style={styles.errorText}>Unable to analyze property</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => analysisResult.refetch()}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <Text style={styles.brandLogo}>
              <Text style={styles.brandDeal}>Deal</Text>
              <Text style={styles.brandMaker}>Maker</Text>
              <Text style={styles.brandIQ}>IQ</Text>
            </Text>
            <Text style={styles.brandSub}>
              by Invest<Text style={styles.brandIQ}>IQ</Text>
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push('/search')}>
              <Ionicons name="search" size={20} color={decisionGrade.deepNavy} />
            </TouchableOpacity>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>H</Text>
            </View>
          </View>
        </View>

        {/* Nav Tabs */}
        <NavTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Property Context Bar */}
        <PropertyContextBar property={property} />

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Investment Analysis FIRST (Star of the show - conversion driver) */}
          <InvestmentAnalysis
            financingTerms="20% down, 7.3%"
            currentStrategy={currentStrategy}
            strategies={STRATEGIES}
            iqPrices={iqPrices}
            selectedIQPrice={selectedIQPrice}
            onIQPriceChange={handleIQPriceChange}
            metrics={metrics}
            onChangeTerms={handleChangeTerms}
            onStrategyChange={handleStrategyChange}
            onHowCalculated={handleHowCalculated}
          />

          {/* Spacer */}
          <View style={styles.sectionSpacer} />

          {/* Verdict Score - Supporting confidence section */}
          <VerdictHero
            score={dealScore.score}
            verdictLabel={dealScore.label || 'Analyzing...'}
            verdictSubtitle={raw?.verdictDescription || 'Calculating deal metrics...'}
            confidenceMetrics={confidenceMetrics}
            onHowItWorksPress={handleHowVerdictWorks}
            onHowWeScorePress={handleHowWeScore}
          />

          {/* Spacer */}
          <View style={styles.sectionSpacer} />

          {/* Financial Breakdown - Uses calculated data */}
          <FinancialBreakdown
            isOpen={financialBreakdownOpen}
            onToggle={() => setFinancialBreakdownOpen(!financialBreakdownOpen)}
            purchaseTerms={{ ...purchaseTerms, onAdjust: handleAdjustTerms }}
            income={{ ...incomeSection, onAdjust: handleAdjustIncome }}
            operatingExpenses={{ ...operatingExpenses, onAdjust: handleAdjustExpenses }}
            noi={{ label: 'Net Operating Income (NOI)', value: formatCurrencyCompact(noiValue) }}
            debtService={debtService}
            cashflow={cashFlowValues}
          />

          {/* Subtle divider */}
          <View style={styles.sectionDividerSubtle} />

          {/* Deal Gap - Uses API data */}
          <DealGap
            isOffMarket={property.status === 'off-market'}
            marketEstimate={listPrice}
            targetPrice={targetPrice}
            dealGapPercent={-discountPercent}
            discountNeeded={listPrice - targetPrice}
            suggestedOfferRange={`${Math.round(discountPercent - 5)}% – ${Math.round(discountPercent + 5)}% below asking`}
          />

          {/* Subtle divider */}
          <View style={styles.sectionDividerSubtle} />

          {/* At-a-Glance - Uses API data */}
          <AtAGlance
            metrics={glanceMetrics}
            compositeScore={dealScore.score}
            isOpen={glanceOpen}
            onToggle={() => setGlanceOpen(!glanceOpen)}
          />

          {/* Subtle divider */}
          <View style={styles.sectionDividerSubtle} />

          {/* Performance Benchmarks - Uses API data */}
          <PerformanceBenchmarks
            groups={benchmarkGroups}
            onHowToRead={handleHowToReadBenchmarks}
          />

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={handleGotoDealMaker}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>Go to DealMakerIQ →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={handleExportAnalysis}
              activeOpacity={0.7}
            >
              <Text style={styles.btnSecondaryText}>Export Analysis</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: decisionGrade.bgSecondary,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: rs(16),
  },
  loadingText: {
    fontSize: rf(16),
    fontWeight: '600',
    color: decisionGrade.deepNavy,
    marginTop: rs(12),
  },
  errorText: {
    fontSize: rf(18),
    fontWeight: '700',
    color: decisionGrade.deepNavy,
    marginTop: rs(12),
  },
  errorSubtext: {
    fontSize: rf(14),
    color: decisionGrade.textTertiary,
    textAlign: 'center',
    paddingHorizontal: rs(32),
  },
  retryBtn: {
    marginTop: rs(20),
    paddingHorizontal: rs(24),
    paddingVertical: rs(12),
    backgroundColor: decisionGrade.pacificTeal,
    borderRadius: rs(8),
  },
  retryBtnText: {
    fontSize: rf(14),
    fontWeight: '600',
    color: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(16),
    paddingVertical: rs(12),
    backgroundColor: decisionGrade.bgPrimary,
  },
  brandContainer: {},
  brandLogo: {
    fontSize: rf(16),
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: rf(18),
  },
  brandDeal: {
    color: decisionGrade.deepNavy,
  },
  brandMaker: {
    color: decisionGrade.deepNavy,
  },
  brandIQ: {
    color: decisionGrade.pacificTeal,
  },
  brandSub: {
    fontSize: rf(9),
    fontWeight: '600',
    color: decisionGrade.textTertiary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  avatar: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(8),
    backgroundColor: decisionGrade.pacificTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: rf(14),
    fontWeight: '700',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  sectionDivider: {
    height: rs(8),
    backgroundColor: decisionGrade.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: decisionGrade.borderLight,
    borderBottomWidth: 1,
    borderBottomColor: decisionGrade.borderLight,
  },
  sectionSpacer: {
    height: rs(6),
    backgroundColor: decisionGrade.bgSecondary,
  },
  sectionDividerSubtle: {
    height: rs(1),
    backgroundColor: decisionGrade.borderLight,
    marginHorizontal: rs(16),
  },
  actionSection: {
    padding: rs(20),
    paddingHorizontal: rs(16),
    backgroundColor: decisionGrade.bgPrimary,
  },
  btnPrimary: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs(14),
    backgroundColor: decisionGrade.pacificTeal,
    borderRadius: rs(8),
    marginBottom: rs(10),
  },
  btnPrimaryText: {
    fontSize: rf(13),
    fontWeight: '700',
    color: 'white',
  },
  btnSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs(14),
    backgroundColor: decisionGrade.bgPrimary,
    borderWidth: 2,
    borderColor: decisionGrade.pacificTeal,
    borderRadius: rs(8),
  },
  btnSecondaryText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: decisionGrade.pacificTeal,
  },
});
