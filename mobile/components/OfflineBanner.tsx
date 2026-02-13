/**
 * OfflineBanner — Persistent top banner shown when the device is offline.
 *
 * Slides down from the top (below the status bar) and auto-dismisses when
 * connectivity is restored, with a brief "Back Online" confirmation.
 *
 * Mount this once in the root layout — it self-manages visibility.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const { isConnected, isInternetReachable, isChecking } = useNetworkStatus();
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const [bannerState, setBannerState] = useState<'hidden' | 'offline' | 'reconnected'>('hidden');
  const wasOfflineRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOffline = !isChecking && (!isConnected || !isInternetReachable);

  useEffect(() => {
    if (isChecking) return;

    if (isOffline) {
      // Show offline banner
      wasOfflineRef.current = true;
      setBannerState('offline');
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else if (wasOfflineRef.current) {
      // Just came back online — show "Back Online" briefly
      wasOfflineRef.current = false;
      setBannerState('reconnected');

      // Auto-hide after 2.5s
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -80,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setBannerState('hidden'));
      }, 2500);
    }

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isOffline, isChecking, slideAnim]);

  if (bannerState === 'hidden') return null;

  const isReconnected = bannerState === 'reconnected';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 4,
          backgroundColor: isReconnected ? '#059669' : '#B91C1C',
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.content}>
        <Ionicons
          name={isReconnected ? 'checkmark-circle' : 'cloud-offline-outline'}
          size={16}
          color="#FFFFFF"
        />
        <Text style={styles.text}>
          {isReconnected ? 'Back Online' : 'No Internet Connection'}
        </Text>
        {!isReconnected && (
          <Text style={styles.subtext}>Showing cached data where available</Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
    flexWrap: 'wrap',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    width: '100%',
    textAlign: 'center',
  },
});

export default OfflineBanner;
