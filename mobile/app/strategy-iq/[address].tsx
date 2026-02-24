/**
 * StrategyIQ Screen — Financial Deep-Dive (Page 2 of 2)
 * Route: /strategy-iq/[address]
 * 
 * Full financial breakdown, benchmarks, data quality, and next steps.
 * Navigated from VerdictIQ via "Show Me the Numbers" CTA.
 * 
 * Design: VerdictIQ 3.3 — True black base, Inter typography, Slate text hierarchy
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { ScreenErrorFallback as ErrorBoundary } from '../../components/ScreenErrorFallback';
export { ErrorBoundary };

import { StrategySkeleton } from '../../components/Skeleton';
import { useIsOnline } from '../../hooks/useNetworkStatus';
import { buildShareUrl } from '../../hooks/useDeepLinking';
import { useUIStore } from '../../stores';
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
import { PropertyData } from '../../types/analytics';
import { VerdictFooter } from '../../components/verdict-iq/VerdictCTA';
import { useAddPortfolioProperty } from '../../hooks/useDatabase';
import { usePropertyData } from '../../hooks/usePropertyData';
import {
  IQEstimateSelector,
  type IQEstimateSources,
} from '../../components/verdict-iq/IQEstimateSelector';
import { useIQSourceOverrides, resolveOverrideChain } from '../../hooks/useIQSourceOverrides';

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

/** Deal Gap label uses the actual gap percentage, not the component score. */
function dealGapLabel(gapPct: number): string {
  if (gapPct <= 5)  return 'Minimal';
  if (gapPct <= 15) return 'Mild';
  if (gapPct <= 25) return 'Moderate';
  if (gapPct <= 35) return 'Large';
  return 'Excessive';
}

/** Per-component label functions — each uses language appropriate to its domain. */
const COMPONENT_LABELS: Record<string, (v: number) => string> = {
  'Return Quality':   v => v >= 75 ? 'Excellent' : v >= 55 ? 'Strong' : v >= 40 ? 'Good' : v >= 20 ? 'Fair' : 'Weak',
  'Market Alignment': v => v >= 75 ? 'Strong' : v >= 55 ? 'Favorable' : v >= 40 ? 'Neutral' : v >= 20 ? 'Weak' : 'Misaligned',
  'Deal Probability': v => v >= 75 ? 'Highly Probable' : v >= 55 ? 'Probable' : v >= 40 ? 'Possible' : v >= 20 ? 'Unlikely' : 'Improbable',
};

function componentQualLabel(v: number, componentName?: string): string {
  const labelFn = componentName ? COMPONENT_LABELS[componentName] : undefined;
  return labelFn ? labelFn(v) : COMPONENT_LABELS['Return Quality'](v);
}

function buildConfidence(raw: IQVerdictResponse | null): ConfidenceMetric[] {
  if (!raw) {
    return [
      { label: 'Deal Gap', value: 0, qualLabel: '—', color: 'teal' },
      { label: 'Return Quality', value: 0, qualLabel: '—', color: 'blue' },
      { label: 'Market Alignment', value: 0, qualLabel: '—', color: 'teal' },
      { label: 'Deal Probability', value: 0, qualLabel: '—', color: 'blue' },
    ];
  }
  const cs = raw.componentScores;
  const dealGapScore = cs?.dealGapScore ?? 0;
  const dealGapPct = Math.max(0, raw.opportunityFactors?.dealGap ?? 0);
  const returnQuality = cs?.returnQualityScore ?? 0;
  const marketAlignment = cs?.marketAlignmentScore ?? 0;
  const dealProbability = cs?.dealProbabilityScore ?? 0;
  return [
    { label: 'Deal Gap', value: dealGapScore, qualLabel: dealGapLabel(dealGapPct), color: 'teal' },
    { label: 'Return Quality', value: returnQuality, qualLabel: componentQualLabel(returnQuality, 'Return Quality'), color: 'blue' },
    { label: 'Market Alignment', value: marketAlignment, qualLabel: componentQualLabel(marketAlignment, 'Market Alignment'), color: 'teal' },
    { label: 'Deal Probability', value: dealProbability, qualLabel: componentQualLabel(dealProbability, 'Deal Probability'), color: 'blue' },
  ];
}

const NEXT_STEPS: StepCardData[] = [
  { icon: 'cash-outline', name: 'Get Funding', description: 'Explore loan options & pre-approvals' },
  { icon: 'people-outline', name: 'Find an Agent', description: 'Local investment specialist' },
  { icon: 'construct-outline', name: 'Contractor', description: 'Renovation estimates' },
];

