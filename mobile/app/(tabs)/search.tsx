import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/hooks/useSession';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
  textStyles,
  shadows,
} from '@/constants/tokens';

const RECENT_PLACEHOLDER = [
  { address: '1451 SW 10th St, Boca Raton, FL 33486', time: '2 hours ago' },
  { address: '742 Evergreen Terrace, Springfield, IL 62704', time: 'Yesterday' },
  { address: '221 Baker Street, New York, NY 10001', time: '3 days ago' },
];

const QUICK_ACTIONS = [
  { icon: 'camera-outline' as const, label: 'Scan Address', route: '/scanner' },
  { icon: 'map-outline' as const, label: 'Nearby', route: '/nearby' },
  { icon: 'trending-up-outline' as const, label: 'Market Data', route: '/market' },
];

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const inputRef = useRef<TextInput>(null);

  const [address, setAddress] = useState('');

  function handleAnalyze() {
    const trimmed = address.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    router.push(`/analyzing?address=${encodeURIComponent(trimmed)}`);
  }

  const greeting = user?.full_name
    ? `Hey, ${user.full_name.split(' ')[0]}`
    : 'Find your next deal';

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
          <Text style={styles.logo}>DealGap<Text style={styles.logoAccent}>IQ</Text></Text>
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
          Is That Property{'\n'}a <Text style={styles.heroAccent}>Good Deal</Text>?
        </Text>
        <Text style={styles.heroSubtitle}>
          Paste any address. Get a score and buy price in 60 seconds.
        </Text>
      </View>

      {/* ── Search Bar ────────────────────────────────────── */}
      <Pressable
        style={styles.searchBar}
        onPress={() => inputRef.current?.focus()}
      >
        <Ionicons name="search" size={20} color={colors.secondary} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          value={address}
          onChangeText={setAddress}
          placeholder="Enter any property address..."
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          onSubmitEditing={handleAnalyze}
          autoCorrect={false}
          selectionColor={colors.accent}
        />
        {address.length > 0 && (
          <Pressable onPress={() => setAddress('')} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </Pressable>
        )}
      </Pressable>

      <Pressable
        style={[styles.analyzeBtn, !address.trim() && styles.analyzeBtnDisabled]}
        onPress={handleAnalyze}
        disabled={!address.trim()}
      >
        <Text style={styles.analyzeBtnText}>Analyze Property</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.black} />
      </Pressable>

      {/* ── Quick Actions ─────────────────────────────────── */}
      <View style={styles.quickActions}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.label}
            style={styles.quickAction}
            onPress={() => {
              // Placeholder — these screens will be built in Phase 2
            }}
          >
            <View style={styles.quickActionIcon}>
              <Ionicons name={action.icon} size={22} color={colors.accent} />
            </View>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* ── Recent Searches ───────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Searches</Text>
        {RECENT_PLACEHOLDER.map((item) => (
          <Pressable
            key={item.address}
            style={styles.recentItem}
            onPress={() => {
              setAddress(item.address);
              inputRef.current?.focus();
            }}
          >
            <View style={styles.recentIcon}>
              <Ionicons name="time-outline" size={18} color={colors.secondary} />
            </View>
            <View style={styles.recentContent}>
              <Text style={styles.recentAddress} numberOfLines={1}>
                {item.address}
              </Text>
              <Text style={styles.recentTime}>{item.time}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
        ))}
      </View>

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

  // Header
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

  // Hero
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

  // Search bar
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
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.heading,
    paddingVertical: 14,
  },

  // Analyze button
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
  analyzeBtnDisabled: {
    opacity: 0.4,
  },
  analyzeBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.black,
  },

  // Quick actions
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

  // Recent searches
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
  recentTime: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 1,
  },
});
