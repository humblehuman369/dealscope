import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '@/components/ui';
import { authApi } from '@/services/auth';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing, layout } from '@/constants/spacing';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.successIcon}>✉️</Text>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            If an account exists with that email, we've sent a password reset link.
          </Text>
          <Pressable onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.link}>Back to sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back to sign in</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.logo}>DealGapIQ</Text>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you a link to reset your password.
            </Text>
          </View>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setEmailError('');
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={emailError}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <Button
              title="Send Reset Link"
              onPress={handleSubmit}
              loading={loading}
              style={styles.cta}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['2xl'],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  backBtn: {
    marginBottom: spacing.xl,
  },
  backText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logo: {
    fontFamily: fontFamilies.heading,
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.textHeading,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  form: { gap: spacing.md },
  cta: { marginTop: spacing.sm },
  errorBanner: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.error,
    backgroundColor: colors.errorBg,
    padding: spacing.md,
    borderRadius: layout.inputRadius,
    textAlign: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  link: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xl,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
});
