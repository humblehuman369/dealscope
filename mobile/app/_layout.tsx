import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
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
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { PostHogProvider } from 'posthog-react-native';
import { hydrateTokens } from '@/services/token-manager';
import { initPayments, identifyUser, resetUser } from '@/services/payments';
import {
  persistQueryCache,
  restoreQueryCache,
} from '@/services/query-persistence';
import { initNetworkListener } from '@/hooks/useNetworkStatus';
import { useBiometricLock } from '@/hooks/useBiometricLock';
import { useSession } from '@/hooks/useSession';
import { BiometricLockScreen } from '@/components/auth/BiometricLockScreen';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { colors } from '@/constants/tokens';

SplashScreen.preventAutoHideAsync();

// React Query online manager — auto-pause/resume queries based on connectivity
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(state.isConnected === true && state.isInternetReachable !== false);
  });
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

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

/**
 * Persist query cache when the app goes to background.
 */
function CachePersistenceManager() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    function handleAppState(next: AppStateStatus) {
      if (
        appState.current === 'active' &&
        (next === 'background' || next === 'inactive')
      ) {
        persistQueryCache(queryClient);
      }
      appState.current = next;
    }

    const sub = AppState.addEventListener('change', handleAppState);

    // Also persist every 5 minutes while active
    const interval = setInterval(() => {
      if (appState.current === 'active') {
        persistQueryCache(queryClient);
      }
    }, 5 * 60 * 1000);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, []);

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
      <CachePersistenceManager />
      <OfflineBanner />
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
      options={{ host: POSTHOG_HOST }}
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
      await restoreQueryCache(queryClient);
      await initPayments();
      initNetworkListener();
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
