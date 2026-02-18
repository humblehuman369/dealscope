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
import { get } from '../../services/apiClient';
import { getUserProfile } from '../../services/userService';

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

  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery<PropertyStats>({
    queryKey: ['mobile', 'dashboard', 'stats'],
    queryFn: () => get<PropertyStats>('/api/v1/properties/saved/stats'),
    staleTime: 2 * 60 * 1000,
  });

  const { data: recentSearches, isError: searchesError, refetch: refetchSearches } = useQuery<SearchHistoryItem[]>({
    queryKey: ['mobile', 'dashboard', 'searches'],
    queryFn: () => get<SearchHistoryItem[]>('/api/v1/search-history/recent', { limit: 5 }),
    staleTime: 60 * 1000,
  });

  const { data: savedProperties, isError: propertiesError, refetch: refetchProperties } = useQuery<SavedProperty[]>({
    queryKey: ['mobile', 'dashboard', 'properties'],
    queryFn: () => get<SavedProperty[]>('/api/v1/properties/saved', { limit: 5 }),
    staleTime: 2 * 60 * 1000,
  });

  const { data: profile, isError: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ['mobile', 'dashboard', 'profile'],
    queryFn: getUserProfile,
    staleTime: 5 * 60 * 1000,
  });

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mobile', 'dashboard'] });
  }, [queryClient]);

  const hasError = statsError || searchesError || propertiesError || profileError;
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

        {/* Error state */}
        {hasError && (
          <View style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)' }} accessibilityRole="alert">
            <Text style={{ fontSize: 14, color: isDark ? '#fca5a5' : '#b91c1c', marginBottom: 12 }} accessibilityLabel="Error: Couldn't load dashboard. Check your connection and try again.">
              Couldn't load dashboard. Check your connection and try again.
            </Text>
            <TouchableOpacity
              onPress={onRefresh}
              style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: accentColor }}
              accessibilityRole="button"
              accessibilityLabel="Retry loading dashboard"
            >
              <Ionicons name="refresh" size={18} color="#ffffff" />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#ffffff' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

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

        {/* Goals vs Actual */}
        {profile && (profile.target_cash_on_cash || profile.target_cap_rate) && (
          <View style={{ backgroundColor: cardBg, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor }}>
            <Text accessibilityRole="header" style={{ fontSize: 13, fontWeight: '600', color: mutedColor, marginBottom: 12 }}>Goals vs Actual</Text>
            {profile.target_cash_on_cash != null && (
              <GoalRow
                label="Cash-on-Cash"
                target={(profile.target_cash_on_cash * 100)}
                actual={(stats?.average_coc_return || 0) * 100}
                suffix="%"
                textColor={textColor}
                mutedColor={mutedColor}
                borderColor={borderColor}
              />
            )}
            {profile.target_cap_rate != null && (
              <GoalRow
                label="Cap Rate"
                target={(profile.target_cap_rate * 100)}
                actual={0}
                suffix="%"
                textColor={textColor}
                mutedColor={mutedColor}
                borderColor={borderColor}
                noData={total === 0}
              />
            )}
          </View>
        )}

        {/* Recommended Next Step */}
        <View style={{ backgroundColor: cardBg, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor }}>
          <Text accessibilityRole="header" style={{ fontSize: 13, fontWeight: '600', color: mutedColor, marginBottom: 8 }}>Recommended Next Step</Text>
          {(() => {
            if (total === 0 && (!recentSearches || recentSearches.length === 0)) {
              return (
                <TouchableOpacity onPress={() => router.push('/(tabs)/scan')} accessibilityRole="button" accessibilityLabel="Run your first analysis">
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: `${accentColor}15`, borderRadius: 10, borderWidth: 1, borderColor: `${accentColor}30` }}>
                    <Ionicons name="scan-outline" size={22} color={accentColor} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>Run your first analysis</Text>
                      <Text style={{ fontSize: 12, color: mutedColor }}>Point your camera at any property to get started</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={mutedColor} />
                  </View>
                </TouchableOpacity>
              );
            }
            const actualCoC = (stats?.average_coc_return || 0) * 100;
            const targetCoC = (profile?.target_cash_on_cash || 0.08) * 100;
            if (total > 0 && actualCoC < targetCoC) {
              return (
                <TouchableOpacity onPress={() => router.push('/(tabs)/scan')} accessibilityRole="button" accessibilityLabel="Improve returns">
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#fbbf2415', borderRadius: 10, borderWidth: 1, borderColor: '#fbbf2430' }}>
                    <Ionicons name="trending-up-outline" size={22} color="#fbbf24" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>Returns below target</Text>
                      <Text style={{ fontSize: 12, color: mutedColor }}>Actual {actualCoC.toFixed(1)}% vs target {targetCoC.toFixed(1)}% — scan more deals to find better fits</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={mutedColor} />
                  </View>
                </TouchableOpacity>
              );
            }
            if (total > 0 && actualCoC >= targetCoC) {
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#22c55e15', borderRadius: 10, borderWidth: 1, borderColor: '#22c55e30' }}>
                  <Ionicons name="checkmark-circle-outline" size={22} color="#22c55e" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>You&apos;re on pace</Text>
                    <Text style={{ fontSize: 12, color: mutedColor }}>Portfolio CoC {actualCoC.toFixed(1)}% meets your {targetCoC.toFixed(1)}% target — keep building</Text>
                  </View>
                </View>
              );
            }
            return (
              <TouchableOpacity onPress={() => router.push('/(tabs)/scan')} accessibilityRole="button" accessibilityLabel="Analyze your first property">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: `${accentColor}15`, borderRadius: 10, borderWidth: 1, borderColor: `${accentColor}30` }}>
                  <Ionicons name="analytics-outline" size={22} color={accentColor} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>Save a property to your portfolio</Text>
                    <Text style={{ fontSize: 12, color: mutedColor }}>Track your deals and see how they stack up against your goals</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={mutedColor} />
                </View>
              </TouchableOpacity>
            );
          })()}
        </View>

        {/* Activity */}
        <View style={{ backgroundColor: cardBg, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor }}>
          <Text accessibilityRole="header" style={{ fontSize: 13, fontWeight: '600', color: mutedColor, marginBottom: 12 }}>Activity This Week</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, alignItems: 'center', padding: 12, backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderRadius: 10 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#3b82f6' }}>
                {recentSearches?.filter(s => {
                  const d = new Date(s.searched_at);
                  const week = Date.now() - 7 * 86400000;
                  return d.getTime() > week;
                }).length ?? 0}
              </Text>
              <Text style={{ fontSize: 11, color: mutedColor, fontWeight: '600', textTransform: 'uppercase', marginTop: 2 }}>Searches</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', padding: 12, backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderRadius: 10 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#22c55e' }}>{total}</Text>
              <Text style={{ fontSize: 11, color: mutedColor, fontWeight: '600', textTransform: 'uppercase', marginTop: 2 }}>Properties</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', padding: 12, backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderRadius: 10 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: accentColor }}>{Object.values(pipeline).reduce((a, b) => a + b, 0) > 0 ? Object.values(pipeline).reduce((a, b) => a + b, 0) : 0}</Text>
              <Text style={{ fontSize: 11, color: mutedColor, fontWeight: '600', textTransform: 'uppercase', marginTop: 2 }}>In Pipeline</Text>
            </View>
          </View>
        </View>

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

