/**
 * Strategy Routes Layout
 */

import { Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { colors } from '@/theme/colors';

export default function StrategyLayout() {
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'strategy/_layout.tsx:StrategyLayout',message:'Strategy layout theme source',data:{isDark,hasColorsDark:!!(colors as any).dark,hasColorsLight:!!(colors as any).light,themeDefined:!!theme},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

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

