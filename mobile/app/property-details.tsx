import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { colors, cardGlow } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { usePropertySearch } from '@/hooks/usePropertyData';

export default function PropertyDetailsScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const router = useRouter();
  const { data, isLoading, error } = usePropertySearch(address ?? null);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Could not load property details.</Text>
        <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </View>
    );
  }

  const d = data.details;
  const v = data.valuations;
  const m = data.market;
  const l = data.listing;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Button
          title="← Back"
          variant="ghost"
          onPress={() => router.back()}
          style={{ alignSelf: 'flex-start', marginBottom: spacing.sm }}
        />

        <Text style={styles.title}>{data.address.street}</Text>
        <Text style={styles.subtitle}>
          {data.address.city}, {data.address.state} {data.address.zip_code}
        </Text>

        {/* Basic Info */}
        <View style={[styles.card, cardGlow.sm]}>
          <Text style={styles.sectionLabel}>PROPERTY INFO</Text>
          <View style={styles.statsRow}>
            <Stat label="Beds" value={d.bedrooms} />
            <Stat label="Baths" value={d.bathrooms} />
            <Stat label="Sqft" value={fmt(d.square_footage)} />
            <Stat label="Year Built" value={d.year_built} />
          </View>
          <Row label="Property Type" value={d.property_type ?? '—'} />
          <Row label="Lot Size" value={d.lot_size ? `${fmt(d.lot_size)} sqft` : '—'} />
          <Row label="Stories" value={d.stories ?? '—'} />
          <Row label="Garage" value={d.garage_spaces ? `${d.garage_spaces} car` : '—'} />
          <Row label="Parking" value={d.parking_type ?? '—'} />
          <Row label="Pool" value={d.has_pool ? 'Yes' : 'No'} />
        </View>

        {/* Listing Info */}
        {l && (
          <View style={[styles.card, cardGlow.sm]}>
            <Text style={styles.sectionLabel}>LISTING STATUS</Text>
            <Row label="Status" value={l.listing_status ?? '—'} />
            <Row label="Days on Market" value={l.days_on_market != null ? String(l.days_on_market) : '—'} />
            <Row label="List Price" value={money(v.market_price)} />
          </View>
        )}

        {/* Valuations */}
        <View style={[styles.card, cardGlow.sm]}>
          <Text style={styles.sectionLabel}>VALUATIONS</Text>
          <Row label="IQ Value Estimate" value={money(v.value_iq_estimate)} highlight />
          <Row label="Zestimate" value={money(v.zestimate)} />
          <Row label="RentCast AVM" value={money(v.rentcast_avm)} />
          <Row label="Redfin Estimate" value={money(v.redfin_estimate)} />
          <Row label="Tax Assessed Value" value={money(v.tax_assessed_value)} />
          <Row label="Price/Sqft" value={money(v.price_per_sqft)} />
        </View>

        {/* Market Data */}
        <View style={[styles.card, cardGlow.sm]}>
          <Text style={styles.sectionLabel}>MARKET DATA</Text>
          <Row label="Property Taxes" value={money(m.property_taxes_annual) + '/yr'} />
          <Row label="HOA Fees" value={m.hoa_fees_monthly ? money(m.hoa_fees_monthly) + '/mo' : 'None'} />
          <Row label="Market Strength" value={m.market_strength ?? '—'} />
        </View>

        {/* Rental Data */}
        <View style={[styles.card, cardGlow.sm]}>
          <Text style={styles.sectionLabel}>RENTAL ESTIMATES</Text>
          <Row label="IQ Rent Estimate" value={moneyMo(data.rentals.monthly_rent_ltr)} highlight />
          <Row label="RentCast" value={moneyMo(data.rentals.rental_stats?.rentcast_estimate)} />
          <Row label="Zillow" value={moneyMo(data.rentals.rental_stats?.zillow_estimate)} />
          <Row label="Redfin" value={moneyMo(data.rentals.rental_stats?.redfin_estimate)} />
        </View>
      </ScrollView>
    </View>
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

function Row({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.rowHighlight]}>{value ?? '—'}</Text>
    </View>
  );
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
  errorText: { fontFamily: fontFamilies.body, color: colors.error, fontSize: 16 },

  title: { fontFamily: fontFamilies.heading, fontSize: 22, fontWeight: '700', color: colors.textHeading },
  subtitle: { fontFamily: fontFamilies.body, fontSize: 14, color: colors.textSecondary, marginBottom: spacing.md },

  card: { backgroundColor: colors.base, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md },
  sectionLabel: { fontFamily: fontFamilies.heading, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: colors.primary, textTransform: 'uppercase', marginBottom: spacing.sm },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontFamily: fontFamilies.monoBold, fontSize: 20, fontWeight: '700', color: colors.textHeading },
  statLabel: { fontFamily: fontFamilies.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontFamily: fontFamilies.body, fontSize: 14, color: colors.textSecondary },
  rowValue: { fontFamily: fontFamilies.mono, fontSize: 14, fontWeight: '600', color: colors.textHeading },
  rowHighlight: { color: colors.primary, fontWeight: '700' },
});
