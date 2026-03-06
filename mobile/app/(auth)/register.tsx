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
import { useRegister } from '@/hooks/useSession';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing, layout } from '@/constants/spacing';

function getPasswordStrength(pw: string): { label: string; color: string; width: number } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', color: colors.error, width: 25 };
  if (score <= 2) return { label: 'Fair', color: colors.warning, width: 50 };
  if (score <= 3) return { label: 'Good', color: colors.primary, width: 75 };
  return { label: 'Strong', color: colors.success, width: 100 };
}

export default function RegisterScreen() {
  const router = useRouter();
  const register = useRegister();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const strength = password ? getPasswordStrength(password) : null;

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = 'Full name is required';
    else if (fullName.trim().length < 2) errors.fullName = 'Name must be at least 2 characters';
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email address';
    if (!password) errors.password = 'Password is required';
    else {
      if (password.length < 8) errors.password = 'Password must be at least 8 characters';
      else if (!/[A-Z]/.test(password)) errors.password = 'Password must contain at least one uppercase letter';
      else if (!/[a-z]/.test(password)) errors.password = 'Password must contain at least one lowercase letter';
      else if (!/\d/.test(password)) errors.password = 'Password must contain at least one digit';
      else if (!/[^A-Za-z0-9]/.test(password)) errors.password = 'Password must contain at least one special character';
    }
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password';
    else if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setError('');
    try {
      const result = await register.mutateAsync({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
      });
      if (result.access_token) {
        router.replace('/(tabs)/search');
      } else if (result.requires_verification) {
        setSuccess('Check your email to verify your account.');
      } else {
        setSuccess('Account created! Sign in to get started.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Registration failed');
    }
  }

  if (success) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.title}>{success}</Text>
          <Button
            title="Sign in now"
            onPress={() => router.replace('/(auth)/login')}
            style={styles.cta}
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
            <Text style={styles.title}>Create Account</Text>
          </View>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <View style={styles.form}>
            <Input
              label="Full Name"
              value={fullName}
              onChangeText={(t) => {
                setFullName(t);
                setFieldErrors((p) => ({ ...p, fullName: '' }));
              }}
              placeholder="John Doe"
              autoComplete="name"
              autoCapitalize="words"
              error={fieldErrors.fullName}
              returnKeyType="next"
            />

            <Input
              label="Email"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setFieldErrors((p) => ({ ...p, email: '' }));
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={fieldErrors.email}
              returnKeyType="next"
            />

            <View>
              <Input
                label="Password"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setFieldErrors((p) => ({ ...p, password: '' }));
                }}
                placeholder="Create a strong password"
                secureTextEntry
                autoComplete="new-password"
                error={fieldErrors.password}
                returnKeyType="next"
              />
              {strength && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthTrack}>
                    <View
                      style={[
                        styles.strengthFill,
                        { width: `${strength.width}%`, backgroundColor: strength.color },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>
                    Strength: {strength.label}
                  </Text>
                </View>
              )}
            </View>

            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                setFieldErrors((p) => ({ ...p, confirmPassword: '' }));
              }}
              placeholder="Confirm your password"
              secureTextEntry
              autoComplete="new-password"
              error={fieldErrors.confirmPassword}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={register.isPending}
              style={styles.cta}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.linkInline}>Sign in</Text>
            </Pressable>
          </View>

          <Text style={styles.terms}>
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </Text>
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
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  strengthTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.panel,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  linkInline: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  terms: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  successIcon: {
    fontSize: 48,
    color: colors.success,
    marginBottom: spacing.md,
  },
});
