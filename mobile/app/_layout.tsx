import { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AnimatedSplash } from '../components/AnimatedSplash';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { OfflineBanner } from '../components/OfflineBanner';
import { useDeepLinking } from '../hooks/useDeepLinking';
import NetInfo from '@react-native-community/netinfo';

// Initialize Sentry for error tracking
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: 0.1, // 10% of transactions
    enableAutoSessionTracking: true,
    // Don't send errors in development
    enabled: !__DEV__,
    beforeSend(event) {
      // Don't send PII
      if (event.user) {
        delete event.user.ip_address;
        delete event.user.email;
      }
      return event;
    },
  });
}

// Prevent splash screen from hiding until app is ready
SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash screen may already be hidden in Expo Go
});

// Wire NetInfo into React Query so it pauses fetching when offline
// and auto-refetches when back online.
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected && state.isInternetReachable !== false);
  });
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // Data fresh for 5 min — prevents re-fetching on back-nav
      gcTime: 1000 * 60 * 30,         // Keep unused cache for 30 min (offline fallback window)
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000), // exponential: 1s, 2s, 4s…10s
      refetchOnReconnect: 'always',   // Always refresh stale data when coming back online
      networkMode: 'offlineFirst',    // Return cached data immediately, refetch in background
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Hide native splash screen immediately to show our animated one
    const hideNativeSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch {
        // Ignore - splash screen may already be hidden in Expo Go
      }
      setAppReady(true);
    };
    
    // Small delay to ensure smooth transition
    const timer = setTimeout(hideNativeSplash, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleAnimationComplete = useCallback(() => {
    setShowAnimatedSplash(false);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <SafeAreaProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <AppContent 
                  appReady={appReady} 
                  showAnimatedSplash={showAnimatedSplash}
                  onAnimationComplete={handleAnimationComplete}
                />
              </GestureHandlerRootView>
            </SafeAreaProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function AppContent({ 
  appReady, 
  showAnimatedSplash, 
  onAnimationComplete 
}: { 
  appReady: boolean; 
  showAnimatedSplash: boolean; 
  onAnimationComplete: () => void;
}) {
  const { theme } = useTheme();

  // Handle deep links / universal links from shared property URLs
  useDeepLinking();

  return (
    <>
      <StatusBar style={theme.statusBar} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        {/* IQ Verdict Flow Screens */}
        <Stack.Screen 
          name="analyzing/[address]" 
          options={{ 
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'fade',
            gestureEnabled: false, // Prevent going back during analysis
          }} 
        />
        {/* Verdict IQ Page */}
        <Stack.Screen 
          name="verdict-iq/[address]" 
          options={{ 
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        {/* Strategy IQ Page (Page 2 of VerdictIQ split) */}
        <Stack.Screen 
          name="strategy-iq/[address]" 
          options={{ 
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        {/* Property Details Page */}
        <Stack.Screen 
          name="property-details/[address]" 
          options={{ 
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        {/* Onboarding Flow */}
        <Stack.Screen 
          name="onboarding/index" 
          options={{ 
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'fade',
            gestureEnabled: false,
          }} 
        />
        {/* Deal Gap Analysis */}
        <Stack.Screen 
          name="deal-gap/[address]" 
          options={{ 
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        {/* Rehab Estimator */}
        <Stack.Screen 
          name="rehab/index" 
          options={{ 
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        {/* Price Intel (Comps & Valuation) */}
        <Stack.Screen 
          name="price-intel/[address]" 
          options={{ 
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        {/* Strategy Worksheets */}
        <Stack.Screen 
          name="worksheet/[strategy]" 
          options={{ 
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        {/* Photo Gallery */}
        <Stack.Screen 
          name="photos/[zpid]" 
          options={{ 
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        {/* Search History */}
        <Stack.Screen 
          name="search-history/index" 
          options={{ 
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        {/* Strategy Education */}
        <Stack.Screen 
          name="learn/[strategy]" 
          options={{ 
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        {/* National Averages */}
        <Stack.Screen 
          name="national-averages/index" 
          options={{ 
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
      </Stack>
      
      {/* Offline connectivity banner — slides down when no internet */}
      <OfflineBanner />

      {/* Animated Splash Screen with pulsating logo */}
      {appReady && showAnimatedSplash && (
        <AnimatedSplash onAnimationComplete={onAnimationComplete} />
      )}
    </>
  );
}
