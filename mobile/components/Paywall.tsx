import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors, cardGlow } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { useOfferings, usePurchase, useRestore } from '@/hooks/useSubscription';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
  trigger?: string;
}

const FEATURES_FREE = [
  '5 property analyses / month',
  '6 investment strategies',
  'VerdictIQ score',
];

const FEATURES_PRO = [
  'Unlimited property analyses',
  'Excel proforma downloads',
  'Lender-ready PDF reports',
  'Priority analysis speed',
  '7-day free trial',
];

export function Paywall({ visible, onClose, trigger }: PaywallProps) {
  const offerings = useOfferings();
  const purchase = usePurchase();
  const restore = useRestore();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const currentOffering = offerings.data?.current;
  const monthlyPkg = currentOffering?.monthly;
  const annualPkg = currentOffering?.annual;
  const selectedPkg = billingCycle === 'annual' ? annualPkg : monthlyPkg;

  async function handlePurchase() {
    if (!selectedPkg) return;
    try {
      await purchase.mutateAsync(selectedPkg);
      onClose();
    } catch (err: any) {
      if (!err.userCancelled) {
        Alert.alert('Purchase Failed', err.message ?? 'Please try again.');
      }
    }
  }

  async function handleRestore() {
    try {
      const info = await restore.mutateAsync();
      const hasPro = info.entitlements?.active?.pro;
      if (hasPro) {
        Alert.alert('Restored', 'Your Pro subscription has been restored.');
        onClose();
      } else {
        Alert.alert('No Purchase Found', 'We could not find an active subscription.');
      }
    } catch {
      Alert.alert('Restore Failed', 'Please try again.');
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <Text style={styles.title}>
            Upgrade to <Text style={{ color: colors.primary }}>Pro</Text>
          </Text>
          <Text style={styles.subtitle}>
            Unlock unlimited analyses and professional reports.
          </Text>

          {/* Billing Toggle */}
          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => setBillingCycle('monthly')}
              style={[styles.toggle, billingCycle === 'monthly' && styles.toggleActive]}
            >
              <Text style={[styles.toggleText, billingCycle === 'monthly' && styles.toggleTextActive]}>
                Monthly $39
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setBillingCycle('annual')}
              style={[styles.toggle, billingCycle === 'annual' && styles.toggleActive]}
            >
              <Text style={[styles.toggleText, billingCycle === 'annual' && styles.toggleTextActive]}>
                Annual $29/mo
              </Text>
              <Text style={styles.saveBadge}>SAVE 26%</Text>
            </Pressable>
          </View>

          {/* Free Tier */}
          <View style={styles.tierCard}>
            <Text style={styles.tierName}>Starter (Free)</Text>
            {FEATURES_FREE.map((f) => (
              <Text key={f} style={styles.featureText}>• {f}</Text>
            ))}
          </View>

          {/* Pro Tier */}
          <View style={[styles.tierCard, styles.tierPro, cardGlow.lg]}>
            <Text style={[styles.tierName, { color: colors.primary }]}>Pro</Text>
            {FEATURES_PRO.map((f) => (
              <Text key={f} style={styles.featureText}>✓ {f}</Text>
            ))}
          </View>

          <Button
            title={billingCycle === 'annual' ? 'Start 7-Day Free Trial' : 'Subscribe for $39/mo'}
            onPress={handlePurchase}
            loading={purchase.isPending}
            style={styles.ctaBtn}
          />

          <Pressable onPress={handleRestore} style={styles.restoreBtn}>
            <Text style={styles.restoreText}>
              {restore.isPending ? 'Restoring...' : 'Restore Purchases'}
            </Text>
          </Pressable>

          <Text style={styles.disclaimer}>
            Payment will be charged to your App Store account. Subscription automatically renews
            unless cancelled at least 24 hours before the end of the current period.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  scroll: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: 60 },
  closeBtn: { alignSelf: 'flex-end', padding: spacing.sm },
  closeText: { fontSize: 20, color: colors.textSecondary },

  title: { fontFamily: fontFamilies.heading, fontSize: 28, fontWeight: '700', color: colors.textHeading, textAlign: 'center', marginTop: spacing.md },
  subtitle: { fontFamily: fontFamilies.body, fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.xl },

  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  toggle: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  toggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { fontFamily: fontFamilies.heading, fontSize: 14, fontWeight: '600', color: colors.textBody },
  toggleTextActive: { color: '#fff' },
  saveBadge: { fontFamily: fontFamilies.heading, fontSize: 9, fontWeight: '700', color: colors.success, marginTop: 2 },

  tierCard: { backgroundColor: colors.card, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  tierPro: { backgroundColor: colors.base },
  tierName: { fontFamily: fontFamilies.heading, fontSize: 18, fontWeight: '700', color: colors.textHeading, marginBottom: spacing.sm },
  featureText: { fontFamily: fontFamilies.body, fontSize: 14, color: colors.textBody, paddingVertical: 4 },

  ctaBtn: { marginTop: spacing.md },
  restoreBtn: { alignSelf: 'center', paddingVertical: spacing.md },
  restoreText: { fontFamily: fontFamilies.body, fontSize: 13, color: colors.primary },
  disclaimer: { fontFamily: fontFamilies.body, fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg, lineHeight: 16 },
});
