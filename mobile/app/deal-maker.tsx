import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '@/components/ui';
import { SliderInput } from '@/components/deal-maker/SliderInput';
import { usePropertyData } from '@/hooks/usePropertyData';
import { useVerdict } from '@/hooks/useVerdict';
import api from '@/services/api';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { getScoreColor } from '@/constants/theme';

function fmtC(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  return (v < 0 ? '-$' : '$') + Math.round(Math.abs(v)).toLocaleString();
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  return v.toFixed(2) + '%';
}

interface Assumptions {
  purchase_price: number;
  down_payment_pct: number;
  interest_rate: number;
  loan_term_years: number;
  monthly_rent: number;
  vacancy_rate: number;
  property_management_pct: number;
  maintenance_pct: number;
  insurance_pct: number;
}

interface MetricsResult {
  deal_score: number;
  monthly_cash_flow: number;
  cash_on_cash: number;
  cap_rate: number;
  dscr: number;
  noi: number;
  cash_needed: number;
}

export default function DealMakerScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const router = useRouter();
  const { getCached } = usePropertyData();
  const { data: verdict } = useVerdict(address);
  const property = address ? getCached(address) : undefined;

  const listPrice = property?.listing?.list_price ?? verdict?.list_price ?? 300000;
  const rent = property?.rentals?.monthly_rent_ltr ?? 1500;

  const [assumptions, setAssumptions] = useState<Assumptions>({
    purchase_price: verdict?.purchase_price ?? listPrice,
    down_payment_pct: 20,
    interest_rate: 6.5,
    loan_term_years: 30,
    monthly_rent: rent,
    vacancy_rate: 5,
    property_management_pct: 8,
    maintenance_pct: 5,
    insurance_pct: 0.5,
  });

  const [metrics, setMetrics] = useState<MetricsResult | null>(null);
  const [calculating, setCalculating] = useState(false);

  const recalculate = useCallback(async () => {
    if (!address) return;
    setCalculating(true);
    try {
      const propertyTaxes = property?.expenses?.property_taxes ?? 0;
      const insuranceAnnual = property?.expenses?.insurance ?? assumptions.purchase_price * (assumptions.insurance_pct / 100);

      const { data } = await api.post<MetricsResult>('/api/v1/worksheet/deal-score', {
        list_price: listPrice,
        purchase_price: assumptions.purchase_price,
        monthly_rent: assumptions.monthly_rent,
        property_taxes: propertyTaxes,
        insurance: insuranceAnnual,
        down_payment_pct: assumptions.down_payment_pct / 100,
        interest_rate: assumptions.interest_rate / 100,
        loan_term_years: assumptions.loan_term_years,
        vacancy_rate: assumptions.vacancy_rate / 100,
        property_management_pct: assumptions.property_management_pct / 100,
        maintenance_pct: assumptions.maintenance_pct / 100,
      });
      setMetrics(data);
    } catch {
      // keep previous metrics on error
    } finally {
      setCalculating(false);
    }
  }, [address, assumptions, listPrice, property]);

  useEffect(() => {
    const timeout = setTimeout(recalculate, 500);
    return () => clearTimeout(timeout);
  }, [recalculate]);

  function update<K extends keyof Assumptions>(key: K, value: Assumptions[K]) {
    setAssumptions((prev) => ({ ...prev, [key]: value }));
  }

  const score = metrics?.deal_score ?? verdict?.deal_score ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>DealMaker</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Score Header */}
        <Card glow="lg" style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <View style={styles.scoreCenter}>
              <Text style={styles.scoreLabel}>DEAL SCORE</Text>
              <Text style={[styles.scoreValue, { color: getScoreColor(score) }]}>
                {Math.round(score)}
              </Text>
            </View>
            {calculating && (
              <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
            )}
          </View>

          {metrics && (
            <View style={styles.metricsRow}>
              <MiniMetric
                label="Cash Flow"
                value={fmtC(metrics.monthly_cash_flow) + '/mo'}
                color={(metrics.monthly_cash_flow ?? 0) >= 0 ? colors.success : colors.error}
              />
              <MiniMetric label="CoC" value={fmtPct(metrics.cash_on_cash)} />
              <MiniMetric label="Cap Rate" value={fmtPct(metrics.cap_rate)} />
              <MiniMetric label="DSCR" value={metrics.dscr?.toFixed(2) + 'x'} />
            </View>
          )}
        </Card>

        {/* Sliders */}
        <Card glow="sm" style={styles.slidersCard}>
          <Text style={styles.sectionTitle}>PURCHASE TERMS</Text>
          <SliderInput
            label="Purchase Price"
            value={assumptions.purchase_price}
            onChange={(v) => update('purchase_price', v)}
            min={Math.round(listPrice * 0.5)}
            max={Math.round(listPrice * 1.2)}
            step={5000}
            format="currency"
          />
          <SliderInput
            label="Down Payment"
            value={assumptions.down_payment_pct}
            onChange={(v) => update('down_payment_pct', v)}
            min={3.5}
            max={50}
            step={0.5}
            format="percent"
          />
          <SliderInput
            label="Interest Rate"
            value={assumptions.interest_rate}
            onChange={(v) => update('interest_rate', v)}
            min={3}
            max={12}
            step={0.125}
            format="percent"
          />
          <SliderInput
            label="Loan Term"
            value={assumptions.loan_term_years}
            onChange={(v) => update('loan_term_years', v)}
            min={10}
            max={30}
            step={5}
            format="years"
          />
        </Card>

        <Card glow="sm" style={styles.slidersCard}>
          <Text style={styles.sectionTitle}>INCOME</Text>
          <SliderInput
            label="Monthly Rent"
            value={assumptions.monthly_rent}
            onChange={(v) => update('monthly_rent', v)}
            min={500}
            max={Math.round(rent * 2.5)}
            step={50}
            format="currency"
          />
          <SliderInput
            label="Vacancy Rate"
            value={assumptions.vacancy_rate}
            onChange={(v) => update('vacancy_rate', v)}
            min={0}
            max={20}
            step={1}
            format="percent"
          />
        </Card>

        <Card glow="sm" style={styles.slidersCard}>
          <Text style={styles.sectionTitle}>EXPENSES</Text>
          <SliderInput
            label="Property Management"
            value={assumptions.property_management_pct}
            onChange={(v) => update('property_management_pct', v)}
            min={0}
            max={15}
            step={0.5}
            format="percent"
          />
          <SliderInput
            label="Maintenance Reserve"
            value={assumptions.maintenance_pct}
            onChange={(v) => update('maintenance_pct', v)}
            min={0}
            max={15}
            step={0.5}
            format="percent"
          />
          <SliderInput
            label="Insurance Rate"
            value={assumptions.insurance_pct}
            onChange={(v) => update('insurance_pct', v)}
            min={0.1}
            max={2}
            step={0.1}
            format="percent"
          />
        </Card>

        <View style={styles.actions}>
          <Button
            title="Apply & See Verdict"
            onPress={() => router.push({ pathname: '/verdict', params: { address } })}
          />
          <Button
            title="View Strategy Details"
            variant="secondary"
            onPress={() => router.push({ pathname: '/strategy', params: { address } })}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniMetric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={miniStyles.box}>
      <Text style={miniStyles.label}>{label}</Text>
      <Text style={[miniStyles.value, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const miniStyles = StyleSheet.create({
  box: { alignItems: 'center', gap: 2 },
  label: { ...typography.tag, color: colors.textLabel },
  value: { fontFamily: fontFamilies.mono, fontSize: 13, fontWeight: '700', color: colors.textHeading },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backArrow: { fontSize: 22, color: colors.textBody },
  headerTitle: { ...typography.h3, color: colors.textHeading },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'] + 40,
    gap: spacing.lg,
  },
  scoreCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreCenter: { alignItems: 'center' },
  scoreLabel: { ...typography.label, color: colors.textLabel },
  scoreValue: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 48,
    marginVertical: 4,
  },
  spinner: { position: 'absolute', right: 0, top: 0 },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  slidersCard: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textLabel,
    marginBottom: -spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
});
