import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { STRATEGY_CONFIG, type StrategyId } from '@dealscope/shared';
import { Button } from '@/components/ui/Button';
import { PriceComparisonBar } from '@/components/ui/PriceComparisonBar';
import { ScoreGauge } from '@/components/verdict/ScoreGauge';
import { SignalCards } from '@/components/verdict/SignalCards';
import { PriceCards } from '@/components/verdict/PriceCards';
import { FinancialBreakdown, buildLTRSections } from '@/components/verdict/FinancialBreakdown';
import { ConfidenceMetrics } from '@/components/verdict/ConfidenceMetrics';
import { colors, cardGlow, shadows } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { usePropertySearch } from '@/hooks/usePropertyData';
import { useSaveProperty, useCheckSaved } from '@/hooks/useSavedProperties';
import { useVerdict, type StrategyResult } from '@/hooks/useVerdict';
import { useWorksheet } from '@/hooks/useWorksheet';
import { useRecordAnalysis } from '@/hooks/useUsage';
import { useExcelExport } from '@/hooks/useExcelExport';
import { usePdfExport } from '@/hooks/usePdfExport';
import { getScoreColor } from '@/constants/theme';
import api from '@/services/api';

export default function VerdictScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const router = useRouter();
  const property = usePropertySearch(address ?? null);
  const verdict = useVerdict(property.data);
  const savedCheck = useCheckSaved(address ?? null);
  const saveProperty = useSaveProperty();
  const recordAnalysis = useRecordAnalysis();
  const excelExport = useExcelExport();
  const pdfExport = usePdfExport();
  const hasRecordedRef = useRef(false);

  const bestStrategy = verdict.data?.strategies?.[0]?.id ?? 'ltr';
  const worksheet = useWorksheet(property.data, bestStrategy);

  const isLoading = property.isLoading || verdict.isLoading;
  const error = property.error || verdict.error;

  useEffect(() => {
    if (!isLoading && property.data && verdict.data && address && !hasRecordedRef.current) {
      hasRecordedRef.current = true;
      recordAnalysis.mutate();
    }
  }, [isLoading, property.data, verdict.data, address]);

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
    const axiosErr = error as any;
    const status = axiosErr?.response?.status;
    const detail = axiosErr?.response?.data?.detail;
    let errorMsg = 'Could not analyze this property. Please try again.';
    if (status === 401) errorMsg = 'Your session has expired. Please log in again.';
    else if (status === 429) errorMsg = 'Too many requests. Please wait a moment and try again.';
    else if (status === 404) errorMsg = 'Property not found. Please check the address and try again.';
    else if (detail) errorMsg = detail;

    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorTitle}>Analysis Failed</Text>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 20, width: 200 }} />
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
  const strategies = vr?.strategies?.slice().sort((a, b) => a.rank - b.rank) ?? [];
  const ws = worksheet.data;

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
        street: data.address.street, city: data.address.city, state: data.address.state,
        zipCode: data.address.zip_code, bedrooms: d.bedrooms, bathrooms: d.bathrooms,
        sqft: d.square_footage, listPrice: v.market_price, zpid: data.zpid,
      },
      status: 'watching',
    });
  }

  function handleDealMaker() {
    const baseUrl = api.defaults.baseURL?.replace('/api', '').replace(':8000', ':3000') ?? 'https://dealgapiq.com';
    const url = `${baseUrl}/deal-maker?address=${encodeURIComponent(address ?? '')}`;
    WebBrowser.openBrowserAsync(url);
  }

  function handlePdfExport() {
    if (!data.property_id) return;
    pdfExport.mutate({ propertyId: data.property_id, strategy: bestStrategy, address: data.address.street });
  }

  function handleExcelExport() {
    if (!data.property_id) return;
    excelExport.mutate({ propertyId: data.property_id, strategy: bestStrategy, address: data.address.street });
  }

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

        {/* Score Gauge Hero */}
        {vr && (
          <View style={[styles.heroCard, cardGlow.lg]}>
            <View style={styles.heroCenter}>
              <ScoreGauge score={vr.deal_score} verdictLabel={vr.deal_verdict} />
            </View>
            {vr.verdict_description && (
              <Text style={styles.verdictDesc}>{vr.verdict_description}</Text>
            )}
            {vr.deal_narrative && (
              <View style={styles.narrativeBox}>
                <View style={styles.narrativeAccent} />
                <Text style={styles.narrativeText}>{vr.deal_narrative}</Text>
              </View>
            )}
          </View>
        )}

        {/* Signal Cards */}
        {vr && (
          <SignalCards
            dealGapPercent={vr.deal_gap_percent}
            opportunity={vr.opportunity}
            returnRating={vr.return_rating}
            opportunityFactors={vr.opportunity_factors ?? []}
          />
        )}

        {/* Price Cards */}
        {vr && (
          <View style={[styles.card, cardGlow.sm]}>
            <PriceCards
              incomeValue={vr.income_value}
              targetBuy={vr.income_value != null ? Math.round(vr.income_value * 0.95) : null}
              wholesalePrice={vr.wholesale_mao}
              listPrice={vr.list_price ?? v.market_price ?? null}
            />
          </View>
        )}

        {/* Price Comparison Bar */}
        <View style={[styles.card, cardGlow.sm]}>
          <PriceComparisonBar
            listPrice={vr?.list_price ?? v.market_price ?? null}
            incomeValue={vr?.income_value ?? null}
            wholesalePrice={vr?.wholesale_mao ?? null}
          />
        </View>

        {/* Confidence Metrics */}
        {vr && (
          <ConfidenceMetrics
            dealScore={vr.deal_score}
            dealGapPercent={vr.deal_gap_percent}
            incomeGapPercent={vr.income_gap_percent}
          />
        )}

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

        {/* Financial Breakdown */}
        {ws && <FinancialBreakdown sections={buildLTRSections(ws)} />}

        {/* Action Buttons */}
        <View style={styles.actionGrid}>
          <Button
            title={isSaved ? '✓ Saved' : 'Save to Deal Vault'}
            variant={isSaved ? 'secondary' : 'primary'}
            onPress={handleSave}
            disabled={isSaved}
            loading={saveProperty.isPending}
            style={styles.actionBtn}
          />
          <Button
            title="Open Deal Maker"
            variant="secondary"
            onPress={handleDealMaker}
            style={styles.actionBtn}
          />
          <Button
            title={pdfExport.isPending ? 'Generating...' : 'Download PDF'}
            variant="secondary"
            onPress={handlePdfExport}
            loading={pdfExport.isPending}
            style={styles.actionBtn}
          />
          <Button
            title={excelExport.isPending ? 'Generating...' : 'Download Excel'}
            variant="secondary"
            onPress={handleExcelExport}
            loading={excelExport.isPending}
            style={styles.actionBtn}
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
                  router.push({ pathname: '/strategy', params: { address: address!, strategyId: s.id } })
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
  const scoreColor = getScoreColor(strategy.score);
  return (
    <Pressable onPress={onPress} style={styles.strategyRow}>
      <Text style={styles.rankBadge}>{rank}</Text>
      <Text style={styles.strategyIcon}>{config?.icon ?? '●'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.strategyName}>{config?.name ?? strategy.name}</Text>
        <Text style={styles.strategyMetric}>{strategy.metric_label}: {formatMetric(strategy)}</Text>
      </View>
      <View style={[styles.scoreChip, { borderColor: scoreColor }]}>
        <Text style={[styles.scoreChipText, { color: scoreColor }]}>{Math.round(strategy.score)}</Text>
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

function formatMetric(s: StrategyResult): string {
  if (s.metric_value == null) return '—';
  if (s.metric.includes('%') || s.metric_label.toLowerCase().includes('rate') || s.metric_label.toLowerCase().includes('roi'))
    return `${s.metric_value.toFixed(1)}%`;
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

  heroCard: { backgroundColor: colors.base, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md, alignItems: 'center' },
  heroCenter: { marginBottom: spacing.sm },
  verdictDesc: { fontFamily: fontFamilies.body, fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: spacing.sm },
  narrativeBox: { flexDirection: 'row', backgroundColor: 'rgba(14,165,233,0.05)', borderRadius: 10, padding: spacing.sm, gap: spacing.sm, width: '100%' },
  narrativeAccent: { width: 3, backgroundColor: colors.primary, borderRadius: 2 },
  narrativeText: { fontFamily: fontFamilies.body, fontSize: 13, color: colors.textBody, lineHeight: 20, flex: 1 },

  card: { backgroundColor: colors.base, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md },
  sectionLabel: { fontFamily: fontFamilies.heading, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: colors.primary, textTransform: 'uppercase', marginBottom: spacing.sm },

  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  quickStat: { alignItems: 'center', flex: 1 },
  quickStatValue: { fontFamily: fontFamilies.monoBold, fontSize: 20, fontWeight: '700', color: colors.textHeading },
  quickStatLabel: { fontFamily: fontFamilies.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  seeMoreBtn: { marginTop: spacing.sm, alignSelf: 'center', paddingVertical: spacing.xs },
  seeMoreText: { fontFamily: fontFamilies.bodyMedium, fontSize: 13, color: colors.primary },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  actionBtn: { width: '48%' },

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
