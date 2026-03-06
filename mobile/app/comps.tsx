import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui';
import api from '@/services/api';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

type CompsView = 'sale' | 'rent';

interface CompProperty {
  address: string;
  price?: number;
  rent?: number;
  bedrooms?: number;
  bathrooms?: number;
  square_footage?: number;
  distance_miles?: number;
  days_on_market?: number;
  sold_date?: string;
  year_built?: number;
}

function fmtC(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  return '$' + Math.round(v).toLocaleString();
}

function useComps(address: string | undefined, view: CompsView) {
  return useQuery<CompProperty[]>({
    queryKey: ['comps', address, view],
    queryFn: async () => {
      const endpoint = view === 'sale'
        ? '/api/v1/properties/similar-sold'
        : '/api/v1/properties/similar-rent';
      const { data } = await api.get<CompProperty[]>(endpoint, {
        params: { address },
      });
      return data;
    },
    enabled: !!address,
    staleTime: 5 * 60_000,
  });
}

function CompCard({ comp, view }: { comp: CompProperty; view: CompsView }) {
  const mainValue = view === 'sale' ? comp.price : comp.rent;
  const mainLabel = view === 'sale' ? fmtC(mainValue) : fmtC(mainValue) + '/mo';

  return (
    <Card glow="sm" style={styles.compCard}>
      <Text style={styles.compAddress} numberOfLines={2}>{comp.address}</Text>
      <Text style={styles.compPrice}>{mainLabel}</Text>
      <Text style={styles.compMeta}>
        {[
          comp.bedrooms && `${comp.bedrooms} bd`,
          comp.bathrooms && `${comp.bathrooms} ba`,
          comp.square_footage && `${comp.square_footage.toLocaleString()} sqft`,
          comp.distance_miles != null && `${comp.distance_miles.toFixed(1)} mi`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      {view === 'sale' && comp.sold_date && (
        <Text style={styles.compDate}>Sold: {comp.sold_date}</Text>
      )}
    </Card>
  );
}

export default function CompsScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const router = useRouter();
  const [view, setView] = useState<CompsView>('sale');

  const { data: comps, isLoading, error } = useComps(address, view);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Comps</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Toggle */}
      <View style={styles.toggleRow}>
        <Pressable
          onPress={() => setView('sale')}
          style={[styles.toggleBtn, view === 'sale' && styles.toggleBtnActive]}
        >
          <Text style={[styles.toggleText, view === 'sale' && styles.toggleTextActive]}>
            Sale Comps
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setView('rent')}
          style={[styles.toggleBtn, view === 'rent' && styles.toggleBtnActive]}
        >
          <Text style={[styles.toggleText, view === 'rent' && styles.toggleTextActive]}>
            Rental Comps
          </Text>
        </Pressable>
      </View>

      {isLoading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {error && !isLoading && (
        <View style={styles.loading}>
          <Text style={styles.errorText}>Failed to load comps</Text>
        </View>
      )}

      {comps && !isLoading && (
        <FlatList
          data={comps}
          keyExtractor={(item, i) => item.address + i}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <CompCard comp={item} view={view} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No comparable properties found</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
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
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.panel,
    borderRadius: 10,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: '#000',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: { ...typography.bodySmall, color: colors.error },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.sm,
  },
  compCard: {
    padding: spacing.md,
    gap: 4,
  },
  compAddress: {
    ...typography.h4,
    color: colors.textHeading,
  },
  compPrice: {
    ...typography.financialLarge,
    color: colors.primary,
  },
  compMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  compDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing['2xl'],
  },
});
