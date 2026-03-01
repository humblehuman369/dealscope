import { useState } from 'react';
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
 * Renders children transparently for Pro users (including trial and grace period).
 * Shows upgrade CTA with restore option for free users and refunded/expired users.
 */
export function ProGate({ children, feature = 'This feature' }: ProGateProps) {
  const {
    isPro,
    isTrial,
    trialExpiringSoon,
    cancelledButActive,
    inGracePeriod,
    wasRefunded,
    restore,
    isRestoring,
    expiresDate,
    presentPaywall,
  } = useSubscription();
  const router = useRouter();
  const [showingPaywall, setShowingPaywall] = useState(false);

  const handleUpgrade = async () => {
    setShowingPaywall(true);
    try {
      await presentPaywall();
    } finally {
      setShowingPaywall(false);
    }
  };

  // Pro users (trial, paid, or grace) see the content
  if (isPro) {
    return (
      <View style={{ flex: 1 }}>
        {/* Trial expiring banner */}
        {trialExpiringSoon && (
          <Pressable
            style={styles.trialBanner}
            onPress={() => router.push('/(protected)/billing')}
          >
            <Ionicons name="time-outline" size={16} color={colors.gold} />
            <Text style={styles.trialBannerText}>
              Your trial expires soon — upgrade to keep Pro access
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.gold} />
          </Pressable>
        )}

        {/* Grace period banner */}
        {inGracePeriod && (
          <View style={styles.graceBanner}>
            <Ionicons name="warning-outline" size={16} color={colors.orange} />
            <Text style={styles.graceBannerText}>
              Payment issue detected. Update your payment method to avoid losing access.
            </Text>
          </View>
        )}

        {/* Cancelled-but-active notice */}
        {cancelledButActive && expiresDate && (
          <Pressable
            style={styles.cancelledBanner}
            onPress={() => router.push('/(protected)/billing')}
          >
            <Ionicons name="information-circle-outline" size={16} color={colors.secondary} />
            <Text style={styles.cancelledBannerText}>
              Pro access until {new Date(expiresDate).toLocaleDateString()}
            </Text>
          </Pressable>
        )}

        {children}
      </View>
    );
  }

  // Refunded state
  if (wasRefunded) {
    return (
      <View style={styles.container}>
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(248, 113, 113, 0.12)' }]}>
          <Ionicons name="alert-circle" size={28} color={colors.red} />
        </View>
        <Text style={styles.title}>Subscription Refunded</Text>
        <Text style={styles.desc}>
          Your Pro subscription was refunded. Re-subscribe to regain access to
          {' '}{feature.toLowerCase()}.
        </Text>
        <Pressable
          style={styles.upgradeBtn}
          onPress={handleUpgrade}
          disabled={showingPaywall}
        >
          <Ionicons name="diamond" size={16} color={colors.black} />
          <Text style={styles.upgradeBtnText}>Re-subscribe</Text>
        </Pressable>
        <RestoreButton restore={restore} isRestoring={isRestoring} />
      </View>
    );
  }

  // Standard free-tier gate
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
        onPress={handleUpgrade}
        disabled={showingPaywall}
      >
        <Ionicons name="diamond" size={16} color={colors.black} />
        <Text style={styles.upgradeBtnText}>Start 7-Day Free Trial</Text>
      </Pressable>
      <Text style={styles.trialNote}>No charge for 7 days. Cancel anytime.</Text>
      <RestoreButton restore={restore} isRestoring={isRestoring} />
    </View>
  );
}

function RestoreButton({
  restore,
  isRestoring,
}: {
  restore: () => Promise<unknown>;
  isRestoring: boolean;
}) {
  return (
    <Pressable
      onPress={() => restore()}
      disabled={isRestoring}
      style={styles.restoreBtn}
    >
      <Text style={styles.restoreText}>
        {isRestoring ? 'Restoring...' : 'Already subscribed? Restore purchases'}
      </Text>
    </Pressable>
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
  restoreBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  restoreText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.secondary,
    textDecorationLine: 'underline',
  },

  // Banners (shown inside Pro content)
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 191, 36, 0.2)',
  },
  trialBannerText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.gold,
  },
  graceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 146, 60, 0.2)',
  },
  graceBannerText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.orange,
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.panel,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelledBannerText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.secondary,
  },
});