// ------------------------------------------------------------------
// GoalRow sub-component — shows target vs actual with gap indicator
// ------------------------------------------------------------------

function GoalRow({ label, target, actual, suffix, textColor, mutedColor, borderColor, noData }: {
  label: string; target: number; actual: number; suffix: string;
  textColor: string; mutedColor: string; borderColor: string; noData?: boolean;
}) {
  const gap = actual - target;
  const isAbove = gap >= 0;
  const gapColor = isAbove ? '#22c55e' : '#ef4444';

  return (
    <View accessibilityLabel={`${label}: target ${target.toFixed(1)}${suffix}, actual ${noData ? 'no data' : `${actual.toFixed(1)}${suffix}`}`}
      style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: borderColor }}>
      <Text style={{ fontSize: 14, fontWeight: '500', color: textColor }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 11, color: mutedColor }}>Target</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>{target.toFixed(1)}{suffix}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 11, color: mutedColor }}>Actual</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: noData ? mutedColor : textColor }}>
            {noData ? '—' : `${actual.toFixed(1)}${suffix}`}
          </Text>
        </View>
        {!noData && (
          <View style={{ minWidth: 48, alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, backgroundColor: `${gapColor}18`, borderRadius: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: gapColor }}>
              {isAbove ? '+' : ''}{gap.toFixed(1)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
