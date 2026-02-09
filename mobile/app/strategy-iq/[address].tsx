/**
 * StrategyIQ Screen — Financial Deep-Dive (Page 2 of 2)
 * Route: /strategy-iq/[address]
 * 
 * Full financial breakdown, benchmarks, data quality, and next steps.
 * Navigated from VerdictIQ via "Show Me the Numbers" CTA.
 * 
 * Design: VerdictIQ 3.3 — True black base, Inter typography, Slate text hierarchy
 */

import React, { useCallback, useState, useMemo } from 'react';
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

import { verdictDark } from '../../theme/colors';
import { verdictTypography } from '../../theme/textStyles';
import {
  FinancialBreakdown,
  BreakdownGroup,
  rf,
  rs,
} from '../../components/verdict-iq';
import {
  BackStrip,
  ActionBar,
  ResultCards,
  InsightBox,
  InsightText,
  InsightBold,
  BenchmarkTable,
  BenchmarkRow,
  DataQuality,
  ConfidenceMetric,
  NextSteps,
  StepCardData,
  SaveCTA,
} from '../../components/strategy-iq';
import { usePropertyAnalysis, IQVerdictResponse } from '../../hooks/usePropertyAnalysis';
import { PropertyData } from '../../components/analytics/redesign/types';
import { VerdictFooter } from '../../components/verdict-iq/VerdictCTA';

// =============================================================================
// HELPERS
// =============================================================================

