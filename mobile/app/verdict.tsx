import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { STRATEGY_CONFIG } from '@dealscope/shared';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { usePropertySearch } from '@/hooks/usePropertyData';
import { useSaveProperty, useCheckSaved } from '@/hooks/useSavedProperties';
import { useVerdict, type StrategyResult } from '@/hooks/useVerdict';

export default function VerdictScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const router = useRouter();
  const property = usePropertySearch(address ?? null);
  const verdict = useVerdict(property.data);
  const savedCheck = useCheckSaved(address ?? null);
  const saveProperty = useSaveProperty();

  const isLoading = property.isLoading || verdict.isLoading;
  const error = property.error || verdict.error;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Analyzing property...</Text>
        <Text style={styles.loadingSubtext}>{address}</Text>
      </View>
    );
  }

  if (error || !property.data) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorTitle}>Analysis Failed</Text>
        <Text style={styles.errorText}>
          {(error as any)?.response?.data?.detail ??
            'Could not analyze this property. Please try again.'}
        </Text>
        <Button
          title="Go Back"
          onPress={() => router.back()}
          style={{ marginTop: 20, width: 200 }}
        />
      </View>
    );
  }

  const data = property.data;
  const vr = verdict.data;
  const v = data.valuations;
  const r = data.rentals;
  const m = data.market;
  const d = data.details;
  const isSaved = savedCheck.data?.is_saved ?? false;

  function handleSave() {
    if (isSaved || !data) return;
    saveProperty.mutate({
      address_street: data.address.street ?? '',
      address_city: data.address.city ?? undefined,
      address_state: data.address.state ?? undefined,
      address_zip: data.address.zip_code ?? undefined,
      full_address: address ?? '',
      zpid: data.zpid ?? undefined,
      property_data_snapshot: {
        street: data.address.street,
        city: data.address.city,
        state: data.address.state,
        zipCode: data.address.zip_code,
        bedrooms: d.bedrooms,
        bathrooms: d.bathrooms,
        sqft: d.square_footage,
        listPrice: v.market_price,
        zpid: data.zpid,
      },
      status: 'watching',
    });
  }

  const scoreColor = getScoreColor(vr?.deal_score ?? 0);
  const strategies = vr?.strategies?.slice().sort((a, b) => a.rank - b.rank) ?? [];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Button
          title="← Back to Search"
          variant="ghost"
          onPress={() => router.back()}
          style={{ alignSelf: 'flex-start', marginBottom: 8 }}
        />

        <Text style={styles.address}>{data.address.street}</Text>
        <Text style={styles.location}>
          {data.address.city}, {data.address.state} {data.address.zip_code}
        </Text>

        {/* Verdict Score Card */}
        {vr && (
          <View style={styles.scoreCard}>
            <View style={styles.scoreRow}>
              <View style={[styles.scoreBadge, { borderColor: scoreColor }]}>
                <Text style={[styles.scoreNumber, { color: scoreColor }]}>
                  {Math.round(vr.deal_score)}
                </Text>
              </View>
              <View style={styles.scoreInfo}>
                <Text style={styles.verdictLabel}>{vr.deal_verdict}</Text>
                {vr.deal_gap_percent != null && (
                  <Text style={styles.gapText}>
                    Deal Gap: {vr.deal_gap_percent > 0 ? '+' : ''}
                    {vr.deal_gap_percent.toFixed(1)}%
                  </Text>
                )}
              </View>
            </View>
            {vr.deal_narrative && (
              <Text style={styles.narrative}>{vr.deal_narrative}</Text>
            )}
          </View>
        )}

        {/* Save Button */}
        <Button
          title={isSaved ? '✓ Saved to Deal Vault' : 'Save to Deal Vault'}
          variant={isSaved ? 'secondary' : 'primary'}
          onPress={handleSave}
          disabled={isSaved}
          loading={saveProperty.isPending}
          style={{ marginBottom: 16 }}
        />

        {/* Property Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Property Details</Text>
          <View style={styles.row}>
            <Stat label="Beds" value={d.bedrooms} />
            <Stat label="Baths" value={d.bathrooms} />
            <Stat label="Sqft" value={fmt(d.square_footage)} />
            <Stat label="Year" value={d.year_built} />
          </View>
        </View>

        {/* Strategy Rankings */}
        {strategies.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Strategy Rankings</Text>
            {strategies.map((s) => (
              <StrategyRow
                key={s.id}
                strategy={s}
                onPress={() =>
                  router.push({
                    pathname: '/strategy',
                    params: { address: address!, strategyId: s.id },
                  })
                }
              />
            ))}
          </View>
        )}

        {/* Valuations */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Valuations</Text>
          <ValueRow label="IQ Estimate" value={money(v.value_iq_estimate)} highlight />
          <ValueRow label="Zestimate" value={money(v.zestimate)} />
          <ValueRow label="RentCast AVM" value={money(v.rentcast_avm)} />
          <ValueRow label="Redfin Estimate" value={money(v.redfin_estimate)} />
          <ValueRow label="Market Price" value={money(v.market_price)} />
        </View>

        {/* Rental Estimates */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rental Estimates</Text>
          <ValueRow label="IQ Rent Estimate" value={money(r.monthly_rent_ltr)} highlight />
          <ValueRow label="RentCast" value={money(r.rental_stats?.rentcast_estimate)} />
          <ValueRow label="Zillow" value={money(r.rental_stats?.zillow_estimate)} />
          <ValueRow label="Redfin" value={money(r.rental_stats?.redfin_estimate)} />
        </View>

        {/* Market */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Market Data</Text>
          <ValueRow label="Property Taxes" value={`${money(m.property_taxes_annual)}/yr`} />
          <ValueRow label="HOA" value={m.hoa_fees_monthly ? `${money(m.hoa_fees_monthly)}/mo` : 'None'} />
          <ValueRow label="Price/Sqft" value={money(v.price_per_sqft)} />
        </View>
      </ScrollView>
    </View>
  );
}

function StrategyRow({
  strategy,
  onPress,
}: {
  strategy: StrategyResult;
  onPress: () => void;
}) {
  const config = STRATEGY_CONFIG[strategy.id as keyof typeof STRATEGY_CONFIG];
  const stratColor = config?.color ?? colors.primary;

  return (
    <Pressable onPress={onPress} style={styles.strategyRow}>
      <View style={styles.strategyLeft}>
        <Text style={styles.strategyIcon}>{config?.icon ?? '●'}</Text>
        <View>
          <Text style={styles.strategyName}>{config?.name ?? strategy.name}</Text>
          <Text style={styles.strategyMetric}>
            {strategy.metric_label}: {strategy.metric_value != null
              ? strategy.metric.includes('%')
                ? `${strategy.metric_value.toFixed(1)}%`
                : money(strategy.metric_value)
              : '—'}
          </Text>
        </View>
      </View>
      <View style={[styles.strategyScore, { borderColor: stratColor }]}>
        <Text style={[styles.strategyScoreText, { color: stratColor }]}>
          {Math.round(strategy.score)}
        </Text>
      </View>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ValueRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.valueRow}>
      <Text style={styles.valueLabel}>{label}</Text>
      <Text style={[styles.valueAmount, highlight && styles.valueHighlight]}>{value}</Text>
    </View>
  );
}

