import { View, Text, FlatList, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '@/components/ui';
import { useSearchHistory, useDeleteSearchHistoryEntry, useClearSearchHistory } from '@/hooks/useSearchHistory';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

export default function SearchHistoryScreen() {
  const router = useRouter();
  const { data: history, isLoading, isError } = useSearchHistory({
    page: 0,
    pageSize: 50,
    successfulOnly: false,
  });
  const deleteItem = useDeleteSearchHistoryEntry();
  const clearAll = useClearSearchHistory();

  function handleClear() {
    Alert.alert('Clear History', 'Clear all search history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => clearAll.mutate() },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Search History</Text>
        {history && history.length > 0 ? (
          <Pressable onPress={handleClear}>
            <Text style={styles.clearBtn}>Clear</Text>
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {isLoading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/analyzing', params: { address: item.search_query } })
            }
            onLongPress={() => {
              Alert.alert('Delete', 'Remove this search?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteItem.mutate(item.id) },
              ]);
            }}
          >
            <Card glow="none" style={styles.itemCard}>
              <Text style={styles.itemAddress} numberOfLines={2}>{item.search_query}</Text>
              <Text style={styles.itemDate}>
                {new Date(item.searched_at).toLocaleDateString()}
              </Text>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {isError ? 'Unable to Load History' : 'No Search History'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isError
                  ? 'Please check your connection and try again.'
                  : 'Properties you analyze will appear here'}
              </Text>
            </View>
          ) : null
        }
      />
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
  clearBtn: { fontFamily: fontFamilies.bodyMedium, fontSize: 14, color: colors.error, fontWeight: '600' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.sm,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.panel,
    borderRadius: 10,
  },
  itemAddress: { ...typography.bodySmall, color: colors.textBody, flex: 1, marginRight: spacing.sm },
  itemDate: { ...typography.caption, color: colors.textMuted },
  empty: { alignItems: 'center', paddingTop: spacing['2xl'] },
  emptyTitle: { ...typography.h3, color: colors.textHeading, marginBottom: spacing.sm },
  emptySubtitle: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' },
});
