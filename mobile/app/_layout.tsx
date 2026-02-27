import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostHogProvider } from 'posthog-react-native';
import { hydrateTokens } from '@/services/token-manager';
import { initPayments, identifyUser, resetUser } from '@/services/payments';
import { useBiometricLock } from '@/hooks/useBiometricLock';
import { useSession } from '@/hooks/useSession';
import { BiometricLockScreen } from '@/components/auth/BiometricLockScreen';
import { colors } from '@/constants/tokens';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

/**
 * Syncs RevenueCat identity with the current session.
 * Identify on login, reset on logout.
 */
function PaymentIdentitySync() {
  const { user, isAuthenticated } = useSession();

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      identifyUser(user.id);
    } else {
      resetUser();
    }
  }, [isAuthenticated, user?.id]);

  return null;
}

function AppContent() {
  const { isLocked, unlock } = useBiometricLock();

  if (isLocked) {
    return <BiometricLockScreen onRetry={unlock} />;
  }

  return (
    <>
      <PaymentIdentitySync />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.base },
          animation: 'slide_from_right',
        }}
      />
      <StatusBar style="light" />
    </>
  );
}

function AppWithAnalytics() {
  if (!POSTHOG_API_KEY) {
    return <AppContent />;
  }

  return (
    <PostHogProvider
      apiKey={POSTHOG_API_KEY}
      options={{
        host: POSTHOG_HOST,
      }}
    >
      <AppContent />
    </PostHogProvider>
  );
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    async function prepare() {
      await hydrateTokens();
      await initPayments();
      setAppReady(true);
    }
    prepare();
  }, []);

  useEffect(() => {
    if (fontsLoaded && appReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, appReady]);

  if (!fontsLoaded || !appReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppWithAnalytics />
    </QueryClientProvider>
  );
}
