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
import { useLocalSearchParams, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { StatusCard } from '@/components/ui/StatusCard';
import { authApi } from '@/services/auth';
import { colors, fontFamily, fontSize, spacing, textStyles } from '@/constants/tokens';

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  {
    label: 'One special character',
    test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p),
  },
] as const;

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const insets = useSafeAreaInsets();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const failedReqs = PASSWORD_REQUIREMENTS.filter((r) => !r.test(password));
  const passwordsMatch = password === confirmPassword;
  const canSubmit =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    failedReqs.length === 0 &&
    passwordsMatch;

  async function handleSubmit() {
    if (!canSubmit || !token) return;
    setStatus('loading');
    setMessage('');
    try {
      const data = await authApi.resetPassword(token, password);
      setStatus('success');
      setMessage(data.message || 'Password reset successfully!');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Reset failed. The link may have expired.');
    }
  }

  if (!token) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <StatusCard
          type="error"
          title="Invalid Reset Link"
          message="This password reset link is invalid or has expired."
        >
          <Link href="/(auth)/forgot-password" asChild>
            <Pressable>
              <Text style={styles.actionLink}>Request New Link</Text>
            </Pressable>
          </Link>
        </StatusCard>
      </View>
    );
  }

  if (status === 'success') {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <StatusCard
          type="success"
          title="Password Reset!"
          message={message}
        >
          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.signInBtn}>
              <Text style={styles.signInText}>Sign In</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
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
          { paddingTop: insets.top + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed-outline" size={32} color={colors.accent} />
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your new password below.</Text>
        </View>

        {status === 'error' && message ? <ErrorBanner message={message} /> : null}

        <View style={styles.form}>
          <View>
            <Input
              label="New Password"
              icon="lock-closed-outline"
              placeholder="Enter new password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              secureToggle
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
            />
            {password.length > 0 && (
              <View style={styles.reqList}>
                {PASSWORD_REQUIREMENTS.map((req) => {
                  const passed = req.test(password);
                  return (
                    <View key={req.label} style={styles.reqRow}>
                      {passed ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color={colors.green}
                        />
                      ) : (
                        <View style={styles.reqDot} />
                      )}
                      <Text
                        style={[
                          styles.reqText,
                          passed && { color: colors.green },
                        ]}
                      >
                        {req.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <Input
            label="Confirm Password"
            icon="lock-closed-outline"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={
              confirmPassword.length > 0 && !passwordsMatch
                ? "Passwords don't match"
                : undefined
            }
            secureTextEntry
            secureToggle
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />

          <Button
            title="Reset Password"
            onPress={handleSubmit}
            loading={status === 'loading'}
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
  reqList: {
    marginTop: spacing.sm,
    gap: 4,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reqDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reqText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.secondary,
  },
  actionLink: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.accent,
    marginTop: spacing.sm,
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  signInText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.white,
  },
});
