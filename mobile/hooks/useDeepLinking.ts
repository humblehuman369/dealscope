import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { getAccessToken } from '@/services/token-manager';

const ALLOWED_HOSTS = ['dealgapiq.com', 'www.dealgapiq.com'];

function parseDeepLink(url: string): { pathname: string; params: Record<string, string> } | null {
  try {
    const parsed = Linking.parse(url);
    const host = parsed.hostname ?? '';
    const path = parsed.path ?? '';

    if (parsed.scheme === 'https' && !ALLOWED_HOSTS.includes(host)) {
      return null;
    }

    if (path.startsWith('verdict') || path.startsWith('property')) {
      const address = parsed.queryParams?.address as string | undefined;
      if (address) return { pathname: '/verdict', params: { address } };
    }

    if (path.startsWith('reset-password')) {
      const token = parsed.queryParams?.token as string | undefined;
      if (token) return { pathname: '/(auth)/forgot-password', params: {} };
    }

    if (path.startsWith('verify-email')) {
      return { pathname: '/(auth)/login', params: {} };
    }

    return null;
  } catch {
    return null;
  }
}

export function useDeepLinking() {
  const router = useRouter();

  useEffect(() => {
    function handleUrl({ url }: { url: string }) {
      const result = parseDeepLink(url);
      if (!result) return;

      const hasToken = !!getAccessToken();
      if (!hasToken && result.pathname !== '/(auth)/login' && result.pathname !== '/(auth)/forgot-password') {
        router.replace('/(auth)/login');
        return;
      }

      router.push({ pathname: result.pathname as any, params: result.params });
    }

    const subscription = Linking.addEventListener('url', handleUrl);

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => subscription.remove();
  }, [router]);
}
