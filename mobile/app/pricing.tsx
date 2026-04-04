import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';
import { Card, Button } from '@/components/ui';
import { useSession, useRefreshUser } from '@/hooks/useSession';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isPro as checkIsPro,
  getCustomerInfo,
} from '@/services/purchases';
import { colors, cardGlow } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

interface PlanInfo {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  pkg?: PurchasesPackage;
}

const STARTER_PLAN: PlanInfo = {
  id: 'starter',
  name: 'Starter',
  price: 'Free',
  period: '',
  features: [
    '3 property analyses per month',
    'IQ Verdict score',
    'Basic financial breakdown',
    'Deal Gap analysis',
  ],
  cta: 'Current Plan',
  highlighted: false,
};

const FALLBACK_PLANS: PlanInfo[] = [
  STARTER_PLAN,
  {
    id: 'pro-monthly',
    name: 'Pro',
    price: '$39',
    period: '/month',
    features: [
      'Unlimited property analyses',
      'Full 6-strategy breakdown',
      'DealMaker assumptions editor',
      'Deal Vault (saved properties)',
      'Sale & rental comps',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    highlighted: true,
  },
  {
    id: 'pro-annual',
    name: 'Pro Annual',
    price: '$29',
    period: '/month (billed annually)',
    features: ['Everything in Pro', 'Save $120/year'],
    cta: 'Upgrade to Pro Annual',
    highlighted: false,
  },
];

export default function PricingScreen() {
  const router = useRouter();
  const { isPro } = useSession();
  const refreshUser = useRefreshUser();

  const [plans, setPlans] = useState<PlanInfo[]>(FALLBACK_PLANS);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const offerings = await getOfferings();
        const current = offerings.current;
        if (!current) {
          setLoadingOfferings(false);
          return;
        }
        const loaded: PlanInfo[] = [STARTER_PLAN];
        const monthly = current.monthly;
        const annual = current.annual;

        if (monthly) {
          loaded.push({
            id: 'pro-monthly',
            name: 'Pro',
            price: monthly.product.priceString,
            period: '/month',
            features: FALLBACK_PLANS[1].features,
            cta: 'Upgrade to Pro',
            highlighted: true,
            pkg: monthly,
          });
        }
        if (annual) {
          loaded.push({
            id: 'pro-annual',
            name: 'Pro Annual',
            price: annual.product.priceString,
            period: '/year',
            features: ['Everything in Pro', 'Best value'],
            cta: 'Upgrade to Pro Annual',
            highlighted: !monthly,
            pkg: annual,
          });
        }
        if (loaded.length > 1) setPlans(loaded);
      } catch {
        // use fallback plans
      } finally {
        setLoadingOfferings(false);
      }
    })();
  }, []);

  const handlePurchase = useCallback(async (plan: PlanInfo) => {
    if (!plan.pkg) return;
    setPurchasing(plan.id);
    try {
      await purchasePackage(plan.pkg);
      const info = await getCustomerInfo();
      if (checkIsPro(info)) {
        refreshUser();
        Alert.alert('Welcome to Pro!', 'You now have unlimited access to all DealGapIQ features.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      if (err?.userCancelled) return;
      Alert.alert('Purchase Error', 'Unable to complete purchase. Please try again.');
    } finally {
      setPurchasing(null);
    }
  }, [refreshUser, router]);

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      if (checkIsPro(info)) {
        refreshUser();
        Alert.alert('Restored', 'Your Pro subscription has been restored.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('No Subscription Found', 'No active Pro subscription was found for this account.');
      }
    } catch {
      Alert.alert('Restore Error', 'Unable to restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  }, [refreshUser, router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Pricing</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Upgrade Your Analysis</Text>
          <Text style={styles.heroSubtitle}>
            Unlock the full power of DealGapIQ
          </Text>
        </View>

        {loadingOfferings && (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: spacing.lg }} />
        )}

        {plans.map((plan) => {
          const isCurrentPlan = (isPro && plan.id !== 'starter') || (!isPro && plan.id === 'starter');
          const isDisabled = isCurrentPlan || purchasing !== null;
          const isThisPurchasing = purchasing === plan.id;

          return (
            <Card
              key={plan.id}
              glow={plan.highlighted ? 'active' : 'sm'}
              style={styles.planCard}
            >
              {plan.highlighted && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
              )}
              <Text style={styles.planName}>{plan.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.planPrice}>{plan.price}</Text>
                {plan.period ? (
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                ) : null}
              </View>
              <View style={styles.featureList}>
                {plan.features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Text style={styles.featureCheck}>✓</Text>
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
              <Button
                title={isCurrentPlan ? 'Current Plan' : isThisPurchasing ? 'Processing...' : plan.cta}
                variant={plan.highlighted ? 'primary' : 'secondary'}
                disabled={isDisabled || plan.id === 'starter'}
                loading={isThisPurchasing}
                onPress={() => handlePurchase(plan)}
              />
            </Card>
          );
        })}

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

        <Text style={styles.disclaimer}>
          Payment will be charged to your Apple ID account at confirmation of purchase.
          Subscriptions automatically renew unless canceled at least 24 hours before
          the end of the current period. You can manage and cancel your subscriptions
          by going to your App Store account settings.
        </Text>
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
  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  heroTitle: { ...typography.h1, color: colors.textHeading },
  heroSubtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xs },
  planCard: { padding: spacing.lg, gap: spacing.md },
  popularBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'center',
  },
  popularText: { ...typography.label, color: '#000' },
  planName: { ...typography.h2, color: colors.textHeading, textAlign: 'center' },
  priceRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: 4 },
  planPrice: { fontFamily: fontFamilies.monoBold, fontSize: 36, fontWeight: '700', color: colors.primary },
  planPeriod: { ...typography.bodySmall, color: colors.textSecondary },
  featureList: { gap: spacing.sm },
  featureRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  featureCheck: { color: colors.success, fontSize: 14, marginTop: 2 },
  featureText: { ...typography.bodySmall, color: colors.textBody, flex: 1 },
  restoreRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  restoreText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  disclaimer: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
