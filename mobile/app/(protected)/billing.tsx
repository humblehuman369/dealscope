import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '@/hooks/useSubscription';
import { useUsage } from '@/hooks/useUsage';
import { GlowCard } from '@/components/ui/GlowCard';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { UsageBar } from '@/components/billing/UsageBar';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';
import type { PurchasesPackage } from 'react-native-purchases';
import { PAYWALL_RESULT } from '@/services/payments';

export default function BillingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    isPro,
    isLifetime,
    offerings,
    expiresDate,
    willRenew,
    purchase,
    restore,
    manageSubscription,
    presentPaywall,
    presentCustomerCenter,
    isPurchasing,
    isRestoring,
    purchaseError,
  } = useSubscription();
  const { searches, saved } = useUsage();

  const [error, setError] = useState('');

  const currentOffering = offerings?.current;
  const monthlyPkg = currentOffering?.monthly;
  const annualPkg = currentOffering?.annual;

  async function handlePurchase(pkg: PurchasesPackage | undefined | null) {
    if (!pkg) {
      Alert.alert('Not Available', 'This plan is not currently available. Please try again later.');
      return;
    }
    setError('');
    try {
      await purchase(pkg);
    } catch (err: any) {
      setError(err.message ?? 'Purchase failed. Please try again.');
    }
  }

  async function handleRestore() {
    setError('');
    try {
      await restore();
    } catch (err: any) {
      setError(err.message ?? 'Restore failed.');
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing['2xl'] },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.heading} />
        </Pressable>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 24 }} />
      </View>

      {error ? <ErrorBanner message={error} /> : null}

      {/* Current status */}
      <GlowCard
        style={styles.statusCard}
        glowColor={isPro ? colors.accent : colors.muted}
        active={isPro}
      >
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusIcon,
              { backgroundColor: isPro ? colors.accent : colors.panel },
            ]}
          >
            <Ionicons
              name={isPro ? 'diamond' : 'person'}
              size={24}
              color={isPro ? colors.black : colors.secondary}
            />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusPlan}>
              {isPro ? 'Pro' : 'Free'} Plan
            </Text>
            <Text style={styles.statusDetail}>
              {isPro
                ? willRenew
                  ? `Renews ${expiresDate ? new Date(expiresDate).toLocaleDateString() : 'soon'}`
                  : `Expires ${expiresDate ? new Date(expiresDate).toLocaleDateString() : 'soon'}`
                : `${searches.remaining} of ${searches.limit} analyses remaining`}
            </Text>
          </View>
        </View>
      </GlowCard>

      {/* Usage bar (free users) */}
      {!isPro && <UsageBar />}

      {/* Plans */}
      {!isPro && (
        <>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>

          {/* Monthly */}
          <PlanCard
            title="Pro Monthly"
            price={monthlyPkg?.product?.priceString ?? '$29'}
            period="/month"
            features={[
              'Unlimited property analyses',
              'All 6 investment strategies',
              'Deal Maker + proforma exports',
              'Unlimited DealVault saves',
              'Priority support',
            ]}
            trial="7-day free trial"
            onPurchase={() => handlePurchase(monthlyPkg)}
            isPurchasing={isPurchasing}
            highlighted
          />

          {/* Annual */}
          <PlanCard
            title="Pro Annual"
            price={annualPkg?.product?.priceString ?? '$290'}
            period="/year"
            features={[
              'Everything in Pro Monthly',
              'Save ~17% vs monthly',
            ]}
            badge="Best Value"
            trial="7-day free trial"
            onPurchase={() => handlePurchase(annualPkg)}
            isPurchasing={isPurchasing}
          />
        </>
      )}

      {/* Feature comparison */}
      <Text style={styles.sectionTitle}>Plan Features</Text>
      <View style={styles.featuresCard}>
        <FeatureRow header label="Feature" free="Free" pro="Pro" />
        <FeatureRow label="Analyses" free={`${searches.limit}/mo`} pro="Unlimited" />
        <FeatureRow label="DealVault" free={`${saved.limit} saved`} pro="Unlimited" />
        <FeatureRow label="Strategies" free="LTR only" pro="All 6" />
        <FeatureRow label="Deal Maker" free="—" pro="✓" isPro />
        <FeatureRow label="Proforma" free="—" pro="✓" isPro />
        <FeatureRow label="LOI Generator" free="—" pro="✓" isPro />
        <FeatureRow label="Priority Support" free="—" pro="✓" isPro />
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        {!isPro && (
          <Button
            title="View Plans & Subscribe"
            onPress={presentPaywall}
          />
        )}
        {isPro && (
          <>
            <Button
              title="Manage Subscription"
              variant="secondary"
              onPress={presentCustomerCenter}
            />
            {!isLifetime && (
              <Pressable onPress={manageSubscription}>
                <Text style={styles.restoreText}>
                  Manage via {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}
                </Text>
              </Pressable>
            )}
          </>
        )}
        <Pressable onPress={handleRestore} disabled={isRestoring}>
          <Text style={styles.restoreText}>
            {isRestoring ? 'Restoring...' : 'Restore Purchases'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Plan card
// ---------------------------------------------------------------------------

function PlanCard({
  title,
  price,
  period,
  features,
  trial,
  badge,
  onPurchase,
  isPurchasing,
  highlighted,
}: {
  title: string;
  price: string;
  period: string;
  features: string[];
  trial?: string;
  badge?: string;
  onPurchase: () => void;
  isPurchasing: boolean;
  highlighted?: boolean;
}) {
  return (
    <GlowCard
      style={styles.planCard}
      active={highlighted}
    >
      {badge && (
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>{badge}</Text>
        </View>
      )}
      <Text style={styles.planTitle}>{title}</Text>
      <View style={styles.priceRow}>
        <Text style={styles.planPrice}>{price}</Text>
        <Text style={styles.planPeriod}>{period}</Text>
      </View>
      {trial && (
        <View style={styles.trialBadge}>
          <Ionicons name="gift-outline" size={14} color={colors.green} />
          <Text style={styles.trialText}>{trial}</Text>
        </View>
      )}
      <View style={styles.featureList}>
        {features.map((f) => (
          <View key={f} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.green} />
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>
      <Button
        title={isPurchasing ? 'Processing...' : 'Start Free Trial'}
        onPress={onPurchase}
        loading={isPurchasing}
        disabled={isPurchasing}
      />
    </GlowCard>
  );
}

// ---------------------------------------------------------------------------
// Feature row
// ---------------------------------------------------------------------------

function FeatureRow({
  label,
  free,
  pro,
  isPro: isProFeature,
  header,
}: {
  label: string;
  free: string;
  pro: string;
  isPro?: boolean;
  header?: boolean;
}) {
  return (
    <View style={[featureStyles.row, header && featureStyles.headerRow]}>
      <Text style={[featureStyles.label, header && featureStyles.headerText]}>
        {label}
      </Text>
      <Text style={[featureStyles.free, header && featureStyles.headerText]}>
        {free}
      </Text>
      <Text
        style={[
          featureStyles.pro,
          header && featureStyles.headerText,
          isProFeature && { color: colors.green },
        ]}
      >
        {pro}
      </Text>
    </View>
  );
}

const featureStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerRow: {
    backgroundColor: colors.panel,
  },
  headerText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: colors.label,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  label: {
    flex: 2,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.body,
  },
  free: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
  },
  pro: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.accent,
    textAlign: 'center',
  },
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.base },
  content: { paddingHorizontal: spacing.md, gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.heading,
  },

  // Status card
  statusCard: { padding: spacing.md },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfo: { flex: 1 },
  statusPlan: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.heading,
  },
  statusDetail: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginTop: 2,
  },

  // Section
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.label,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },

  // Plan card
  planCard: {
    padding: spacing.md,
    gap: spacing.sm,
    position: 'relative',
  },
  planBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  planBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.green,
  },
  planTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.heading,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    color: colors.accent,
  },
  planPeriod: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.secondary,
    marginLeft: 4,
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderRadius: radius.full,
  },
  trialText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.green,
  },
  featureList: {
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.body,
  },

  // Features table
  featuresCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  // Actions
  actionsSection: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  restoreText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
});
