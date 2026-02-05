import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { colors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { billingService, formatPrice } from '../../services/billingService';
import type {
  PricingPlan,
  SubscriptionResponse,
  UsageResponse,
  PaymentHistoryItem,
} from '../../types';

export default function BillingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, isDark } = useTheme();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [isYearly, setIsYearly] = useState(false);

  // Load data
  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setIsLoading(true);
      const [plansData, subData, usageData, paymentsData] = await Promise.all([
        billingService.getPlans(),
        billingService.getSubscription(),
        billingService.getUsage(),
        billingService.getPaymentHistory(5).catch(() => ({ payments: [], total_count: 0, has_more: false })),
      ]);

      setPlans(plansData.plans);
      setSubscription(subData);
      setUsage(usageData);
      setPayments(paymentsData.payments);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load billing data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlan = async (plan: PricingPlan) => {
    const priceId = isYearly ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly;

    if (!priceId) {
      Alert.alert('Not Available', 'This plan is not currently available for purchase.');
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const response = await billingService.createCheckoutSession({
        price_id: priceId,
      });

      // Open checkout in browser
      await Linking.openURL(response.checkout_url);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start checkout');
    }
  };

  const handleManageSubscription = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const response = await billingService.createPortalSession();
      await Linking.openURL(response.portal_url);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to open billing portal');
    }
  };

  const getUsagePercent = (used: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  // Dynamic styles
  const dynamicStyles = {
    container: { backgroundColor: theme.background },
    header: { backgroundColor: theme.headerBackground, borderBottomColor: theme.headerBorder },
    title: { color: theme.text },
    section: { backgroundColor: theme.card, borderColor: isDark ? colors.primary[700] : colors.primary[200] },
    sectionTitle: { color: theme.sectionTitle },
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, dynamicStyles.container]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, dynamicStyles.title]}>Billing</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Current Plan */}
        {subscription && (
          <View style={styles.sectionWrapper}>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>CURRENT PLAN</Text>
            <View style={[styles.section, dynamicStyles.section]}>
              <View style={styles.currentPlanHeader}>
                <View>
                  <Text style={[styles.planName, { color: theme.text }]}>
                    {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan
                  </Text>
                  <Text style={[styles.planStatus, { color: colors.profit.main }]}>
                    {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                  </Text>
                </View>
                <TouchableOpacity style={styles.manageButton} onPress={handleManageSubscription}>
                  <Text style={styles.manageButtonText}>Manage</Text>
                </TouchableOpacity>
              </View>

              {subscription.current_period_end && (
                <Text style={[styles.renewalText, { color: theme.textMuted }]}>
                  {subscription.cancel_at_period_end
                    ? `Expires on ${new Date(subscription.current_period_end).toLocaleDateString()}`
                    : `Renews on ${new Date(subscription.current_period_end).toLocaleDateString()}`}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Usage */}
        {usage && (
          <View style={styles.sectionWrapper}>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>USAGE THIS PERIOD</Text>
            <View style={[styles.section, dynamicStyles.section]}>
              <UsageMeter
                label="Properties"
                used={usage.properties_saved}
                limit={usage.properties_limit}
                theme={theme}
                isDark={isDark}
              />
              <UsageMeter
                label="Searches"
                used={usage.searches_used}
                limit={usage.searches_limit}
                theme={theme}
                isDark={isDark}
              />
              <UsageMeter
                label="API Calls"
                used={usage.api_calls_used}
                limit={usage.api_calls_limit}
                theme={theme}
                isDark={isDark}
              />
              {usage.days_until_reset && (
                <Text style={[styles.resetText, { color: theme.textMuted }]}>
                  Resets in {usage.days_until_reset} days
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Plans */}
        <View style={styles.sectionWrapper}>
          <View style={styles.plansHeader}>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>AVAILABLE PLANS</Text>
            <View style={styles.billingToggle}>
              <TouchableOpacity
                style={[styles.toggleOption, !isYearly && styles.toggleOptionActive]}
                onPress={() => setIsYearly(false)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: !isYearly ? colors.primary[isDark ? 300 : 600] : theme.textMuted },
                  ]}
                >
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleOption, isYearly && styles.toggleOptionActive]}
                onPress={() => setIsYearly(true)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: isYearly ? colors.primary[isDark ? 300 : 600] : theme.textMuted },
                  ]}
                >
                  Yearly (Save 20%)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isYearly={isYearly}
              isCurrentPlan={subscription?.tier === plan.tier}
              onSelect={() => handleSelectPlan(plan)}
              theme={theme}
              isDark={isDark}
            />
          ))}
        </View>

        {/* Recent Payments */}
        {payments.length > 0 && (
          <View style={styles.sectionWrapper}>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>RECENT PAYMENTS</Text>
            <View style={[styles.section, dynamicStyles.section]}>
              {payments.map((payment) => (
                <View key={payment.id} style={styles.paymentItem}>
                  <View>
                    <Text style={[styles.paymentAmount, { color: theme.text }]}>
                      {formatPrice(payment.amount)}
                    </Text>
                    <Text style={[styles.paymentDate, { color: theme.textMuted }]}>
                      {new Date(payment.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.paymentStatus,
                      { color: payment.status === 'succeeded' ? colors.profit.main : colors.warning.main },
                    ]}
                  >
                    {payment.status}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

interface UsageMeterProps {
  label: string;
  used: number;
  limit: number;
  theme: any;
  isDark: boolean;
}

function UsageMeter({ label, used, limit, theme, isDark }: UsageMeterProps) {
  const percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isOverLimit = used >= limit && limit > 0;

  return (
    <View style={styles.usageMeter}>
      <View style={styles.usageHeader}>
        <Text style={[styles.usageLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.usageCount, { color: theme.textSecondary }]}>
          {used.toLocaleString()} / {limit === -1 ? '∞' : limit.toLocaleString()}
        </Text>
      </View>
      <View style={[styles.usageBar, { backgroundColor: isDark ? colors.navy[700] : colors.gray[200] }]}>
        <View
          style={[
            styles.usageBarFill,
            {
              width: `${percent}%`,
              backgroundColor: isOverLimit ? colors.loss.main : colors.primary[500],
            },
          ]}
        />
      </View>
    </View>
  );
}

interface PlanCardProps {
  plan: PricingPlan;
  isYearly: boolean;
  isCurrentPlan: boolean;
  onSelect: () => void;
  theme: any;
  isDark: boolean;
}

function PlanCard({ plan, isYearly, isCurrentPlan, onSelect, theme, isDark }: PlanCardProps) {
  const price = isYearly ? plan.price_yearly / 12 : plan.price_monthly;

  return (
    <View
      style={[
        styles.planCard,
        {
          backgroundColor: theme.card,
          borderColor: plan.is_popular
            ? colors.primary[500]
            : isDark
            ? colors.primary[700]
            : colors.primary[200],
          borderWidth: plan.is_popular ? 2 : 1.5,
        },
      ]}
    >
      {plan.is_popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>Most Popular</Text>
        </View>
      )}

      <View style={styles.planHeader}>
        <Text style={[styles.planCardName, { color: theme.text }]}>{plan.name}</Text>
        <Text style={[styles.planPrice, { color: theme.text }]}>
          ${(price / 100).toFixed(0)}
          <Text style={[styles.planPriceUnit, { color: theme.textMuted }]}>/mo</Text>
        </Text>
      </View>

      <Text style={[styles.planDescription, { color: theme.textMuted }]}>{plan.description}</Text>

      <View style={styles.planFeatures}>
        {plan.features.slice(0, 4).map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Ionicons
              name={feature.included ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={feature.included ? colors.profit.main : theme.textMuted}
            />
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>{feature.name}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.selectButton,
          isCurrentPlan && styles.selectButtonDisabled,
          { backgroundColor: isCurrentPlan ? theme.backgroundTertiary : colors.primary[600] },
        ]}
        onPress={onSelect}
        disabled={isCurrentPlan}
      >
        <Text style={[styles.selectButtonText, { color: isCurrentPlan ? theme.textMuted : '#fff' }]}>
          {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8, marginLeft: -8 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  headerSpacer: { width: 40 },
  content: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  sectionWrapper: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  section: { borderRadius: 16, borderWidth: 1.5, padding: 16 },
  currentPlanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { fontSize: 18, fontWeight: '600' },
  planStatus: { fontSize: 13, marginTop: 4 },
  manageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary[600],
  },
  manageButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  renewalText: { fontSize: 13, marginTop: 12 },
  usageMeter: { marginBottom: 16 },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  usageLabel: { fontSize: 14, fontWeight: '500' },
  usageCount: { fontSize: 13 },
  usageBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  usageBarFill: { height: '100%', borderRadius: 4 },
  resetText: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  plansHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  billingToggle: { flexDirection: 'row', gap: 8 },
  toggleOption: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  toggleOptionActive: { backgroundColor: colors.primary[100] },
  toggleText: { fontSize: 12, fontWeight: '500' },
  planCard: { borderRadius: 16, padding: 16, marginBottom: 12, position: 'relative' },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: colors.primary[600],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  planCardName: { fontSize: 18, fontWeight: '600' },
  planPrice: { fontSize: 24, fontWeight: '700' },
  planPriceUnit: { fontSize: 14, fontWeight: '400' },
  planDescription: { fontSize: 13, marginBottom: 16 },
  planFeatures: { marginBottom: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  featureText: { fontSize: 13 },
  selectButton: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  selectButtonDisabled: {},
  selectButtonText: { fontSize: 15, fontWeight: '600' },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  paymentAmount: { fontSize: 15, fontWeight: '600' },
  paymentDate: { fontSize: 12, marginTop: 2 },
  paymentStatus: { fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
});
