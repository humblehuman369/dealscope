import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { api } from '@/services/api';
import { usePropertyData } from '@/hooks/usePropertyData';
import {
  DealMakerSlider,
  formatSliderValue,
  type SliderConfig,
} from '@/components/ui/DealMakerSlider';
import {
  CollapsibleSection,
  FinancialRow,
} from '@/components/strategy/CollapsibleSection';
import { GlowCard } from '@/components/ui/GlowCard';
import { DealGapPriceLadder } from '@/components/analytics/DealGapPriceLadder';
import { formatCurrency, formatPercent, formatCompactCurrency } from '@/utils/formatters';
import type { PropertyResponse } from '@dealscope/shared';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
} from '@/constants/tokens';

type PropertyResponseCompat = PropertyResponse & Record<string, unknown>;

// ---------------------------------------------------------------------------
// Slider configurations
// ---------------------------------------------------------------------------

const BUY_PRICE_SLIDERS: SliderConfig[] = [
  { id: 'buyPrice', label: 'Buy Price', min: 50000, max: 2000000, step: 5000, format: 'currency' },
];

const FINANCING_SLIDERS: SliderConfig[] = [
  { id: 'downPaymentPercent', label: 'Down Payment', min: 0.05, max: 0.50, step: 0.01, format: 'percentage' },
  { id: 'interestRate', label: 'Interest Rate', min: 0.03, max: 0.12, step: 0.001, format: 'percentage' },
  { id: 'loanTermYears', label: 'Loan Term', min: 10, max: 30, step: 5, format: 'years' },
];

const INCOME_SLIDERS: SliderConfig[] = [
  { id: 'monthlyRent', label: 'Monthly Rent', min: 0, max: 10000, step: 50, format: 'currencyPerMonth' },
  { id: 'otherIncome', label: 'Other Income', min: 0, max: 2000, step: 25, format: 'currencyPerMonth' },
  { id: 'vacancyRate', label: 'Vacancy Rate', min: 0, max: 0.20, step: 0.01, format: 'percentage' },
];

const EXPENSES_SLIDERS: SliderConfig[] = [
  { id: 'annualPropertyTax', label: 'Property Taxes', min: 0, max: 30000, step: 100, format: 'currencyPerYear' },
  { id: 'annualInsurance', label: 'Insurance', min: 0, max: 10000, step: 50, format: 'currencyPerYear' },
  { id: 'managementRate', label: 'Management', min: 0, max: 0.15, step: 0.01, format: 'percentage' },
  { id: 'maintenanceRate', label: 'Maintenance', min: 0, max: 0.15, step: 0.01, format: 'percentage' },
  { id: 'monthlyHoa', label: 'HOA Fees', min: 0, max: 1000, step: 10, format: 'currencyPerMonth' },
];

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

interface DealMakerState {
  buyPrice: number;
  downPaymentPercent: number;
  closingCostsPercent: number;
  interestRate: number;
  loanTermYears: number;
  rehabBudget: number;
  arv: number;
  monthlyRent: number;
  otherIncome: number;
  vacancyRate: number;
  maintenanceRate: number;
  managementRate: number;
  annualPropertyTax: number;
  annualInsurance: number;
  monthlyHoa: number;
}

const DEFAULTS: DealMakerState = {
  buyPrice: 300000,
  downPaymentPercent: 0.20,
  closingCostsPercent: 0.03,
  interestRate: 0.07,
  loanTermYears: 30,
  rehabBudget: 0,
  arv: 360000,
  monthlyRent: 2000,
  otherIncome: 0,
  vacancyRate: 0.05,
  maintenanceRate: 0.05,
  managementRate: 0.08,
  annualPropertyTax: 4000,
  annualInsurance: 1800,
  monthlyHoa: 0,
};

// ---------------------------------------------------------------------------
// Metric calculations (mirrors frontend DealMakerPage)
// ---------------------------------------------------------------------------

function calculateMortgage(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || annualRate <= 0 || years <= 0) return 0;
  const r = annualRate / 12;
  const n = years * 12;
  const pmt = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Number.isFinite(pmt) ? pmt : 0;
}

