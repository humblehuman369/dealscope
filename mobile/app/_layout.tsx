import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { hydrateTokens } from '@/services/token-manager';
import { colors } from '@/constants/colors';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  const [fontsLoaded] = useFonts({
    'DMSans-Bold': require('../assets/fonts/DMSans-Variable.ttf'),
    'DMSans-Medium': require('../assets/fonts/DMSans-Variable.ttf'),
    'SourceSans3-Regular': require('../assets/fonts/SourceSans3-Variable.ttf'),
    'SourceSans3-SemiBold': require('../assets/fonts/SourceSans3-Variable.ttf'),
    'SourceSans3-Bold': require('../assets/fonts/SourceSans3-Variable.ttf'),
    'SpaceMono-Regular': require('../assets/fonts/SpaceMono-Regular.ttf'),
    'SpaceMono-Bold': require('../assets/fonts/SpaceMono-Bold.ttf'),
  });

  useEffect(() => {
    hydrateTokens().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (fontsLoaded && ready) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.base },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="analyzing" options={{ animation: 'fade' }} />
          <Stack.Screen name="verdict" />
          <Stack.Screen name="strategy" />
          <Stack.Screen name="deal-maker" />
          <Stack.Screen name="property-details" />
          <Stack.Screen name="comps" />
          <Stack.Screen name="pricing" />
          <Stack.Screen name="about" />
          <Stack.Screen name="(protected)" />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
