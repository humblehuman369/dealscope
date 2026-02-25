/**
 * Price Intel Screen - Sale comps, rent comps, and valuation
 * Route: /price-intel/[address]
 * Params: address, price, beds, baths, sqft
 */

import { ScreenErrorFallback as ErrorBoundary } from '../../components/ScreenErrorFallback';
export { ErrorBoundary };

import { useIsOnline } from '../../hooks/useNetworkStatus';
import React, { useState, useEffect, useCallback } from 'react';
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
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/apiClient';
import { isValidAddress, InvalidParamFallback } from '../../hooks/useValidatedParams';

interface SaleComp {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  sale_price?: number;
  price_per_sqft?: number;
  sale_date?: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  distance_miles?: number;
}

interface RentComp {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  monthly_rent?: number;
  rent_per_sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  distance_miles?: number;
}

function formatPrice(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

function formatDistance(miles?: number): string {
  if (miles == null) return '';
  if (miles < 0.1) return 'Nearby';
  if (miles < 1) return `${(miles * 5280).toFixed(0)} ft`;
  return `${miles.toFixed(1)} mi`;
}

function formatAddress(c: SaleComp | RentComp): string {
  if (c.address) return c.address;
  const parts = [c.city, c.state, c.zip].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Unknown';
}

export default function PriceIntelScreen() {
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
  const listPrice = params.price ? parseFloat(params.price) : 0;
  const sqftValue = params.sqft ? parseInt(params.sqft, 10) : 0;

  type TabId = 'sale' | 'rent' | 'valuation';
  const [activeTab, setActiveTab] = useState<TabId>('sale');

  const [saleComps, setSaleComps] = useState<SaleComp[]>([]);
  const [saleLoading, setSaleLoading] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);

  const [rentComps, setRentComps] = useState<RentComp[]>([]);
  const [rentLoading, setRentLoading] = useState(false);
  const [rentError, setRentError] = useState<string | null>(null);

  const fetchSaleComps = useCallback(async () => {
    if (!decodedAddress) return;
    setSaleLoading(true);
    setSaleError(null);
    try {
      const data = await api.get<SaleComp[] | { results?: SaleComp[] }>(
        '/api/v1/similar-sold',
        { params: { address: decodedAddress, radius: 1 } }
      );
      const list = Array.isArray(data) ? data : (data?.results || []);
      setSaleComps(Array.isArray(list) ? list : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch sale comps';
      setSaleError(msg);
      setSaleComps([]);
    } finally {
      setSaleLoading(false);
    }
  }, [decodedAddress]);

  const fetchRentComps = useCallback(async () => {
    if (!decodedAddress) return;
    setRentLoading(true);
    setRentError(null);
    try {
      const data = await api.get<RentComp[] | { results?: RentComp[] }>(
        '/api/v1/similar-rent',
        { params: { address: decodedAddress, radius: 1 } }
      );
      const list = Array.isArray(data) ? data : (data?.results || []);
      setRentComps(Array.isArray(list) ? list : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch rent comps';
      setRentError(msg);
      setRentComps([]);
    } finally {
      setRentLoading(false);
    }
  }, [decodedAddress]);

  useEffect(() => {
    if (activeTab === 'sale' || activeTab === 'valuation') fetchSaleComps();
  }, [activeTab, fetchSaleComps]);

  useEffect(() => {
    if (activeTab === 'rent' || activeTab === 'valuation') fetchRentComps();
  }, [activeTab, fetchRentComps]);

  const medianSalePrice = (() => {
    const prices = saleComps
      .map((c) => c.sale_price)
      .filter((p): p is number => typeof p === 'number' && p > 0);
    if (prices.length === 0) return 0;
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  })();

  const medianRent = (() => {
    const rents = rentComps
      .map((c) => c.monthly_rent)
      .filter((r): r is number => typeof r === 'number' && r > 0);
    if (rents.length === 0) return 0;
    const sorted = [...rents].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  })();

  const estimatedValue = medianSalePrice || listPrice;
  const annualRent = medianRent * 12;
  const grm = annualRent > 0 ? estimatedValue / annualRent : 0;
  const rentToPrice = estimatedValue > 0 ? (medianRent / estimatedValue) * 100 : 0;
  const onePercentRule = estimatedValue > 0 ? (medianRent / estimatedValue) * 100 : 0;
  const pricePerSqft = sqftValue > 0 ? estimatedValue / sqftValue : 0;

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'sale', label: 'Sale Comps' },
    { id: 'rent', label: 'Rent Comps' },
    { id: 'valuation', label: 'Valuation' },
  ];

  if (!isValidAddress(params.address)) return <InvalidParamFallback message="Property not found" />;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: borderColor }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Price Intel</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={[styles.address, { color: mutedColor }]} numberOfLines={2}>
          {decodedAddress}
        </Text>

        <View style={[styles.tabBar, { borderBottomColor: borderColor }]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeTab === tab.id && styles.tabActive,
                activeTab === tab.id && { borderBottomColor: accentColor },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab.id);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab.id ? accentColor : mutedColor },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'sale' && (
            <>
              {saleLoading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="large" color={accentColor} />
                  <Text style={[styles.loadingText, { color: mutedColor }]}>
                    Loading sale comps...
                  </Text>
                </View>
              ) : saleError ? (
                <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                  <Ionicons name="alert-circle-outline" size={32} color="#ef4444" />
                  <Text style={[styles.errorText, { color: textColor }]}>{saleError}</Text>
                  <TouchableOpacity
                    style={[styles.retryBtn, { backgroundColor: accentColor }]}
                    onPress={fetchSaleComps}
                  >
                    <Text style={styles.retryBtnText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                    <Text style={[styles.cardTitle, { color: mutedColor }]}>Median Sale Price</Text>
                    <Text style={[styles.medianValue, { color: accentColor }]}>
                      {formatPrice(medianSalePrice)}
                    </Text>
                  </View>
                  {saleComps.map((c, i) => (
                    <View
                      key={i}
                      style={[styles.compCard, { backgroundColor: cardBg, borderColor }]}
                    >
                      <Text style={[styles.compAddress, { color: textColor }]} numberOfLines={2}>
                        {formatAddress(c)}
                      </Text>
                      <View style={styles.compMeta}>
                        <Text style={[styles.compPrice, { color: accentColor }]}>
                          {c.sale_price ? formatPrice(c.sale_price) : '—'}
                        </Text>
                        <Text style={[styles.compDetails, { color: mutedColor }]}>
                          {[c.bedrooms && `${c.bedrooms}bd`, c.bathrooms && `${c.bathrooms}ba`, c.sqft && `${c.sqft} sqft`]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </View>
                      <View style={styles.compFooter}>
                        {c.sale_date && (
                          <Text style={[styles.compMetaText, { color: mutedColor }]}>
                            Sold {c.sale_date}
                          </Text>
                        )}
                        {c.distance_miles != null && (
                          <Text style={[styles.compMetaText, { color: mutedColor }]}>
                            {formatDistance(c.distance_miles)}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}

          {activeTab === 'rent' && (
            <>
              {rentLoading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="large" color={accentColor} />
                  <Text style={[styles.loadingText, { color: mutedColor }]}>
                    Loading rent comps...
                  </Text>
                </View>
              ) : rentError ? (
                <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                  <Ionicons name="alert-circle-outline" size={32} color="#ef4444" />
                  <Text style={[styles.errorText, { color: textColor }]}>{rentError}</Text>
                  <TouchableOpacity
                    style={[styles.retryBtn, { backgroundColor: accentColor }]}
                    onPress={fetchRentComps}
                  >
                    <Text style={styles.retryBtnText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                    <Text style={[styles.cardTitle, { color: mutedColor }]}>Median Rent</Text>
                    <Text style={[styles.medianValue, { color: accentColor }]}>
                      {medianRent > 0 ? formatPrice(medianRent) + '/mo' : '—'}
                    </Text>
                  </View>
                  {rentComps.map((c, i) => (
                    <View
                      key={i}
                      style={[styles.compCard, { backgroundColor: cardBg, borderColor }]}
                    >
                      <Text style={[styles.compAddress, { color: textColor }]} numberOfLines={2}>
                        {formatAddress(c)}
                      </Text>
                      <View style={styles.compMeta}>
                        <Text style={[styles.compPrice, { color: accentColor }]}>
                          {c.monthly_rent ? formatPrice(c.monthly_rent) + '/mo' : '—'}
                        </Text>
                        <Text style={[styles.compDetails, { color: mutedColor }]}>
                          {[c.bedrooms && `${c.bedrooms}bd`, c.bathrooms && `${c.bathrooms}ba`, c.sqft && `${c.sqft} sqft`]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </View>
                      {c.distance_miles != null && (
                        <Text style={[styles.compMetaText, { color: mutedColor }]}>
                          {formatDistance(c.distance_miles)}
                        </Text>
                      )}
                    </View>
                  ))}
                </>
              )}
            </>
          )}

          {activeTab === 'valuation' && (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.cardTitle, { color: mutedColor }]}>Valuation Summary</Text>
              <View style={styles.valRow}>
                <Text style={[styles.valLabel, { color: textColor }]}>Estimated Value</Text>
                <Text style={[styles.valValue, { color: accentColor }]}>
                  {formatPrice(estimatedValue)}
                </Text>
              </View>
              <View style={styles.valRow}>
                <Text style={[styles.valLabel, { color: textColor }]}>Rent-to-Price Ratio</Text>
                <Text style={[styles.valValue, { color: textColor }]}>
                  {rentToPrice > 0 ? rentToPrice.toFixed(2) + '%' : '—'}
                </Text>
              </View>
              <View style={styles.valRow}>
                <Text style={[styles.valLabel, { color: textColor }]}>Price per Sqft</Text>
                <Text style={[styles.valValue, { color: textColor }]}>
                  {pricePerSqft > 0 ? formatPrice(pricePerSqft) : '—'}
                </Text>
              </View>
              <View style={styles.valRow}>
                <Text style={[styles.valLabel, { color: textColor }]}>GRM</Text>
                <Text style={[styles.valValue, { color: textColor }]}>
                  {grm > 0 ? grm.toFixed(1) : '—'}
                </Text>
              </View>
              <View style={styles.valRow}>
                <Text style={[styles.valLabel, { color: textColor }]}>1% Rule Check</Text>
                <Text style={[styles.valValue, { color: onePercentRule >= 1 ? accentColor : mutedColor }]}>
                  {estimatedValue > 0 ? onePercentRule.toFixed(2) + '%' : '—'}
                </Text>
              </View>
              <Text style={[styles.valHint, { color: mutedColor }]}>
                Median of sale comps. GRM = price ÷ annual rent. 1% rule: monthly rent / price.
              </Text>
            </View>
          )}
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
  address: { fontSize: 13, marginHorizontal: 16, marginTop: 12, marginBottom: 4 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: {},
  tabText: { fontSize: 14, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  loadingWrap: { padding: 32, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  cardTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  medianValue: { fontSize: 24, fontWeight: '700' },
  errorText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, marginTop: 16 },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  compCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  compAddress: { fontSize: 14, fontWeight: '500' },
  compMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  compPrice: { fontSize: 16, fontWeight: '700' },
  compDetails: { fontSize: 12, marginTop: 2 },
  compFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  compMetaText: { fontSize: 11 },
  valRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, width: '100%' },
  valLabel: { fontSize: 14 },
  valValue: { fontSize: 14, fontWeight: '600' },
  valHint: { fontSize: 11, marginTop: 12, textAlign: 'center' },
});
