import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import {
  useSearchHistory,
  useDeleteSearchEntry,
  useClearSearchHistory,
  type SearchHistoryEntry,
} from '@/hooks/useSearchHistory';

export default function SearchHistoryScreen() {
  const router = useRouter();
  const { data: entries, isLoading, refetch } = useSearchHistory();
  const deleteEntry = useDeleteSearchEntry();
  const clearAll = useClearSearchHistory();

  function handlePress(entry: SearchHistoryEntry) {
    const addr = [entry.address, entry.city, entry.state, entry.zip_code]
      .filter(Boolean)
      .join(', ');
    router.push({ pathname: '/verdict', params: { address: addr } });
  }

  function handleClearAll() {
    Alert.alert(
      'Clear History',
      'Remove all search history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => clearAll.mutate(),
        },
      ],
    );
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          title="← Back"
          variant="ghost"
          onPress={() => router.back()}
          style={{ alignSelf: 'flex-start' }}
        />
        <View style={styles.titleRow}>
          <Text style={styles.title}>Search History</Text>
          {(entries?.length ?? 0) > 0 && (
            <Pressable onPress={handleClearAll}>
              <Text style={styles.clearText}>Clear All</Text>
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={entries ?? []}
        keyExtractor={(item) => item.id}
        refreshing={isLoading}
        onRefresh={refetch}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No Searches Yet</Text>
            <Text style={styles.emptyText}>
              Properties you search for will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => handlePress(item)} style={styles.entryCard}>
            <View style={styles.entryRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryAddress} numberOfLines={1}>
                  {item.address}
                </Text>
                <Text style={styles.entryLocation} numberOfLines={1}>
                  {[item.city, item.state, item.zip_code].filter(Boolean).join(', ')}
                </Text>
              </View>
              <Text style={styles.entryTime}>{formatDate(item.searched_at)}</Text>
            </View>
            <Pressable
              onPress={() => deleteEntry.mutate(item.id)}
              hitSlop={8}
              style={styles.removeBtn}
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  header: { paddingHorizontal: 24, paddingTop: 56 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: colors.textHeading },
  clearText: { fontSize: 14, fontWeight: '600', color: colors.error },

  list: { paddingHorizontal: 24, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textHeading, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  entryCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  entryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  entryAddress: { fontSize: 15, fontWeight: '600', color: colors.textHeading },
  entryLocation: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  entryTime: { fontSize: 12, color: colors.textMuted, marginLeft: 8 },
  removeBtn: { marginTop: 8, alignSelf: 'flex-end' },
  removeText: { fontSize: 12, color: colors.error, fontWeight: '600' },
});
