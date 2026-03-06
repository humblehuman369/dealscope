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
import { PriceComparisonBar } from '@/components/ui/PriceComparisonBar';
import { colors, cardGlow, shadows } from '@/constants/colors';
import { fontFamilies, typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { usePropertySearch } from '@/hooks/usePropertyData';
import { useSaveProperty, useCheckSaved } from '@/hooks/useSavedProperties';
import { useVerdict, type StrategyResult } from '@/hooks/useVerdict';
import { getScoreColor } from '@/constants/theme';

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
          onPress={() => router.replace('/(tabs)/search')}
          style={{ alignSelf: 'flex-start', marginBottom: spacing.sm }}
        />

        {/* Address */}
        <Text style={styles.address}>{data.address.street}</Text>
        <Text style={styles.location}>
          {data.address.city}, {data.address.state} {data.address.zip_code}
        </Text>

        {/* Verdict Score Hero */}
        {vr && (
          <View style={[styles.heroCard, cardGlow.lg]}>
            <View style={styles.heroTop}>
              <View style={[styles.scoreBadge, { borderColor: scoreColor }, shadows.glowStrong]}>
                <Text style={[styles.scoreNumber, { color: scoreColor }]}>
                  {Math.round(vr.deal_score)}
                </Text>
                <Text style={styles.scoreOf}>/95</Text>
              </View>
              <View style={styles.heroInfo}>
                <Text style={styles.verdictLabel}>{vr.deal_verdict}</Text>
                <Text style={styles.verdictDesc}>{vr.verdict_description}</Text>
              </View>
            </View>

            {/* AI Narrative */}
            {vr.deal_narrative && (
              <View style={styles.narrativeBox}>
                <View style={styles.narrativeAccent} />
                <Text style={styles.narrativeText}>{vr.deal_narrative}</Text>
              </View>
            )}
          </View>
        )}

        {/* Price Comparison Bar */}
        <View style={[styles.card, cardGlow.sm]}>
          <PriceComparisonBar
            listPrice={vr?.list_price ?? v.market_price ?? null}
            incomeValue={vr?.income_value ?? null}
            wholesalePrice={vr?.wholesale_mao ?? null}
          />
          {vr?.deal_gap_percent != null && (
            <View style={styles.gapRow}>
              <Text style={styles.gapLabel}>Deal Gap</Text>
              <Text
                style={[
                  styles.gapValue,
                  { color: (vr.deal_gap_percent ?? 0) < 0 ? colors.success : colors.error },
                ]}
              >
                {(vr.deal_gap_percent ?? 0) > 0 ? '+' : ''}
                {vr.deal_gap_percent?.toFixed(1)}%
                {vr.deal_gap_amount != null && ` (${money(vr.deal_gap_amount)})`}
              </Text>
            </View>
          )}
        </View>

        {/* Property Quick Stats */}
        <View style={[styles.card, cardGlow.sm]}>
          <Text style={styles.sectionLabel}>PROPERTY DETAILS</Text>
          <View style={styles.statsGrid}>
            <QuickStat label="Beds" value={String(d.bedrooms ?? '—')} />
            <QuickStat label="Baths" value={String(d.bathrooms ?? '—')} />
            <QuickStat label="Sqft" value={fmt(d.square_footage)} />
            <QuickStat label="Year" value={String(d.year_built ?? '—')} />
          </View>
          <Pressable
            onPress={() => router.push({ pathname: '/property-details' as any, params: { address: address! } })}
            style={styles.seeMoreBtn}
          >
            <Text style={styles.seeMoreText}>See Full Details →</Text>
          </Pressable>
        </View>

        {/* Save / Actions */}
        <View style={styles.actionRow}>
          <Button
            title={isSaved ? '✓ Saved' : 'Save to Deal Vault'}
            variant={isSaved ? 'secondary' : 'primary'}
            onPress={handleSave}
            disabled={isSaved}
            loading={saveProperty.isPending}
            style={{ flex: 1 }}
          />
        </View>

        {/* Strategy Rankings */}
        {strategies.length > 0 && (
          <View style={[styles.card, cardGlow.sm]}>
            <Text style={styles.sectionLabel}>STRATEGY RANKINGS</Text>
            {strategies.map((s, i) => (
              <StrategyRow
                key={s.id}
                strategy={s}
                rank={i + 1}
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
        <View style={[styles.card, cardGlow.sm]}>
          <Text style={styles.sectionLabel}>VALUATIONS</Text>
          <DataRow label="IQ Estimate" value={money(v.value_iq_estimate)} highlight />
          <DataRow label="Zestimate" value={money(v.zestimate)} />
          <DataRow label="RentCast AVM" value={money(v.rentcast_avm)} />
          <DataRow label="Redfin Estimate" value={money(v.redfin_estimate)} />
          <DataRow label="Market Price" value={money(v.market_price)} />
        </View>

        {/* Rental Estimates */}
        <View style={[styles.card, cardGlow.sm]}>
          <Text style={styles.sectionLabel}>RENTAL ESTIMATES</Text>
          <DataRow label="IQ Rent Estimate" value={moneyMo(r.monthly_rent_ltr)} highlight />
          <DataRow label="RentCast" value={moneyMo(r.rental_stats?.rentcast_estimate)} />
          <DataRow label="Zillow" value={moneyMo(r.rental_stats?.zillow_estimate)} />
          <DataRow label="Redfin" value={moneyMo(r.rental_stats?.redfin_estimate)} />
        </View>

        {/* Market */}
        <View style={[styles.card, cardGlow.sm]}>
          <Text style={styles.sectionLabel}>MARKET DATA</Text>
          <DataRow label="Property Taxes" value={`${money(m.property_taxes_annual)}/yr`} />
          <DataRow label="HOA" value={m.hoa_fees_monthly ? `${money(m.hoa_fees_monthly)}/mo` : 'None'} />
          <DataRow label="Price/Sqft" value={money(v.price_per_sqft)} />
        </View>

        {/* Navigation links */}
        <View style={styles.navLinks}>
          <NavLink label="View Comps" onPress={() => router.push({ pathname: '/comps' as any, params: { address: address! } })} />
          <NavLink label="View Photos" onPress={() => router.push({ pathname: '/photos' as any, params: { address: address! } })} />
        </View>
      </ScrollView>
    </View>
  );
}

function StrategyRow({ strategy, rank, onPress }: { strategy: StrategyResult; rank: number; onPress: () => void }) {
  const config = STRATEGY_CONFIG[strategy.id as StrategyId];
  const stratColor = colors.strategies[strategy.id as keyof typeof colors.strategies]?.primary ?? colors.primary;
  const scoreColor = getScoreColor(strategy.score);

  return (
    <Pressable onPress={onPress} style={styles.strategyRow}>
      <Text style={styles.rankBadge}>{rank}</Text>
      <Text style={styles.strategyIcon}>{config?.icon ?? '●'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.strategyName}>{config?.name ?? strategy.name}</Text>
        <Text style={styles.strategyMetric}>
          {strategy.metric_label}: {formatMetricValue(strategy)}
        </Text>
      </View>
      <View style={[styles.scoreChip, { borderColor: scoreColor }]}>
        <Text style={[styles.scoreChipText, { color: scoreColor }]}>
          {Math.round(strategy.score)}
        </Text>
      </View>
    </Pressable>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.quickStat}>
      <Text style={styles.quickStatValue}>{value}</Text>
      <Text style={styles.quickStatLabel}>{label}</Text>
    </View>
  );
}

function DataRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={[styles.dataValue, highlight && styles.dataHighlight]}>{value}</Text>
    </View>
  );
}

function NavLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.navLink}>
      <Text style={styles.navLinkText}>{label}</Text>
      <Text style={styles.navLinkArrow}>→</Text>
    </Pressable>
  );
}

