import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusCard } from '@/components/ui/StatusCard';
import { authApi } from '@/services/auth';
import { colors, fontFamily, fontSize, spacing } from '@/constants/tokens';

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function verify() {
      if (!token) {
        setStatus('error');
        setMessage('No verification token provided.');
        return;
      }

      try {
        const data = await authApi.verifyEmail(token);
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Verification failed. The link may have expired.');
      }
    }

    verify();
  }, [token]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing['2xl'] }]}>
      {status === 'loading' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingTitle}>Verifying your email...</Text>
          <Text style={styles.loadingText}>
            Please wait while we verify your email address.
          </Text>
        </View>
      )}

      {status === 'success' && (
        <StatusCard
          type="success"
          title="Email Verified!"
          message="Your email has been verified successfully. You can now sign in to your account."
        >
          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.signInBtn}>
              <Text style={styles.signInText}>Sign In</Text>
            </Pressable>
          </Link>
        </StatusCard>
      )}

      {status === 'error' && (
        <StatusCard
          type="error"
          title="Verification Failed"
          message={message}
        >
          <Link href="/" asChild>
            <Pressable>
              <Text style={styles.homeLink}>Go to Home</Text>
            </Pressable>
          </Link>
          <Text style={styles.helpText}>
            Need help?{' '}
            <Text style={styles.helpLink}>Contact Support</Text>
          </Text>
        </StatusCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    gap: spacing.md,
  },
  loadingTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    color: colors.heading,
    marginTop: spacing.md,
  },
  loadingText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    textAlign: 'center',
  },
  signInBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  signInText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.white,
  },
  homeLink: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.accent,
    marginTop: spacing.sm,
  },
  helpText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginTop: spacing.md,
  },
  helpLink: {
    color: colors.accent,
  },
});
