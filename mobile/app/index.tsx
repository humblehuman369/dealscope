import { Redirect } from 'expo-router';
import { getAccessToken } from '@/services/token-manager';

export default function Index() {
  const hasToken = !!getAccessToken();
  return <Redirect href={hasToken ? '/(tabs)/search' : '/(auth)/login'} />;
}
