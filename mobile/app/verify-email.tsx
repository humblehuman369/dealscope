import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { authApi } from '@/services/auth';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email and try again.');
      return;
    }

    (async () => {
      try {
        const result = await authApi.verifyEmail(token);
        setStatus('success');
        setMessage(result.message ?? 'Your email has been verified successfully.');
      } catch (err: any) {
        setStatus('error');
        setMessage(err?.response?.data?.detail ?? 'Verification failed. The link may have expired.');
      }
    })();
  }, [token]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.text}>Verifying your email...</Text>
          </>
        )}

        {status === 'success' && (
          <>
            <Text style={styles.icon}>✓</Text>
            <Text style={styles.title}>Email Verified</Text>
            <Text style={styles.text}>{message}</Text>
            <Button
              title="Sign In"
              onPress={() => router.replace('/(auth)/login')}
              style={styles.btn}
            />
          </>
        )}

        {status === 'error' && (
          <>
            <Text style={styles.icon}>✗</Text>
            <Text style={styles.title}>Verification Failed</Text>
            <Text style={styles.text}>{message}</Text>
            <Button
              title="Back to Sign In"
              onPress={() => router.replace('/(auth)/login')}
              style={styles.btn}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  icon: {
    fontSize: 48,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.textHeading,
  },
  text: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  btn: { marginTop: spacing.md, width: 200 },
});
