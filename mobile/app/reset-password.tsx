import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '@/components/ui';
import { authApi } from '@/services/auth';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing, layout } from '@/constants/spacing';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleReset() {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Password reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.icon}>✓</Text>
          <Text style={styles.title}>Password Reset</Text>
          <Text style={styles.subtitle}>
            Your password has been reset successfully. You can now sign in with your new password.
          </Text>
          <Button
            title="Sign In"
            onPress={() => router.replace('/(auth)/login')}
            style={styles.btn}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={styles.icon}>✗</Text>
          <Text style={styles.title}>Invalid Link</Text>
          <Text style={styles.subtitle}>
            This password reset link is invalid or has expired. Please request a new one.
          </Text>
          <Button
            title="Back to Sign In"
            onPress={() => router.replace('/(auth)/login')}
            style={styles.btn}
          />
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
          <View style={styles.header}>
            <Text style={styles.logo}>DealGapIQ</Text>
            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.subtitle}>
              Enter your new password below.
            </Text>
          </View>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <View style={styles.form}>
            <Input
              label="New Password"
              value={newPassword}
              onChangeText={(t) => { setNewPassword(t); setError(''); }}
              placeholder="Enter new password"
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="next"
            />
            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
              placeholder="Confirm new password"
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={handleReset}
            />
            <Button
              title="Reset Password"
              onPress={handleReset}
              loading={loading}
              disabled={!newPassword || !confirmPassword}
              style={styles.btn}
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
    gap: spacing.md,
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
  icon: {
    fontSize: 48,
    color: colors.success,
  },
  form: { gap: spacing.md },
  btn: { marginTop: spacing.sm },
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
});
