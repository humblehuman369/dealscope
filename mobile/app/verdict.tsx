import { useState } from 'react';
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
import { api } from '@/services/api';
import { usePropertyData } from '@/hooks/usePropertyData';
import { useVerdictData } from '@/hooks/useVerdictData';
import { VerdictScoreRing } from '@/components/verdict/VerdictScoreRing';
import { ScoreComponentBars } from '@/components/verdict/ScoreComponentBars';
import { PriceCards } from '@/components/verdict/PriceCards';
import { DealGapBar } from '@/components/verdict/DealGapBar';
import { StrategyGrid } from '@/components/verdict/StrategyGrid';
import { GlowCard } from '@/components/ui/GlowCard';
import { formatCurrency, formatPercent, formatNumber } from '@/utils/formatters';
import type { PropertyResponse } from '@dealscope/shared';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
  textStyles,
} from '@/constants/tokens';

type PropertyResponseCompat = PropertyResponse & Record<string, unknown>;

export default function VerdictScreen() {
  const router = useRouter();
  const { address } = useLocalSearchParams<{ address: string }>();
  const insets = useSafeAreaInsets();

  const [activeStrategy, setActiveStrategy] = useState<string | null>(null);

  // Property data from cache (populated by analyzing screen)
  const { fetchProperty } = usePropertyData();
  const propertyQuery = useQuery<PropertyResponseCompat>({
    queryKey: ['property-search', address],
    queryFn: () => fetchProperty(address ?? ''),
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
  });

  // Verdict analysis data
  const verdictQuery = useVerdictData(address);

  const property = propertyQuery.data;
  const verdict = verdictQuery.data;
  const isLoading = propertyQuery.isLoading || verdictQuery.isLoading;
  const error = propertyQuery.error ?? verdictQuery.error;

  // Extract key values from property data
  const listPrice =
    property?.listing?.list_price ??
    property?.valuations?.market_price ??
    property?.valuations?.zestimate ??
    null;

  const incomeValue = verdict?.income_value ?? null;
  const targetBuy = verdict?.target_buy_price ?? null;
  const wholesalePrice = verdict?.wholesale_price ?? null;
  const dealGapPercent = verdict?.deal_gap_percent ?? 0;

  const details = property?.details;
  const addr = property?.address;
  const fullAddress = addr
    ? `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip_code}`
    : address ?? '';

  function navigateToStrategy() {
    router.push(`/strategy?address=${encodeURIComponent(address ?? '')}`);
  }

  function navigateToDealMaker() {
    router.push(`/deal-maker/${encodeURIComponent(address ?? '')}`);
  }

  // ── Loading state ──────────────────────────────────────
  if (isLoading && !property) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading analysis...</Text>
      </View>
    );
  }

  // ── Error state ────────────────────────────────────────
  if (error && !property) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <Ionicons name="warning" size={48} color={colors.red} />
        <Text style={styles.errorTitle}>Analysis Failed</Text>
        <Text style={styles.errorText}>
          {(error as Error).message ?? 'Could not analyze this property.'}
        </Text>
        <Pressable style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>Try Another Address</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing['2xl'] },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ──────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.heading} />
        </Pressable>
        <Text style={styles.headerTitle}>IQ Verdict</Text>
        <Pressable onPress={() => {}} hitSlop={12}>
          <Ionicons name="share-outline" size={22} color={colors.heading} />
        </Pressable>
      </View>

      {/* ── Property summary ────────────────────────────── */}
      <GlowCard style={styles.propertyCard}>
        <Text style={styles.propertyAddress} numberOfLines={2}>
          {fullAddress}
        </Text>
        <View style={styles.propertyMeta}>
          {details?.bedrooms != null && (
            <Text style={styles.metaChip}>{details.bedrooms} bd</Text>
          )}
          {details?.bathrooms != null && (
            <Text style={styles.metaChip}>{details.bathrooms} ba</Text>
          )}
          {details?.square_footage != null && (
            <Text style={styles.metaChip}>
              {formatNumber(details.square_footage)} sqft
            </Text>
          )}
          {listPrice != null && (
            <Text style={[styles.metaChip, styles.metaPrice]}>
              {formatCurrency(listPrice)}
            </Text>
          )}
        </View>
      </GlowCard>

      {/* ── Verdict Score ───────────────────────────────── */}
      <GlowCard style={styles.section}>
        <Text style={styles.sectionEyebrow}>The Verdict</Text>
        <VerdictScoreRing
          score={verdict?.score ?? 0}
          verdictLabel={verdict?.verdict_label}
        />
        {verdict?.verdict_description && (
          <Text style={styles.verdictDesc}>{verdict.verdict_description}</Text>
        )}
        {verdict?.component_scores && (
          <ScoreComponentBars scores={verdict.component_scores} />
        )}
      </GlowCard>

      {/* ── Deal Gap ────────────────────────────────────── */}
      {(incomeValue != null || targetBuy != null) && (
        <DealGapBar
          dealGapPercent={dealGapPercent}
          listPrice={listPrice}
          targetBuy={targetBuy}
        />
      )}

      {/* ── Price Cards ─────────────────────────────────── */}
      <PriceCards
        incomeValue={incomeValue}
        targetBuy={targetBuy}
        wholesalePrice={wholesalePrice}
      />

      {/* ── Key Metrics ─────────────────────────────────── */}
      {verdict && (
        <GlowCard style={styles.metricsCard}>
          <View style={styles.metricsRow}>
            <MetricItem
              value={formatPercent(verdict.cap_rate)}
              label="Cap Rate"
              positive={verdict.cap_rate >= 5}
            />
            <MetricItem
              value={formatPercent(verdict.cash_on_cash)}
              label="Cash-on-Cash"
              positive={verdict.cash_on_cash >= 8}
            />
            <MetricItem
              value={verdict.dscr?.toFixed(2) ?? '—'}
              label="DSCR"
              positive={verdict.dscr >= 1.2}
            />
          </View>
        </GlowCard>
      )}

      {/* ── Strategy Grid ───────────────────────────────── */}
      <StrategyGrid
        grades={verdict?.strategy_grades}
        activeStrategy={activeStrategy}
        onSelectStrategy={(id) => {
          setActiveStrategy(id);
          navigateToStrategy();
        }}
      />

      {/* ── Action Buttons ──────────────────────────────── */}
      <View style={styles.actions}>
        <Pressable style={styles.primaryBtn} onPress={navigateToStrategy}>
          <Ionicons name="bar-chart" size={18} color={colors.black} />
          <Text style={styles.primaryBtnText}>Deep Dive Strategy</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={navigateToDealMaker}>
          <Ionicons name="options-outline" size={18} color={colors.accent} />
          <Text style={styles.secondaryBtnText}>Deal Maker</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ── Inline metric item ─────────────────────────────────────

function MetricItem({
  value,
  label,
  positive,
}: {
  value: string;
  label: string;
  positive: boolean;
}) {
  return (
    <View style={metricStyles.item}>
      <Text
        style={[
          metricStyles.value,
          { color: positive ? colors.accent : colors.red },
        ]}
      >
        {value}
      </Text>
      <Text style={metricStyles.label}>{label}</Text>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
});

// ── Main styles ────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.base,
  },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.base,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  errorTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    color: colors.heading,
    marginTop: spacing.sm,
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  retryText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.black,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.heading,
  },

  // Property card
  propertyCard: {
    padding: spacing.md,
  },
  propertyAddress: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.heading,
    marginBottom: spacing.sm,
  },
  propertyMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaChip: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.secondary,
    backgroundColor: colors.panel,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  metaPrice: {
    color: colors.accent,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
  },

  // Verdict section
  section: {
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.md,
  },
  sectionEyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
  },
  verdictDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.body,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.6,
    maxWidth: 300,
  },

  // Metrics
  metricsCard: {
    padding: spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Actions
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 16,
  },
  primaryBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: colors.black,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 14,
  },
  secondaryBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.accent,
  },
});
