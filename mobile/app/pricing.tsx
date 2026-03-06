import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { colors, cardGlow } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

const PLANS = [
  {
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
  },
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
      'PDF & Excel export',
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
    features: [
      'Everything in Pro',
      'Save $120/year',
    ],
    cta: 'Upgrade to Pro Annual',
    highlighted: false,
  },
] as const;

export default function PricingScreen() {
  const router = useRouter();
  const { isPro } = useSession();

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

        {PLANS.map((plan) => (
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
              title={isPro && plan.id !== 'starter' ? 'Current Plan' : plan.cta}
              variant={plan.highlighted ? 'primary' : 'secondary'}
              disabled={isPro && plan.id !== 'starter'}
              onPress={() => {
                // RevenueCat purchase flow would go here
              }}
            />
          </Card>
        ))}
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
});
