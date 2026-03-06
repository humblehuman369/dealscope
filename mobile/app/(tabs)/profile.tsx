import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { UsageBar } from '@/components/UsageBar';
import { Paywall } from '@/components/Paywall';
import { colors, cardGlow } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { useLogout, useSession } from '@/hooks/useSession';

export default function ProfileScreen() {
  const { user } = useSession();
  const logout = useLogout();
  const router = useRouter();
  const [showPaywall, setShowPaywall] = useState(false);

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
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={[styles.avatar, cardGlow.sm]}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.name}>{user?.full_name ?? 'User'}</Text>
          <Text style={styles.email}>{user?.email ?? ''}</Text>
        </View>

        {/* Usage Bar */}
        <UsageBar onUpgrade={() => setShowPaywall(true)} />

        {/* Account Info */}
        <View style={[styles.card, cardGlow.sm]}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <InfoRow label="Subscription" value={user?.subscription_tier ?? 'Free'} />
          <InfoRow label="Status" value={user?.subscription_status ?? 'Active'} />
          <InfoRow label="MFA" value={user?.mfa_enabled ? 'Enabled' : 'Disabled'} />
        </View>

        {/* Navigation Links */}
        <View style={styles.navCard}>
          <NavRow label="Search History" onPress={() => router.push('/(protected)/search-history')} />
          <NavRow label="Settings" onPress={() => router.push('/(protected)/settings')} />
          <NavRow label="Pricing" onPress={() => router.push('/pricing' as any)} />
          <NavRow label="About DealGapIQ" onPress={() => router.push('/about' as any)} />
        </View>

        {user?.subscription_tier !== 'pro' && (
          <Button
            title="Upgrade to Pro"
            onPress={() => setShowPaywall(true)}
            style={{ marginTop: spacing.md }}
          />
        )}

        <Button
          title="Sign Out"
          variant="secondary"
          onPress={handleLogout}
          loading={logout.isPending}
          style={{ marginTop: spacing.sm }}
        />

        <Text style={styles.version}>DealGapIQ v1.0.0</Text>
      </ScrollView>

      <Paywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
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
  container: { flex: 1, backgroundColor: colors.base },
  scroll: { padding: spacing.lg, paddingTop: 60, paddingBottom: 40 },

  header: { alignItems: 'center', marginBottom: spacing.lg },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.panel,
    borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  avatarText: { fontFamily: fontFamilies.heading, fontSize: 28, fontWeight: '700', color: colors.primary },
  name: { fontFamily: fontFamilies.heading, fontSize: 20, fontWeight: '600', color: colors.textHeading },
  email: { fontFamily: fontFamilies.body, fontSize: 14, color: colors.textSecondary, marginTop: 2 },

  card: {
    backgroundColor: colors.base, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm,
  },
  sectionLabel: { fontFamily: fontFamilies.heading, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: colors.primary, textTransform: 'uppercase', marginBottom: spacing.sm },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontFamily: fontFamilies.body, fontSize: 14, color: colors.textSecondary },
  infoValue: { fontFamily: fontFamilies.mono, fontSize: 14, fontWeight: '600', color: colors.textHeading },

  navCard: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginTop: spacing.sm },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  navLabel: { fontFamily: fontFamilies.bodyMedium, fontSize: 15, fontWeight: '500', color: colors.textHeading },
  navChevron: { fontSize: 20, color: colors.textMuted },

  version: { fontFamily: fontFamilies.body, textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: spacing.xl },
});
