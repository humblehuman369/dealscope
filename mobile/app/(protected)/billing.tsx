import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Platform, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '@/components/ui';
import { useSubscription, useUsage } from '@/hooks/useSubscription';
import { restorePurchases, isPro as checkIsPro } from '@/services/purchases';
import { useRefreshUser } from '@/hooks/useSession';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

export default function BillingScreen() {
  const router = useRouter();
  const { tier, status, isPro } = useSubscription();
  const { data: usage } = useUsage();
  const refreshUser = useRefreshUser();
  const [restoring, setRestoring] = useState(false);

  async function handleRestore() {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      if (checkIsPro(info)) {
        refreshUser();
        Alert.alert('Restored', 'Your Pro subscription has been restored.');
      } else {
        Alert.alert('No Subscription Found', 'No active Pro subscription was found for this account.');
      }
    } catch {
      Alert.alert('Restore Error', 'Unable to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  }

  function handleManageSubscription() {
    if (Platform.OS === 'ios') {
      Linking.openURL('itms-apps://apps.apple.com/account/subscriptions');
    } else {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  }

  const usagePct = usage
    ? Math.min(100, (usage.searches_used / usage.searches_limit) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Billing</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card glow="lg" style={styles.planCard}>
          <Text style={styles.planLabel}>CURRENT PLAN</Text>
          <Text style={styles.planName}>{isPro ? 'Pro' : 'Starter'}</Text>
          <Text style={styles.planStatus}>
            {status === 'active' ? 'Active' : status}
          </Text>
          {!isPro && (
            <Button
              title="Upgrade to Pro"
              onPress={() => router.push('/pricing')}
              style={styles.upgradeBtn}
            />
          )}
        </Card>

        {usage && (
          <Card glow="sm" style={styles.usageCard}>
            <Text style={styles.usageLabel}>USAGE THIS PERIOD</Text>
            <View style={styles.usageBarTrack}>
              <View style={[styles.usageBarFill, { width: `${usagePct}%` }]} />
            </View>
            <Text style={styles.usageText}>
              {usage.searches_used} / {usage.searches_limit} searches
            </Text>
          </Card>
        )}

        {isPro && (
          <Button
            title="Manage Subscription"
            variant="secondary"
            onPress={handleManageSubscription}
          />
        )}

        <Pressable
          onPress={handleRestore}
          disabled={restoring}
          style={styles.restoreRow}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.restoreText}>Restore Purchases</Text>
          )}
        </Pressable>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  planCard: { alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  planLabel: { ...typography.label, color: colors.textLabel },
  planName: { ...typography.h1, color: colors.primary },
  planStatus: { ...typography.bodySmall, color: colors.success },
  upgradeBtn: { marginTop: spacing.sm, width: '100%' },
  usageCard: { padding: spacing.md, gap: spacing.sm },
  usageLabel: { ...typography.label, color: colors.textLabel },
  usageBarTrack: {
    height: 6,
    backgroundColor: colors.panel,
    borderRadius: 3,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  usageText: { ...typography.caption, color: colors.textSecondary },
  restoreRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  restoreText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.panel,
    borderRadius: 10,
  },
  infoLabel: { ...typography.bodySmall, color: colors.textSecondary },
  infoValue: { fontFamily: fontFamilies.mono, fontSize: 14, color: colors.textHeading, fontWeight: '600' },
});
