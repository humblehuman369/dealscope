import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { GlowCard } from '@/components/ui/GlowCard';
import { Button } from '@/components/ui/Button';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

export default function BillingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { subscriptionTier, subscriptionStatus } = useAuth();

  const isPro = subscriptionTier === 'pro';

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

      {/* Current plan card */}
      <GlowCard
        style={styles.planCard}
        glowColor={isPro ? colors.accent : colors.muted}
        active={isPro}
      >
        <View style={styles.planHeader}>
          <View
            style={[
              styles.planBadge,
              { backgroundColor: isPro ? colors.accent : colors.panel },
            ]}
          >
            <Ionicons
              name={isPro ? 'diamond' : 'person'}
              size={24}
              color={isPro ? colors.black : colors.secondary}
            />
          </View>
          <View style={styles.planInfo}>
            <Text style={styles.planName}>
              {isPro ? 'Pro' : 'Free'} Plan
            </Text>
            <Text style={styles.planStatus}>
              Status:{' '}
              <Text style={{ color: subscriptionStatus === 'active' ? colors.green : colors.gold }}>
                {subscriptionStatus === 'active' ? 'Active' : subscriptionStatus}
              </Text>
            </Text>
          </View>
        </View>

        {!isPro && (
          <View style={styles.upgradeSection}>
            <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
            <Text style={styles.upgradePrice}>$29/month</Text>
            <Text style={styles.upgradeDesc}>
              Unlimited analyses, DealVault, proforma exports, and priority support.
            </Text>
          </View>
        )}
      </GlowCard>

      {/* Features comparison */}
      <Text style={styles.sectionTitle}>Plan Features</Text>
      <View style={styles.featuresCard}>
        <FeatureRow feature="Property Analyses" free="3 / month" pro="Unlimited" />
        <FeatureRow feature="DealVaultIQ" free="5 saved" pro="Unlimited" />
        <FeatureRow feature="Strategy Deep Dive" free="LTR only" pro="All 6" />
        <FeatureRow feature="Deal Maker" free="—" pro="✓" isPro />
        <FeatureRow feature="Proforma Export" free="—" pro="✓" isPro />
        <FeatureRow feature="LOI Generator" free="—" pro="✓" isPro />
        <FeatureRow feature="Priority Support" free="—" pro="✓" isPro />
      </View>

      {/* CTA */}
      {!isPro && (
        <View style={styles.ctaSection}>
          <Button
            title="Start 7-Day Free Trial"
            onPress={() => {
              // RevenueCat IAP flow will be integrated in Phase 3 payments
            }}
          />
          <Text style={styles.trialNote}>
            No charge for 7 days. Cancel anytime.
          </Text>
        </View>
      )}

      {isPro && (
        <View style={styles.ctaSection}>
          <Button
            title="Manage Subscription"
            variant="secondary"
            onPress={() => {
              // Opens native subscription management
            }}
          />
        </View>
      )}
    </ScrollView>
  );
}

function FeatureRow({
  feature,
  free,
  pro,
  isPro,
}: {
  feature: string;
  free: string;
  pro: string;
  isPro?: boolean;
}) {
  return (
    <View style={featureStyles.row}>
      <Text style={featureStyles.feature}>{feature}</Text>
      <Text style={featureStyles.free}>{free}</Text>
      <Text
        style={[
          featureStyles.pro,
          isPro && { color: colors.green },
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
  feature: {
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

  // Plan card
  planCard: { padding: spacing.lg },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  planBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planInfo: { flex: 1 },
  planName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: colors.heading,
  },
  planStatus: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginTop: 2,
  },
  upgradeSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  upgradeTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.heading,
  },
  upgradePrice: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    color: colors.accent,
    marginTop: spacing.xs,
  },
  upgradeDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginTop: spacing.xs,
    lineHeight: fontSize.sm * 1.5,
  },

  // Features
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.label,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuresCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  // CTA
  ctaSection: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  trialNote: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
});
