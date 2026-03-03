import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { usePropertySearch } from '@/hooks/usePropertyData';

export default function VerdictScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const router = useRouter();
  const { data, isLoading, error } = usePropertySearch(address ?? null);

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

  if (error || !data) {
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

  const v = data.valuations;
  const r = data.rentals;
  const m = data.market;
  const d = data.details;

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

        <Text style={styles.address}>
          {data.address.street}
        </Text>
        <Text style={styles.location}>
          {data.address.city}, {data.address.state} {data.address.zip_code}
        </Text>

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
          <ValueRow label="Rent Range" value={`${money(r.rent_range_low)} – ${money(r.rent_range_high)}`} />
        </View>

        {/* Market Data */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Market Data</Text>
          <ValueRow label="Property Taxes" value={`${money(m.property_taxes_annual)}/yr`} />
          <ValueRow label="HOA" value={money(m.hoa_fees_monthly) ? `${money(m.hoa_fees_monthly)}/mo` : 'None'} />
          <ValueRow label="Price/Sqft" value={money(v.price_per_sqft)} />
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

function ValueRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.valueRow}>
      <Text style={styles.valueLabel}>{label}</Text>
      <Text style={[styles.valueAmount, highlight && styles.valueHighlight]}>
        {value}
      </Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
  },
  scroll: {
    padding: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.base,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: colors.textHeading,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  loadingSubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  errorTitle: {
    color: colors.error,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  address: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textHeading,
    marginBottom: 2,
  },
  location: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textHeading,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textHeading,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  valueLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  valueAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textHeading,
  },
  valueHighlight: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
