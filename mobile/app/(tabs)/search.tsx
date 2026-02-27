import { useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/hooks/useSession';
import { useRecentSearches } from '@/hooks/useSearchHistory';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
  textStyles,
  shadows,
} from '@/constants/tokens';

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

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useSession();

  const { data: recentSearches, isLoading: loadingRecent } = useRecentSearches(5);

  const greeting = user?.full_name
    ? `Hey, ${user.full_name.split(' ')[0]}`
    : 'Find your next deal';

  function openSearch() {
    router.push('/search-modal');
  }

  function openScanner() {
    router.push('/scanner');
  }

  function analyzeRecent(address: string) {
    router.push(`/analyzing?address=${encodeURIComponent(address)}`);
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>
            DealGap<Text style={styles.logoAccent}>IQ</Text>
          </Text>
          <Text style={styles.greeting}>{greeting}</Text>
        </View>
        <Pressable
          style={styles.avatarCircle}
          onPress={() => router.push('/(tabs)/profile')}
          accessibilityLabel="Profile"
        >
          <Ionicons name="person" size={20} color={colors.secondary} />
        </Pressable>
      </View>

      {/* ── Hero ──────────────────────────────────────────── */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>
          Is That Property{'\n'}a{' '}
          <Text style={styles.heroAccent}>Good Deal</Text>?
        </Text>
        <Text style={styles.heroSubtitle}>
          Paste any address. Get a score and buy price in 60 seconds.
        </Text>
      </View>

      {/* ── Search Bar (tap to open full-screen search) ──── */}
      <Pressable style={styles.searchBar} onPress={openSearch}>
        <Ionicons
          name="search"
          size={20}
          color={colors.secondary}
          style={styles.searchIcon}
        />
        <Text style={styles.searchPlaceholder}>
          Enter any property address...
        </Text>
      </Pressable>

      <Pressable style={styles.analyzeBtn} onPress={openSearch}>
        <Text style={styles.analyzeBtnText}>Analyze Property</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.black} />
      </Pressable>

      {/* ── Quick Actions ─────────────────────────────────── */}
      <View style={styles.quickActions}>
        <Pressable style={styles.quickAction} onPress={openScanner}>
          <View style={styles.quickActionIcon}>
            <Ionicons name="camera-outline" size={22} color={colors.accent} />
          </View>
          <Text style={styles.quickActionLabel}>Scan Address</Text>
        </Pressable>

        <Pressable style={styles.quickAction} onPress={openSearch}>
          <View style={styles.quickActionIcon}>
            <Ionicons name="search-outline" size={22} color={colors.accent} />
          </View>
          <Text style={styles.quickActionLabel}>Search</Text>
        </Pressable>

        <Pressable style={styles.quickAction} onPress={() => {}}>
          <View style={styles.quickActionIcon}>
            <Ionicons
              name="trending-up-outline"
              size={22}
              color={colors.accent}
            />
          </View>
          <Text style={styles.quickActionLabel}>Market Data</Text>
        </Pressable>
      </View>

      {/* ── Recent Searches ───────────────────────────────── */}
      {recentSearches && recentSearches.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          {recentSearches.map((item) => (
            <Pressable
              key={item.id}
              style={styles.recentItem}
              onPress={() => analyzeRecent(item.search_query)}
            >
              <View style={styles.recentIcon}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={colors.secondary}
                />
              </View>
              <View style={styles.recentContent}>
                <Text style={styles.recentAddress} numberOfLines={1}>
                  {item.search_query}
                </Text>
                <Text style={styles.recentMeta}>
                  {[
                    item.result_summary?.bedrooms &&
                      `${item.result_summary.bedrooms}bd`,
                    item.result_summary?.bathrooms &&
                      `${item.result_summary.bathrooms}ba`,
                    timeAgo(item.searched_at),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.muted}
              />
            </Pressable>
          ))}
        </View>
      )}

      {/* ── Bottom spacer ─────────────────────────────────── */}
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.base,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  logo: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: colors.heading,
  },
  logoAccent: {
    color: colors.accent,
  },
  greeting: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginTop: 2,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heroTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: fontSize['3xl'] * 1.2,
    color: colors.heading,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  heroAccent: {
    color: colors.accent,
  },
  heroSubtitle: {
    ...textStyles.body,
    color: colors.secondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.base,
    borderWidth: 1,
    borderColor: colors.glowBorder,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    ...shadows.glow,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.muted,
    paddingVertical: 14,
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 14,
    marginTop: spacing.md,
  },
  analyzeBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.black,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.body,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.heading,
    marginBottom: spacing.xs,
  },
  recentItem: {
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
  recentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentContent: {
    flex: 1,
  },
  recentAddress: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.heading,
  },
  recentMeta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 1,
  },
});
