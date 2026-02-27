import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/hooks/useSubscription';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

interface ProGateProps {
  children: React.ReactNode;
  feature?: string;
}

/**
 * ProGate — blocks Pro-only features for free users.
 *
 * Wraps content and shows an upgrade CTA if the user is on the free tier.
 * If the user is Pro, renders children transparently.
 */
export function ProGate({ children, feature = 'This feature' }: ProGateProps) {
  const { isPro } = useSubscription();
  const router = useRouter();

  if (isPro) return <>{children}</>;

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="lock-closed" size={28} color={colors.accent} />
      </View>
      <Text style={styles.title}>Pro Feature</Text>
      <Text style={styles.desc}>
        {feature} requires a Pro subscription. Upgrade to unlock unlimited
        analyses, all 6 strategies, Deal Maker, and more.
      </Text>
      <View style={styles.priceRow}>
        <Text style={styles.price}>$29</Text>
        <Text style={styles.priceUnit}>/month</Text>
      </View>
      <Pressable
        style={styles.upgradeBtn}
        onPress={() => router.push('/(protected)/billing')}
      >
        <Ionicons name="diamond" size={16} color={colors.black} />
        <Text style={styles.upgradeBtnText}>Start 7-Day Free Trial</Text>
      </Pressable>
      <Text style={styles.trialNote}>No charge for 7 days. Cancel anytime.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.heading,
  },
  desc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.5,
    maxWidth: 280,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.xs,
  },
  price: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    color: colors.accent,
  },
  priceUnit: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginLeft: 2,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  upgradeBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.black,
  },
  trialNote: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
});