function formatCurrencyCompact(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function buildPurchaseGroup(
  listPrice: number,
  targetPrice: number,
  downPaymentPct: number = 0.20,
  closingCostsPct: number = 0.03
): BreakdownGroup {
  const downPayment = targetPrice * downPaymentPct;
  const closingCosts = targetPrice * closingCostsPct;
  return {
    title: 'What You\'d Pay',
    rows: [
      { label: 'Market Price', value: formatCurrencyCompact(listPrice) },
      { label: 'Your Target Price', value: formatCurrencyCompact(targetPrice), isTeal: true },
      { label: `Down Payment (${Math.round(downPaymentPct * 100)}%)`, value: formatCurrencyCompact(downPayment) },
      { label: `Closing Costs (${Math.round(closingCostsPct * 100)}%)`, value: formatCurrencyCompact(closingCosts) },
    ],
    totalRow: { label: 'Cash Needed at Close', value: formatCurrencyCompact(downPayment + closingCosts) },
  };
}

function buildLoanGroup(
  targetPrice: number,
  downPaymentPct: number = 0.20,
  interestRate: number = 0.06,
  loanTermYears: number = 30
): BreakdownGroup {
  const downPayment = targetPrice * downPaymentPct;
  const loanAmount = targetPrice - downPayment;
  const monthlyRate = interestRate / 12;
  const numPayments = loanTermYears * 12;
  const monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  return {
    title: 'Your Loan',
    rows: [
      { label: 'Loan Amount', value: formatCurrencyCompact(loanAmount) },
      { label: 'Interest Rate', value: formatPercent(interestRate) },
      { label: 'Loan Term', value: `${loanTermYears} years` },
    ],
    totalRow: { label: 'Monthly Payment', value: formatCurrencyCompact(monthlyPI) },
  };
}

function buildIncomeGroup(monthlyRent: number, vacancyRate: number = 0.05): BreakdownGroup {
  const annualRent = monthlyRent * 12;
  const vacancyLoss = annualRent * vacancyRate;
  const effectiveIncome = annualRent - vacancyLoss;
  return {
    title: 'What You\'d Earn',
    rows: [
      { label: 'Monthly Rent', value: formatCurrencyCompact(monthlyRent) },
      { label: 'Annual Gross', value: formatCurrencyCompact(annualRent) },
      { label: `Vacancy Loss (${Math.round(vacancyRate * 100)}%)`, value: `(${formatCurrencyCompact(vacancyLoss)})`, isNegative: true },
    ],
    totalRow: { label: 'Effective Income', value: formatCurrencyCompact(effectiveIncome) },
  };
}

function buildExpensesGroup(
  propertyTaxes: number,
  insurance: number,
  monthlyRent: number,
  managementPct: number = 0.08,
  maintenancePct: number = 0.05,
  reservesPct: number = 0.05
): BreakdownGroup {
  const annualRent = monthlyRent * 12;
  const management = annualRent * managementPct;
  const maintenance = annualRent * maintenancePct;
  const reserves = annualRent * reservesPct;
  const totalExpenses = propertyTaxes + insurance + management + maintenance + reserves;
  return {
    title: 'What It Costs to Own',
    rows: [
      { label: 'Property Tax', value: `${formatCurrencyCompact(propertyTaxes)}/yr` },
      { label: 'Insurance', value: `${formatCurrencyCompact(insurance)}/yr` },
      { label: `Management (${Math.round(managementPct * 100)}%)`, value: `${formatCurrencyCompact(management)}/yr` },
      { label: `Maintenance (${Math.round(maintenancePct * 100)}%)`, value: `${formatCurrencyCompact(maintenance)}/yr` },
      { label: `Reserves (${Math.round(reservesPct * 100)}%)`, value: `${formatCurrencyCompact(reserves)}/yr` },
    ],
    totalRow: { label: 'Total Costs', value: `${formatCurrencyCompact(totalExpenses)}/yr` },
  };
}

function buildBenchmarkRows(raw: IQVerdictResponse | null, monthlyCashFlow: number): BenchmarkRow[] {
  if (!raw || !raw.returnFactors) {
    return [
      { metric: 'Cap Rate', value: '—', target: '6.0%', status: 'poor' },
      { metric: 'Cash-on-Cash', value: '—', target: '8.0%', status: 'poor' },
      { metric: 'Monthly Cash Flow', value: '—', target: '+$300', status: 'poor' },
      { metric: 'Payback Period', value: '—', target: '10 yrs', status: 'poor' },
    ];
  }
  const { capRate, cashOnCash } = raw.returnFactors;
  const capRateVal = capRate ? (capRate * 100).toFixed(1) + '%' : '—';
  const cocVal = cashOnCash ? (cashOnCash * 100).toFixed(1) + '%' : '—';
  const cfVal = monthlyCashFlow >= 0 ? `$${Math.round(monthlyCashFlow).toLocaleString()}` : `-$${Math.round(Math.abs(monthlyCashFlow)).toLocaleString()}`;
  const payback = monthlyCashFlow > 0 ? Math.round(1 / (monthlyCashFlow * 12 / 100000)) : 99;
  return [
    { metric: 'Cap Rate', value: capRateVal, target: '6.0%', status: (capRate && capRate >= 0.06) ? 'good' : (capRate && capRate >= 0.048) ? 'fair' : 'poor' },
    { metric: 'Cash-on-Cash', value: cocVal, target: '8.0%', status: (cashOnCash && cashOnCash >= 0.08) ? 'good' : (cashOnCash && cashOnCash >= 0.05) ? 'fair' : 'poor' },
    { metric: 'Monthly Cash Flow', value: cfVal, target: '+$300', status: monthlyCashFlow >= 300 ? 'good' : monthlyCashFlow >= 0 ? 'fair' : 'poor' },
    { metric: 'Payback Period', value: `${payback} yrs`, target: '10 yrs', status: payback <= 10 ? 'good' : payback <= 15 ? 'fair' : 'poor' },
  ];
}

function buildConfidence(raw: IQVerdictResponse | null): ConfidenceMetric[] {
  if (!raw || !raw.opportunityFactors) {
    return [
      { label: 'Deal Probability', value: 0, color: 'blue' },
      { label: 'Market Alignment', value: 0, color: 'teal' },
      { label: 'Price Confidence', value: 0, color: 'blue' },
    ];
  }
  const dealGap = raw.opportunityFactors.dealGap ?? 0;
  const motivation = raw.opportunityFactors.motivation ?? 50;
  const dealProbability = Math.min(100, Math.max(0, 50 + dealGap * 5));
  const priceConfidence = raw.opportunity?.score ?? 65;
  return [
    { label: 'Deal Probability', value: Math.round(dealProbability), color: 'blue' },
    { label: 'Market Alignment', value: Math.round(motivation), color: 'teal' },
    { label: 'Price Confidence', value: Math.round(priceConfidence), color: 'blue' },
  ];
}

const NEXT_STEPS: StepCardData[] = [
  { icon: 'cash-outline', name: 'Get Funding', description: 'Explore loan options & pre-approvals' },
  { icon: 'people-outline', name: 'Find an Agent', description: 'Local investment specialist' },
  { icon: 'construct-outline', name: 'Contractor', description: 'Renovation estimates' },
];

// =============================================================================
// SCREEN
// =============================================================================

export default function StrategyIQScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    address, price, beds, baths, sqft, rent,
    city, state, zip, status, image, lat, lng,
  } = useLocalSearchParams<{
    address: string; price?: string; beds?: string; baths?: string;
    sqft?: string; rent?: string; city?: string; state?: string;
    zip?: string; status?: string; image?: string; lat?: string; lng?: string;
  }>();

  const [currentStrategy, setCurrentStrategy] = useState('Long-Term Rental');

  const decodedAddress = decodeURIComponent(address || '');
  const listPrice = price ? parseFloat(price) : 350000;
  const bedroomCount = beds ? parseInt(beds, 10) : 3;
  const bathroomCount = baths ? parseFloat(baths) : 2;
  const sqftValue = sqft ? parseInt(sqft, 10) : 1500;
  const monthlyRent = rent ? parseFloat(rent) : Math.round(listPrice * 0.008);
  const propertyTaxes = Math.round(listPrice * 0.012);
  const insurance = Math.round(1500 + sqftValue * 3);

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

  const analysisResult = usePropertyAnalysis(propertyData);
  const { raw, targetPrice, isLoading, error } = analysisResult;

  // Financial calculations
  const leftColumn = useMemo(() => [
    buildPurchaseGroup(listPrice, targetPrice),
    buildLoanGroup(targetPrice),
  ], [listPrice, targetPrice]);

  const rightColumn = useMemo(() => [
    buildIncomeGroup(monthlyRent),
    buildExpensesGroup(propertyTaxes, insurance, monthlyRent),
  ], [monthlyRent, propertyTaxes, insurance]);

  const { noiValue, monthlyCashFlow, annualCashFlow } = useMemo(() => {
    const annualRent = monthlyRent * 12 * 0.95;
    const totalExpenses = propertyTaxes + insurance + (monthlyRent * 12 * 0.18);
    const noi = annualRent - totalExpenses;
    const loanAmount = targetPrice * 0.80;
    const monthlyRate = 0.06 / 12;
    const numPayments = 360;
    const monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    const annualDebt = monthlyPI * 12;
    const annual = noi - annualDebt;
    return { noiValue: noi, monthlyCashFlow: annual / 12, annualCashFlow: annual };
  }, [monthlyRent, propertyTaxes, insurance, targetPrice]);

  const resultCards = useMemo(() => [
    {
      title: 'Before Your Loan',
      subtitle: 'Net Operating Income',
      amount: noiValue >= 0 ? formatCurrencyCompact(noiValue) : `(${formatCurrencyCompact(Math.abs(noiValue))})`,
      monthly: `${formatCurrencyCompact(Math.round(noiValue / 12))}/mo`,
      isPositive: noiValue >= 0,
    },
    {
      title: "What You'd Pocket",
      subtitle: 'After everything',
      amount: annualCashFlow >= 0 ? formatCurrencyCompact(annualCashFlow) : `(${formatCurrencyCompact(Math.abs(annualCashFlow))})`,
      monthly: `(${formatCurrencyCompact(Math.abs(Math.round(monthlyCashFlow)))})/mo`,
      isPositive: annualCashFlow >= 0,
    },
  ], [noiValue, annualCashFlow, monthlyCashFlow]);

  const benchmarkRows = useMemo(() => buildBenchmarkRows(raw, monthlyCashFlow), [raw, monthlyCashFlow]);
  const confidenceMetrics = useMemo(() => buildConfidence(raw), [raw]);

  // Handlers
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleExport = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Export Analysis', 'PDF export feature coming soon');
  }, []);

  const handleChangeTerms = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Adjust Terms', 'Opens financing terms adjustment modal');
  }, []);

  const handleStrategyPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Change Strategy', 'Strategy selector coming soon');
  }, []);

  const handleSignUp = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Create Account', 'Sign up flow coming soon');
  }, []);

  // Short address for back strip
  const shortAddress = decodedAddress.split(',')[0] || decodedAddress;

  // Loading
  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={verdictDark.blue} />
          <Text style={styles.loadingText}>Loading strategy...</Text>
        </View>
      </>
    );
  }

  // Error
  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
          <Ionicons name="alert-circle-outline" size={48} color={verdictDark.red} />
          <Text style={styles.errorText}>Unable to load strategy</Text>
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
        {/* Nav */}
        <View style={styles.nav}>
          <Text style={styles.logo}>
            Invest<Text style={styles.logoIQ}>IQ</Text>
          </Text>
          <View style={styles.navRight}>
            <TouchableOpacity onPress={() => router.push('/search')}>
              <Ionicons name="search-outline" size={rf(21)} color={verdictDark.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="person-outline" size={rf(21)} color={verdictDark.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Back Strip */}
        <BackStrip address={shortAddress} onBack={handleBack} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Full Breakdown Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              <Ionicons name="desktop-outline" size={rf(14)} color={verdictDark.blue} />{' '}
              FULL BREAKDOWN
            </Text>
            <Text style={styles.sectionTitle}>Where Does the Money Go?</Text>
            <Text style={styles.sectionSub}>
              Every dollar in and out — so you can see exactly whether this property pays for itself.
            </Text>

            <ActionBar
              currentStrategy={currentStrategy}
              onExport={handleExport}
              onChangeTerms={handleChangeTerms}
              onStrategyPress={handleStrategyPress}
            />

            {/* Financial Breakdown */}
            <FinancialBreakdown
              leftColumn={leftColumn}
              rightColumn={rightColumn}
              noi={{
                label: 'Net Operating Income (NOI)',
                value: formatCurrencyCompact(noiValue),
                monthlyLabel: 'Monthly NOI',
                monthlyValue: formatCurrencyCompact(Math.round(noiValue / 12)),
              }}
              cashflow={{
                annual: {
                  label: 'Pre-Tax Cash Flow',
                  value: annualCashFlow >= 0 ? formatCurrencyCompact(annualCashFlow) : `(${formatCurrencyCompact(Math.abs(annualCashFlow))})`,
                  isNegative: annualCashFlow < 0,
                },
                monthly: {
                  label: 'Monthly Cash Flow',
                  value: monthlyCashFlow >= 0 ? formatCurrencyCompact(monthlyCashFlow) : `(${formatCurrencyCompact(Math.abs(monthlyCashFlow))})`,
                  isNegative: monthlyCashFlow < 0,
                },
              }}
            />

            {/* Result Cards */}
            <View style={{ marginTop: rs(20) }}>
              <ResultCards cards={resultCards} />
            </View>

            {/* Insight */}
            <InsightBox label="What this means for you">
              <InsightText>
                Even at the discounted Profit Entry Point of {formatCurrencyCompact(targetPrice)}, this property would{' '}
                <InsightBold>cost you about {formatCurrencyCompact(Math.abs(Math.round(monthlyCashFlow)))} per month out of pocket</InsightBold>{' '}
                as a long-term rental. The rent doesn't fully cover the mortgage plus expenses.
              </InsightText>
            </InsightBox>
          </View>

          {/* Benchmarks Section */}
          <View style={[styles.section, styles.sectionAlt]}>
            <Text style={styles.sectionLabel}>
              <Ionicons name="bar-chart-outline" size={rf(14)} color={verdictDark.blue} />{' '}
              INVESTOR BENCHMARKS
            </Text>
            <Text style={styles.sectionTitle}>How Does This Stack Up?</Text>
            <Text style={styles.sectionSub}>
              We compare this deal against the numbers experienced investors actually look for before buying.
            </Text>

            <BenchmarkTable
              rows={benchmarkRows}
              helperText='The "Target" column shows what experienced investors consider a good deal. When every metric is below target, it usually means the asking price is too high for this strategy.'
            />

            <InsightBox label="Quick translation">
              <InsightText>
                Every benchmark is below target as a long-term rental. This doesn't mean it's a bad property — it means{' '}
                <InsightBold>the current price is too high for this strategy</InsightBold>.
                Try switching to a different investment approach or adjusting the terms.
              </InsightText>
            </InsightBox>
          </View>

          {/* Data Quality Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              <Ionicons name="shield-checkmark-outline" size={rf(14)} color={verdictDark.blue} />{' '}
              DATA QUALITY
            </Text>
            <Text style={styles.sectionTitle}>How Reliable Is This Analysis?</Text>
            <Text style={styles.sectionSub}>
              No analysis is perfect. These scores show you how much data we had to work with.
            </Text>

            <DataQuality metrics={confidenceMetrics} />
          </View>

          {/* Next Steps Section */}
          <View style={[styles.section, styles.sectionAlt]}>
            <Text style={styles.sectionTitle}>What's Your Next Move?</Text>
            <Text style={styles.sectionSub}>Ready to act? Here's where to start.</Text>
            <NextSteps steps={NEXT_STEPS} />
          </View>

          {/* Save CTA */}
          <SaveCTA onPress={handleSignUp} />

          {/* Footer */}
          <VerdictFooter />
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
    backgroundColor: verdictDark.black,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: rs(16),
  },
  loadingText: {
    fontSize: rf(16),
    fontWeight: '600',
    color: verdictDark.textBody,
    marginTop: rs(12),
  },
  errorText: {
    fontSize: rf(18),
    fontWeight: '700',
    color: verdictDark.textHeading,
    marginTop: rs(12),
  },
  retryBtn: {
    marginTop: rs(20),
    paddingHorizontal: rs(24),
    paddingVertical: rs(12),
    backgroundColor: verdictDark.blueDeep,
    borderRadius: rs(8),
  },
  retryBtnText: {
    fontSize: rf(14),
    fontWeight: '600',
    color: verdictDark.white,
  },
  // Nav
  nav: {
    paddingVertical: rs(14),
    paddingHorizontal: rs(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: verdictDark.black,
    borderBottomWidth: 1,
    borderBottomColor: verdictDark.border,
  },
  logo: {
    fontSize: rf(22),
    fontWeight: '700',
    color: verdictDark.white,
  },
  logoIQ: {
    color: verdictDark.blue,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(16),
  },
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // Sections
  section: {
    paddingVertical: rs(32),
    paddingHorizontal: rs(20),
    borderTopWidth: 1,
    borderTopColor: verdictDark.border,
  },
  sectionAlt: {
    backgroundColor: verdictDark.bg,
  },
  sectionLabel: {
    ...verdictTypography.sectionLabel,
    fontSize: rf(11),
    marginBottom: rs(8),
  },
  sectionTitle: {
    ...verdictTypography.heading,
    fontSize: rf(21),
    marginBottom: rs(6),
  },
  sectionSub: {
    ...verdictTypography.body,
    fontSize: rf(15),
    color: verdictDark.textBody,
    lineHeight: rf(15) * 1.55,
    marginBottom: rs(24),
  },
});
