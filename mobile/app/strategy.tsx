import { useState, useMemo } from 'react';
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
import { useStrategyData } from '@/hooks/useStrategyData';
import { StrategyPills, getStrategyDef } from '@/components/strategy/StrategyPills';
import { StrategyMetrics } from '@/components/strategy/StrategyMetrics';
import {
  CollapsibleSection,
  FinancialRow,
} from '@/components/strategy/CollapsibleSection';
import { GlowCard } from '@/components/ui/GlowCard';
import { formatCurrency, formatPercent, formatCompactCurrency } from '@/utils/formatters';
import type { PropertyResponse } from '@dealscope/shared';
import type { StrategyId } from '@dealscope/shared';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
  textStyles,
} from '@/constants/tokens';

type PropertyResponseCompat = PropertyResponse & Record<string, unknown>;

export default function StrategyScreen() {
  const router = useRouter();
  const { address, strategy: initialStrategy } = useLocalSearchParams<{
    address?: string;
    strategy?: string;
  }>();
  const insets = useSafeAreaInsets();

  const [activeStrategy, setActiveStrategy] = useState<StrategyId>(
    (initialStrategy as StrategyId) ?? 'ltr',
  );

  const strategyDef = getStrategyDef(activeStrategy);

  // Property data from cache
  const { fetchProperty } = usePropertyData();
  const propertyQuery = useQuery<PropertyResponseCompat>({
    queryKey: ['property-search', address],
    queryFn: () => fetchProperty(address ?? ''),
    enabled: !!address,
    staleTime: 5 * 60 * 1000,
  });

  const property = propertyQuery.data;

  // Verdict data (for strategy grades and price info)
  const verdictQuery = useVerdictData(address);
  const verdict = verdictQuery.data;

  // Strategy-specific worksheet data
  const worksheetParams = useMemo(() => {
    if (!address || !property) return null;
    const v = property.valuations;
    const listPrice =
      property.listing?.list_price ?? v?.market_price ?? v?.zestimate ?? 0;
    return {
      address,
      list_price: listPrice,
      monthly_rent: property.rentals?.monthly_rent_ltr ?? 0,
      property_taxes: property.market?.property_taxes_annual ?? 0,
      insurance: 0,
      bedrooms: property.details?.bedrooms ?? 3,
      bathrooms: property.details?.bathrooms ?? 2,
      sqft: property.details?.square_footage ?? 1500,
    };
  }, [address, property]);

  const worksheetQuery = useStrategyData(activeStrategy, worksheetParams);
  const worksheetData = worksheetQuery.data ?? null;

  // Build strategy grades map from verdict data
  const grades = useMemo(() => {
    const map: Record<string, string> = {};
    verdict?.strategy_grades?.forEach((g) => {
      map[g.strategy] = g.grade;
    });
    return map;
  }, [verdict]);

  // Extract values for the financial breakdown
  const listPrice =
    property?.listing?.list_price ??
    property?.valuations?.market_price ??
    property?.valuations?.zestimate ??
    null;
  const monthlyRent = property?.rentals?.monthly_rent_ltr ?? null;
  const addr = property?.address;
  const fullAddress = addr
    ? `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip_code}`
    : address ?? '';

  const isLoading =
    propertyQuery.isLoading || (worksheetQuery.isLoading && !worksheetData);

  // ── Loading ────────────────────────────────────────────
  if (isLoading && !property) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading strategy analysis...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header ──────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.heading} />
        </Pressable>
        <Text style={styles.headerTitle}>Strategy<Text style={{ color: colors.accent }}>IQ</Text></Text>
        <Pressable
          onPress={() =>
            router.push(
              `/deal-maker/${encodeURIComponent(address ?? '')}`,
            )
          }
          hitSlop={12}
        >
          <Ionicons name="options-outline" size={22} color={colors.heading} />
        </Pressable>
      </View>

      {/* ── Strategy pills ──────────────────────────────── */}
      <StrategyPills
        active={activeStrategy}
        onChange={setActiveStrategy}
        grades={grades}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Strategy title ────────────────────────────── */}
        <View style={styles.titleRow}>
          <View style={[styles.titleDot, { backgroundColor: strategyDef.color }]} />
          <View style={styles.titleText}>
            <Text style={[styles.strategyName, { color: strategyDef.color }]}>
              {strategyDef.name}
            </Text>
            <Text style={styles.addressSub} numberOfLines={1}>
              {fullAddress}
            </Text>
          </View>
        </View>

        {/* ── Key metrics ───────────────────────────────── */}
        <StrategyMetrics
          strategyId={activeStrategy}
          data={worksheetData}
          accentColor={strategyDef.color}
        />

        {/* ── Financial breakdown ────────────────────────── */}
        <View style={styles.breakdownSection}>
          <Text style={styles.sectionTitle}>Financial Breakdown</Text>

          <CollapsibleSection
            title="Purchase Terms"
            accentColor={strategyDef.color}
            defaultOpen
            actionLabel="Adjust"
            onAction={() =>
              router.push(
                `/deal-maker/${encodeURIComponent(address ?? '')}`,
              )
            }
          >
            <FinancialRow
              label="Purchase Price"
              value={formatCurrency(listPrice)}
              highlight
              accentColor={strategyDef.color}
            />
            <FinancialRow
              label="Down Payment"
              value={formatPercent(
                Number(worksheetData?.down_payment_pct ?? 20),
              )}
            />
            <FinancialRow
              label="Loan Amount"
              value={formatCurrency(
                (listPrice ?? 0) *
                  (1 - Number(worksheetData?.down_payment_pct ?? 20) / 100),
              )}
            />
            <FinancialRow
              label="Interest Rate"
              value={formatPercent(
                Number(worksheetData?.interest_rate ?? 7.0),
              )}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Income"
            accentColor={strategyDef.color}
            actionLabel="Adjust"
            onAction={() =>
              router.push(
                `/deal-maker/${encodeURIComponent(address ?? '')}`,
              )
            }
          >
            <FinancialRow
              label="Monthly Rent"
              value={`${formatCurrency(monthlyRent)}/mo`}
            />
            <FinancialRow
              label="Annual Gross Rent"
              value={formatCurrency((monthlyRent ?? 0) * 12)}
            />
            <FinancialRow
              label="Vacancy"
              value={formatPercent(
                Number(worksheetData?.vacancy_rate ?? 5),
              )}
            />
            <FinancialRow
              label="Effective Gross Income"
              value={formatCurrency(
                (monthlyRent ?? 0) *
                  12 *
                  (1 - Number(worksheetData?.vacancy_rate ?? 5) / 100),
              )}
              highlight
              accentColor={strategyDef.color}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Operating Expenses"
            accentColor={strategyDef.color}
          >
            <FinancialRow
              label="Property Taxes"
              value={formatCurrency(
                property?.market?.property_taxes_annual,
              )}
            />
            <FinancialRow
              label="Insurance"
              value={formatCurrency(
                Number(worksheetData?.insurance ?? 0),
              )}
            />
            <FinancialRow
              label="Management"
              value={formatPercent(
                Number(worksheetData?.management_rate ?? 8),
              )}
            />
            <FinancialRow
              label="Maintenance"
              value={formatPercent(
                Number(worksheetData?.maintenance_rate ?? 5),
              )}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Cash Flow Summary"
            accentColor={strategyDef.color}
            defaultOpen
          >
            <FinancialRow
              label="NOI"
              value={formatCompactCurrency(
                Number(worksheetData?.noi ?? worksheetData?.annual_noi ?? 0),
              )}
              highlight
              accentColor={strategyDef.color}
            />
            <FinancialRow
              label="Annual Debt Service"
              value={formatCompactCurrency(
                Number(worksheetData?.annual_debt_service ?? 0),
              )}
              negative
            />
            <FinancialRow
              label="Annual Cash Flow"
              value={formatCompactCurrency(
                Number(
                  worksheetData?.annual_cash_flow ??
                    worksheetData?.annual_cash_flow_after_debt ??
                    0,
                ),
              )}
              highlight
              accentColor={strategyDef.color}
            />
          </CollapsibleSection>
        </View>

        {/* ── Action Buttons ────────────────────────────── */}
        <View style={styles.actions}>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() =>
              router.push(
                `/verdict?address=${encodeURIComponent(address ?? '')}`,
              )
            }
          >
            <Ionicons
              name="arrow-back"
              size={16}
              color={colors.accent}
            />
            <Text style={styles.secondaryBtnText}>Back to Verdict</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: strategyDef.color }]}
            onPress={() =>
              router.push(
                `/deal-maker/${encodeURIComponent(address ?? '')}`,
              )
            }
          >
            <Ionicons name="options-outline" size={16} color={colors.black} />
            <Text style={styles.primaryBtnText}>Adjust in Deal Maker</Text>
          </Pressable>
        </View>

        <View style={{ height: insets.bottom + spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
  },
  center: {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.heading,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  titleText: {
    flex: 1,
  },
  strategyName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
  },
  addressSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.secondary,
    marginTop: 1,
  },
  breakdownSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: colors.heading,
    marginBottom: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  primaryBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
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
    paddingVertical: 12,
  },
  secondaryBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.accent,
  },
});
