import { Redirect } from 'expo-router';
import { getAccessToken } from '@/services/token-manager';

export default function Index() {
  const token = getAccessToken();
  if (token) return <Redirect href="/(tabs)/search" />;
  return <Redirect href="/(auth)/login" />;
}
