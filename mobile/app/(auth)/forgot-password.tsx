import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { StatusCard } from '@/components/ui/StatusCard';
import { authApi } from '@/services/auth';
import { colors, fontFamily, fontSize, spacing, textStyles } from '@/constants/tokens';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const emailError =
    email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? 'Enter a valid email'
      : undefined;

  const canSubmit = email.length > 0 && !emailError;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError('');
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <StatusCard
          type="success"
          title="Check your email"
          message="If an account exists with that email, we've sent a password reset link."
        >
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.backLink}>Back to sign in</Text>
            </Pressable>
          </Link>
        </StatusCard>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.backRow}>
            <Ionicons name="arrow-back" size={20} color={colors.secondary} />
            <Text style={styles.backText}>Back to sign in</Text>
          </Pressable>
        </Link>

        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-outline" size={32} color={colors.accent} />
          </View>
          <Text style={styles.title}>Forgot password?</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a link to reset your password.
          </Text>
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        <View style={styles.form}>
          <Input
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />

          <Button
            title="Send Reset Link"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={!canSubmit}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.base },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  backText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...textStyles.h1,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.secondary,
    textAlign: 'center',
  },
  form: {
    gap: spacing.md,
  },
  backLink: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.accent,
    marginTop: spacing.sm,
  },
});
