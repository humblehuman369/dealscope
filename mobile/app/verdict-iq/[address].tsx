/**
 * VerdictIQ Screen — Decision-Grade UI (Page 1 of 2)
 * Route: /verdict-iq/[address]
 * 
 * Shows the verdict score, price targets, market snapshot, and CTA to StrategyIQ.
 * Financial breakdown, benchmarks, and data quality live on the StrategyIQ page.
 * 
 * Design: VerdictIQ 3.3 — True black base, Inter typography, Slate text hierarchy
 */

import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ScreenErrorFallback as ErrorBoundary } from '../../components/ScreenErrorFallback';
export { ErrorBoundary };

import { VerdictSkeleton } from '../../components/Skeleton';
import { useIsOnline } from '../../hooks/useNetworkStatus';
import { buildVerdictShareUrl } from '../../hooks/useDeepLinking';
import { verdictDark } from '../../theme/colors';
import { verdictTypography } from '../../theme/textStyles';
import {
  PropertyContextData,
  VerdictHero,
  SignalIndicator,
  InvestmentAnalysis,
  IQPriceId,
  IQPriceOption,
  MetricData,
  MarketSnapshot,
  MarketTile,
  BeginnerTip,
  PriceScale,
  VerdictCTA,
  TrustStrip,
  VerdictFooter,
  rf,
  rs,
} from '../../components/verdict-iq';
import { usePropertyAnalysis, IQVerdictResponse } from '../../hooks/usePropertyAnalysis';
import { PropertyData } from '../../types/analytics';
import { useAddPortfolioProperty } from '../../hooks/useDatabase';

// =============================================================================
// CONSTANTS
// =============================================================================

const STRATEGIES = [
  'Long-term Rental',
  'Short-term Rental',
  'BRRRR',
  'Fix & Flip',
  'House Hack',
  'Wholesale',
];

