import { useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import {
  useSavedProperties,
  useDeleteSavedProperty,
  type SavedPropertySummary,
} from '@/hooks/useSavedProperties';

const STATUS_FILTERS = ['all', 'watching', 'analyzing', 'offer', 'owned'] as const;

const STATUS_COLORS: Record<string, string> = {
  watching: '#0EA5E9',
  analyzing: '#8b5cf6',
  offer: '#f97316',
  owned: '#34D399',
};

export default function DealVaultScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<string>('all');
  const { data: properties, isLoading, refetch } = useSavedProperties(filter);
  const deleteProperty = useDeleteSavedProperty();

  function handleDelete(item: SavedPropertySummary) {
    Alert.alert(
      'Remove Property',
      `Remove ${item.address_street} from Deal Vault?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteProperty.mutate(item.id),
        },
      ],
    );
  }

  function handlePress(item: SavedPropertySummary) {
    const addr = [
      item.address_street,
      item.address_city,
      item.address_state,
      item.address_zip,
    ]
      .filter(Boolean)
      .join(', ');
    router.push({ pathname: '/verdict', params: { address: addr } });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Deal Vault</Text>
        <Text style={styles.count}>
          {properties?.length ?? 0} properties
        </Text>
      </View>

      {/* Status Filters */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={STATUS_FILTERS}
        keyExtractor={(s) => s}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item: status }) => (
          <Pressable
            onPress={() => setFilter(status)}
            style={[
              styles.filterChip,
              filter === status && styles.filterChipActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === status && styles.filterTextActive,
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </Pressable>
        )}
      />

      {/* Property List */}
      <FlatList
        data={properties ?? []}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No Properties Saved</Text>
            <Text style={styles.emptyText}>
              Search and analyze a property, then save it to your Deal Vault.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => handlePress(item)} style={styles.propertyCard}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.propertyStreet} numberOfLines={1}>
                  {item.nickname ?? item.address_street}
                </Text>
                <Text style={styles.propertyLocation} numberOfLines={1}>
                  {[item.address_city, item.address_state, item.address_zip]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: (STATUS_COLORS[item.status] ?? colors.textMuted) + '22' },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: STATUS_COLORS[item.status] ?? colors.textMuted },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>

            {(item.best_strategy || item.best_cash_flow != null) && (
              <View style={styles.metricsRow}>
                {item.best_strategy && (
                  <Text style={styles.metricChip}>
                    Best: {item.best_strategy.toUpperCase()}
                  </Text>
                )}
                {item.best_cash_flow != null && (
                  <Text style={styles.metricChip}>
                    ${Math.round(item.best_cash_flow).toLocaleString()}/mo
                  </Text>
                )}
                {item.best_coc_return != null && (
                  <Text style={styles.metricChip}>
                    {item.best_coc_return.toFixed(1)}% CoC
                  </Text>
                )}
              </View>
            )}

            <Pressable
              onPress={() => handleDelete(item)}
              hitSlop={8}
              style={styles.deleteBtn}
            >
              <Text style={styles.deleteText}>Remove</Text>
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: colors.textHeading },
  count: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },

  filterRow: { paddingHorizontal: 24, paddingVertical: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, marginRight: 8, backgroundColor: colors.card },
  filterChipActive: { borderColor: colors.primary, backgroundColor: 'rgba(14,165,233,0.15)' },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  filterTextActive: { color: colors.primary },

  list: { paddingHorizontal: 24, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textHeading, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  propertyCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  propertyStreet: { fontSize: 15, fontWeight: '600', color: colors.textHeading },
  propertyLocation: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 },
  metricChip: { fontSize: 12, fontWeight: '600', color: colors.textLabel, backgroundColor: colors.panel, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },

  deleteBtn: { marginTop: 10, alignSelf: 'flex-end' },
  deleteText: { fontSize: 12, color: colors.error, fontWeight: '600' },
});
