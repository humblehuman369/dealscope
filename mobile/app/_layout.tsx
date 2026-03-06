import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useDeepLinking } from '@/hooks/useDeepLinking';
import { useSession } from '@/hooks/useSession';
import { hydrateTokens, getAccessToken } from '@/services/token-manager';
import { initSentry } from '@/services/sentry';
import { initPurchases } from '@/services/purchases';

SplashScreen.preventAutoHideAsync();
initSentry();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const customFonts = {
  'DMSans-Bold': require('@/assets/fonts/DMSans-Variable.ttf'),
  'DMSans-Medium': require('@/assets/fonts/DMSans-Variable.ttf'),
  'SpaceMono-Regular': require('@/assets/fonts/SpaceMono-Regular.ttf'),
  'SpaceMono-Bold': require('@/assets/fonts/SpaceMono-Bold.ttf'),
  'SourceSans3-Regular': require('@/assets/fonts/SourceSans3-Variable.ttf'),
  'SourceSans3-SemiBold': require('@/assets/fonts/SourceSans3-Variable.ttf'),
  'SourceSans3-Bold': require('@/assets/fonts/SourceSans3-Variable.ttf'),
};

function AuthGate() {
  const { user, isLoading } = useSession();
  const segments = useSegments();
  const router = useRouter();
  useDeepLinking();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const hasToken = !!getAccessToken();

    if (!hasToken && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (hasToken && user && inAuthGroup) {
      router.replace('/(tabs)/search');
    }
  }, [user, isLoading, segments]);

  useEffect(() => {
    if (user?.id) {
      initPurchases(user.id);
    }
  }, [user?.id]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      await Promise.all([
        hydrateTokens(),
        Font.loadAsync(customFonts),
      ]);
      setReady(true);
      SplashScreen.hideAsync();
    }
    prepare();
  }, []);

  if (!ready) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <OfflineBanner />
          <AuthGate />
          <StatusBar style="light" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