// =============================================================================
// HELPERS
// =============================================================================

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${Math.round(value).toLocaleString()}`;
  }
  return `$${Math.round(value)}`;
}

function formatCurrencyCompact(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

function getColorFromScore(score: number): 'teal' | 'amber' | 'negative' {
  if (score >= 60) return 'teal';
  if (score >= 40) return 'amber';
  return 'negative';
}

function buildIQPrices(
  incomeValue: number,
  targetPrice: number,
  listPrice: number,
  /** When backend provides wholesale/MAO price, pass it here to avoid local formula */
  wholesalePriceFromApi?: number
): IQPriceOption[] {
  const wholesalePrice =
    wholesalePriceFromApi != null && wholesalePriceFromApi > 0
      ? Math.round(wholesalePriceFromApi)
      : Math.round(targetPrice * 0.70);
  return [
    { id: 'breakeven', label: 'INCOME VALUE', value: incomeValue, subtitle: 'Max price for $0 cashflow' },
    { id: 'target', label: 'TARGET BUY', value: targetPrice, subtitle: 'Positive Cashflow' },
    { id: 'wholesale', label: 'WHOLESALE', value: wholesalePrice, subtitle: '30% net discount for assignment' },
  ];
}

function buildMetricsFromAPI(
  raw: IQVerdictResponse | null,
  targetPrice: number,
  downPaymentPct: number = 0.20,
  closingCostsPct: number = 0.03
): MetricData[] {
  const cashNeeded = Math.round(targetPrice * (downPaymentPct + closingCostsPct));
  if (!raw || !raw.returnFactors) {
    return [
      { label: 'CASH FLOW', value: '—' },
      { label: 'CASH NEEDED', value: formatCurrencyCompact(cashNeeded) },
      { label: 'CAP RATE', value: '—' },
    ];
  }
  const monthlyCashFlow = raw.strategies[0]?.monthlyCashFlow ?? 0;
  const capRate = raw.returnFactors.capRate ?? 0;
  return [
    { label: 'CASH FLOW', value: `$${Math.round(monthlyCashFlow)}/mo` },
    { label: 'CASH NEEDED', value: formatCurrencyCompact(cashNeeded) },
    { label: 'CAP RATE', value: `${Number(capRate).toFixed(1)}%` },
  ];
}

/** Deal Gap label uses the actual gap percentage, not the component score. */
function dealGapLabel(gapPct: number): string {
  if (gapPct <= 5)  return 'Minimal';
  if (gapPct <= 15) return 'Mild';
  if (gapPct <= 25) return 'Moderate';
  if (gapPct <= 35) return 'Large';
  return 'Excessive';
}

/** Per-component label functions — each uses language appropriate to its domain. */
const COMPONENT_LABELS: Record<string, (v: number) => string> = {
  'Return Quality':   v => v >= 75 ? 'Excellent' : v >= 55 ? 'Strong' : v >= 40 ? 'Good' : v >= 20 ? 'Fair' : 'Weak',
  'Market Alignment': v => v >= 75 ? 'Strong' : v >= 55 ? 'Favorable' : v >= 40 ? 'Neutral' : v >= 20 ? 'Weak' : 'Misaligned',
  'Deal Probability': v => v >= 75 ? 'Highly Probable' : v >= 55 ? 'Probable' : v >= 40 ? 'Possible' : v >= 20 ? 'Unlikely' : 'Improbable',
};

function componentLabel(v: number, componentName?: string): string {
  const labelFn = componentName ? COMPONENT_LABELS[componentName] : undefined;
  return labelFn ? labelFn(v) : COMPONENT_LABELS['Return Quality'](v);
}

function buildConfidenceMetrics(raw: IQVerdictResponse | null): Array<{ label: string; value: number; qualLabel: string; color: 'teal' | 'amber' | 'negative' }> {
  if (!raw) {
    return [
      { label: 'Deal Gap', value: 0, qualLabel: '—', color: 'negative' },
      { label: 'Return Quality', value: 0, qualLabel: '—', color: 'negative' },
      { label: 'Market Alignment', value: 0, qualLabel: '—', color: 'negative' },
      { label: 'Deal Probability', value: 0, qualLabel: '—', color: 'negative' },
    ];
  }
  const cs = raw.componentScores;
  const dealGapScore = cs?.dealGapScore ?? 0;
  const dealGapPct = Math.max(0, raw.opportunityFactors?.dealGap ?? 0);
  const returnQuality = cs?.returnQualityScore ?? 0;
  const marketAlignment = cs?.marketAlignmentScore ?? 0;
  const dealProbability = cs?.dealProbabilityScore ?? 0;
  return [
    { label: 'Deal Gap', value: dealGapScore, qualLabel: dealGapLabel(dealGapPct), color: getColorFromScore(dealGapScore) },
    { label: 'Return Quality', value: returnQuality, qualLabel: componentLabel(returnQuality, 'Return Quality'), color: getColorFromScore(returnQuality) },
    { label: 'Market Alignment', value: marketAlignment, qualLabel: componentLabel(marketAlignment, 'Market Alignment'), color: getColorFromScore(marketAlignment) },
    { label: 'Deal Probability', value: dealProbability, qualLabel: componentLabel(dealProbability, 'Deal Probability'), color: getColorFromScore(dealProbability) },
  ];
}

function buildSignalIndicators(
  raw: IQVerdictResponse | null,
  discountPercent: number
): SignalIndicator[] {
  // Only include signals backed by real API data — no hardcoded values
  if (!raw || !raw.opportunityFactors) {
    return [
      { label: 'DEAL GAP', value: '—', status: 'N/A', color: 'negative' },
      { label: 'URGENCY', value: '—', status: 'N/A', color: 'amber' },
      { label: 'MARKET', value: '—', status: 'N/A', color: 'amber' },
    ];
  }
  const { dealGap, motivation, motivationLabel, buyerMarket } = raw.opportunityFactors;
  const gapValue = `${dealGap > 0 ? '+' : ''}${dealGap.toFixed(1)}%`;
  const gapColor: 'teal' | 'amber' | 'negative' = dealGap >= 0 ? 'teal' : (dealGap >= -15 ? 'amber' : 'negative');
  const gapStatus = dealGap >= 0 ? 'Favorable' : (dealGap >= -15 ? 'Moderate' : 'Difficult');
  const urgencyColor: 'teal' | 'amber' | 'negative' = motivation >= 70 ? 'teal' : (motivation >= 40 ? 'amber' : 'negative');
  const urgencyLabel = motivation >= 70 ? 'High' : (motivation >= 40 ? 'Medium' : 'Low');
  const marketLabel = buyerMarket || 'Warm';
  const marketColor: 'teal' | 'amber' | 'negative' = marketLabel === 'Hot' || marketLabel === 'Warm' ? 'teal' : (marketLabel === 'Cool' ? 'amber' : 'negative');
  return [
    { label: 'DEAL GAP', value: gapValue, status: gapStatus, color: gapColor },
    { label: 'URGENCY', value: urgencyLabel, status: `${Math.round(motivation)}/100`, color: urgencyColor },
    { label: 'MARKET', value: marketLabel, status: motivationLabel || 'Active', color: marketColor },
  ];
}

function buildMarketTiles(indicators: SignalIndicator[]): MarketTile[] {
  // Only real API-sourced signals — vacancy removed (no reliable data source)
  const colorMap: Record<string, 'red' | 'gold' | 'teal' | 'green'> = {
    negative: 'red',
    amber: 'gold',
    teal: 'teal',
  };
  return [
    {
      label: 'Deal Gap',
      subLabel: indicators[0]?.status ?? 'N/A',
      value: indicators[0]?.value ?? '—',
      color: colorMap[indicators[0]?.color ?? 'amber'] ?? 'gold',
    },
    {
      label: 'Urgency',
      subLabel: indicators[1]?.status ?? 'N/A',
      value: indicators[1]?.value ?? '—',
      color: colorMap[indicators[1]?.color ?? 'amber'] ?? 'gold',
    },
    {
      label: 'Market',
      subLabel: indicators[2]?.status ?? 'N/A',
      value: indicators[2]?.value ?? '—',
      color: colorMap[indicators[2]?.color ?? 'teal'] ?? 'teal',
    },
  ];
}

// =============================================================================
// SCREEN
// =============================================================================

export default function VerdictIQScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    address, lat, lng, price, beds, baths, sqft, rent,
    city, state, zip, status, image,
  } = useLocalSearchParams<{
    address: string; lat?: string; lng?: string; price?: string;
    beds?: string; baths?: string; sqft?: string; rent?: string;
    city?: string; state?: string; zip?: string; status?: string; image?: string;
  }>();

  const isOnline = useIsOnline();
  const [currentStrategy, setCurrentStrategy] = useState('Long-term Rental');
  const [selectedIQPrice, setSelectedIQPrice] = useState<IQPriceId>('target');
  const [isSaved, setIsSaved] = useState(false);
  const addToPortfolio = useAddPortfolioProperty();

  const decodedAddress = decodeURIComponent(address || '');
  const listPrice = price ? parseFloat(price) : 350000;
  const bedroomCount = beds ? parseInt(beds, 10) : 3;
  const bathroomCount = baths ? parseFloat(baths) : 2;
  const sqftValue = sqft ? parseInt(sqft, 10) : 1500;
  const monthlyRent = rent ? parseFloat(rent) : 0;
  const propertyTaxes = Math.round(listPrice * 0.012);
  const insurance = Math.round(1500 + sqftValue * 3);

  const propertyData = useMemo((): PropertyData => ({
    address: decodedAddress || 'Unknown Address',
    city: city || 'Unknown',
    state: state || 'FL',
    zipCode: zip || '00000',
    listPrice,
    monthlyRent,
    propertyTaxes,
    insurance,
    bedrooms: bedroomCount,
    bathrooms: bathroomCount,
    sqft: sqftValue,
    arv: Math.round(listPrice * 1.2),
    averageDailyRate: 195,
    occupancyRate: 0.72,
    photos: image ? [image] : [],
    photoCount: 1,
  }), [decodedAddress, city, state, zip, listPrice, monthlyRent, propertyTaxes, insurance, bedroomCount, bathroomCount, sqftValue, image]);

  const analysisResult = usePropertyAnalysis(propertyData);
  const { raw, targetPrice, incomeValue, discountPercent, dealScore, isLoading, error } = analysisResult;

  const marketPrice = raw?.listPrice ?? listPrice;

  const property: PropertyContextData = useMemo(() => ({
    street: decodedAddress || 'Unknown Address',
    city: city || 'Unknown',
    state: state || 'FL',
    zip: zip || '00000',
    beds: bedroomCount,
    baths: bathroomCount,
    sqft: sqftValue,
    price: marketPrice,
    status: (status as 'active' | 'pending' | 'off-market') || 'off-market',
    image: image || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&h=150&fit=crop',
  }), [decodedAddress, city, state, zip, bedroomCount, bathroomCount, sqftValue, marketPrice, status, image]);

  // Derived data — use backend list_price and wholesale_mao when available
  const wholesaleMao = analysisResult.wholesaleMao ?? raw?.wholesaleMao;
  const iqPrices = useMemo(
    () => buildIQPrices(incomeValue, targetPrice, marketPrice, wholesaleMao),
    [incomeValue, targetPrice, marketPrice, wholesaleMao]
  );
  const metrics = useMemo(() => buildMetricsFromAPI(raw, targetPrice), [raw, targetPrice]);
  const confidenceMetrics = useMemo(() => buildConfidenceMetrics(raw), [raw]);
  const signalIndicators = useMemo(() => buildSignalIndicators(raw, discountPercent), [raw, discountPercent]);
  const marketTiles = useMemo(() => buildMarketTiles(signalIndicators), [signalIndicators]);

  // Handlers
  const handleIQPriceChange = useCallback((id: IQPriceId) => {
    setSelectedIQPrice(id);
  }, []);

  const handleStrategyChange = useCallback((strategy: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStrategy(strategy);
  }, []);

  const handleChangeTerms = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Adjust Terms', 'Opens financing terms adjustment modal');
  }, []);

  const handleHowCalculated = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'How Income Value is Calculated',
      'Income value is the maximum purchase price that results in $0 monthly cashflow after all expenses.',
      [{ text: 'Got it' }]
    );
  }, []);

  const handleShare = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const url = buildVerdictShareUrl(decodedAddress, {
      price: marketPrice,
      beds: bedroomCount,
      baths: bathroomCount,
      sqft: sqftValue,
      city: city || undefined,
      state: state || undefined,
    });
    try {
      await Share.share({
        message: `Check out this investment property on DealGapIQ:\n${decodedAddress}\n\n${url}`,
        url, // iOS uses this for the share sheet preview
        title: `DealGapIQ — ${decodedAddress}`,
      });
    } catch {
      // user cancelled
    }
  }, [decodedAddress, marketPrice, bedroomCount, bathroomCount, sqftValue, city, state]);

  const handleSaveToPortfolio = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addToPortfolio.mutate({
      address: decodedAddress,
      city: city || null,
      state: state || null,
      zip: zip || null,
      purchasePrice: listPrice,
      purchaseDate: Math.floor(Date.now() / 1000),
      strategy: 'long_term_rental',
      propertyData: propertyData as any,
    }, {
      onSuccess: () => {
        setIsSaved(true);
        Alert.alert('Saved to Portfolio', `${decodedAddress} has been added to your portfolio.`);
      },
      onError: () => {
        Alert.alert('Save Failed', 'Could not save to portfolio. Please try again.');
      },
    });
  }, [decodedAddress, city, state, zip, listPrice, propertyData, addToPortfolio]);

  const handleHowVerdictWorks = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'How Verdict Score Works',
      'Your Verdict Score (5–95) is a weighted composite of four factors:\n\n• Deal Gap (35%) — How favorably priced vs income value\n• Return Quality (30%) — Best strategy\'s financial returns\n• Market Alignment (20%) — Seller motivation & market conditions\n• Deal Probability (15%) — Likelihood of closing at target price\n\nNo property scores 100 — every deal carries risk.',
      [{ text: 'Got it' }]
    );
  }, []);

  const navigateToStrategy = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: '/strategy-iq/[address]',
      params: {
        address: property.street,
        price: String(property.price),
        beds: String(property.beds),
        baths: String(property.baths),
        sqft: String(property.sqft),
        rent: String(monthlyRent),
        city: property.city,
        state: property.state,
        zip: property.zip,
        status: property.status,
        image: property.image,
        lat, lng,
      },
    });
  }, [router, property, monthlyRent, lat, lng]);

  // Loading — show skeleton instead of spinner
  if (isLoading && !raw) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <VerdictSkeleton />
      </>
    );
  }

  // Error — differentiate offline vs server error
  if (error && !raw) {
    const isOffline = !isOnline;
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
          <Ionicons
            name={isOffline ? 'cloud-offline-outline' : 'alert-circle-outline'}
            size={48}
            color={isOffline ? verdictDark.textSecondary : verdictDark.red}
          />
          <Text style={styles.errorText}>
            {isOffline ? 'You\'re Offline' : 'Unable to analyze property'}
          </Text>
          <Text style={styles.errorSub}>
            {isOffline
              ? 'Connect to the internet to analyze this property.'
              : error}
          </Text>
          <TouchableOpacity 
            style={styles.retryBtn} 
            onPress={() => analysisResult.refetch()}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            accessibilityHint="Retries the property analysis"
          >
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Nav */}
        <View style={styles.nav}>
          <Text style={styles.logo}>
            Invest<Text style={styles.logoIQ}>IQ</Text>
          </Text>
          <View style={styles.navRight}>
            <TouchableOpacity 
              onPress={() => router.push('/search')}
              accessibilityRole="button"
              accessibilityLabel="Search"
              accessibilityHint="Opens the search screen"
            >
              <Ionicons name="search-outline" size={rf(21)} color={verdictDark.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Profile"
              accessibilityHint="Opens your profile"
            >
              <Ionicons name="person-outline" size={rf(21)} color={verdictDark.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Address Strip */}
        <View style={styles.addressStrip}>
          <View style={styles.addressLeft}>
            <Ionicons name="home-outline" size={rf(16)} color={verdictDark.blue} />
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.addressText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{property.street}</Text>
              <Text style={styles.addressDetails} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                {property.beds} bed · {property.baths} bath · {property.sqft.toLocaleString()} sqft · Listed {formatCurrency(property.price)}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Share analysis"
              accessibilityHint="Shares this property analysis"
            >
              <Ionicons name="share-outline" size={rf(14)} color={verdictDark.textBody} />
              <Text style={styles.saveBtnText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveBtn}
              onPress={handleSaveToPortfolio}
              accessibilityRole="button"
              accessibilityLabel="Save property to portfolio"
              accessibilityHint="Saves this property to your portfolio"
            >
              <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={rf(14)} color={isSaved ? verdictDark.blue : verdictDark.textBody} />
              <Text style={[styles.saveBtnText, isSaved && { color: verdictDark.blue }]}>{isSaved ? 'Saved' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Verdict Hero */}
          <VerdictHero
            score={dealScore.score}
            verdictLabel={dealScore.label || 'Analyzing...'}
            verdictSubtitle={raw?.verdictDescription || 'Calculating deal metrics...'}
            confidenceMetrics={confidenceMetrics}
            signalIndicators={signalIndicators}
            onHowItWorksPress={handleHowVerdictWorks}
          />

          {/* Price Targets */}
          <View style={styles.zonesSection}>
            <Text style={styles.sectionLabel}>PRICE TARGETS</Text>
            <Text style={styles.zonesTitle} accessibilityRole="header">What Should You Pay?</Text>
            <Text style={styles.zonesSub}>
              Every investment property has three price levels. These tell you exactly when a deal starts making money.
            </Text>

            <InvestmentAnalysis
              financingTerms="20% down, 6.0%"
              currentStrategy={currentStrategy}
              strategies={STRATEGIES}
              iqPrices={iqPrices}
              selectedIQPrice={selectedIQPrice}
              onIQPriceChange={handleIQPriceChange}
              metrics={metrics}
              onChangeTerms={handleChangeTerms}
              onStrategyChange={handleStrategyChange}
              onHowCalculated={handleHowCalculated}
            />

            {/* Price Scale — data-driven positions */}
            <View style={styles.scaleWrap}>
              {(() => {
                const wholesalePrice = iqPrices.find((p) => p.id === 'wholesale')?.value ?? targetPrice * 0.70;
                const scaleMin = wholesalePrice * 0.95;
                const scaleMax = Math.max(marketPrice * 1.08, incomeValue * 1.05);
                const range = scaleMax - scaleMin;
                const clamp = (v: number) => Math.min(0.96, Math.max(0.04, (v - scaleMin) / range));
                return (
                  <PriceScale
                    askingPriceLabel={formatCurrency(marketPrice)}
                    targetPosition={clamp(targetPrice)}
                    askingPosition={clamp(marketPrice)}
                    labels={['Wholesale', 'Profit Entry', 'Income Value', 'Asking ▶']}
                    termsNote="20% down · 6.0% rate · 30-year term"
                  />
                );
              })()}
            </View>
          </View>

          {/* Market Snapshot */}
          <MarketSnapshot tiles={marketTiles} />

          {/* Beginner Tip — dynamic based on actual score */}
          <BeginnerTip
            body={
              dealScore.score >= 70
                ? `A VerdictIQ score of ${dealScore.score} means the numbers work at or near asking price. This property looks strong — run the strategy breakdown to confirm.`
                : dealScore.score >= 50
                ? `A VerdictIQ score of ${dealScore.score} means this deal is possible with negotiation. Use the strategy page to see what price makes it work.`
                : `A VerdictIQ score of ${dealScore.score} means you'd need a significant discount to make this work. Check the strategy breakdown to see if any approach fits.`
            }
          />

          {/* CTA → Strategy Page */}
          <VerdictCTA onPress={navigateToStrategy} />

          {/* Trust Strip */}
          <TrustStrip />

          {/* Footer */}
          <VerdictFooter />
        </ScrollView>
      </View>
    </>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: verdictDark.black,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: rs(16),
  },
  loadingText: {
    fontSize: rf(16),
    fontWeight: '600',
    color: verdictDark.textBody,
    marginTop: rs(12),
  },
  errorText: {
    fontSize: rf(18),
    fontWeight: '700',
    color: verdictDark.textHeading,
    marginTop: rs(12),
  },
  errorSub: {
    fontSize: rf(14),
    color: verdictDark.textSecondary,
    textAlign: 'center',
    paddingHorizontal: rs(32),
  },
  retryBtn: {
    marginTop: rs(20),
    paddingHorizontal: rs(24),
    paddingVertical: rs(12),
    backgroundColor: verdictDark.blueDeep,
    borderRadius: rs(8),
  },
  retryBtnText: {
    fontSize: rf(14),
    fontWeight: '600',
    color: verdictDark.white,
  },
  // Nav
  nav: {
    paddingVertical: rs(14),
    paddingHorizontal: rs(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: verdictDark.black,
    borderBottomWidth: 1,
    borderBottomColor: verdictDark.border,
  },
  logo: {
    fontFamily: 'Source Sans 3',
    fontSize: rf(22),
    fontWeight: '700',
    color: verdictDark.white,
  },
  logoIQ: {
    color: verdictDark.blue,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(16),
  },
  // Address strip
  addressStrip: {
    paddingVertical: rs(12),
    paddingHorizontal: rs(20),
    backgroundColor: verdictDark.bg,
    borderBottomWidth: 1,
    borderBottomColor: verdictDark.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    flex: 1,
  },
  addressText: {
    fontSize: rf(15),
    fontWeight: '600',
    color: verdictDark.textHeading,
  },
  addressDetails: {
    fontSize: rf(13),
    color: verdictDark.textSecondary,
    marginTop: rs(2),
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    paddingVertical: rs(6),
    paddingHorizontal: rs(12),
    borderWidth: 1,
    borderColor: verdictDark.textLabel,
    borderRadius: rs(100),
  },
  saveBtnText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: verdictDark.textBody,
  },
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // Zones section
  zonesSection: {
    paddingTop: rs(32),
    paddingHorizontal: rs(20),
    paddingBottom: rs(32),
    backgroundColor: verdictDark.black,
  },
  sectionLabel: {
    ...verdictTypography.sectionLabel,
    fontSize: rf(11),
    marginBottom: rs(8),
  },
  zonesTitle: {
    ...verdictTypography.heading,
    fontSize: rf(22),
    marginBottom: rs(6),
  },
  zonesSub: {
    ...verdictTypography.body,
    fontSize: rf(15),
    color: verdictDark.textBody,
    lineHeight: rf(15) * 1.55,
    marginBottom: rs(24),
  },
  scaleWrap: {
    marginTop: rs(20),
  },
});
