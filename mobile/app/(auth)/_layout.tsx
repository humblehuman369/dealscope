import { Stack } from 'expo-router';
import { colors } from '@/constants/tokens';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.base },
        animation: 'slide_from_right',
      }}
    />
  );
}
