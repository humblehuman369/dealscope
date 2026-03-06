import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { STRATEGY_CONFIG, type StrategyId } from '@dealscope/shared';
import { Button } from '@/components/ui/Button';
import { colors, cardGlow } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { usePropertySearch } from '@/hooks/usePropertyData';
import { useVerdict, type StrategyResult } from '@/hooks/useVerdict';
import { useWorksheet } from '@/hooks/useWorksheet';
import { getScoreColor } from '@/constants/theme';

export default function StrategyScreen() {
  const { address, strategyId } = useLocalSearchParams<{
    address: string;
    strategyId: string;
  }>();
  const router = useRouter();
  const property = usePropertySearch(address ?? null);
  const verdict = useVerdict(property.data);
  const worksheet = useWorksheet(property.data, strategyId ?? undefined);

  const isLoading = property.isLoading || verdict.isLoading;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading strategy...</Text>
      </View>
    );
  }

  if (!verdict.data || !property.data) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorTitle}>Strategy Unavailable</Text>
        <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  const strategies = verdict.data.strategies.slice().sort((a, b) => a.rank - b.rank);
  const selected = strategies.find((s) => s.id === strategyId) ?? strategies[0];
  const config = STRATEGY_CONFIG[selected.id as StrategyId];
  const stratColor = config?.color ?? colors.primary;
  const scoreColor = getScoreColor(selected.score);
  const ws = worksheet.data;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Button
          title="← Back to Verdict"
          variant="ghost"
          onPress={() => router.back()}
          style={{ alignSelf: 'flex-start', marginBottom: spacing.sm }}
        />

        <Text style={styles.address}>{property.data.address.street}</Text>
        <Text style={styles.location}>
          {property.data.address.city}, {property.data.address.state}
        </Text>

        {/* Strategy Picker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
          {strategies.map((s) => {
            const c = STRATEGY_CONFIG[s.id as StrategyId];
            const isActive = s.id === selected.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => router.setParams({ strategyId: s.id })}
                style={[
                  styles.pickerChip,
                  isActive && { backgroundColor: stratColor, borderColor: stratColor },
                ]}
              >
                <Text style={styles.pickerIcon}>{c?.icon ?? '●'}</Text>
                <Text style={[styles.pickerLabel, isActive && styles.pickerLabelActive]}>
                  {c?.shortName ?? s.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Score + Metrics Hero */}
        <View style={[styles.heroCard, cardGlow.lg]}>
          <View style={styles.heroTop}>
            <Text style={styles.heroIcon}>{config?.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName}>{config?.name ?? selected.name}</Text>
              <Text style={styles.heroScore}>
                Score: <Text style={{ color: scoreColor }}>{Math.round(selected.score)}/95</Text>
              </Text>
            </View>
            {selected.badge && (
              <View style={[styles.badgeChip, { backgroundColor: stratColor + '20', borderColor: stratColor }]}>
                <Text style={[styles.badgeText, { color: stratColor }]}>{selected.badge}</Text>
              </View>
            )}
          </View>

          {/* Key metric */}
          <View style={styles.keyMetricRow}>
            <Text style={styles.keyMetricLabel}>{selected.metric_label}</Text>
            <Text style={[styles.keyMetricValue, { color: stratColor }]}>
              {formatMetric(selected)}
            </Text>
          </View>
        </View>

        {/* Financial Worksheet */}
        {ws && (
          <>
            {/* Acquisition */}
            <View style={[styles.card, cardGlow.sm]}>
              <Text style={styles.sectionLabel}>ACQUISITION</Text>
              <DataRow label="Purchase Price" value={money(ws.purchase_price)} />
              <DataRow label="Down Payment (20%)" value={money(ws.down_payment)} />
              <DataRow label="Loan Amount" value={money(ws.loan_amount)} />
              <DataRow label="Closing Costs (3%)" value={money(ws.purchase_price * 0.03)} />
              <DataRow label="Total Cash Needed" value={money(ws.total_cash_needed)} highlight />
            </View>

            {/* Income & Expenses */}
            <View style={[styles.card, cardGlow.sm]}>
              <Text style={styles.sectionLabel}>MONTHLY INCOME & EXPENSES</Text>
              <DataRow label="Gross Rent" value={moneyMo(ws.monthly_rent)} highlight />
              <DataRow label="Mortgage (P&I)" value={`-${moneyMo(ws.monthly_mortgage)}`} negative />
              <DataRow label="Property Taxes" value={`-${moneyMo(ws.property_taxes_monthly)}`} negative />
              <DataRow label="Insurance" value={`-${moneyMo(ws.insurance_cost)}`} negative />
              <DataRow label="Vacancy (1%)" value={`-${moneyMo(ws.vacancy_cost)}`} negative />
              <DataRow label="Maintenance (5%)" value={`-${moneyMo(ws.maintenance_cost)}`} negative />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Monthly Cash Flow</Text>
                <Text style={[styles.totalValue, { color: ws.monthly_cash_flow >= 0 ? colors.success : colors.error }]}>
                  {ws.monthly_cash_flow >= 0 ? '+' : ''}{moneyMo(ws.monthly_cash_flow)}
                </Text>
              </View>
            </View>

            {/* Key Metrics */}
            <View style={[styles.card, cardGlow.sm]}>
              <Text style={styles.sectionLabel}>KEY METRICS</Text>
              <View style={styles.metricsGrid}>
                <MetricCard label="Cash on Cash" value={`${ws.cash_on_cash.toFixed(1)}%`} color={ws.cash_on_cash >= 8 ? colors.success : ws.cash_on_cash >= 4 ? colors.warning : colors.error} />
                <MetricCard label="Cap Rate" value={`${ws.cap_rate.toFixed(1)}%`} color={ws.cap_rate >= 7 ? colors.success : ws.cap_rate >= 4 ? colors.warning : colors.error} />
                <MetricCard label="DSCR" value={`${ws.dscr.toFixed(2)}x`} color={ws.dscr >= 1.25 ? colors.success : ws.dscr >= 1.0 ? colors.warning : colors.error} />
                <MetricCard label="Annual Cash Flow" value={money(ws.annual_cash_flow)} color={ws.annual_cash_flow >= 0 ? colors.success : colors.error} />
              </View>
            </View>

            {/* Strategy Metrics from Verdict */}
            <View style={[styles.card, cardGlow.sm]}>
              <Text style={styles.sectionLabel}>STRATEGY ANALYSIS</Text>
              {selected.cap_rate != null && (
                <DataRow label="Cap Rate" value={`${selected.cap_rate.toFixed(1)}%`} />
              )}
              {selected.cash_on_cash != null && (
                <DataRow label="Cash on Cash" value={`${selected.cash_on_cash.toFixed(1)}%`} />
              )}
              {selected.dscr != null && (
                <DataRow label="DSCR" value={`${selected.dscr.toFixed(2)}x`} />
              )}
              {selected.monthly_cash_flow != null && (
                <DataRow label="Monthly Cash Flow" value={moneyMo(selected.monthly_cash_flow)} />
              )}
              {selected.annual_cash_flow != null && (
                <DataRow label="Annual Cash Flow" value={money(selected.annual_cash_flow)} />
              )}
            </View>
          </>
        )}

        {worksheet.isLoading && (
          <View style={styles.worksheetLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.worksheetLoadingText}>Calculating worksheet...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={[styles.metricCardValue, { color }]}>{value}</Text>
      <Text style={styles.metricCardLabel}>{label}</Text>
    </View>
  );
}

