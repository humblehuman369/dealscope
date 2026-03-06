import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import api from '@/services/api';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    async function checkConnection() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const baseUrl = api.defaults.baseURL ?? '';
        await fetch(`${baseUrl}/health`, { signal: controller.signal, method: 'GET' });
        clearTimeout(timeout);
        setIsOffline(false);
      } catch {
        setIsOffline(true);
      }
    }

    checkConnection();
    const interval = setInterval(checkConnection, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>You are offline. Some features may be unavailable.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  text: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
});
