import { Stack } from 'expo-router';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { colors } from '@/constants/tokens';

export default function ProtectedLayout() {
  return (
    <AuthGuard>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.base },
          animation: 'slide_from_right',
        }}
      />
    </AuthGuard>
  );
}
