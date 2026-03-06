import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import api from '@/services/api';
import { colors } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        await api.get('/api/v1/health', { timeout: 5000 });
        if (mounted) setOffline(false);
      } catch {
        if (mounted) setOffline(true);
      }
    }

    check();
    const interval = setInterval(check, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: offline ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [offline, opacity]);

  if (!offline) return null;

  return (
    <Animated.View style={[styles.banner, { opacity }]}>
      <Text style={styles.text}>No connection — some features may be unavailable</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 100,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 10,
    padding: spacing.md,
    alignItems: 'center',
    zIndex: 999,
  },
  text: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
    textAlign: 'center',
  },
});
