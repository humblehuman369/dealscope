/**
 * Native dashboard screen — replaces the WebView wrapper.
 *
 * Uses React Query for data fetching with offline cache support.
 * All data comes from the API directly rather than loading a web page.
 */

import { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getAccessToken } from '../../services/authService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://dealscope-production.up.railway.app';

// ------------------------------------------------------------------
// API helper
// ------------------------------------------------------------------

async function apiFetch<T>(endpoint: string): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface PropertyStats {
  total: number;
  by_status: Record<string, number>;
  total_estimated_value?: number;
  total_monthly_cash_flow?: number;
  average_coc_return?: number;
}

interface SearchHistoryItem {
  id: string;
  search_query: string;
  was_successful: boolean;
  searched_at: string;
}

interface SavedProperty {
  id: string;
  address_street: string;
  address_city?: string;
  address_state?: string;
  status: string;
  best_cash_flow?: number;
  best_coc_return?: number;
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const fmt = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtPct = (n: number) => `${n.toFixed(1)}%`;

const timeAgo = (d: string) => {
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(ms / 3600000);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(ms / 86400000)}d`;
};

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<PropertyStats>({
    queryKey: ['mobile', 'dashboard', 'stats'],
    queryFn: () => apiFetch('/api/v1/properties/saved/stats'),
    staleTime: 2 * 60 * 1000,
  });

  const { data: recentSearches } = useQuery<SearchHistoryItem[]>({
    queryKey: ['mobile', 'dashboard', 'searches'],
    queryFn: () => apiFetch('/api/v1/search-history/recent?limit=5'),
    staleTime: 60 * 1000,
  });

  const { data: savedProperties } = useQuery<SavedProperty[]>({
    queryKey: ['mobile', 'dashboard', 'properties'],
    queryFn: () => apiFetch('/api/v1/properties/saved?limit=5'),
    staleTime: 2 * 60 * 1000,
  });

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mobile', 'dashboard'] });
  }, [queryClient]);

  const isRefreshing = statsLoading;

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#0d9488';

  const firstName = user?.full_name?.split(' ')[0] || 'Investor';

  const total = stats?.total || 0;
  const pipeline = stats?.by_status || {};

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={accentColor} />
        }
      >
        {/* Header */}
        <View style={{ marginBottom: 20 }}>
          <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '800', color: textColor }}>
            Welcome, {firstName}
          </Text>
          <Text style={{ fontSize: 14, color: mutedColor, marginTop: 2 }}>
            Your investment overview
          </Text>
        </View>

        {/* Metrics */}
        {statsLoading ? (
          <View style={{ height: 120, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={accentColor} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <MetricCard icon="home-outline" label="Properties" value={String(total)} color={accentColor} bg={cardBg} textColor={textColor} mutedColor={mutedColor} borderColor={borderColor} />
            <MetricCard icon="cash-outline" label="Portfolio" value={fmt(stats?.total_estimated_value || 0)} color="#3b82f6" bg={cardBg} textColor={textColor} mutedColor={mutedColor} borderColor={borderColor} />
            <MetricCard icon="trending-up-outline" label="Cash Flow" value={fmt(stats?.total_monthly_cash_flow || 0)} color="#22c55e" bg={cardBg} textColor={textColor} mutedColor={mutedColor} borderColor={borderColor} />
            <MetricCard icon="stats-chart-outline" label="Avg CoC" value={fmtPct((stats?.average_coc_return || 0) * 100)} color="#8b5cf6" bg={cardBg} textColor={textColor} mutedColor={mutedColor} borderColor={borderColor} />
          </View>
        )}

        {/* Pipeline */}
        {total > 0 && (
          <View style={{ backgroundColor: cardBg, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: mutedColor, marginBottom: 8 }}>Deal Pipeline</Text>
            <View style={{ flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }}>
              {(pipeline['watching'] || 0) > 0 && <View style={{ flex: pipeline['watching'], backgroundColor: '#94a3b8' }} />}
              {(pipeline['analyzing'] || 0) > 0 && <View style={{ flex: pipeline['analyzing'], backgroundColor: '#3b82f6' }} />}
              {((pipeline['contacted'] || 0) + (pipeline['negotiating'] || 0)) > 0 && <View style={{ flex: (pipeline['contacted'] || 0) + (pipeline['negotiating'] || 0), backgroundColor: '#f59e0b' }} />}
              {(pipeline['under_contract'] || 0) > 0 && <View style={{ flex: pipeline['under_contract'], backgroundColor: '#0d9488' }} />}
              {(pipeline['owned'] || 0) > 0 && <View style={{ flex: pipeline['owned'], backgroundColor: '#22c55e' }} />}
            </View>
          </View>
        )}

        {/* Recent Properties */}
        <View style={{ backgroundColor: cardBg, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor }}>
          <Text accessibilityRole="header" style={{ fontSize: 13, fontWeight: '600', color: mutedColor, marginBottom: 12 }}>Recent Properties</Text>
          {savedProperties && savedProperties.length > 0 ? (
            savedProperties.map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: borderColor }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: textColor }} numberOfLines={1}>{p.address_street}</Text>
                  <Text style={{ fontSize: 12, color: mutedColor }}>{p.address_city}, {p.address_state}</Text>
                </View>
                {p.best_cash_flow != null && (
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#22c55e' }}>{fmt(p.best_cash_flow)}/mo</Text>
                )}
              </View>
            ))
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Ionicons name="home-outline" size={32} color={mutedColor} style={{ opacity: 0.4 }} />
              <Text style={{ fontSize: 13, color: mutedColor, marginTop: 8 }}>No properties saved yet</Text>
            </View>
          )}
        </View>

        {/* Recent Searches */}
        <View style={{ backgroundColor: cardBg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor }}>
          <Text accessibilityRole="header" style={{ fontSize: 13, fontWeight: '600', color: mutedColor, marginBottom: 12 }}>Recent Searches</Text>
          {recentSearches && recentSearches.length > 0 ? (
            recentSearches.map((s) => (
              <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.was_successful ? '#22c55e' : '#ef4444' }} />
                <Text style={{ flex: 1, fontSize: 13, color: textColor }} numberOfLines={1}>{s.search_query}</Text>
                <Text style={{ fontSize: 11, color: mutedColor }}>{timeAgo(s.searched_at)}</Text>
              </View>
            ))
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Ionicons name="time-outline" size={32} color={mutedColor} style={{ opacity: 0.4 }} />
              <Text style={{ fontSize: 13, color: mutedColor, marginTop: 8 }}>No recent searches</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ------------------------------------------------------------------
// MetricCard sub-component
// ------------------------------------------------------------------

function MetricCard({ icon, label, value, color, bg, textColor, mutedColor, borderColor }: {
  icon: string; label: string; value: string; color: string;
  bg: string; textColor: string; mutedColor: string; borderColor: string;
}) {
  return (
    <View accessibilityLabel={`${label}: ${value}`} style={{ flex: 1, minWidth: '45%', backgroundColor: bg, borderRadius: 12, padding: 14, borderWidth: 1, borderColor }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Ionicons name={icon as any} size={18} color={color} />
        <Text style={{ fontSize: 11, fontWeight: '600', color: mutedColor, textTransform: 'uppercase' }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 20, fontWeight: '800', color: textColor }}>{value}</Text>
    </View>
  );
}
