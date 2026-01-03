import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../context/AuthContext';

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
  useEffect(() => {
    // Hide splash screen after a brief delay
    const timer = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
      } catch {
        // Ignore - splash screen may already be hidden in Expo Go
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style="auto" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#f9fafb' },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="auth" options={{ headerShown: false }} />
              <Stack.Screen 
                name="property/[address]" 
                options={{ 
                  presentation: 'fullScreenModal',
                  headerShown: false, // WebView provides its own header
                  animation: 'slide_from_bottom',
                }} 
              />
            </Stack>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
