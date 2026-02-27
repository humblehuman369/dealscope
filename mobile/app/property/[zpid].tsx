import { useMemo } from 'react';
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
import { PhotoCarousel } from '@/components/property/PhotoCarousel';
import { PropertyInfoCard } from '@/components/property/PropertyInfoCard';
import { MultiStrategyComparison } from '@/components/strategy/MultiStrategyComparison';
import { GlowCard } from '@/components/ui/GlowCard';
import { useVerdictData } from '@/hooks/useVerdictData';
import { useSaveProperty } from '@/hooks/useSavedProperties';
import { formatCurrency } from '@/utils/formatters';
import type { PropertyResponse } from '@dealscope/shared';
import type { StrategyId } from '@dealscope/shared';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
} from '@/constants/tokens';

type PropertyResponseCompat = PropertyResponse & Record<string, unknown>;

interface PhotosResponse {
  photos: string[];
}

export default function PropertyDetailsScreen() {
  const router = useRouter();
  const { zpid } = useLocalSearchParams<{ zpid: string }>();
  const insets = useSafeAreaInsets();

  // Fetch property by zpid
  const propertyQuery = useQuery<PropertyResponseCompat>({
    queryKey: ['property', zpid],
    queryFn: () => api.get<PropertyResponseCompat>(`/api/v1/properties/${zpid}`),
    enabled: !!zpid,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch photos
  const photosQuery = useQuery<string[]>({
    queryKey: ['photos', zpid],
    queryFn: async () => {
      const res = await api.get<PhotosResponse>(`/api/v1/photos?zpid=${zpid}`);
      return res.photos ?? [];
    },
    enabled: !!zpid,
    staleTime: 10 * 60 * 1000,
  });

  const property = propertyQuery.data;
  const photos = photosQuery.data ?? [];

  // Build address for verdict query
  const fullAddress = useMemo(() => {
    if (!property?.address) return '';
    const a = property.address;
    return `${a.street}, ${a.city}, ${a.state} ${a.zip_code}`;
  }, [property]);

  // Verdict data for multi-strategy comparison
  const verdictQuery = useVerdictData(fullAddress || undefined);
  const verdict = verdictQuery.data;

  // Save / unsave
  const { isSaved, isSaving, toggle: toggleSave } = useSaveProperty(fullAddress);

  const details = property?.details;
  const listing = property?.listing;
  const market = property?.market;
  const valuations = property?.valuations;

  const listPrice =
    listing?.list_price ?? valuations?.market_price ?? valuations?.zestimate ?? null;

  function navigateToVerdict() {
    router.push(`/verdict?address=${encodeURIComponent(fullAddress)}`);
  }

  function navigateToStrategy(strategyId: StrategyId) {
    router.push(
      `/strategy?address=${encodeURIComponent(fullAddress)}&strategy=${strategyId}`,
    );
  }

  // Loading
  if (propertyQuery.isLoading && !property) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading property...</Text>
      </View>
    );
  }

  // Error
  if (propertyQuery.error && !property) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="warning" size={48} color={colors.red} />
        <Text style={styles.errorTitle}>Property Not Found</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {/* Header overlays the photo */}
      <View style={[styles.headerOverlay, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </Pressable>
        <View style={styles.headerBtnGroup}>
          <Pressable
            style={styles.headerBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleSave({
                list_price: listPrice ?? undefined,
                bedrooms: details?.bedrooms ?? undefined,
                bathrooms: details?.bathrooms ?? undefined,
                sqft: details?.square_footage ?? undefined,
                zpid: zpid ?? undefined,
              });
            }}
            disabled={isSaving}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isSaved ? colors.accent : colors.white}
            />
          </Pressable>
          <Pressable style={styles.headerBtn} onPress={() => {}}>
            <Ionicons name="share-outline" size={22} color={colors.white} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing['2xl'] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Photos */}
        <PhotoCarousel photos={photos} />

        <View style={styles.content}>
          {/* Address */}
          <Text style={styles.address}>{fullAddress}</Text>

          {/* Property info */}
          <PropertyInfoCard
            bedrooms={details?.bedrooms}
            bathrooms={details?.bathrooms}
            squareFootage={details?.square_footage}
            yearBuilt={details?.year_built}
            lotSize={details?.lot_size}
            propertyType={details?.property_type}
            listPrice={listPrice}
            daysOnMarket={listing?.days_on_market}
            listingStatus={listing?.listing_status}
          />

          {/* Location details */}
          {property?.address && (
            <GlowCard style={styles.locationCard}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.locationGrid}>
                <LocationRow
                  icon="location-outline"
                  label="Street"
                  value={property.address.street}
                />
                <LocationRow
                  icon="business-outline"
                  label="City"
                  value={property.address.city}
                />
                <LocationRow
                  icon="flag-outline"
                  label="State"
                  value={property.address.state}
                />
                <LocationRow
                  icon="mail-outline"
                  label="ZIP"
                  value={property.address.zip_code}
                />
                {property.address.county && (
                  <LocationRow
                    icon="map-outline"
                    label="County"
                    value={property.address.county}
                  />
                )}
              </View>
            </GlowCard>
          )}

          {/* Market info */}
          {(market?.property_taxes_annual != null ||
            market?.market_stats?.median_price != null) && (
            <GlowCard style={styles.locationCard}>
              <Text style={styles.sectionTitle}>Market Data</Text>
              <View style={styles.locationGrid}>
                {market?.property_taxes_annual != null && (
                  <LocationRow
                    icon="receipt-outline"
                    label="Annual Taxes"
                    value={formatCurrency(market.property_taxes_annual)}
                  />
                )}
                {market?.market_stats?.median_price != null && (
                  <LocationRow
                    icon="trending-up-outline"
                    label="Median Price"
                    value={formatCurrency(market.market_stats.median_price)}
                  />
                )}
                {market?.market_strength && (
                  <LocationRow
                    icon="thermometer-outline"
                    label="Market Strength"
                    value={market.market_strength}
                  />
                )}
              </View>
            </GlowCard>
          )}

          {/* Valuation sources */}
          {valuations && (
            <GlowCard style={styles.locationCard}>
              <Text style={styles.sectionTitle}>Valuations</Text>
              <View style={styles.locationGrid}>
                {valuations.value_iq_estimate != null && (
                  <LocationRow
                    icon="sparkles-outline"
                    label="IQ Estimate"
                    value={formatCurrency(valuations.value_iq_estimate)}
                    accent
                  />
                )}
                {valuations.zestimate != null && (
                  <LocationRow
                    icon="analytics-outline"
                    label="Zestimate"
                    value={formatCurrency(valuations.zestimate)}
                  />
                )}
                {valuations.rentcast_avm != null && (
                  <LocationRow
                    icon="cube-outline"
                    label="RentCast AVM"
                    value={formatCurrency(valuations.rentcast_avm)}
                  />
                )}
                {valuations.redfin_estimate != null && (
                  <LocationRow
                    icon="home-outline"
                    label="Redfin Estimate"
                    value={formatCurrency(valuations.redfin_estimate)}
                  />
                )}
              </View>
            </GlowCard>
          )}

          {/* Multi-strategy comparison */}
          {verdict?.strategy_grades && verdict.strategy_grades.length > 0 && (
            <MultiStrategyComparison
              grades={verdict.strategy_grades}
              onSelectStrategy={navigateToStrategy}
            />
          )}

          {/* CTA */}
          <View style={styles.actions}>
            <Pressable style={styles.primaryBtn} onPress={navigateToVerdict}>
              <Ionicons name="flash" size={18} color={colors.black} />
              <Text style={styles.primaryBtnText}>Run Full Analysis</Text>
            </Pressable>
            <View style={styles.docRow}>
              <Pressable
                style={styles.docBtn}
                onPress={() =>
                  router.push(
                    `/(protected)/proforma/${property?.property_id ?? zpid}?address=${encodeURIComponent(fullAddress)}`,
                  )
                }
              >
                <Ionicons name="document-outline" size={16} color={colors.green} />
                <Text style={styles.docBtnText}>Proforma</Text>
              </Pressable>
              <Pressable
                style={styles.docBtn}
                onPress={() =>
                  router.push(
                    `/(protected)/loi/generate?address=${encodeURIComponent(fullAddress)}&offer_price=${listPrice ?? ''}`,
                  )
                }
              >
                <Ionicons name="create-outline" size={16} color={colors.accent} />
                <Text style={styles.docBtnText}>Generate LOI</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Inline sub-component ─────────────────────────────────────

function LocationRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | null | undefined;
  accent?: boolean;
}) {
  if (!value) return null;
  return (
    <View style={locStyles.row}>
      <Ionicons
        name={icon}
        size={16}
        color={accent ? colors.accent : colors.secondary}
      />
      <Text style={locStyles.label}>{label}</Text>
      <Text
        style={[locStyles.value, accent && { color: colors.accent }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const locStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.secondary,
    width: 90,
  },
  value: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.heading,
    textAlign: 'right',
  },
});

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.base },
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
  errorTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    color: colors.heading,
    marginTop: spacing.sm,
  },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  backBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.black,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  address: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: colors.heading,
    lineHeight: fontSize.xl * 1.3,
  },
  locationCard: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.heading,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  locationGrid: {
    gap: 2,
  },
  actions: {
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
  docRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  docBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  docBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.heading,
  },
});
