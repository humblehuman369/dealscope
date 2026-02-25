/**
 * Billing & Subscription Management
 * Route: /billing
 *
 * Shows current plan, usage stats, upgrade/manage actions,
 * and payment history.
 */

import { ScreenErrorFallback as ErrorBoundary } from '../components/ScreenErrorFallback';
export { ErrorBoundary };

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import { billingService } from '../services/billingService';
import { useSubscription } from '../hooks/useSubscription';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import type {
  SubscriptionResponse,
  UsageResponse,
  PaymentHistoryItem,
} from '../types/billing';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getBarColor(pct: number): string {
  if (pct > 80) return colors.loss.main;
  if (pct > 60) return colors.warning.main;
  return colors.accent[500];
}

export default function BillingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPro } = useSubscription();
  const { isDark } = useTheme();

  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const bg = isDark ? '#0f172a' : '#ffffff';
  const cardBg = isDark ? '#1e293b' : '#f8fafc';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const fetchAll = useCallback(async () => {
    try {
      setError(null);
      const [subRes, usageRes, paymentsRes] = await Promise.all([
        billingService.getSubscription(),
        billingService.getUsage(),
        billingService.getPaymentHistory(10),
      ]);
      setSubscription(subRes);
      setUsage(usageRes);
      setPayments(paymentsRes.payments ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll();
  }, [fetchAll]);

  const handleUpgrade = useCallback(async () => {
    setCheckoutLoading(true);
    try {
      const { plans } = await billingService.getPlans();
      const proPlan = plans.find((p) => p.tier === 'pro');
      const priceId = proPlan?.stripe_price_id_monthly ?? proPlan?.stripe_price_id_yearly;
      if (!priceId) {
        setError('No upgrade plan available');
        return;
      }
      const { checkout_url } = await billingService.createCheckoutSession({
        price_id: priceId,
      });
      await WebBrowser.openBrowserAsync(checkout_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  }, []);

  const handleManageSubscription = useCallback(async () => {
    setPortalLoading(true);
    try {
      const { portal_url } = await billingService.createPortalSession();
      await WebBrowser.openBrowserAsync(portal_url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open portal');
    } finally {
      setPortalLoading(false);
    }
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Billing</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent[500]}
            />
          }
        >
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.accent[500]} />
              <Text style={[styles.loadingText, { color: mutedColor }]}>
                Loading billing...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorWrap}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.loss.main} />
              <Text style={[styles.errorText, { color: colors.loss.main }]}>{error}</Text>
              <TouchableOpacity
                style={[styles.retryButton, { borderColor: colors.accent[500] }]}
                onPress={() => { setLoading(true); fetchAll(); }}
              >
                <Text style={[styles.retryText, { color: colors.accent[500] }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Current Plan */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: mutedColor }]}>
                  Current Plan
                </Text>
                <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                  <View style={styles.planRow}>
                    <View style={[styles.tierBadge, { backgroundColor: isPro ? colors.accent[500] + '20' : colors.gray[400] + '20' }]}>
                      <Text style={[styles.tierText, { color: isPro ? colors.accent[500] : mutedColor }]}>
                        {subscription?.tier === 'pro' ? 'Pro' : 'Free'}
                      </Text>
                    </View>
                    <Text style={[styles.planStatus, { color: mutedColor }]}>
                      {subscription?.status ?? '—'}
                    </Text>
                  </View>
                  {subscription?.cancel_at_period_end && (
                    <Text style={[styles.cancelNote, { color: colors.warning.main }]}>
                      Cancels at end of billing period
                    </Text>
                  )}
                  {subscription?.current_period_end && (
                    <Text style={[styles.periodText, { color: mutedColor }]}>
                      Renews {formatDate(subscription.current_period_end)}
                    </Text>
                  )}
                </View>
              </View>

              {/* Usage */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: mutedColor }]}>
                  Usage
                </Text>
                <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                  {usage && (
                    <>
                      <UsageBar
                        label="Searches"
                        used={usage.searches_used}
                        limit={usage.searches_limit}
                        textColor={textColor}
                        mutedColor={mutedColor}
                      />
                      <View style={[styles.usageDivider, { backgroundColor: borderColor }]} />
                      <UsageBar
                        label="Saved Properties"
                        used={usage.properties_saved}
                        limit={usage.properties_limit}
                        textColor={textColor}
                        mutedColor={mutedColor}
                      />
                      {usage.usage_reset_date && (
                        <Text style={[styles.resetText, { color: mutedColor }]}>
                          Resets {formatDate(usage.usage_reset_date)}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              </View>

              {/* Actions */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: mutedColor }]}>
                  Subscription
                </Text>
                <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                  {!isPro && (
                    <TouchableOpacity
                      style={[styles.primaryButton, checkoutLoading && styles.buttonDisabled]}
                      onPress={handleUpgrade}
                      disabled={checkoutLoading}
                      accessibilityRole="button"
                      accessibilityLabel="Upgrade to Pro"
                    >
                      {checkoutLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="rocket-outline" size={20} color="#fff" />
                          <Text style={styles.primaryButtonText}>Upgrade to Pro</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                  {(isPro || subscription?.stripe_customer_id) && (
                    <TouchableOpacity
                      style={[
                        styles.secondaryButton,
                        { borderColor: colors.accent[500] },
                        portalLoading && styles.buttonDisabled,
                      ]}
                      onPress={handleManageSubscription}
                      disabled={portalLoading}
                      accessibilityRole="button"
                      accessibilityLabel="Manage subscription"
                    >
                      {portalLoading ? (
                        <ActivityIndicator size="small" color={colors.accent[500]} />
                      ) : (
                        <>
                          <Ionicons name="card-outline" size={20} color={colors.accent[500]} />
                          <Text style={[styles.secondaryButtonText, { color: colors.accent[500] }]}>
                            Manage Subscription
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Payment History */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: mutedColor }]}>
                  Payment History
                </Text>
                <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                  {payments.length === 0 ? (
                    <Text style={[styles.emptyText, { color: mutedColor }]}>
                      No payments yet
                    </Text>
                  ) : (
                    payments.map((p, i) => (
                      <View
                        key={p.id}
                        style={[
                          styles.paymentRow,
                          { borderTopColor: borderColor },
                          i === 0 && styles.paymentRowFirst,
                        ]}
                      >
                        <View style={styles.paymentLeft}>
                          <Text style={[styles.paymentDesc, { color: textColor }]}>
                            {p.description ?? 'Payment'}
                          </Text>
                          <Text style={[styles.paymentDate, { color: mutedColor }]}>
                            {formatDate(p.created_at)}
                          </Text>
                        </View>
                        <Text style={[styles.paymentAmount, { color: textColor }]}>
                          {(p.amount / 100).toFixed(2)} {p.currency.toUpperCase()}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </>
  );
}

function UsageBar({
  label,
  used,
  limit,
  textColor,
  mutedColor,
}: {
  label: string;
  used: number;
  limit: number;
  textColor: string;
  mutedColor: string;
}) {
  const pct = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;
  const barColor = getBarColor(pct);

  return (
    <View style={styles.usageBarWrap}>
      <View style={styles.usageBarHeader}>
        <Text style={[styles.usageBarLabel, { color: textColor }]}>{label}</Text>
        <Text style={[styles.usageBarValue, { color: mutedColor }]}>
          {used} / {limit}
        </Text>
      </View>
      <View style={[styles.usageBarTrack, { backgroundColor: mutedColor + '30' }]}>
        <View
          style={[
            styles.usageBarFill,
            {
              width: `${pct}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 24, height: 24 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorWrap: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  errorText: { fontSize: 15, marginTop: 12, textAlign: 'center' },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  retryText: { fontSize: 15, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tierText: { fontSize: 14, fontWeight: '700' },
  planStatus: { fontSize: 13, textTransform: 'capitalize' },
  cancelNote: { fontSize: 13, marginTop: 8 },
  periodText: { fontSize: 12, marginTop: 4 },
  usageBarWrap: { marginBottom: 12 },
  usageDivider: { height: 1, marginVertical: 12 },
  usageBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  usageBarLabel: { fontSize: 14, fontWeight: '600' },
  usageBarValue: { fontSize: 13 },
  usageBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  resetText: { fontSize: 12, marginTop: 8 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  paymentRowFirst: { borderTopWidth: 0 },
  paymentLeft: { flex: 1 },
  paymentDesc: { fontSize: 14, fontWeight: '500' },
  paymentDate: { fontSize: 12, marginTop: 2 },
  paymentAmount: { fontSize: 14, fontWeight: '600' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 16 },
});
