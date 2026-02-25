/**
 * Pricing Screen
 *
 * Deep-links to the web pricing/checkout flow in an in-app browser.
 * Native IAP is a separate post-launch initiative.
 */

import { ScreenErrorFallback as ErrorBoundary } from '../components/ScreenErrorFallback';
export { ErrorBoundary };

import React, { useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://dealgapiq.com';

export default function PricingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#0d9488';

  const handleViewPricing = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await WebBrowser.openBrowserAsync(`${WEB_APP_URL}/pricing`, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        controlsColor: accentColor,
        toolbarColor: isDark ? '#0f172a' : '#ffffff',
      });
    } catch {
      Linking.openURL(`${WEB_APP_URL}/pricing`);
    }
  }, [isDark]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const tiers = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      features: ['3 property analyses/month', 'Basic IQ Verdict', 'Single strategy'],
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '$29',
      period: '/month',
      features: ['Unlimited analyses', 'All 6 strategies', 'Deal Maker', 'Worksheets', 'Priority support'],
      highlighted: true,
    },
    {
      name: 'Team',
      price: '$79',
      period: '/month',
      features: ['Everything in Pro', 'Team collaboration', 'API access', 'Custom reports'],
      highlighted: false,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={handleBack} style={[styles.backBtn, { backgroundColor: isDark ? '#0f172a' : '#f1f5f9' }]}>
          <Ionicons name="chevron-back" size={20} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>Pricing</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tier Cards */}
      <View style={styles.tiersContainer}>
        {tiers.map((tier) => (
          <View
            key={tier.name}
            style={[
              styles.tierCard,
              {
                backgroundColor: cardBg,
                borderColor: tier.highlighted ? accentColor : borderColor,
                borderWidth: tier.highlighted ? 2 : 1,
              },
            ]}
          >
            {tier.highlighted && (
              <View style={[styles.popularBadge, { backgroundColor: accentColor }]}>
                <Text style={styles.popularText}>MOST POPULAR</Text>
              </View>
            )}
            <Text style={[styles.tierName, { color: textColor }]}>{tier.name}</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.tierPrice, { color: tier.highlighted ? accentColor : textColor }]}>
                {tier.price}
              </Text>
              <Text style={[styles.tierPeriod, { color: mutedColor }]}>{tier.period}</Text>
            </View>
            {tier.features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={accentColor} />
                <Text style={[styles.featureText, { color: textColor }]}>{f}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* CTA */}
      <View style={[styles.ctaContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          onPress={handleViewPricing}
          style={[styles.ctaButton, { backgroundColor: accentColor }]}
          activeOpacity={0.8}
        >
          <Ionicons name="open-outline" size={18} color="#ffffff" />
          <Text style={styles.ctaText}>View Full Pricing & Subscribe</Text>
        </TouchableOpacity>
        <Text style={[styles.ctaSubtext, { color: mutedColor }]}>
          Opens in your browser for secure checkout
        </Text>
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '700' },
  tiersContainer: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  tierCard: {
    borderRadius: 14,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  popularText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  tierName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 12 },
  tierPrice: { fontSize: 28, fontWeight: '800' },
  tierPeriod: { fontSize: 13, marginLeft: 2 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  featureText: { fontSize: 13 },
  ctaContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  ctaSubtext: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
