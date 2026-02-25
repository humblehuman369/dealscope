/**
 * Deal Gap Screen - Visual price ladder with interactive buy price slider
 * Route: /deal-gap/[address]
 * Params: address, price, beds, baths, sqft
 */

import { ScreenErrorFallback as ErrorBoundary } from '../../components/ScreenErrorFallback';
export { ErrorBoundary };

import { GenericSkeleton } from '../../components/Skeleton';
import { useIsOnline } from '../../hooks/useNetworkStatus';
import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';
import { usePropertyAnalysis } from '../../hooks/usePropertyAnalysis';
import type { PropertyData } from '../../types/analytics';
import { isValidAddress, InvalidParamFallback } from '../../hooks/useValidatedParams';

function formatPrice(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

export default function DealGapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    address: string;
    price?: string;
    beds?: string;
    baths?: string;
    sqft?: string;
  }>();

  const { isDark } = useTheme();

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#0d9488';

  const decodedAddress = decodeURIComponent(params.address || '');

  const listPrice = params.price ? parseFloat(params.price) : 350000;
  const bedrooms = params.beds ? parseInt(params.beds, 10) : 3;
  const sqftValue = params.sqft ? parseInt(params.sqft, 10) : 1500;

  const propertyData: PropertyData = useMemo(
    () => ({
      address: decodedAddress || 'Unknown',
      city: 'Unknown',
      state: 'Unknown',
      zipCode: '00000',
      listPrice,
      monthlyRent: 0,
      bedrooms,
      bathrooms: 2,
      sqft: sqftValue || 1500,
    }),
    [decodedAddress, listPrice, bedrooms, sqftValue]
  );

  const analysis = usePropertyAnalysis(propertyData);
  const {
    incomeValue,
    targetPrice,
    dealScore,
    isLoading,
    error,
    refetch,
  } = analysis;

  const [buyPricePercent, setBuyPricePercent] = useState(80);
  const buyPrice = useMemo(
    () => listPrice * (buyPricePercent / 100),
    [listPrice, buyPricePercent]
  );

  const dealGapDollars = listPrice - buyPrice;
  const dealGapPercent = listPrice > 0 ? (dealGapDollars / listPrice) * 100 : 0;

  const estimatedScore = useMemo(() => {
    if (!analysis.raw) return 0;
    const base = dealScore.score;
    if (buyPrice <= targetPrice) {
      return Math.min(100, base + Math.round((targetPrice - buyPrice) / targetPrice * 10));
    }
    if (buyPrice >= incomeValue) {
      return Math.max(0, Math.round(base * 0.4));
    }
    const t = (buyPrice - targetPrice) / (incomeValue - targetPrice);
    return Math.round(base * (1 - t * 0.6));
  }, [buyPrice, targetPrice, incomeValue, dealScore.score, analysis.raw]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const isOnline = useIsOnline();

  if (!isValidAddress(params.address)) return <InvalidParamFallback message="Property not found" />;

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <GenericSkeleton />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: bg }]}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity 
              onPress={handleBack} 
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              accessibilityHint="Returns to the previous screen"
            >
              <Ionicons name="arrow-back" size={24} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: textColor }]} accessibilityRole="header">Deal Gap</Text>
          </View>
          <View style={styles.errorWrap}>
            <Ionicons
              name={!isOnline ? 'cloud-offline-outline' : 'alert-circle-outline'}
              size={48}
              color={!isOnline ? mutedColor : '#ef4444'}
            />
            <Text style={[styles.errorText, { color: textColor }]}>
              {!isOnline ? 'You\'re offline. Connect to analyze this property.' : error}
            </Text>
            <TouchableOpacity 
              style={[styles.retryBtn, { backgroundColor: accentColor }]} 
              onPress={refetch}
              accessibilityRole="button"
              accessibilityLabel="Try again"
              accessibilityHint="Retries loading the deal gap analysis"
            >
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  const priceRungs = [
    { label: 'List Price', price: listPrice, color: mutedColor },
    { label: 'Income Value', price: incomeValue, color: '#f59e0b' },
    { label: 'IQ Target / Buy Price', price: targetPrice, color: accentColor },
  ];

  const maxP = Math.max(listPrice, incomeValue, targetPrice, buyPrice);
  const minP = Math.min(listPrice, incomeValue, targetPrice, buyPrice);
  const range = maxP - minP || 1;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: borderColor }]}>
          <TouchableOpacity 
            onPress={handleBack} 
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            accessibilityHint="Returns to the previous screen"
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]} accessibilityRole="header">Deal Gap</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.address, { color: mutedColor }]} numberOfLines={2}>
            {decodedAddress}
          </Text>

          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.cardTitle, { color: mutedColor }]}>Price Ladder</Text>

            <View style={styles.ladder}>
              {priceRungs.map((rung, i) => {
                const h = Math.max(12, ((rung.price - minP) / range) * 48 + 16);
                return (
                  <View key={rung.label} style={styles.rungRow}>
                    <View
                      style={[
                        styles.rungBar,
                        {
                          height: h,
                          backgroundColor: rung.color + '40',
                          borderColor: rung.color,
                        },
                      ]}
                    />
                    <View style={styles.rungLabels}>
                      <Text style={[styles.rungLabel, { color: textColor }]}>{rung.label}</Text>
                      <Text style={[styles.rungPrice, { color: rung.color }]}>
                        {formatPrice(rung.price)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.cardTitle, { color: mutedColor }]}>Buy Price</Text>
            <Text style={[styles.buyPrice, { color: accentColor }]}>{formatPrice(buyPrice)}</Text>
            <Text style={[styles.buyPriceSub, { color: mutedColor }]}>
              {buyPricePercent}% of list price
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={50}
              maximumValue={100}
              value={buyPricePercent}
              onValueChange={(v) => setBuyPricePercent(Math.round(v))}
              onSlidingComplete={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              minimumTrackTintColor={accentColor}
              maximumTrackTintColor={borderColor}
              thumbTintColor={accentColor}
              accessibilityRole="adjustable"
              accessibilityLabel="Buy price percentage"
              accessibilityHint={`Adjust buy price percentage. Current value is ${buyPricePercent} percent`}
              accessibilityValue={{ min: 50, max: 100, now: buyPricePercent }}
            />
          </View>

          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.cardTitle, { color: mutedColor }]}>Deal Gap (at current buy price)</Text>
            <View style={styles.gapRow}>
              <Text style={[styles.gapValue, { color: accentColor }]}>
                {formatPrice(dealGapDollars)}
              </Text>
              <Text style={[styles.gapPercent, { color: textColor }]}>
                {dealGapPercent.toFixed(1)}% below list
              </Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.cardTitle, { color: mutedColor }]}>Deal Score</Text>
            <View style={styles.scoreRow}>
              <View style={[styles.scoreBadge, { backgroundColor: dealScore.color + '40' }]}>
                <Text style={[styles.scoreGrade, { color: dealScore.color }]}>
                  {dealScore.grade}
                </Text>
              </View>
              <View style={styles.scoreDetails}>
                <Text 
                  style={[styles.scoreValue, { color: textColor }]}
                  accessibilityLabel={`Deal score ${estimatedScore} out of 100, estimated at ${formatPrice(buyPrice)}`}
                >
                  {estimatedScore}/100 (est. at {formatPrice(buyPrice)})
                </Text>
                <Text style={[styles.scoreLabel, { color: mutedColor }]}>
                  {dealScore.label}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 40 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 24 },
  errorText: { fontSize: 16, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  address: { fontSize: 13, marginBottom: 4 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 12 },
  ladder: { gap: 12 },
  rungRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rungBar: {
    width: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  rungLabels: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rungLabel: { fontSize: 14, fontWeight: '500' },
  rungPrice: { fontSize: 15, fontWeight: '700' },
  buyPrice: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  buyPriceSub: { fontSize: 13, marginBottom: 12 },
  slider: { width: '100%', height: 40 },
  gapRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  gapValue: { fontSize: 24, fontWeight: '700' },
  gapPercent: { fontSize: 14 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scoreBadge: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  scoreGrade: { fontSize: 20, fontWeight: '700' },
  scoreDetails: { flex: 1 },
  scoreValue: { fontSize: 16, fontWeight: '600' },
  scoreLabel: { fontSize: 13, marginTop: 2 },
});
