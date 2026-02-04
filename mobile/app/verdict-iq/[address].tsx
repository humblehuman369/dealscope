/**
 * VerdictIQ Screen - Decision-Grade UI
 * Route: /verdict-iq/[address]
 * 
 * Complete VerdictIQ analysis page with high-contrast, decision-grade design
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
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

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_PROPERTY: PropertyContextData = {
  street: '1451 SW 10th St.',
  city: 'Boca Raton',
  state: 'FL',
  zip: '33486',
  beds: 4,
  baths: 2,
  sqft: 1722,
  price: 821000,
  status: 'off-market',
  image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&h=150&fit=crop',
};

const STRATEGIES = [
  'Long-term Rental',
  'Short-term Rental',
  'BRRRR',
  'Fix & Flip',
  'House Hack',
  'Wholesale',
];

const IQ_PRICES: IQPriceOption[] = [
  { id: 'breakeven', label: 'BREAKEVEN', value: 784458, subtitle: 'Max price for $0 cashflow' },
  { id: 'target', label: 'TARGET BUY', value: 745235, subtitle: 'Positive Cashflow' },
  { id: 'wholesale', label: 'WHOLESALE', value: 549121, subtitle: '30% net discount for assignment' },
];

const METRICS: MetricData[] = [
  { label: 'CASH FLOW', value: '$281/mo' },
  { label: 'CASH NEEDED', value: '$171,404' },
  { label: 'CAP RATE', value: '6.2%' },
];

const CONFIDENCE_METRICS = [
  { label: 'Deal Probability', value: 78, color: 'teal' as const },
  { label: 'Market Alignment', value: 54, color: 'amber' as const },
  { label: 'Price Confidence', value: 65, color: 'teal' as const },
];

const PURCHASE_TERMS: BreakdownGroup = {
  title: 'Purchase Terms',
  adjustLabel: 'Adjust Terms',
  rows: [
    { label: 'Down Payment', value: '$147,333' },
    { label: 'Down Payment %', value: '20.00%' },
    { label: 'Loan Amount', value: '$586,332' },
    { label: 'Interest Rate', value: '6.00%' },
    { label: 'Loan Term (Years)', value: '30' },
    { label: 'Monthly Payment (P&I)', value: '$3,533' },
  ],
};

const INCOME: BreakdownGroup = {
  title: 'Income',
  adjustLabel: 'Adjust Income',
  rows: [
    { label: 'Gross Scheduled Rent', value: '$68,800' },
    { label: 'Less: Vacancy Allowance', value: '($957)', isNegative: true },
    { label: 'Other Income', value: '$0' },
  ],
  totalRow: { label: 'Effective Gross Income', value: '$65,990' },
};

const OPERATING_EXPENSES: BreakdownGroup = {
  title: 'Operating Expenses',
  adjustLabel: 'Adjust Expenses',
  rows: [
    { label: 'Property Taxes', value: '$6,840' },
    { label: 'Insurance', value: '$7,367' },
    { label: 'HOA Fees', value: '—' },
    { label: 'Property Management', value: '—' },
    { label: 'Maintenance & Repairs', value: '$3,333' },
    { label: 'Utilities', value: '$1,200' },
    { label: 'Capex Reserve', value: '$3,333' },
  ],
  totalRow: { label: 'Total Operating Expenses', value: '$24,073' },
};

const DEBT_SERVICE: BreakdownGroup = {
  title: 'Debt Service',
  rows: [
    { label: 'Annual Mortgage (P&I)', value: '$42,400' },
  ],
};

const GLANCE_METRICS: GlanceMetric[] = [
  { label: 'Returns', value: 75, color: 'teal' },
  { label: 'Cash Flow', value: 21, color: 'negative' },
  { label: 'Equity Gain', value: 75, color: 'teal' },
  { label: 'Debt Safety', value: 84, color: 'teal' },
  { label: 'Cost Control', value: 55, color: 'amber' },
  { label: 'Downside Risk', value: 18, color: 'negative' },
];

const BENCHMARK_GROUPS: BenchmarkGroup[] = [
  {
    title: 'Returns',
    metrics: [
      { label: 'Cash on Cash Return', value: '4.1%', position: 35, color: 'teal' },
      { label: 'Cap Rate', value: '6.8%', position: 68, color: 'teal' },
      { label: 'Total ROI (5yr)', value: '52%', position: 72, color: 'teal' },
    ],
  },
  {
    title: 'Cash Flow & Risk',
    metrics: [
      { label: 'Cash Flow Yield', value: '5.1%', position: 55, color: 'teal' },
      { label: 'Debt Service Coverage', value: '1.20', position: 42, color: 'amber' },
      { label: 'Expense Ratio', value: '23%', position: 25, color: 'negative' },
      { label: 'Breakeven Occupancy', value: '82%', position: 78, color: 'teal' },
    ],
  },
];

// =============================================================================
// SCREEN COMPONENT
// =============================================================================

export default function VerdictIQScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { address, lat, lng } = useLocalSearchParams<{ address: string; lat?: string; lng?: string }>();

  // State
  const [activeTab, setActiveTab] = useState<NavTabId>('analyze');
  const [currentStrategy, setCurrentStrategy] = useState('Long-term Rental');
  const [selectedIQPrice, setSelectedIQPrice] = useState<IQPriceId>('target');
  const [financialBreakdownOpen, setFinancialBreakdownOpen] = useState(true);
  const [glanceOpen, setGlanceOpen] = useState(true);

  const decodedAddress = decodeURIComponent(address || '');

  // Property data with decoded address
  const property: PropertyContextData = {
    ...MOCK_PROPERTY,
    ...(decodedAddress && { street: decodedAddress }),
  };

  // =============================================================================
  // HANDLERS
  // =============================================================================

  const handleTabChange = useCallback((tabId: NavTabId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tabId);

    const encodedAddress = encodeURIComponent(property.street);
    
    switch (tabId) {
      case 'analyze':
        // Already on analyze (VerdictIQ)
        break;
      case 'details':
        router.push({
          pathname: '/property-details/[address]',
          params: {
            address: encodedAddress,
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
      params: { address: encodeURIComponent(property.street) },
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
          {/* Verdict Hero */}
          <VerdictHero
            score={84}
            verdictLabel="Strong Opportunity"
            verdictSubtitle="Deal Gap easily achievable"
            confidenceMetrics={CONFIDENCE_METRICS}
            onHowItWorksPress={handleHowVerdictWorks}
            onHowWeScorePress={handleHowWeScore}
          />

          {/* Section Divider */}
          <View style={styles.sectionDivider} />

          {/* Investment Analysis */}
          <InvestmentAnalysis
            financingTerms="20% down, 6.0%"
            currentStrategy={currentStrategy}
            strategies={STRATEGIES}
            iqPrices={IQ_PRICES}
            selectedIQPrice={selectedIQPrice}
            onIQPriceChange={handleIQPriceChange}
            metrics={METRICS}
            onChangeTerms={handleChangeTerms}
            onStrategyChange={handleStrategyChange}
            onHowCalculated={handleHowCalculated}
          />

          {/* Section Divider */}
          <View style={styles.sectionDivider} />

          {/* Financial Breakdown */}
          <FinancialBreakdown
            isOpen={financialBreakdownOpen}
            onToggle={() => setFinancialBreakdownOpen(!financialBreakdownOpen)}
            purchaseTerms={{ ...PURCHASE_TERMS, onAdjust: handleAdjustTerms }}
            income={{ ...INCOME, onAdjust: handleAdjustIncome }}
            operatingExpenses={{ ...OPERATING_EXPENSES, onAdjust: handleAdjustExpenses }}
            noi={{ label: 'Net Operating Income (NOI)', value: '$41,920' }}
            debtService={DEBT_SERVICE}
            cashflow={{
              annual: { label: 'Pre-Tax Cash Flow', value: '($480)', isNegative: true },
              monthly: { label: 'Monthly Cash Flow', value: '($40)', isNegative: true },
            }}
          />

          {/* Section Divider */}
          <View style={styles.sectionDivider} />

          {/* Deal Gap */}
          <DealGap
            isOffMarket={property.status === 'off-market'}
            marketEstimate={821000}
            targetPrice={775437}
            dealGapPercent={-5.5}
            discountNeeded={45563}
            suggestedOfferRange="10% – 18% below asking"
          />

          {/* Section Divider */}
          <View style={styles.sectionDivider} />

          {/* At-a-Glance */}
          <AtAGlance
            metrics={GLANCE_METRICS}
            compositeScore={75}
            isOpen={glanceOpen}
            onToggle={() => setGlanceOpen(!glanceOpen)}
          />

          {/* Section Divider */}
          <View style={styles.sectionDivider} />

          {/* Performance Benchmarks */}
          <PerformanceBenchmarks
            groups={BENCHMARK_GROUPS}
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
