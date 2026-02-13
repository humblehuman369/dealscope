/**
 * ScreenErrorFallback — Expo Router ErrorBoundary-compatible fallback.
 *
 * Expo Router allows each route file to export `ErrorBoundary` as a named export.
 * This component provides a consistent, branded fallback that:
 *   - Shows a recovery UI matching the app's dark theme
 *   - Offers "Try Again" and "Go Home" actions
 *   - Reports to Sentry in production
 *   - Shows stack traces in development
 *
 * Usage in route files:
 *   export { ScreenErrorFallback as ErrorBoundary } from '../../components/ScreenErrorFallback';
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface ScreenErrorFallbackProps {
  error: Error;
  retry: () => void;
}

export function ScreenErrorFallback({ error, retry }: ScreenErrorFallbackProps) {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);

  // Report to Sentry in production
  React.useEffect(() => {
    try {
      const Sentry = require('@sentry/react-native');
      Sentry.captureException(error);
    } catch {
      // Sentry not available
    }
    if (__DEV__) {
      console.error('[ScreenError]', error);
    }
  }, [error]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconRing}>
          <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
        </View>

        <Text style={styles.title}>This Screen Hit a Snag</Text>
        <Text style={styles.subtitle}>
          {error.message || 'An unexpected error occurred. Please try again.'}
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.retryBtn} onPress={retry} activeOpacity={0.7}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => router.replace('/(tabs)/home')}
            activeOpacity={0.7}
          >
            <Ionicons name="home-outline" size={18} color="#0891B2" />
            <Text style={styles.homeText}>Go Home</Text>
          </TouchableOpacity>
        </View>

        {__DEV__ && (
          <>
            <TouchableOpacity
              style={styles.detailsToggle}
              onPress={() => setShowDetails(!showDetails)}
            >
              <Text style={styles.detailsToggleText}>
                {showDetails ? 'Hide Stack Trace' : 'Show Stack Trace'}
              </Text>
              <Ionicons
                name={showDetails ? 'chevron-up' : 'chevron-down'}
                size={14}
                color="#64748B"
              />
            </TouchableOpacity>

            {showDetails && (
              <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.detailsContent}>
                <Text style={styles.detailsText} selectable>{error.stack || error.message}</Text>
              </ScrollView>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  content: {
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0891B2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(8, 145, 178, 0.12)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(8, 145, 178, 0.3)',
  },
  homeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0891B2',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 24,
    padding: 8,
  },
  detailsToggleText: {
    fontSize: 12,
    color: '#64748B',
  },
  detailsScroll: {
    maxHeight: 180,
    width: '100%',
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
  },
  detailsContent: {
    padding: 12,
  },
  detailsText: {
    fontSize: 10,
    color: '#475569',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});

export default ScreenErrorFallback;