interface DeepDiveTool {
  icon: string;
  label: string;
  desc: string;
  color: string;
  route: string;
}

const DEEP_DIVE_TOOLS: DeepDiveTool[] = [
  { icon: 'calculator-outline', label: 'Full Worksheet', desc: 'Edit every input, see every metric', color: '#0d9488', route: 'worksheet' },
  { icon: 'trending-down-outline', label: 'Deal Gap', desc: 'Interactive price analysis', color: '#3b82f6', route: 'deal-gap' },
  { icon: 'bar-chart-outline', label: 'Price Intel', desc: 'Comps & valuation data', color: '#8b5cf6', route: 'price-intel' },
  { icon: 'hammer-outline', label: 'Rehab Estimator', desc: 'Quick or detailed estimates', color: '#f97316', route: 'rehab' },
  { icon: 'images-outline', label: 'Photos', desc: 'View property photos', color: '#ec4899', route: 'photos' },
  { icon: 'school-outline', label: 'Learn Strategy', desc: 'How this strategy works', color: '#22c55e', route: 'learn' },
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

  const isOnline = useIsOnline();
  const [currentStrategy, setCurrentStrategy] = useState('Long-Term Rental');
  const setActiveStrategy = useUIStore((s) => s.setActiveStrategy);
  const addToPortfolio = useAddPortfolioProperty();

  // Sync strategy selection to UI store for cross-screen consistency
  const handleSetStrategy = useCallback((name: string) => {
    setCurrentStrategy(name);
    const strategyMap: Record<string, string> = {
      'Long-Term Rental': 'ltr', 'Short-Term Rental': 'str', 'BRRRR': 'brrrr',
      'Fix & Flip': 'flip', 'House Hack': 'house_hack', 'Wholesale': 'wholesale',
    };
    const id = strategyMap[name];
    if (id) setActiveStrategy(id as any);
  }, [setActiveStrategy]);

  const decodedAddress = decodeURIComponent(address || '');
  const listPrice = price ? parseFloat(price) : 350000;
  const bedroomCount = beds ? parseInt(beds, 10) : 3;
  const bathroomCount = baths ? parseFloat(baths) : 2;
  const sqftValue = sqft ? parseInt(sqft, 10) : 1500;
  const monthlyRent = rent ? parseFloat(rent) : 0;
  const propertyTaxes = Math.round(listPrice * 0.012);
  const insurance = Math.round(listPrice * 0.01);

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
    arv: Math.round(listPrice * 1.15),
    averageDailyRate: monthlyRent > 0 ? (monthlyRent / 30) * 1.5 : 200,
    occupancyRate: 0.65,
    photos: image ? [image] : [],
    photoCount: 1,
  }), [decodedAddress, city, state, zip, listPrice, monthlyRent, propertyTaxes, insurance, bedroomCount, bathroomCount, sqftValue, image]);

  const analysisResult = usePropertyAnalysis(propertyData);
  const { raw, targetPrice, isLoading, error } = analysisResult;

  // Fetch full property data for IQ Estimate sources
  const { fetchProperty } = usePropertyData();
  const [iqSources, setIqSources] = useState<IQEstimateSources>({
    value: { iq: null, zillow: null, rentcast: null, redfin: null },
    rent: { iq: null, zillow: null, rentcast: null, redfin: null },
  });

  useEffect(() => {
    if (!decodedAddress) return;
    fetchProperty(decodedAddress)
      .then((data) => {
        const rentalStats = data.rentals?.rental_stats;
        setIqSources({
          value: {
            iq: data.valuations?.value_iq_estimate ?? null,
            zillow: data.valuations?.zestimate ?? null,
            rentcast: data.valuations?.rentcast_avm ?? null,
            redfin: data.valuations?.redfin_estimate ?? null,
          },
          rent: {
            iq: rentalStats?.iq_estimate ?? data.rentals?.monthly_rent_ltr ?? null,
            zillow: rentalStats?.zillow_estimate ?? null,
            rentcast: rentalStats?.rentcast_estimate ?? null,
            redfin: rentalStats?.redfin_estimate ?? null,
          },
        });
      })
      .catch(() => {});
  }, [decodedAddress, fetchProperty]);

  // 3-tier override chain: dealMakerOverrides ?? sourceOverrides ?? propertyInfo
  const { sourceOverrides, handleSourceChange } = useIQSourceOverrides(iqSources);

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

  // ── Export: share financial summary with deep link ──
  const handleExport = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const url = buildShareUrl('strategy', {
      address: decodedAddress,
      price: listPrice,
      beds: bedroomCount,
      baths: bathroomCount,
      sqft: sqftValue,
      rent: monthlyRent,
    });
    const summary = [
      `DealGapIQ — ${currentStrategy} Analysis`,
      `Property: ${decodedAddress}`,
      `List Price: $${listPrice.toLocaleString()}`,
      `Target Price: $${(targetPrice ?? listPrice).toLocaleString()}`,
      `Monthly Rent: $${monthlyRent.toLocaleString()}`,
      '',
      url,
    ].join('\n');
    try {
      await Share.share({ message: summary, url, title: `${currentStrategy} Analysis` });
    } catch {
      // user cancelled — no-op
    }
  }, [currentStrategy, decodedAddress, listPrice, targetPrice, monthlyRent, bedroomCount, bathroomCount, sqftValue]);

  // ── PDF Export: download and share a lender-ready report ──
  const handlePDFExport = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { API_BASE_URL } = await import('../../services/apiClient');
      const strategyMap: Record<string, string> = {
        'Long-Term Rental': 'ltr', 'Short-Term Rental': 'str', 'BRRRR': 'brrrr',
        'Fix & Flip': 'flip', 'House Hack': 'house_hack', 'Wholesale': 'wholesale',
      };
      const strategy = strategyMap[currentStrategy] || 'ltr';
      const propertyId = raw?.property_id || 'general';
      const params = new URLSearchParams({
        address: decodedAddress,
        strategy,
        theme: 'light',
      });
      const pdfUrl = `${API_BASE_URL}/api/v1/proforma/property/${propertyId}/pdf?${params}`;
      const safeAddress = decodedAddress.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
      const fileUri = `${FileSystem.cacheDirectory}DealGapIQ_${safeAddress}.pdf`;

      const downloadResult = await FileSystem.downloadAsync(pdfUrl, fileUri);

      if (downloadResult.status !== 200) {
        Alert.alert('Export Failed', 'Could not generate the report. Please try again.');
        return;
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('Report Saved', `PDF saved to ${fileUri}`);
      }
    } catch (err) {
      console.error('PDF export error:', err);
      Alert.alert('Export Failed', 'Something went wrong. Please check your connection and try again.');
    }
  }, [decodedAddress, currentStrategy, raw]);

  // ── Change Terms: navigate to worksheet for the active strategy ──
  const handleChangeTerms = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const strategyMap: Record<string, string> = {
      'Long-Term Rental': 'ltr', 'Short-Term Rental': 'str', 'BRRRR': 'brrrr',
      'Fix & Flip': 'flip', 'House Hack': 'house_hack', 'Wholesale': 'wholesale',
    };
    const strategyId = strategyMap[currentStrategy] || 'ltr';
    router.push({
      pathname: '/worksheet/[strategy]',
      params: {
        strategy: strategyId,
        address: encodeURIComponent(decodedAddress),
        price: String(listPrice),
        beds: String(bedroomCount),
        baths: String(bathroomCount),
        sqft: String(sqftValue),
        rent: String(monthlyRent),
      },
    });
  }, [currentStrategy, router, decodedAddress, listPrice, bedroomCount, bathroomCount, sqftValue, monthlyRent]);

  // ── Strategy picker: native ActionSheet on iOS, Alert on Android ──
  const STRATEGIES = [
    'Long-Term Rental', 'Short-Term Rental', 'BRRRR',
    'Fix & Flip', 'House Hack', 'Wholesale',
  ];

  const handleStrategyPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...STRATEGIES, 'Cancel'],
          cancelButtonIndex: STRATEGIES.length,
          title: 'Select Strategy',
        },
        (buttonIndex) => {
          if (buttonIndex < STRATEGIES.length) {
            handleSetStrategy(STRATEGIES[buttonIndex]);
          }
        },
      );
    } else {
      // Android fallback — use Alert with buttons
      const buttons = STRATEGIES.map((s) => ({
        text: s,
        onPress: () => handleSetStrategy(s),
      }));
      buttons.push({ text: 'Cancel', onPress: () => {} });
      Alert.alert('Select Strategy', undefined, buttons);
    }
  }, [handleSetStrategy]);

  const handleSaveToPortfolio = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Map display name to DB key
    const strategyKeyMap: Record<string, string> = {
      'Long-Term Rental': 'long_term_rental',
      'Short-Term Rental': 'short_term_rental',
      'BRRRR': 'brrrr',
      'Fix & Flip': 'fix_and_flip',
      'House Hack': 'house_hack',
      'Wholesale': 'wholesale',
    };
    addToPortfolio.mutate({
      address: decodedAddress,
      city: city || null,
      state: state || null,
      zip: zip || null,
      purchasePrice: targetPrice || listPrice,
      purchaseDate: Math.floor(Date.now() / 1000),
      strategy: strategyKeyMap[currentStrategy] || 'long_term_rental',
      propertyData: propertyData as any,
    }, {
      onSuccess: () => {
        Alert.alert('Saved to Portfolio', `${decodedAddress} has been added to your portfolio.`);
      },
      onError: () => {
        Alert.alert('Save Failed', 'Could not save to portfolio. Please try again.');
      },
    });
  }, [decodedAddress, city, state, zip, targetPrice, listPrice, currentStrategy, propertyData, addToPortfolio]);

  const handleDeepDive = useCallback((tool: DeepDiveTool) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const params = {
      address: encodeURIComponent(decodedAddress),
      price: String(listPrice),
      beds: String(bedroomCount),
      baths: String(bathroomCount),
      sqft: String(sqftValue),
      rent: String(monthlyRent),
    };
    if (tool.route === 'worksheet') {
      const worksheetPropertyId = raw?.property_id;
      router.push({ pathname: '/worksheet/[strategy]', params: { strategy: 'ltr', ...params, ...(worksheetPropertyId ? { propertyId: worksheetPropertyId } : {}) } });
    } else if (tool.route === 'deal-gap') {
      router.push({ pathname: '/deal-gap/[address]', params });
    } else if (tool.route === 'price-intel') {
      router.push({ pathname: '/price-intel/[address]', params });
    } else if (tool.route === 'rehab') {
      router.push('/rehab');
    } else if (tool.route === 'photos') {
      router.push({ pathname: '/photos/[zpid]', params: { zpid: encodeURIComponent(decodedAddress), address: decodedAddress } });
    } else if (tool.route === 'learn') {
      // Map current strategy name to route id
      const strategyMap: Record<string, string> = {
        'Long-Term Rental': 'ltr', 'Short-Term Rental': 'str', 'BRRRR': 'brrrr',
        'Fix & Flip': 'flip', 'House Hack': 'house_hack', 'Wholesale': 'wholesale',
      };
      const strategyId = strategyMap[currentStrategy] || 'ltr';
      router.push({ pathname: '/learn/[strategy]', params: { strategy: strategyId } });
    }
  }, [router, decodedAddress, listPrice, bedroomCount, bathroomCount, sqftValue, monthlyRent, currentStrategy]);

  // Short address for back strip
  const shortAddress = decodedAddress.split(',')[0] || decodedAddress;

  // Loading — show skeleton instead of spinner
  if (isLoading && !raw) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StrategySkeleton />
      </>
    );
  }

  // Error — differentiate offline vs server error
  if (error && !raw) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
          <Ionicons
            name={!isOnline ? 'cloud-offline-outline' : 'alert-circle-outline'}
            size={48}
            color={!isOnline ? verdictDark.textSecondary : verdictDark.red}
          />
          <Text style={styles.errorText}>
            {!isOnline ? 'You\'re Offline' : 'Unable to load strategy'}
          </Text>
          <Text style={styles.loadingText}>
            {!isOnline ? 'Connect to the internet to view this analysis.' : String(error)}
          </Text>
          <TouchableOpacity 
            style={styles.retryBtn} 
            onPress={() => analysisResult.refetch()}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            accessibilityHint="Retries loading the strategy analysis"
          >
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
            <TouchableOpacity 
              onPress={() => router.push('/search')}
              accessibilityRole="button"
              accessibilityLabel="Search"
              accessibilityHint="Opens the search screen"
            >
              <Ionicons name="search-outline" size={rf(21)} color={verdictDark.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Profile"
              accessibilityHint="Opens your profile"
            >
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
            <Text style={styles.sectionTitle} accessibilityRole="header">Where Does the Money Go?</Text>
            <Text style={styles.sectionSub}>
              Every dollar in and out — so you can see exactly whether this property pays for itself.
            </Text>

            <ActionBar
              currentStrategy={currentStrategy}
              onExport={handleExport}
              onPDFExport={handlePDFExport}
              onChangeTerms={handleChangeTerms}
              onStrategyPress={handleStrategyPress}
            />

            {/* Data Sources — IQ Estimate Selector */}
            <View style={{ marginBottom: rs(16) }}>
              <IQEstimateSelector
                sources={iqSources}
                onSourceChange={handleSourceChange}
                storageKey="iq_source_selection_strategy"
              />
            </View>

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
            <Text style={styles.sectionTitle} accessibilityRole="header">How Does This Stack Up?</Text>
            <Text style={styles.sectionSub}>
              We compare this deal against the numbers experienced investors actually look for before buying.
            </Text>

            <BenchmarkTable
              rows={benchmarkRows}
              helperText='Target = what experienced investors look for. All below target? The price is probably too high for this strategy.'
            />

            {(() => {
              const passing = benchmarkRows.filter(r => r.status === 'good' || r.status === 'pass').length;
              const total = benchmarkRows.length;
              if (passing === total) {
                return (
                  <InsightBox label="Quick translation">
                    <InsightText>
                      All benchmarks pass for {currentStrategy.toLowerCase()}.{' '}
                      <InsightBold>The numbers work at this price point</InsightBold>.
                      Run your own due diligence before making an offer.
                    </InsightText>
                  </InsightBox>
                );
              }
              if (passing >= total / 2) {
                return (
                  <InsightBox label="Quick translation">
                    <InsightText>
                      {passing} of {total} benchmarks pass as a {currentStrategy.toLowerCase()}.{' '}
                      <InsightBold>This deal has potential but needs negotiation</InsightBold>.
                      Try adjusting terms or the purchase price to improve the numbers.
                    </InsightText>
                  </InsightBox>
                );
              }
              return (
                <InsightBox label="Quick translation">
                  <InsightText>
                    Most benchmarks are below target as a {currentStrategy.toLowerCase()}. This doesn't mean it's a bad property — it means{' '}
                    <InsightBold>the current price is too high for this strategy</InsightBold>.
                    Try a different investment approach or adjust the terms.
                  </InsightText>
                </InsightBox>
              );
            })()}
          </View>

          {/* Data Quality Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              <Ionicons name="shield-checkmark-outline" size={rf(14)} color={verdictDark.blue} />{' '}
              DATA QUALITY
            </Text>
            <Text style={styles.sectionTitle} accessibilityRole="header">How Reliable Is This Analysis?</Text>
            <Text style={styles.sectionSub}>
              No analysis is perfect. These scores show you how much data we had to work with.
            </Text>

            <DataQuality metrics={confidenceMetrics} />
          </View>

          {/* Deep Dive Tools */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              <Ionicons name="apps-outline" size={rf(14)} color={verdictDark.teal} />{' '}
              ANALYSIS TOOLS
            </Text>
            <Text style={styles.sectionTitle} accessibilityRole="header">Go Deeper</Text>
            <Text style={styles.sectionSub}>
              Explore detailed worksheets, comps, and what-if scenarios.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: rs(10), marginTop: rs(16) }}>
              {DEEP_DIVE_TOOLS.map((tool) => (
                <TouchableOpacity
                  key={tool.route}
                  onPress={() => handleDeepDive(tool)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={tool.label}
                  accessibilityHint={tool.desc}
                  style={{
                    width: '48%',
                    backgroundColor: verdictDark.surface,
                    borderRadius: rs(14),
                    padding: rs(16),
                    borderWidth: 1,
                    borderColor: verdictDark.border,
                  }}
                >
                  <View style={{
                    width: rs(36), height: rs(36), borderRadius: rs(10),
                    backgroundColor: tool.color + '20', alignItems: 'center', justifyContent: 'center',
                    marginBottom: rs(10),
                  }}>
                    <Ionicons name={tool.icon as any} size={rf(18)} color={tool.color} />
                  </View>
                  <Text style={{
                    fontFamily: 'Inter_600SemiBold', fontSize: rf(14),
                    color: verdictDark.textPrimary, marginBottom: rs(2),
                  }}>{tool.label}</Text>
                  <Text style={{
                    fontFamily: 'Inter_400Regular', fontSize: rf(11),
                    color: verdictDark.textSecondary, lineHeight: rf(15),
                  }}>{tool.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Next Steps Section */}
          <View style={[styles.section, styles.sectionAlt]}>
            <Text style={styles.sectionTitle} accessibilityRole="header">What's Your Next Move?</Text>
            <Text style={styles.sectionSub}>Ready to act? Here's where to start.</Text>
            <NextSteps steps={NEXT_STEPS} />
          </View>

          {/* Save CTA */}
          <SaveCTA onPress={handleSaveToPortfolio} />

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
