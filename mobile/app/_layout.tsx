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
import { hydrateTokens } from '@/services/token-manager';
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
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.base },
          animation: 'slide_from_right',
        }}
      />
      <StatusBar style="light" />
    </QueryClientProvider>
  );
}
