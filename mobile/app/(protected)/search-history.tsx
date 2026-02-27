import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  useSearchHistoryPaginated,
  useSearchHistoryStats,
  useDeleteSearchHistoryEntry,
  useClearSearchHistory,
  SEARCH_HISTORY_KEYS,
  type SearchHistoryItem,
} from '@/hooks/useSearchHistory';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

const PAGE_SIZE = 20;
const DELETE_THRESHOLD = -80;

export default function SearchHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const [successfulOnly, setSuccessfulOnly] = useState(false);

  const { data: items, isLoading } = useSearchHistoryPaginated({
    page,
    pageSize: PAGE_SIZE,
    successfulOnly,
  });
  const { data: stats } = useSearchHistoryStats();
  const deleteMutation = useDeleteSearchHistoryEntry();
  const clearMutation = useClearSearchHistory();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: SEARCH_HISTORY_KEYS.all });
    setRefreshing(false);
  }

  function handleClearAll() {
    Alert.alert(
      'Clear All History',
      'This will permanently delete all your search history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => clearMutation.mutate(),
        },
      ],
    );
  }

  function handleAnalyze(address: string) {
    router.push(`/analyzing?address=${encodeURIComponent(address)}`);
  }

  function toggleFilter() {
    setSuccessfulOnly((v) => !v);
    setPage(0);
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  const renderItem = useCallback(
    ({ item }: { item: SearchHistoryItem }) => (
      <SwipeToDeleteRow
        onDelete={() => deleteMutation.mutate(item.id)}
        onPress={() => handleAnalyze(item.search_query)}
      >
        <View style={styles.itemContent}>
          <View style={styles.itemIcon}>
            <Ionicons
              name={item.was_successful ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={item.was_successful ? colors.green : colors.gold}
            />
          </View>
          <View style={styles.itemText}>
            <Text style={styles.itemAddress} numberOfLines={1}>
              {item.search_query}
            </Text>
            <Text style={styles.itemMeta}>
              {[
                item.result_summary?.bedrooms && `${item.result_summary.bedrooms}bd`,
                item.result_summary?.bathrooms && `${item.result_summary.bathrooms}ba`,
                item.result_summary?.estimated_value &&
                  formatCurrency(item.result_summary.estimated_value),
                timeAgo(item.searched_at),
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          {item.was_saved && (
            <Ionicons name="bookmark" size={16} color={colors.accent} />
          )}
        </View>
      </SwipeToDeleteRow>
    ),
    [deleteMutation],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.heading} />
        </Pressable>
        <Text style={styles.headerTitle}>Search History</Text>
        <Pressable onPress={handleClearAll} hitSlop={12}>
          <Ionicons name="trash-outline" size={20} color={colors.red} />
        </Pressable>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsRow}>
          <StatChip label="Total" value={String(stats.total_searches)} />
          <StatChip label="This Week" value={String(stats.searches_this_week)} />
          <StatChip label="This Month" value={String(stats.searches_this_month)} />
          <StatChip label="Saved" value={String(stats.saved_from_search)} />
        </View>
      )}

      {/* Filter */}
      <Pressable
        style={[styles.filterBtn, successfulOnly && styles.filterBtnActive]}
        onPress={toggleFilter}
      >
        <Ionicons
          name={successfulOnly ? 'checkmark-circle' : 'filter-outline'}
          size={16}
          color={successfulOnly ? colors.accent : colors.secondary}
        />
        <Text style={[styles.filterText, successfulOnly && { color: colors.accent }]}>
          {successfulOnly ? 'Successful Only' : 'All Results'}
        </Text>
      </Pressable>

      {/* List */}
      {isLoading && !items ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={48} color={colors.muted} />
              <Text style={styles.emptyTitle}>No search history</Text>
              <Text style={styles.emptyText}>
                Properties you analyze will appear here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Swipe-to-delete row
// ---------------------------------------------------------------------------

function SwipeToDeleteRow({
  children,
  onDelete,
  onPress,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  onPress: () => void;
}) {
  const translateX = useSharedValue(0);

  function handleDelete() {
    onDelete();
  }

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = Math.min(0, e.translationX);
    })
    .onEnd(() => {
      if (translateX.value < DELETE_THRESHOLD) {
        translateX.value = withTiming(-200);
        runOnJS(handleDelete)();
      } else {
        translateX.value = withTiming(0);
      }
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.deleteBackground}>
        <Ionicons name="trash" size={22} color={colors.white} />
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={animStyle}>
          <Pressable onPress={onPress}>{children}</Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stat chip
// ---------------------------------------------------------------------------

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  statChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 9,
    color: colors.muted,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterBtnActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  filterText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing['2xl'] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    color: colors.heading,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  // Swipe
  swipeContainer: {
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  deleteBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.red,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: spacing.lg,
    borderRadius: radius.md,
  },
  // Item
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1 },
  itemAddress: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.heading,
  },
  itemMeta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 1,
  },
});
