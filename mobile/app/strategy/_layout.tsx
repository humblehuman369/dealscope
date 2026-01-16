/**
 * Strategy Routes Layout
 */

import { Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

export default function StrategyLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="str/[address]" />
      <Stack.Screen name="brrrr/[address]" />
      <Stack.Screen name="flip/[address]" />
      <Stack.Screen name="househack/[address]" />
      <Stack.Screen name="wholesale/[address]" />
    </Stack>
  );
}

