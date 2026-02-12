/**
 * Search History Screen
 * Route: /search-history
 *
 * Shows local recent searches and backend search history (when authenticated).
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { api } from '../../services/apiClient';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { usePropertyStore, useRecentSearches } from '../../stores';

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface BackendSearchItem {
  id: string;
  address?: string;
  query?: string;
  search_query?: string;
  result_address?: string;
  result_price?: number;
  result_summary?: { estimated_value?: number };
  address_street?: string;
  address_city?: string;
  address_state?: string;
  searched_at: string;
  is_successful?: boolean;
  was_successful?: boolean;
}

interface BackendSearchResponse {
  searches?: BackendSearchItem[];
  items?: BackendSearchItem[];
  total?: number;
}

function getDisplayAddress(item: BackendSearchItem): string {
  if (item.result_address) return item.result_address;
  if (item.address) return item.address;
  if (item.address_street) {
    const parts = [item.address_street];
    if (item.address_city) parts.push(item.address_city);
    if (item.address_state) parts.push(item.address_state);
    return parts.join(', ');
  }
  return item.query || item.search_query || 'Unknown';
}

function getDisplayPrice(item: BackendSearchItem): number | undefined {
  return item.result_price ?? item.result_summary?.estimated_value;
}

export default function SearchHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { isAuthenticated } = useAuth();

  const recentSearches = useRecentSearches();
  const clearRecentSearches = usePropertyStore((s) => s.clearRecentSearches);

  const [backendSearches, setBackendSearches] = useState<BackendSearchItem[]>([]);
  const [totalBackend, setTotalBackend] = useState(0);
  const [searchesThisWeek, setSearchesThisWeek] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBackendHistory = useCallback(async () => {
    if (!isAuthenticated) {
      setBackendSearches([]);
      setTotalBackend(0);
      setSearchesThisWeek(0);
      return;
    }
    try {
      const data = await api.get<BackendSearchResponse>('/api/v1/search-history');
      const items = data.searches ?? data.items ?? [];
      setBackendSearches(Array.isArray(items) ? items : []);
      setTotalBackend(data.total ?? items.length);

      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const backendWeekCount = items.filter((s: BackendSearchItem) => {
        const t = new Date(s.searched_at).getTime();
        return t >= oneWeekAgo;
      }).length;
      setSearchesThisWeek(backendWeekCount);
    } catch {
      setBackendSearches([]);
      setTotalBackend(0);
      setSearchesThisWeek(0);
    }
  }, [isAuthenticated]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await fetchBackendHistory();
    setLoading(false);
  }, [fetchBackendHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBackendHistory();
    setRefreshing(false);
  }, [fetchBackendHistory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBack = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleItemPress = useCallback(
    (address: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/analyzing/${encodeURIComponent(address)}` as any);
    },
    [router]
  );

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      'Clear History',
      'This will clear your local recent searches. Backend history (if signed in) will remain. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            clearRecentSearches();
          },
        },
      ]
    );
  }, [clearRecentSearches]);

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#0d9488';

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const localWeekCount = recentSearches.filter((s) => s.timestamp >= oneWeekAgo).length;
  const totalSearches = recentSearches.length + totalBackend;
  const weekSearches = localWeekCount + searchesThisWeek;
  const isEmpty = recentSearches.length === 0 && backendSearches.length === 0;

  const renderRecentItem = ({ item }: { item: (typeof recentSearches)[0] }) => {
    const address = decodeURIComponent(item.address);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleItemPress(address)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: cardBg,
          borderRadius: 12,
          marginBottom: 8,
          borderWidth: 1,
          borderColor,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: textColor }} numberOfLines={1}>
            {address}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
            {item.price != null && (
              <Text style={{ fontSize: 13, color: mutedColor }}>
                ${item.price.toLocaleString()}
              </Text>
            )}
            <Text style={{ fontSize: 12, color: mutedColor }}>
              {timeAgo(new Date(item.timestamp).toISOString())}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={mutedColor} />
      </TouchableOpacity>
    );
  };

  const renderBackendItem = ({ item }: { item: BackendSearchItem }) => {
    const address = getDisplayAddress(item);
    const price = getDisplayPrice(item);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleItemPress(address)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: cardBg,
          borderRadius: 12,
          marginBottom: 8,
          borderWidth: 1,
          borderColor,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: textColor }} numberOfLines={1}>
            {address}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
            {price != null && (
              <Text style={{ fontSize: 13, color: mutedColor }}>
                ${price.toLocaleString()}
              </Text>
            )}
            <Text style={{ fontSize: 12, color: mutedColor }}>
              {timeAgo(item.searched_at)}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={mutedColor} />
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderColor,
          }}
        >
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ padding: 4, marginRight: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '700', color: textColor }}>Search History</Text>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={accentColor} />
          </View>
        ) : isEmpty ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <Ionicons name="time-outline" size={56} color={mutedColor} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: textColor, marginTop: 16 }}>
              No searches yet
            </Text>
            <Text style={{ fontSize: 14, color: mutedColor, marginTop: 8, textAlign: 'center' }}>
              Searches you run will appear here. Try analyzing a property to get started.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/scan' as any)}
              style={{
                marginTop: 24,
                paddingVertical: 12,
                paddingHorizontal: 24,
                backgroundColor: accentColor,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Start Scanning</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={accentColor}
              />
            }
          >
            {/* Stats */}
            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 8,
              }}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: cardBg,
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor,
                }}
              >
                <Text style={{ fontSize: 12, color: mutedColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Total
                </Text>
                <Text style={{ fontSize: 22, fontWeight: '700', color: textColor, marginTop: 4 }}>
                  {totalSearches}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: cardBg,
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor,
                }}
              >
                <Text style={{ fontSize: 12, color: mutedColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  This Week
                </Text>
                <Text style={{ fontSize: 22, fontWeight: '700', color: textColor, marginTop: 4 }}>
                  {weekSearches}
                </Text>
              </View>
            </View>

            {/* Recent (local) */}
            {recentSearches.length > 0 && (
              <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: mutedColor,
                    marginBottom: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Recent
                </Text>
                {recentSearches.map((item) => (
                  <View key={item.propertyId}>
                    {renderRecentItem({ item })}
                  </View>
                ))}
              </View>
            )}

            {/* All Searches (backend) */}
            {isAuthenticated && backendSearches.length > 0 && (
              <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: mutedColor,
                    marginBottom: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  All Searches
                </Text>
                {backendSearches.map((item) => (
                  <View key={item.id}>
                    {renderBackendItem({ item })}
                  </View>
                ))}
              </View>
            )}

            {/* Clear History */}
            {recentSearches.length > 0 && (
              <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                <TouchableOpacity
                  onPress={handleClearHistory}
                  style={{
                    paddingVertical: 14,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor,
                    borderRadius: 12,
                    backgroundColor: cardBg,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: mutedColor }}>
                    Clear History
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}
