import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSession } from '@/hooks/useSession';
import {
  useSavedProperties,
  useDeleteSavedProperty,
  type SavedPropertySummary,
} from '@/hooks/useSavedProperties';
import { GlowCard } from '@/components/ui/GlowCard';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

type SortOption = 'date' | 'score' | 'gap';
const SORT_LABELS: Record<SortOption, string> = {
  date: 'Date Saved',
  score: 'Verdict Score',
  gap: 'Deal Gap',
};
const PAGE_SIZE = 20;
const DELETE_THRESHOLD = -80;

export default function DealVaultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated } = useSession();

  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<SortOption>('date');

  const { data: items, isLoading } = useSavedProperties({
    page,
    pageSize: PAGE_SIZE,
    sort: sort === 'date' ? '-created_at' : sort === 'score' ? '-verdict_score' : '-deal_gap_pct',
  });
  const deleteMutation = useDeleteSavedProperty();

  function cycleSort() {
    const order: SortOption[] = ['date', 'score', 'gap'];
    const next = order[(order.indexOf(sort) + 1) % order.length];
    setSort(next);
    setPage(0);
  }

  function handlePress(item: SavedPropertySummary) {
    router.push(`/verdict?address=${encodeURIComponent(item.display_address)}`);
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id);
  }

  // ── Unauthenticated ─────────────────────────────────
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.screenTitle}>
          DealVault<Text style={styles.accent}>IQ</Text>
        </Text>
        <View style={styles.emptyState}>
          <View style={styles.iconCircle}>
            <Ionicons name="bookmark-outline" size={40} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>Sign In to Save Deals</Text>
          <Text style={styles.emptyText}>
            Create an account to save properties, track deals, and build your
            investment pipeline.
          </Text>
          <Button
            title="Sign In"
            onPress={() => router.push('/(auth)/login')}
            style={{ minWidth: 200, marginTop: spacing.md }}
          />
        </View>
      </View>
    );
  }

  const renderItem = useCallback(
    ({ item }: { item: SavedPropertySummary }) => (
      <SwipeActionRow
        onDelete={() => handleDelete(item.id)}
        onPress={() => handlePress(item)}
      >
        <View style={styles.cardInner}>
          {/* Address */}
          <Text style={styles.cardAddress} numberOfLines={1}>
            {item.display_address}
          </Text>

          {/* Meta chips */}
          <View style={styles.cardMeta}>
            {item.bedrooms != null && (
              <Text style={styles.metaChip}>{item.bedrooms}bd</Text>
            )}
            {item.bathrooms != null && (
              <Text style={styles.metaChip}>{item.bathrooms}ba</Text>
            )}
            {item.sqft != null && (
              <Text style={styles.metaChip}>{item.sqft.toLocaleString()} sqft</Text>
            )}
          </View>

          {/* Metrics row */}
          <View style={styles.metricsRow}>
            {item.verdict_score != null && (
              <MetricPill
                label="Score"
                value={String(item.verdict_score)}
                color={item.verdict_score >= 65 ? colors.green : item.verdict_score >= 40 ? colors.gold : colors.red}
              />
            )}
            {item.deal_gap_pct != null && (
              <MetricPill
                label="Deal Gap"
                value={`${item.deal_gap_pct.toFixed(1)}%`}
                color={item.deal_gap_pct >= 5 ? colors.green : item.deal_gap_pct >= 0 ? colors.gold : colors.red}
              />
            )}
            {item.target_buy_price != null && (
              <MetricPill
                label="Target Buy"
                value={formatCurrency(item.target_buy_price)}
                color={colors.accent}
              />
            )}
          </View>

          {/* Strategy + date */}
          <View style={styles.cardFooter}>
            {item.best_strategy && (
              <View style={styles.strategyBadge}>
                <Text style={styles.strategyText}>{item.best_strategy}</Text>
              </View>
            )}
            <Text style={styles.dateText}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </SwipeActionRow>
    ),
    [deleteMutation],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>
          DealVault<Text style={styles.accent}>IQ</Text>
        </Text>
        <Pressable style={styles.sortBtn} onPress={cycleSort}>
          <Ionicons name="swap-vertical-outline" size={16} color={colors.secondary} />
          <Text style={styles.sortText}>{SORT_LABELS[sort]}</Text>
        </Pressable>
      </View>

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
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.iconCircle}>
                <Ionicons name="bookmark-outline" size={40} color={colors.accent} />
              </View>
              <Text style={styles.emptyTitle}>No Saved Properties</Text>
              <Text style={styles.emptyText}>
                Properties you save during analysis will appear here for quick
                comparison and tracking.
              </Text>
              <Button
                title="Search a Property"
                onPress={() => router.push('/(tabs)/search')}
                style={{ marginTop: spacing.md }}
              />
            </View>
          }
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Swipe action row
// ---------------------------------------------------------------------------

function SwipeActionRow({
  children,
  onDelete,
  onPress,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  onPress: () => void;
}) {
  const translateX = useSharedValue(0);

  function doDelete() {
    onDelete();
  }

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = Math.min(0, e.translationX);
    })
    .onEnd(() => {
      if (translateX.value < DELETE_THRESHOLD) {
        translateX.value = withTiming(-200);
        runOnJS(doDelete)();
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
        <View style={styles.deleteLabel}>
          <Ionicons name="trash" size={20} color={colors.white} />
          <Text style={styles.deleteLabelText}>Delete</Text>
        </View>
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
// Metric pill
// ---------------------------------------------------------------------------

function MetricPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={metricStyles.pill}>
      <Text style={[metricStyles.value, { color }]}>{value}</Text>
      <Text style={metricStyles.label}>{label}</Text>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  pill: { alignItems: 'center', flex: 1 },
  value: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontFamily: fontFamily.regular,
    fontSize: 9,
    color: colors.muted,
    textTransform: 'uppercase',
    marginTop: 1,
  },
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  screenTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    color: colors.heading,
  },
  accent: { color: colors.accent },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  sortText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.secondary,
  },
  list: { paddingBottom: spacing['2xl'] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Empty
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
    gap: spacing.md,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    color: colors.heading,
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.secondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: fontSize.md * 1.6,
  },

  // Card
  swipeContainer: {
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  deleteBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.red,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: spacing.lg,
    borderRadius: radius.lg,
  },
  deleteLabel: {
    alignItems: 'center',
    gap: 2,
  },
  deleteLabelText: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.white,
  },
  cardInner: {
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardAddress: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.heading,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaChip: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.secondary,
    backgroundColor: colors.panel,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  metricsRow: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  strategyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
  },
  strategyText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  dateText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
});