function money(n: number | null | undefined): string {
  if (n == null) return '—';
  return '$' + Math.round(n).toLocaleString();
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return Math.round(n).toLocaleString();
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#34D399';
  if (score >= 60) return '#0EA5E9';
  if (score >= 40) return '#FBBF24';
  return '#F87171';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  scroll: { padding: 24, paddingTop: 56, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: colors.base, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: colors.textHeading, fontSize: 18, fontWeight: '600', marginTop: 16 },
  loadingSubtext: { color: colors.textSecondary, fontSize: 14, marginTop: 4, textAlign: 'center' },
  errorTitle: { color: colors.error, fontSize: 20, fontWeight: '600', marginBottom: 8 },
  errorText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  address: { fontSize: 22, fontWeight: '700', color: colors.textHeading, marginBottom: 2 },
  location: { fontSize: 15, color: colors.textSecondary, marginBottom: 16 },

  scoreCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  scoreBadge: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  scoreNumber: { fontSize: 24, fontWeight: '800' },
  scoreInfo: { flex: 1 },
  verdictLabel: { fontSize: 18, fontWeight: '700', color: colors.textHeading },
  gapText: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  narrative: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginTop: 4 },

  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.textHeading, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.textHeading },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  valueLabel: { fontSize: 14, color: colors.textSecondary },
  valueAmount: { fontSize: 14, fontWeight: '600', color: colors.textHeading },
  valueHighlight: { color: colors.primary, fontSize: 16, fontWeight: '700' },

  strategyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  strategyLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  strategyIcon: { fontSize: 20, marginRight: 12 },
  strategyName: { fontSize: 14, fontWeight: '600', color: colors.textHeading },
  strategyMetric: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  strategyScore: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  strategyScoreText: { fontSize: 14, fontWeight: '700' },
});