interface DealMetrics {
  cashNeeded: number;
  loanAmount: number;
  monthlyPayment: number;
  grossMonthlyIncome: number;
  totalMonthlyExpenses: number;
  noi: number;
  annualCashFlow: number;
  monthlyCashFlow: number;
  capRate: number;
  cocReturn: number;
  dscr: number;
  dealGapPct: number;
  incomeValue: number;
  targetBuy: number;
}

function computeMetrics(s: DealMakerState, listPrice: number): DealMetrics {
  const dp = s.buyPrice * s.downPaymentPercent;
  const cc = s.buyPrice * s.closingCostsPercent;
  const cashNeeded = dp + cc;
  const loanAmount = s.buyPrice - dp;
  const monthlyPayment = calculateMortgage(loanAmount, s.interestRate, s.loanTermYears);

  const grossMonthly = s.monthlyRent + s.otherIncome;
  const vacancy = grossMonthly * s.vacancyRate;
  const maintenance = grossMonthly * s.maintenanceRate;
  const management = grossMonthly * s.managementRate;
  const taxMo = s.annualPropertyTax / 12;
  const insMo = s.annualInsurance / 12;
  const opEx = vacancy + maintenance + management + taxMo + insMo + s.monthlyHoa;
  const totalMonthly = opEx + monthlyPayment;

  const noi = (grossMonthly - opEx) * 12;
  const annualDebt = monthlyPayment * 12;
  const annualCashFlow = noi - annualDebt;
  const monthlyCashFlow = annualCashFlow / 12;

  const capRate = s.buyPrice > 0 ? (noi / s.buyPrice) * 100 : 0;
  const cocReturn = cashNeeded > 0 ? (annualCashFlow / cashNeeded) * 100 : 0;
  const dscr = annualDebt > 0 ? noi / annualDebt : 0;
  const dealGapPct = listPrice > 0 ? ((listPrice - s.buyPrice) / listPrice) * 100 : 0;

  // Income Value = NOI / (LTV × Mortgage Constant)
  const ltv = 1 - s.downPaymentPercent;
  const mortgageConstant = s.loanTermYears > 0 && s.interestRate > 0
    ? (calculateMortgage(1, s.interestRate, s.loanTermYears) * 12)
    : 0;
  const incomeValue = ltv > 0 && mortgageConstant > 0
    ? Math.round(noi / (ltv * mortgageConstant))
    : 0;
  const targetBuy = Math.round(incomeValue * 0.95);

  return {
    cashNeeded,
    loanAmount,
    monthlyPayment,
    grossMonthlyIncome: grossMonthly,
    totalMonthlyExpenses: totalMonthly,
    noi,
    annualCashFlow,
    monthlyCashFlow,
    capRate,
    cocReturn,
    dscr,
    dealGapPct,
    incomeValue,
    targetBuy,
  };
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const SAVE_DEBOUNCE_MS = 800;

export default function DealMakerScreen() {
  const router = useRouter();
  const { address } = useLocalSearchParams<{ address: string }>();
  const insets = useSafeAreaInsets();
  const decodedAddress = address ? decodeURIComponent(address) : '';

  const { fetchProperty } = usePropertyData();
  const propertyQuery = useQuery<PropertyResponseCompat>({
    queryKey: ['property-search', decodedAddress],
    queryFn: () => fetchProperty(decodedAddress),
    enabled: !!decodedAddress,
    staleTime: 5 * 60 * 1000,
  });
  const property = propertyQuery.data;

  const listPrice =
    property?.listing?.list_price ??
    property?.valuations?.market_price ??
    property?.valuations?.zestimate ??
    DEFAULTS.buyPrice;

  const [state, setState] = useState<DealMakerState>(() => ({
    ...DEFAULTS,
    buyPrice: listPrice,
    annualPropertyTax: (property?.market?.property_taxes_annual as number) ?? DEFAULTS.annualPropertyTax,
    monthlyRent: (property?.rentals?.monthly_rent_ltr as number) ?? DEFAULTS.monthlyRent,
    arv: Math.round(listPrice * 1.2),
  }));

  // Re-sync when property data loads
  useEffect(() => {
    if (!property) return;
    const lp =
      property.listing?.list_price ??
      property.valuations?.market_price ??
      property.valuations?.zestimate ??
      DEFAULTS.buyPrice;
    setState((prev) => ({
      ...prev,
      buyPrice: lp,
      annualPropertyTax: (property.market?.property_taxes_annual as number) ?? prev.annualPropertyTax,
      monthlyRent: (property.rentals?.monthly_rent_ltr as number) ?? prev.monthlyRent,
      arv: Math.round(lp * 1.2),
    }));
  }, [property]);

  const metrics = useMemo(() => computeMetrics(state, listPrice), [state, listPrice]);

  // Debounced auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateField = useCallback(
    <K extends keyof DealMakerState>(key: K, value: DealMakerState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }));
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        // Fire-and-forget save to backend
        api
          .post('/api/v1/analysis/verdict', {
            address: decodedAddress,
            buy_price: state.buyPrice,
            monthly_rent: state.monthlyRent,
          })
          .catch(() => {});
      }, SAVE_DEBOUNCE_MS);
    },
    [decodedAddress, state],
  );

  function handleApply() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(
      `/verdict?address=${encodeURIComponent(decodedAddress)}`,
    );
  }

  // Adjust buy price slider range based on property
  const buyPriceSliders: SliderConfig[] = useMemo(
    () => [
      {
        ...BUY_PRICE_SLIDERS[0],
        min: Math.round(listPrice * 0.5),
        max: Math.round(listPrice * 1.5),
        step: Math.round(listPrice * 0.005) || 5000,
      },
    ],
    [listPrice],
  );

  if (propertyQuery.isLoading && !property) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {/* ── Header ──────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.heading} />
        </Pressable>
        <Text style={styles.headerTitle}>Deal Maker</Text>
        <Pressable onPress={handleApply} hitSlop={12}>
          <Text style={styles.applyText}>Apply</Text>
        </Pressable>
      </View>

      {/* ── Metrics strip ───────────────────────────── */}
      <View style={styles.metricsStrip}>
        <MetricPill label="Cash-on-Cash" value={`${metrics.cocReturn.toFixed(1)}%`} positive={metrics.cocReturn >= 8} />
        <MetricPill label="Cap Rate" value={`${metrics.capRate.toFixed(1)}%`} positive={metrics.capRate >= 5} />
        <MetricPill label="Cash Flow" value={formatCompactCurrency(metrics.monthlyCashFlow)} positive={metrics.monthlyCashFlow > 0} />
        <MetricPill label="DSCR" value={metrics.dscr.toFixed(2)} positive={metrics.dscr >= 1.2} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Price Ladder ──────────────────────────── */}
        <DealGapPriceLadder
          listPrice={listPrice}
          incomeValue={metrics.incomeValue}
          buyPrice={state.buyPrice}
        />

        {/* ── Buy Price ─────────────────────────────── */}
        <CollapsibleSection title="Buy Price" accentColor={colors.accent} defaultOpen>
          {buyPriceSliders.map((sl) => (
            <View key={sl.id} style={styles.sliderPad}>
              <DealMakerSlider
                config={sl}
                value={state[sl.id as keyof DealMakerState] as number}
                onChange={(v) => updateField(sl.id as keyof DealMakerState, v)}
              />
            </View>
          ))}
        </CollapsibleSection>

        {/* ── Financing ─────────────────────────────── */}
        <CollapsibleSection title="Financing" accentColor={colors.accent}>
          {FINANCING_SLIDERS.map((sl) => (
            <View key={sl.id} style={styles.sliderPad}>
              <DealMakerSlider
                config={sl}
                value={state[sl.id as keyof DealMakerState] as number}
                onChange={(v) => updateField(sl.id as keyof DealMakerState, v)}
              />
            </View>
          ))}
          <FinancialRow label="Loan Amount" value={formatCurrency(metrics.loanAmount)} highlight accentColor={colors.accent} />
          <FinancialRow label="Monthly Payment" value={`${formatCurrency(metrics.monthlyPayment)}/mo`} />
        </CollapsibleSection>

        {/* ── Income ─────────────────────────────────── */}
        <CollapsibleSection title="Income" accentColor={colors.green}>
          {INCOME_SLIDERS.map((sl) => (
            <View key={sl.id} style={styles.sliderPad}>
              <DealMakerSlider
                config={sl}
                value={state[sl.id as keyof DealMakerState] as number}
                onChange={(v) => updateField(sl.id as keyof DealMakerState, v)}
                accentColor={colors.green}
              />
            </View>
          ))}
          <FinancialRow
            label="Gross Monthly Income"
            value={`${formatCurrency(metrics.grossMonthlyIncome)}/mo`}
            highlight
            accentColor={colors.green}
          />
        </CollapsibleSection>

        {/* ── Expenses ──────────────────────────────── */}
        <CollapsibleSection title="Operating Expenses" accentColor={colors.red}>
          {EXPENSES_SLIDERS.map((sl) => (
            <View key={sl.id} style={styles.sliderPad}>
              <DealMakerSlider
                config={sl}
                value={state[sl.id as keyof DealMakerState] as number}
                onChange={(v) => updateField(sl.id as keyof DealMakerState, v)}
                accentColor={colors.red}
              />
            </View>
          ))}
          <FinancialRow
            label="Total Monthly Expenses"
            value={`${formatCurrency(metrics.totalMonthlyExpenses)}/mo`}
            highlight
            accentColor={colors.red}
            negative
          />
        </CollapsibleSection>

        {/* ── Summary ───────────────────────────────── */}
        <GlowCard style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Deal Summary</Text>
          <View style={styles.summaryGrid}>
            <SummaryItem label="NOI" value={formatCompactCurrency(metrics.noi)} positive={metrics.noi > 0} />
            <SummaryItem label="Cash Flow" value={`${formatCompactCurrency(metrics.annualCashFlow)}/yr`} positive={metrics.annualCashFlow > 0} />
            <SummaryItem label="Cash Needed" value={formatCompactCurrency(metrics.cashNeeded)} positive />
            <SummaryItem label="Deal Gap" value={`${metrics.dealGapPct.toFixed(1)}%`} positive={metrics.dealGapPct > 0} />
          </View>
        </GlowCard>

        {/* ── Apply Button ──────────────────────────── */}
        <Pressable style={styles.applyBtn} onPress={handleApply}>
          <Ionicons name="checkmark-circle" size={20} color={colors.black} />
          <Text style={styles.applyBtnText}>Apply & Return to Verdict</Text>
        </Pressable>

        <View style={{ height: insets.bottom + spacing.xl }} />
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Inline sub-components
// ---------------------------------------------------------------------------

function MetricPill({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <View style={pillStyles.container}>
      <Text style={[pillStyles.value, { color: positive ? colors.accent : colors.red }]}>
        {value}
      </Text>
      <Text style={pillStyles.label}>{label}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  container: { alignItems: 'center', flex: 1 },
  value: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: 9,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 1,
  },
});

function SummaryItem({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <View style={sumStyles.item}>
      <Text style={[sumStyles.value, { color: positive ? colors.accent : colors.red }]}>{value}</Text>
      <Text style={sumStyles.label}>{label}</Text>
    </View>
  );
}

const sumStyles = StyleSheet.create({
  item: { width: '50%', alignItems: 'center', paddingVertical: spacing.sm },
  value: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 2,
  },
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.base },
  center: {
    flex: 1,
    backgroundColor: colors.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.heading,
  },
  applyText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.accent,
  },
  metricsStrip: {
    flexDirection: 'row',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  sliderPad: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  summaryCard: {
    padding: spacing.md,
  },
  summaryTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.heading,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 16,
  },
  applyBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: colors.black,
  },
});