function formatMetricValue(s: StrategyResult): string {
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
  return '$' + Math.round(n).toLocaleString() + '/mo';
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return Math.round(n).toLocaleString();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  scroll: { padding: spacing.lg, paddingTop: 56, paddingBottom: 60 },
  centered: { flex: 1, backgroundColor: colors.base, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  loadingText: { fontFamily: fontFamilies.heading, color: colors.textHeading, fontSize: 18, fontWeight: '600', marginTop: spacing.md },
  loadingSubtext: { fontFamily: fontFamilies.body, color: colors.textSecondary, fontSize: 14, marginTop: spacing.xs, textAlign: 'center' },
  errorTitle: { fontFamily: fontFamilies.heading, color: colors.error, fontSize: 20, fontWeight: '600', marginBottom: spacing.sm },
  errorText: { fontFamily: fontFamilies.body, color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  address: { fontFamily: fontFamilies.heading, fontSize: 22, fontWeight: '700', color: colors.textHeading },
  location: { fontFamily: fontFamilies.body, fontSize: 14, color: colors.textSecondary, marginBottom: spacing.md },

  heroCard: { backgroundColor: colors.base, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  scoreBadge: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  scoreNumber: { fontFamily: fontFamilies.monoBold, fontSize: 28, fontWeight: '800' },
  scoreOf: { fontFamily: fontFamilies.mono, fontSize: 11, color: colors.textMuted },
  heroInfo: { flex: 1 },
  verdictLabel: { fontFamily: fontFamilies.heading, fontSize: 20, fontWeight: '700', color: colors.textHeading },
  verdictDesc: { fontFamily: fontFamilies.body, fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },

  narrativeBox: { flexDirection: 'row', marginTop: spacing.sm, backgroundColor: 'rgba(14,165,233,0.05)', borderRadius: 10, padding: spacing.sm, gap: spacing.sm },
  narrativeAccent: { width: 3, backgroundColor: colors.primary, borderRadius: 2 },
  narrativeText: { fontFamily: fontFamilies.body, fontSize: 13, color: colors.textBody, lineHeight: 20, flex: 1 },

  card: { backgroundColor: colors.base, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md },
  sectionLabel: { fontFamily: fontFamilies.heading, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: colors.primary, textTransform: 'uppercase', marginBottom: spacing.sm },

  gapRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  gapLabel: { fontFamily: fontFamilies.heading, fontSize: 14, fontWeight: '600', color: colors.textHeading },
  gapValue: { fontFamily: fontFamilies.monoBold, fontSize: 16, fontWeight: '700' },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  quickStat: { alignItems: 'center', flex: 1 },
  quickStatValue: { fontFamily: fontFamilies.monoBold, fontSize: 20, fontWeight: '700', color: colors.textHeading },
  quickStatLabel: { fontFamily: fontFamilies.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  seeMoreBtn: { marginTop: spacing.sm, alignSelf: 'center', paddingVertical: spacing.xs },
  seeMoreText: { fontFamily: fontFamilies.bodyMedium, fontSize: 13, color: colors.primary },

  actionRow: { flexDirection: 'row', marginBottom: spacing.md, gap: spacing.sm },

  strategyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm },
  rankBadge: { fontFamily: fontFamilies.monoBold, fontSize: 14, fontWeight: '700', color: colors.textMuted, width: 20, textAlign: 'center' },
  strategyIcon: { fontSize: 20 },
  strategyName: { fontFamily: fontFamilies.heading, fontSize: 14, fontWeight: '600', color: colors.textHeading },
  strategyMetric: { fontFamily: fontFamilies.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  scoreChip: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  scoreChipText: { fontFamily: fontFamilies.monoBold, fontSize: 14, fontWeight: '700' },

  dataRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  dataLabel: { fontFamily: fontFamilies.body, fontSize: 14, color: colors.textSecondary },
  dataValue: { fontFamily: fontFamilies.mono, fontSize: 14, fontWeight: '600', color: colors.textHeading },
  dataHighlight: { color: colors.primary, fontSize: 15, fontWeight: '700' },

  navLinks: { gap: spacing.sm, marginTop: spacing.sm },
  navLink: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  navLinkText: { fontFamily: fontFamilies.heading, fontSize: 14, fontWeight: '600', color: colors.textHeading },
  navLinkArrow: { fontSize: 16, color: colors.primary },
});
