import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui';
import { usePropertyData } from '@/hooks/usePropertyData';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

function fmtC(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  return '$' + Math.round(v).toLocaleString();
}

function fmtNum(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  return v.toLocaleString();
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function PropertyDetailsScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const router = useRouter();
  const { getCached } = usePropertyData();
  const property = address ? getCached(address) : undefined;

  if (!property) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const d = property.details;
  const l = property.listing;
  const v = property.valuations;
  const r = property.rentals;
  const taxAmount = property.market?.property_taxes_annual;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Property Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Address */}
        <Card glow="lg" style={styles.heroCard}>
          <Text style={styles.address}>{property.address?.full_address ?? address}</Text>
          {d && (
            <Text style={styles.heroMeta}>
              {[
                d.bedrooms && `${d.bedrooms} bd`,
                d.bathrooms && `${d.bathrooms} ba`,
                d.square_footage && `${fmtNum(d.square_footage)} sqft`,
                d.year_built && `Built ${d.year_built}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
          {l?.list_price && (
            <Text style={styles.heroPrice}>{fmtC(l.list_price)}</Text>
          )}
          {l?.listing_status && (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{l.listing_status}</Text>
            </View>
          )}
        </Card>

        {/* Key Facts */}
        <Card glow="sm" style={styles.section}>
          <Text style={styles.sectionTitle}>KEY FACTS</Text>
          {d?.property_type && <DetailRow label="Property Type" value={d.property_type} />}
          {d?.bedrooms != null && <DetailRow label="Bedrooms" value={String(d.bedrooms)} />}
          {d?.bathrooms != null && <DetailRow label="Bathrooms" value={String(d.bathrooms)} />}
          {d?.square_footage != null && <DetailRow label="Square Footage" value={fmtNum(d.square_footage)} />}
          {d?.lot_size != null && <DetailRow label="Lot Size" value={fmtNum(d.lot_size) + ' sqft'} />}
          {d?.year_built != null && <DetailRow label="Year Built" value={String(d.year_built)} />}
          {l?.days_on_market != null && <DetailRow label="Days on Market" value={String(l.days_on_market)} />}
        </Card>

        {/* Valuation */}
        <Card glow="sm" style={styles.section}>
          <Text style={styles.sectionTitle}>VALUATIONS</Text>
          {v?.value_iq_estimate != null && <DetailRow label="IQ Estimate" value={fmtC(v.value_iq_estimate)} />}
          {v?.zestimate != null && <DetailRow label="Zestimate" value={fmtC(v.zestimate)} />}
          {v?.rentcast_avm != null && <DetailRow label="RentCast AVM" value={fmtC(v.rentcast_avm)} />}
          {v?.redfin_estimate != null && <DetailRow label="Redfin Estimate" value={fmtC(v.redfin_estimate)} />}
          {taxAmount != null && <DetailRow label="Annual Taxes" value={fmtC(taxAmount)} />}
        </Card>

        {/* Rental Data */}
        <Card glow="sm" style={styles.section}>
          <Text style={styles.sectionTitle}>RENTAL DATA</Text>
          {r?.monthly_rent_ltr != null && <DetailRow label="Monthly Rent (LTR)" value={fmtC(r.monthly_rent_ltr)} />}
          {r?.rental_stats?.iq_estimate != null && <DetailRow label="Rental IQ Estimate" value={fmtC(r.rental_stats.iq_estimate)} />}
          {r?.rental_stats?.zillow_estimate != null && <DetailRow label="Zillow Rent" value={fmtC(r.rental_stats.zillow_estimate)} />}
          {r?.rental_stats?.rentcast_estimate != null && <DetailRow label="RentCast Rent" value={fmtC(r.rental_stats.rentcast_estimate)} />}
          {r?.average_daily_rate != null && <DetailRow label="ADR (STR)" value={fmtC(r.average_daily_rate)} />}
          {r?.occupancy_rate != null && <DetailRow label="Occupancy Rate" value={r.occupancy_rate.toFixed(0) + '%'} />}
        </Card>

        {/* Listing Info */}
        {l && (
          <Card glow="sm" style={styles.section}>
            <Text style={styles.sectionTitle}>LISTING INFO</Text>
            {l.listing_status && <DetailRow label="Status" value={l.listing_status} />}
            {l.seller_type && <DetailRow label="Seller Type" value={l.seller_type} />}
            {l.is_foreclosure && <DetailRow label="Foreclosure" value="Yes" />}
            {l.is_bank_owned && <DetailRow label="Bank Owned" value="Yes" />}
            {l.is_fsbo && <DetailRow label="FSBO" value="Yes" />}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  heroCard: {
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  address: { ...typography.h2, color: colors.textHeading, textAlign: 'center' },
  heroMeta: { ...typography.bodySmall, color: colors.textSecondary },
  heroPrice: { ...typography.financialLarge, color: colors.primary, fontSize: 24 },
  statusBadge: {
    backgroundColor: colors.accentBg.teal,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: { ...typography.label, color: colors.primary },
  section: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textLabel,
    marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { ...typography.bodySmall, color: colors.textSecondary },
  detailValue: {
    fontFamily: fontFamilies.mono,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textHeading,
  },
});
