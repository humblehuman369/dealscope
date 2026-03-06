import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { colors, cardGlow } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { usePropertySearch } from '@/hooks/usePropertyData';
import api from '@/services/api';

interface CompItem {
  address: string;
  price: number;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  distance_miles?: number;
  sold_date?: string;
  price_per_sqft?: number;
}

type TabType = 'sale' | 'rent';

export default function CompsScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const router = useRouter();
  const property = usePropertySearch(address ?? null);
  const [tab, setTab] = useState<TabType>('sale');
  const [saleComps, setSaleComps] = useState<CompItem[]>([]);
  const [rentComps, setRentComps] = useState<CompItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComps = useCallback(async (compType: TabType, retry = 0) => {
    if (!property.data?.zpid) return;
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get<{ comps: CompItem[] }>(
        `/api/v1/properties/${property.data.zpid}/comps/${compType}`,
      );
      if (compType === 'sale') setSaleComps(data.comps ?? []);
      else setRentComps(data.comps ?? []);
    } catch (err) {
      if (retry < 2) {
        setTimeout(() => fetchComps(compType, retry + 1), 2000 * (retry + 1));
        return;
      }
      const msg = compType === 'rent'
        ? 'Rent comps are temporarily unavailable.'
        : 'Sale comps are temporarily unavailable.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [property.data?.zpid]);

  useEffect(() => {
    fetchComps(tab);
  }, [tab, fetchComps]);

  const comps = tab === 'sale' ? saleComps : rentComps;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Button
          title="← Back"
          variant="ghost"
          onPress={() => router.back()}
          style={{ alignSelf: 'flex-start' }}
        />
        <Text style={styles.title}>Comparable Properties</Text>
        {property.data && (
          <Text style={styles.subtitle}>{property.data.address.street}</Text>
        )}

        {/* Tab Picker */}
        <View style={styles.tabs}>
          <Pressable
            onPress={() => setTab('sale')}
            style={[styles.tab, tab === 'sale' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'sale' && styles.tabTextActive]}>Sale Comps</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('rent')}
            style={[styles.tab, tab === 'rent' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'rent' && styles.tabTextActive]}>Rent Comps</Text>
          </Pressable>
        </View>
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {error && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={() => fetchComps(tab)} style={{ marginTop: spacing.md }} />
        </View>
      )}

      {!loading && !error && comps.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No {tab} comps available.</Text>
        </View>
      )}

      {!loading && comps.length > 0 && (
        <FlatList
          data={comps}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.compCard, cardGlow.sm]}>
              <Text style={styles.compAddress} numberOfLines={1}>{item.address}</Text>
              <View style={styles.compStats}>
                <CompStat label={tab === 'sale' ? 'Price' : 'Rent'} value={money(item.price)} />
                <CompStat label="Beds" value={String(item.bedrooms)} />
                <CompStat label="Baths" value={String(item.bathrooms)} />
                <CompStat label="Sqft" value={fmt(item.sqft)} />
              </View>
              <View style={styles.compMeta}>
                {item.distance_miles != null && (
                  <Text style={styles.metaText}>{item.distance_miles.toFixed(1)} mi</Text>
                )}
                {item.sold_date && (
                  <Text style={styles.metaText}>Sold {item.sold_date}</Text>
                )}
                {item.price_per_sqft != null && (
                  <Text style={styles.metaText}>{money(item.price_per_sqft)}/sqft</Text>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

function CompStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.compStatItem}>
      <Text style={styles.compStatValue}>{value}</Text>
      <Text style={styles.compStatLabel}>{label}</Text>
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
  container: { flex: 1, backgroundColor: colors.base },
  header: { paddingHorizontal: spacing.lg, paddingTop: 56 },
  title: { fontFamily: fontFamilies.heading, fontSize: 22, fontWeight: '700', color: colors.textHeading },
  subtitle: { fontFamily: fontFamilies.body, fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  errorText: { fontFamily: fontFamilies.body, fontSize: 14, color: colors.error, textAlign: 'center' },
  emptyText: { fontFamily: fontFamilies.body, fontSize: 14, color: colors.textSecondary },
  list: { padding: spacing.lg },

  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontFamily: fontFamilies.bodyMedium, fontSize: 14, color: colors.textBody },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  compCard: { backgroundColor: colors.base, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm },
  compAddress: { fontFamily: fontFamilies.heading, fontSize: 14, fontWeight: '600', color: colors.textHeading, marginBottom: spacing.sm },
  compStats: { flexDirection: 'row', justifyContent: 'space-between' },
  compStatItem: { alignItems: 'center', flex: 1 },
  compStatValue: { fontFamily: fontFamilies.monoBold, fontSize: 16, fontWeight: '700', color: colors.textHeading },
  compStatLabel: { fontFamily: fontFamilies.body, fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  compMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  metaText: { fontFamily: fontFamilies.body, fontSize: 11, color: colors.textMuted },
});