function DataRow({ label, value, highlight, negative }: { label: string; value: string; highlight?: boolean; negative?: boolean }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={[
        styles.dataValue,
        highlight && styles.dataHighlight,
        negative && styles.dataNegative,
      ]}>
        {value}
      </Text>
    </View>
  );
}

function formatMetric(s: StrategyResult): string {
  if (s.metric_value == null) return '—';
  if (s.metric.includes('%') || s.metric_label.toLowerCase().includes('rate') || s.metric_label.toLowerCase().includes('roi')) {
    return `${s.metric_value.toFixed(1)}%`;
  }
  return money(s.metric_value);
}

function money(n: number | null | undefined): string {
  if (n == null) return '—';
  return '$' + Math.round(n).toLocaleString();
}

function moneyMo(n: number | null | undefined): string {
  if (n == null) return '—';
  return '$' + Math.round(n).toLocaleString();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  scroll: { padding: spacing.lg, paddingTop: 56, paddingBottom: 60 },
  centered: { flex: 1, backgroundColor: colors.base, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  loadingText: { fontFamily: fontFamilies.heading, color: colors.textHeading, fontSize: 16, marginTop: spacing.sm },
  errorTitle: { fontFamily: fontFamilies.heading, color: colors.error, fontSize: 20, fontWeight: '700' },

  address: { fontFamily: fontFamilies.heading, fontSize: 20, fontWeight: '700', color: colors.textHeading },
  location: { fontFamily: fontFamilies.body, fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm },

  pickerRow: { marginBottom: spacing.md },
  pickerChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 9999, borderWidth: 1, borderColor: colors.borderLight, marginRight: spacing.sm,
    backgroundColor: colors.card,
  },
  pickerIcon: { fontSize: 16, marginRight: 6 },
  pickerLabel: { fontFamily: fontFamilies.bodyMedium, fontSize: 13, color: colors.textBody },
  pickerLabelActive: { color: '#fff', fontWeight: '700' },

  heroCard: { backgroundColor: colors.base, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroIcon: { fontSize: 32 },
  heroName: { fontFamily: fontFamilies.heading, fontSize: 20, fontWeight: '700', color: colors.textHeading },
  heroScore: { fontFamily: fontFamilies.mono, fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  badgeChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, borderWidth: 1 },
  badgeText: { fontFamily: fontFamilies.heading, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  keyMetricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  keyMetricLabel: { fontFamily: fontFamilies.body, fontSize: 14, color: colors.textSecondary },
  keyMetricValue: { fontFamily: fontFamilies.monoBold, fontSize: 20, fontWeight: '700' },

  card: { backgroundColor: colors.base, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md },
  sectionLabel: { fontFamily: fontFamilies.heading, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: colors.primary, textTransform: 'uppercase', marginBottom: spacing.sm },

  dataRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  dataLabel: { fontFamily: fontFamilies.body, fontSize: 14, color: colors.textSecondary },
  dataValue: { fontFamily: fontFamilies.mono, fontSize: 14, fontWeight: '600', color: colors.textHeading },
  dataHighlight: { color: colors.primary, fontWeight: '700' },
  dataNegative: { color: colors.error },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, marginTop: spacing.xs },
  totalLabel: { fontFamily: fontFamilies.heading, fontSize: 15, fontWeight: '700', color: colors.textHeading },
  totalValue: { fontFamily: fontFamilies.monoBold, fontSize: 18, fontWeight: '700' },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metricCard: {
    width: '48%', backgroundColor: colors.card, borderRadius: 12, padding: spacing.sm,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  metricCardValue: { fontFamily: fontFamilies.monoBold, fontSize: 18, fontWeight: '700' },
  metricCardLabel: { fontFamily: fontFamilies.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  worksheetLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md },
  worksheetLoadingText: { fontFamily: fontFamilies.body, fontSize: 13, color: colors.textSecondary },
});
