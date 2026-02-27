import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession, useLogout } from '@/hooks/useSession';
import { Button } from '@/components/ui/Button';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
  textStyles,
} from '@/constants/tokens';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface MenuItemProps {
  icon: IoniconsName;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, onPress, danger }: MenuItemProps) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Ionicons
        name={icon}
        size={20}
        color={danger ? colors.red : colors.secondary}
      />
      <Text style={[styles.menuLabel, danger && { color: colors.red }]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated } = useSession();
  const logoutMutation = useLogout();

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['2xl'] }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>Profile</Text>

      {/* ── User card ──────────────────────────────────── */}
      <View style={styles.userCard}>
        <View style={styles.avatarMedium}>
          <Text style={styles.avatarInitial}>
            {(user?.full_name ?? user?.email ?? '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.full_name ?? 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>
              {user?.subscription_tier === 'pro' ? 'Pro' : 'Free'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Menu ───────────────────────────────────────── */}
      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>Account</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="person-outline"
            label="Edit Profile"
            onPress={() => {}}
          />
          <MenuItem
            icon="card-outline"
            label="Subscription & Billing"
            onPress={() => {}}
          />
          <MenuItem
            icon="time-outline"
            label="Search History"
            onPress={() => {}}
          />
        </View>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>Settings</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="notifications-outline"
            label="Notifications"
            onPress={() => {}}
          />
          <MenuItem
            icon="finger-print"
            label="Biometric Unlock"
            onPress={() => {}}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            label="Two-Factor Auth"
            onPress={() => {}}
          />
        </View>
      </View>

      <View style={styles.menuSection}>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => {}}
          />
          <MenuItem
            icon="document-text-outline"
            label="Terms & Privacy"
            onPress={() => {}}
          />
        </View>
      </View>

      <View style={[styles.menuSection, { marginTop: spacing.sm }]}>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="log-out-outline"
            label="Sign Out"
            onPress={() => logoutMutation.mutate()}
            danger
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
    paddingHorizontal: spacing.lg,
  },
  screenTitle: {
    ...textStyles.h1,
    marginBottom: spacing.xl,
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
    ...textStyles.body,
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
    marginBottom: spacing.xl,
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
  userInfo: {
    flex: 1,
  },
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

  // Menu
  menuSection: {
    marginBottom: spacing.lg,
  },
  menuSectionTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.label,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  menuGroup: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuLabel: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.heading,
  },
});
