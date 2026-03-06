import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui';
import { useSession, useLogout } from '@/hooks/useSession';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

interface MenuItemProps {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

function MenuItem({ label, onPress, destructive }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
    >
      <Text style={[styles.menuLabel, destructive && styles.menuDestructive]}>
        {label}
      </Text>
      <Text style={styles.menuChevron}>›</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isPro } = useSession();
  const logout = useLogout();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Profile</Text>

        <Card glow="sm" style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.full_name ?? 'Guest'}</Text>
          <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>
              {isPro ? 'PRO' : 'STARTER'}
            </Text>
          </View>
        </Card>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>ACCOUNT</Text>
          <Card glow="none" style={styles.menuCard}>
            <MenuItem label="Saved Properties" onPress={() => router.push('/(protected)/saved-properties')} />
            <MenuItem label="Search History" onPress={() => router.push('/(protected)/search-history')} />
            <MenuItem label="Billing" onPress={() => router.push('/(protected)/billing')} />
            <MenuItem label="Settings" onPress={() => router.push('/(protected)/settings')} />
          </Card>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>ABOUT</Text>
          <Card glow="none" style={styles.menuCard}>
            <MenuItem label="Pricing" onPress={() => router.push('/pricing')} />
            <MenuItem label="About DealGapIQ" onPress={() => router.push('/about')} />
          </Card>
        </View>

        <View style={styles.menuSection}>
          <Card glow="none" style={styles.menuCard}>
            <MenuItem
              label="Sign Out"
              onPress={() => logout.mutate()}
              destructive
            />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  screenTitle: {
    ...typography.h1,
    color: colors.textHeading,
    paddingTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  userCard: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontFamily: fontFamilies.heading,
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  userName: {
    ...typography.h3,
    color: colors.textHeading,
  },
  userEmail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tierBadge: {
    marginTop: spacing.sm,
    backgroundColor: colors.accentBg.teal,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tierText: {
    ...typography.label,
    color: colors.primary,
  },
  menuSection: {
    marginTop: spacing.lg,
  },
  menuSectionTitle: {
    ...typography.label,
    color: colors.textLabel,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  menuCard: {
    padding: 0,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemPressed: {
    backgroundColor: colors.panel,
  },
  menuLabel: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    color: colors.textBody,
  },
  menuDestructive: {
    color: colors.error,
  },
  menuChevron: {
    fontSize: 20,
    color: colors.textMuted,
  },
});
