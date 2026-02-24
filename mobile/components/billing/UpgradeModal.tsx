/**
 * UpgradeModal — mobile Stripe checkout flow.
 *
 * Mirrors frontend/src/components/billing/UpgradeModal.tsx.
 * Fetches plans, shows monthly/annual toggle, opens Stripe
 * checkout via expo-web-browser.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { billingService } from '../../services/billingService';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';
import type { PricingPlan } from '../../types/billing';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
}

export function UpgradeModal({ visible, onClose }: UpgradeModalProps) {
  const { isDark } = useTheme();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnnual, setIsAnnual] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError(null);

    billingService
      .getPlans()
      .then((res) => setPlans(res.plans))
      .catch(() => setError('Could not load plans'))
      .finally(() => setLoading(false));
  }, [visible]);

  const proPlan = plans.find((p) => p.tier === 'pro');

  const handleCheckout = async (plan: PricingPlan) => {
    const priceId = isAnnual
      ? plan.stripe_price_id_yearly
      : plan.stripe_price_id_monthly;
    if (!priceId) return;

    setCheckoutLoading(true);
    try {
      const { checkout_url } = await billingService.createCheckoutSession({
        price_id: priceId,
      });
      await WebBrowser.openBrowserAsync(checkout_url);
      onClose();
    } catch {
      setError('Checkout failed. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const bg = isDark ? '#0f172a' : '#ffffff';
  const cardBg = isDark ? '#1e293b' : '#f8fafc';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>
            Upgrade to Pro
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={mutedColor} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary[500]}
              style={{ marginTop: 60 }}
            />
          ) : error ? (
            <Text style={[styles.errorText, { color: '#ef4444' }]}>
              {error}
            </Text>
          ) : proPlan ? (
            <>
              {/* Billing toggle */}
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    !isAnnual && styles.toggleActive,
                    { borderColor },
                  ]}
                  onPress={() => setIsAnnual(false)}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      { color: !isAnnual ? colors.primary[500] : mutedColor },
                    ]}
                  >
                    Monthly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    isAnnual && styles.toggleActive,
                    { borderColor },
                  ]}
                  onPress={() => setIsAnnual(true)}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      { color: isAnnual ? colors.primary[500] : mutedColor },
                    ]}
                  >
                    Annual
                  </Text>
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>Save 20%</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Price */}
              <View style={[styles.priceCard, { backgroundColor: cardBg, borderColor }]}>
                <Text style={[styles.planName, { color: textColor }]}>
                  {proPlan.name}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceAmount, { color: textColor }]}>
                    $
                    {isAnnual
                      ? (proPlan.price_yearly / 100 / 12).toFixed(0)
                      : (proPlan.price_monthly / 100).toFixed(0)}
                  </Text>
                  <Text style={[styles.pricePer, { color: mutedColor }]}>
                    /month
                  </Text>
                </View>
                {isAnnual && (
                  <Text style={[styles.billedNote, { color: mutedColor }]}>
                    Billed ${(proPlan.price_yearly / 100).toFixed(0)} annually
                  </Text>
                )}
              </View>

              {/* Features */}
              <View style={styles.features}>
                {proPlan.features
                  .filter((f) => f.included)
                  .map((feat, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={colors.accent[500]}
                      />
                      <Text style={[styles.featureText, { color: textColor }]}>
                        {feat.name}
                      </Text>
                    </View>
                  ))}
              </View>

              {/* CTA */}
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => handleCheckout(proPlan)}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.ctaText}>Start Pro Plan</Text>
                )}
              </TouchableOpacity>

              <Text style={[styles.guarantee, { color: mutedColor }]}>
                Cancel anytime. 7-day free trial included.
              </Text>
            </>
          ) : (
            <Text style={[styles.errorText, { color: mutedColor }]}>
              No plans available
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  errorText: { fontSize: 14, textAlign: 'center', marginTop: 40 },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 24,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleActive: {
    borderColor: colors.primary[500],
    backgroundColor: 'rgba(4,101,242,0.06)',
  },
  toggleText: { fontSize: 14, fontWeight: '600' },
  saveBadge: {
    backgroundColor: colors.accent[500],
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saveBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  priceCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  planName: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  priceAmount: { fontSize: 48, fontWeight: '800' },
  pricePer: { fontSize: 16, fontWeight: '500', marginLeft: 4 },
  billedNote: { fontSize: 13, marginTop: 4 },
  features: { gap: 12, marginBottom: 28 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, fontWeight: '500', flex: 1 },
  ctaButton: {
    backgroundColor: colors.primary[500],
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  guarantee: { fontSize: 12, textAlign: 'center' },
});
