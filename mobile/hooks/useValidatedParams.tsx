/**
 * Route parameter validation utilities.
 *
 * Provides pure validation functions for each dynamic param type and
 * a shared fallback component for screens that receive invalid params
 * (e.g. malformed deep links, stale bookmarks).
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../context/ThemeContext';

const MAX_PARAM_LENGTH = 500;
const MIN_TOKEN_LENGTH = 10;

const VALID_STRATEGIES = new Set([
  'ltr', 'str', 'brrrr', 'flip', 'house_hack', 'wholesale',
]);

// ─── Validators ──────────────────────────────────────────────────

export function isValidAddress(raw: string | undefined): boolean {
  if (!raw) return false;
  try {
    const decoded = decodeURIComponent(raw);
    return decoded.length > 0 && decoded.length < MAX_PARAM_LENGTH;
  } catch {
    return false;
  }
}

export function isValidStrategy(raw: string | undefined): boolean {
  return VALID_STRATEGIES.has((raw || '').toLowerCase());
}

export function isValidId(raw: string | undefined): boolean {
  return typeof raw === 'string' && raw.length > 0 && raw.length < MAX_PARAM_LENGTH;
}

export function isValidZpid(raw: string | undefined): boolean {
  return typeof raw === 'string' && raw.length > 0 && raw.length < MAX_PARAM_LENGTH;
}

export function isValidToken(raw: string | undefined): boolean {
  return typeof raw === 'string' && raw.length >= MIN_TOKEN_LENGTH;
}

// ─── Fallback UI ─────────────────────────────────────────────────

export function InvalidParamFallback({ message = 'Invalid link' }: { message?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: bg,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: insets.top,
        paddingHorizontal: 24,
      }}
    >
      <Ionicons name="alert-circle-outline" size={56} color={mutedColor} />
      <Text
        style={{
          fontSize: 18,
          fontWeight: '700',
          color: textColor,
          marginTop: 16,
          textAlign: 'center',
        }}
      >
        {message}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: mutedColor,
          marginTop: 8,
          textAlign: 'center',
        }}
      >
        This link may be invalid or expired. Try searching for the property instead.
      </Text>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.replace('/(tabs)/home');
        }}
        style={{
          marginTop: 24,
          backgroundColor: '#0d9488',
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12,
        }}
        accessibilityRole="button"
        accessibilityLabel="Go to home screen"
      >
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
          Go Home
        </Text>
      </TouchableOpacity>
    </View>
  );
}
