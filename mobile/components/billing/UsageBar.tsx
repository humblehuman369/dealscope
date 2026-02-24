/**
 * UsageBar — displays usage limits for free-tier users.
 *
 * Mirrors frontend/src/components/UsageBar.tsx.
 * Shows two meters (Analyses / Saved) with color-coded states:
 *   normal  → accent color
 *   warning (>60%) → amber
 *   critical (>80%) → red
 *
 * Hidden for Pro users.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../../hooks/useSubscription';
import { billingService } from '../../services/billingService';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';
import type { UsageResponse } from '../../types/billing';

const HIDDEN_PATHS = ['/auth', '/onboarding', '/billing'];

function barColor(pct: number): string {
  if (pct >= 80) return '#ef4444';
  if (pct >= 60) return '#f59e0b';
  return colors.accent[500];
}

export function UsageBar() {
  const { isPro, isAuthenticated, isLoading: subLoading } = useSubscription();
  const { isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [usage, setUsage] = useState<UsageResponse | null>(null);

  useEffect(() => {
    if (!isAuthenticated || isPro) return;
    billingService.getUsage().then(setUsage).catch(() => {});
  }, [isAuthenticated, isPro]);

  if (subLoading || isPro || !isAuthenticated || !usage) return null;
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  const searchPct = usage.searches_limit > 0
    ? Math.min(Math.round((usage.searches_used / usage.searches_limit) * 100), 100)
    : 0;
  const savedPct = usage.properties_limit > 0
    ? Math.min(Math.round((usage.properties_saved / usage.properties_limit) * 100), 100)
    : 0;

  const searchesLeft = usage.searches_remaining;
  const isCritical = searchPct >= 80 || savedPct >= 80;
  const isWarning = searchPct >= 60 || savedPct >= 60;

  let ctaText = 'Upgrade for unlimited';
  if (isCritical) ctaText = 'Limit reached — Upgrade now';
  else if (isWarning) ctaText = `${searchesLeft} analyses left — Upgrade`;

  const bg = isDark ? 'rgba(15,23,42,0.95)' : 'rgba(248,250,252,0.95)';
  const textColor = isDark ? '#cbd5e1' : '#475569';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={styles.metersRow}>
        {/* Searches */}
        <View style={styles.meter}>
          <Text style={[styles.meterLabel, { color: textColor }]}>
            Analyses {usage.searches_used}/{usage.searches_limit}
          </Text>
          <View style={[styles.track, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
            <View
              style={[
                styles.fill,
                {
                  width: `${searchPct}%` as any,
                  backgroundColor: barColor(searchPct),
                },
              ]}
            />
          </View>
        </View>

        {/* Saved */}
        <View style={styles.meter}>
          <Text style={[styles.meterLabel, { color: textColor }]}>
            Saved {usage.properties_saved}/{usage.properties_limit}
          </Text>
          <View style={[styles.track, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
            <View
              style={[
                styles.fill,
                {
                  width: `${savedPct}%` as any,
                  backgroundColor: barColor(savedPct),
                },
              ]}
            />
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.ctaButton}
        onPress={() => router.push('/billing')}
      >
        <Text style={styles.ctaText}>{ctaText}</Text>
        <Ionicons name="arrow-forward" size={12} color={colors.primary[500]} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148,163,184,0.15)',
  },
  metersRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  meter: { flex: 1 },
  meterLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  ctaText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary[500],
  },
});
