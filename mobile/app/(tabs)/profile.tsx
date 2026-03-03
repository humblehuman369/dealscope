import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { useLogout, useSession } from '@/hooks/useSession';

export default function ProfileScreen() {
  const { user } = useSession();
  const logout = useLogout();
  const router = useRouter();

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout.mutateAsync();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.full_name ?? 'User'}</Text>
        <Text style={styles.email}>{user?.email ?? ''}</Text>
      </View>

      <View style={styles.card}>
        <InfoRow label="Subscription" value={user?.subscription_tier ?? 'Free'} />
        <InfoRow label="Status" value={user?.subscription_status ?? 'Active'} />
        <InfoRow label="MFA" value={user?.mfa_enabled ? 'Enabled' : 'Disabled'} />
      </View>

      {/* Navigation Links */}
      <View style={styles.navCard}>
        <NavRow
          label="Search History"
          onPress={() => router.push('/(protected)/search-history')}
        />
        <NavRow
          label="Settings"
          onPress={() => router.push('/(protected)/settings')}
        />
      </View>

      <Button
        title="Sign Out"
        variant="secondary"
        onPress={handleLogout}
        loading={logout.isPending}
        style={{ marginTop: 24 }}
      />

      <Text style={styles.version}>v1.0.0</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function NavRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.navRow}>
      <Text style={styles.navLabel}>{label}</Text>
      <Text style={styles.navChevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.panel,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textHeading,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textHeading,
  },
  navCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textHeading,
  },
  navChevron: {
    fontSize: 20,
    color: colors.textMuted,
  },
  version: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 'auto',
    paddingBottom: 20,
  },
});
