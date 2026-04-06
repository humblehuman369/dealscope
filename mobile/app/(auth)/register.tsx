import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Linking,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Button, Input } from '@/components/ui';
import { useRegister, useLoginGoogle } from '@/hooks/useSession';
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
  const loginGoogle = useLoginGoogle();

  const [fullName, setFullName] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
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

  async function handleGoogleSignUp() {
    setError('');
    setGoogleLoading(true);
    try {
      const result = await loginGoogle.mutateAsync();
      if (result) {
        router.replace('/(tabs)/search');
      }
    } catch (err: any) {
      const message = err?.message ?? 'Google sign-in failed';
      if (message !== 'User cancelled') {
        setError(message);
      }
    } finally {
      setGoogleLoading(false);
    }
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

          <Pressable
            style={styles.googleButton}
            onPress={handleGoogleSignUp}
            disabled={googleLoading || loginGoogle.isPending}
          >
            <Svg width={16} height={16} viewBox="0 0 16 16">
              <Path d="M15.68 8.18c0-.57-.05-1.12-.15-1.64H8v3.1h4.3a3.68 3.68 0 01-1.6 2.42v2h2.58c1.51-1.4 2.38-3.45 2.38-5.88z" fill="#4285F4" />
              <Path d="M8 16c2.16 0 3.97-.72 5.3-1.94l-2.59-2a4.84 4.84 0 01-7.22-2.54H.88v2.06A8 8 0 008 16z" fill="#34A853" />
              <Path d="M3.49 9.52a4.8 4.8 0 010-3.04V4.42H.88a8 8 0 000 7.16l2.6-2.06z" fill="#FBBC05" />
              <Path d="M8 3.16a4.33 4.33 0 013.07 1.2l2.3-2.3A7.72 7.72 0 008 0 8 8 0 00.88 4.42l2.6 2.06A4.77 4.77 0 018 3.16z" fill="#EA4335" />
            </Svg>
            <Text style={styles.googleButtonText}>
              {googleLoading ? 'Signing up…' : 'Continue with Google'}
            </Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

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
            By creating an account, you agree to our{' '}
            <Text
              style={styles.termsLink}
              onPress={() => Linking.openURL('https://dealgapiq.com/terms')}
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              style={styles.termsLink}
              onPress={() => Linking.openURL('https://dealgapiq.com/privacy')}
            >
              Privacy Policy
            </Text>
            .
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
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    borderRadius: layout.inputRadius,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    backgroundColor: 'rgba(148,163,184,0.06)',
  },
  googleButtonText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(148,163,184,0.15)',
  },
  dividerText: {
    fontFamily: fontFamilies.body,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
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
  termsLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
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
