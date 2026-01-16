import { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AnimatedSplash } from '../components/AnimatedSplash';

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
      </Stack>
      
      {/* Animated Splash Screen with pulsating logo */}
      {appReady && showAnimatedSplash && (
        <AnimatedSplash onAnimationComplete={onAnimationComplete} />
      )}
    </>
  );
}
