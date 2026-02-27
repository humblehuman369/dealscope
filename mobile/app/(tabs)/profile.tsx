import { useState, useRef } from 'react';
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
import { useSession, useLogout } from '@/hooks/useSession';
import { useUserProfile } from '@/hooks/useProfileData';
import { AccountTab } from '@/components/profile/AccountTab';
import { InvestorTab } from '@/components/profile/InvestorTab';
import { Button } from '@/components/ui/Button';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
} from '@/constants/tokens';

type IoniconsName = keyof typeof Ionicons.glyphMap;
type TabId = 'account' | 'business' | 'investor' | 'preferences';

const TABS: { id: TabId; label: string; icon: IoniconsName }[] = [
  { id: 'account', label: 'Account', icon: 'person-outline' },
  { id: 'business', label: 'Business', icon: 'business-outline' },
  { id: 'investor', label: 'Investor', icon: 'trending-up-outline' },
  { id: 'preferences', label: 'Prefs', icon: 'options-outline' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated } = useSession();
  const { data: fullUser } = useUserProfile();
  const logoutMutation = useLogout();
  const [activeTab, setActiveTab] = useState<TabId>('account');

  // Unauthenticated prompt
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.screenTitle}>Profile</Text>
        <View style={styles.signInPrompt}>
          <View style={styles.avatarLarge}>
            <Ionicons name="person-outline" size={40} color={colors.muted} />
          </View>
          <Text style={styles.signInTitle}>Sign in to DealGapIQ</Text>
          <Text style={styles.signInMessage}>
            Access your saved properties, search history, and subscription.
          </Text>
          <Button
            title="Sign In"
            onPress={() => router.push('/(auth)/login')}
            style={{ minWidth: 200, marginTop: spacing.md }}
          />
          <Pressable onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerLink}>Create an account</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const profileUser = fullUser ?? {
    id: user?.id ?? '',
    email: user?.email ?? '',
    full_name: user?.full_name ?? null,
    avatar_url: null,
    is_active: true,
    is_verified: user?.is_verified ?? false,
    created_at: user?.created_at ?? '',
    last_login: null,
    subscription_tier: user?.subscription_tier ?? 'free',
    subscription_status: user?.subscription_status ?? 'active',
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.headerRow}>
        <Text style={styles.screenTitle}>Profile</Text>
        <Pressable onPress={() => router.push('/(protected)/settings')} hitSlop={12}>
          <Ionicons name="settings-outline" size={22} color={colors.secondary} />
        </Pressable>
      </View>

      {/* User card */}
      <View style={styles.userCard}>
        <View style={styles.avatarMedium}>
          <Text style={styles.avatarInitial}>
            {(profileUser.full_name ?? profileUser.email ?? '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{profileUser.full_name ?? 'User'}</Text>
          <Text style={styles.userEmail}>{profileUser.email}</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>
              {profileUser.subscription_tier === 'pro' ? 'Pro' : 'Free'}
            </Text>
          </View>
        </View>
      </View>

      {/* Tab selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={active ? colors.accent : colors.muted}
              />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Tab content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'account' && <AccountTab user={profileUser} />}

        {activeTab === 'business' && (
          <View style={styles.placeholderSection}>
            <Ionicons name="business-outline" size={40} color={colors.muted} />
            <Text style={styles.placeholderTitle}>Business Profile</Text>
            <Text style={styles.placeholderText}>
              Add your business name, contact info, and license details.
              Coming in the next update.
            </Text>
          </View>
        )}

        {activeTab === 'investor' && <InvestorTab />}

        {activeTab === 'preferences' && (
          <View style={styles.placeholderSection}>
            <Ionicons name="options-outline" size={40} color={colors.muted} />
            <Text style={styles.placeholderTitle}>Preferences</Text>
            <Text style={styles.placeholderText}>
              Default assumptions and notification preferences.
            </Text>
            <Button
              title="Open Settings"
              variant="secondary"
              onPress={() => router.push('/(protected)/settings')}
              style={{ marginTop: spacing.md }}
            />
          </View>
        )}

        {/* Sign out */}
        <Pressable
          style={styles.signOutRow}
          onPress={() => logoutMutation.mutate()}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.red} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        <View style={{ height: insets.bottom + spacing.xl }} />
      </ScrollView>
    </View>
  );
}

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
    marginBottom: spacing.lg,
  },
  screenTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    color: colors.heading,
  },

  // Sign-in prompt
  signInPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
    gap: spacing.sm,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  signInTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    color: colors.heading,
  },
  signInMessage: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  registerLink: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.accent,
    marginTop: spacing.md,
  },

  // User card
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  avatarMedium: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: colors.white,
  },
  userInfo: { flex: 1 },
  userName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.heading,
  },
  userEmail: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginTop: 1,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
  },
  tierText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.accent,
    textTransform: 'uppercase',
  },

  // Tab row
  tabRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  tabActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
  },
  tabText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  tabTextActive: {
    color: colors.accent,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing['2xl'] },

  // Placeholder
  placeholderSection: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.sm,
  },
  placeholderTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.lg,
    color: colors.heading,
  },
  placeholderText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: fontSize.sm * 1.6,
  },

  // Sign out
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  signOutText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.red,
  },
});
