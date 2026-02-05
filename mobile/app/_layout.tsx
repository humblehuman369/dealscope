import { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AnimatedSplash } from '../components/AnimatedSplash';

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
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
        <Stack.Screen 
          name="property/[address]" 
          options={{ 
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'slide_from_bottom',
            gestureEnabled: false, // Disable swipe gestures to prevent conflicts with sliders
          }} 
        />
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
        <Stack.Screen 
          name="verdict/[address]" 
          options={{ 
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        {/* New Analysis IQ Page */}
        <Stack.Screen 
          name="analysis-iq/[address]" 
          options={{ 
            presentation: 'fullScreenModal',
            headerShown: false,
            animation: 'slide_from_right',
          }} 
        />
        {/* New Verdict IQ Page */}
        <Stack.Screen 
          name="verdict-iq/[address]" 
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
      </Stack>
      
      {/* Animated Splash Screen with pulsating logo */}
      {appReady && showAnimatedSplash && (
        <AnimatedSplash onAnimationComplete={onAnimationComplete} />
      )}
    </>
  );
}
