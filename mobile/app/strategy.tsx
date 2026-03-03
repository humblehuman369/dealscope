import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { STRATEGY_CONFIG, type StrategyId } from '@dealscope/shared';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { usePropertySearch } from '@/hooks/usePropertyData';
import { useVerdict, type StrategyResult } from '@/hooks/useVerdict';

export default function StrategyScreen() {
  const { address, strategyId } = useLocalSearchParams<{
    address: string;
    strategyId: string;
  }>();
  const router = useRouter();
  const property = usePropertySearch(address ?? null);
  const verdict = useVerdict(property.data);

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
  const v = property.data.valuations;
  const r = property.data.rentals;
  const m = property.data.market;
  const purchasePrice = verdict.data.purchase_price ?? v.market_price ?? 0;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Button
          title="← Back to Verdict"
          variant="ghost"
          onPress={() => router.back()}
          style={{ alignSelf: 'flex-start', marginBottom: 8 }}
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
                onPress={() =>
                  router.setParams({ strategyId: s.id })
                }
                style={[
                  styles.pickerChip,
                  isActive && { borderColor: c?.color ?? colors.primary, backgroundColor: 'rgba(14,165,233,0.1)' },
                ]}
              >
                <Text style={styles.pickerIcon}>{c?.icon ?? '●'}</Text>
                <Text style={[styles.pickerLabel, isActive && { color: colors.textHeading }]}>
                  {c?.shortName ?? s.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Score Card */}
        <View style={[styles.card, { borderColor: config?.color ?? colors.border }]}>
          <View style={styles.scoreHeader}>
            <Text style={{ fontSize: 28 }}>{config?.icon ?? '●'}</Text>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.stratName}>{config?.name ?? selected.name}</Text>
              <Text style={styles.stratBadge}>{selected.badge ?? `Score: ${Math.round(selected.score)}`}</Text>
            </View>
            <View style={[styles.scorePill, { backgroundColor: config?.color ?? colors.primary }]}>
              <Text style={styles.scorePillText}>{Math.round(selected.score)}</Text>
            </View>
          </View>
        </View>

        {/* Key Metrics */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Key Metrics</Text>
          <MetricRow label="Cap Rate" value={pct(selected.cap_rate)} />
          <MetricRow label="Cash-on-Cash" value={pct(selected.cash_on_cash)} />
          <MetricRow label="DSCR" value={selected.dscr != null ? selected.dscr.toFixed(2) + 'x' : '—'} />
          <MetricRow label="Monthly Cash Flow" value={money(selected.monthly_cash_flow)} />
          <MetricRow label="Annual Cash Flow" value={money(selected.annual_cash_flow)} />
        </View>

        {/* What You'd Pay */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What You'd Pay</Text>
          <MetricRow label="Purchase Price" value={money(purchasePrice)} />
          <MetricRow label="Target Buy" value={money(verdict.data.income_value)} />
          {verdict.data.wholesale_mao != null && (
            <MetricRow label="Wholesale MAO" value={money(verdict.data.wholesale_mao)} />
          )}
        </View>

        {/* What You'd Earn */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What You'd Earn</Text>
          <MetricRow label="Monthly Rent (LTR)" value={money(r.monthly_rent_ltr)} />
          {r.average_daily_rate != null && (
            <MetricRow label="Avg Daily Rate (STR)" value={money(r.average_daily_rate)} />
          )}
          <MetricRow label="Property Taxes" value={`${money(m.property_taxes_annual)}/yr`} />
          <MetricRow label="HOA" value={m.hoa_fees_monthly ? `${money(m.hoa_fees_monthly)}/mo` : 'None'} />
        </View>

        {/* Deal Gap */}
        {verdict.data.deal_gap_percent != null && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Deal Gap Analysis</Text>
            <MetricRow label="Deal Gap" value={`${verdict.data.deal_gap_percent > 0 ? '+' : ''}${verdict.data.deal_gap_percent.toFixed(1)}%`} />
            <MetricRow label="Deal Gap Amount" value={money(verdict.data.deal_gap_amount)} />
            <MetricRow label="Income Gap" value={pct(verdict.data.income_gap_percent)} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function money(n: number | null | undefined): string {
  if (n == null) return '—';
  return '$' + Math.round(n).toLocaleString();
}

function pct(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toFixed(1) + '%';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  scroll: { padding: 24, paddingTop: 56, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: colors.base, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: colors.textHeading, fontSize: 18, fontWeight: '600', marginTop: 16 },
  errorTitle: { color: colors.error, fontSize: 20, fontWeight: '600', marginBottom: 8 },
  address: { fontSize: 20, fontWeight: '700', color: colors.textHeading, marginBottom: 2 },
  location: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },

  pickerRow: { marginBottom: 16 },
  pickerChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, marginRight: 8, backgroundColor: colors.card },
  pickerIcon: { fontSize: 16, marginRight: 6 },
  pickerLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.textHeading, marginBottom: 12 },

  scoreHeader: { flexDirection: 'row', alignItems: 'center' },
  stratName: { fontSize: 18, fontWeight: '700', color: colors.textHeading },
  stratBadge: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  scorePill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  scorePillText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  metricRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  metricLabel: { fontSize: 14, color: colors.textSecondary },
  metricValue: { fontSize: 14, fontWeight: '600', color: colors.textHeading },
});
