import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
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
  onlineManager,
} from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import PostHog, { PostHogProvider, usePostHog } from 'posthog-react-native';
import { hydrateTokens } from '@/services/token-manager';
import { initPayments, identifyUser, resetUser } from '@/services/payments';
import {
  persistQueryCache,
  restoreQueryCache,
} from '@/services/query-persistence';
import { initNetworkListener } from '@/hooks/useNetworkStatus';
import { useBiometricLock } from '@/hooks/useBiometricLock';
import { useSession } from '@/hooks/useSession';
import { useNotificationSetup } from '@/hooks/useNotifications';
import {
  configureNotificationHandler,
  configureNotificationChannels,
} from '@/services/notifications';
import {
  setAnalyticsClient,
  identifyAnalyticsUser,
  resetAnalyticsUser,
  trackAppOpened,
  trackScreenView,
} from '@/services/analytics';
import { BiometricLockScreen } from '@/components/auth/BiometricLockScreen';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { InAppNotificationManager } from '@/components/ui/InAppNotification';
import {
  ErrorBoundary,
  GlobalCrashScreen,
} from '@/components/ui/ErrorBoundary';
import { colors } from '@/constants/tokens';

// ---------------------------------------------------------------------------
// Sentry initialization
// ---------------------------------------------------------------------------

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
  });
}

SplashScreen.preventAutoHideAsync();

// ---------------------------------------------------------------------------
// React Query — offline-first
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// PostHog config
// ---------------------------------------------------------------------------

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';
const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

// ---------------------------------------------------------------------------
// Identity sync components
// ---------------------------------------------------------------------------

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

function AnalyticsIdentitySync() {
  const { user, isAuthenticated } = useSession();
  const posthog = usePostHog();

  useEffect(() => {
    if (posthog) setAnalyticsClient(posthog);
  }, [posthog]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      identifyAnalyticsUser(user.id, {
        subscription_tier: user.subscription_tier,
      });
    } else {
      resetAnalyticsUser();
    }
  }, [isAuthenticated, user?.id, user?.subscription_tier]);

  return null;
}

function ScreenTracker() {
  const pathname = usePathname();
  const prevPath = useRef('');

  useEffect(() => {
    if (pathname && pathname !== prevPath.current) {
      prevPath.current = pathname;
      trackScreenView(pathname);
    }
  }, [pathname]);

  return null;
}

// ---------------------------------------------------------------------------
// Cache persistence
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------

function AppContent() {
  const { isLocked, unlock } = useBiometricLock();
  useNotificationSetup();

  useEffect(() => {
    trackAppOpened('organic');
  }, []);

  if (isLocked) {
    return <BiometricLockScreen onRetry={unlock} />;
  }

  return (
    <>
      <PaymentIdentitySync />
      <AnalyticsIdentitySync />
      <ScreenTracker />
      <CachePersistenceManager />
      <OfflineBanner />
      <InAppNotificationManager />
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

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------

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
      configureNotificationHandler();
      await configureNotificationChannels();
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
    <ErrorBoundary
      name="RootLayout"
      fallback={({ error, reset }) => (
        <GlobalCrashScreen error={error} onRetry={reset} />
      )}
    >
      <QueryClientProvider client={queryClient}>
        <AppWithAnalytics />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
