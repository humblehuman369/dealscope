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
import Svg, { Path } from 'react-native-svg';
import { Button, Input } from '@/components/ui';
import { useLogin, useLoginMfa, useLoginGoogle } from '@/hooks/useSession';
import { isMFA } from '@/services/auth';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing, layout } from '@/constants/spacing';

export default function LoginScreen() {
  const router = useRouter();
  const login = useLogin();
  const loginMfa = useLoginMfa();
  const loginGoogle = useLoginGoogle();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [googleLoading, setGoogleLoading] = useState(false);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email address';
    if (!password) errors.password = 'Password is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleGoogleLogin() {
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

  async function handleLogin() {
    if (!validate()) return;
    setError('');
    try {
      const result = await login.mutateAsync({ email: email.trim(), password });
      if (isMFA(result)) {
        setChallengeToken(result.challenge_token);
      } else {
        router.replace('/(tabs)/search');
      }
    } catch (err: any) {
      if (!err?.response) {
        setError(
          'Unable to reach the server. Check your internet connection and try again.',
        );
      } else if (err.response.status === 423) {
        setError(err.response.data?.detail ?? 'Account temporarily locked. Please wait and try again.');
      } else if (err.response.status === 403) {
        setError(err.response.data?.detail ?? 'Please verify your email before signing in.');
      } else {
        setError(err.response.data?.detail ?? err.message ?? 'Login failed. Please try again.');
      }
    }
  }

  async function handleMfa() {
    if (!mfaCode || mfaCode.length !== 6) return;
    setError('');
    try {
      await loginMfa.mutateAsync({ challengeToken: challengeToken!, totpCode: mfaCode });
      router.replace('/(tabs)/search');
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Invalid MFA code');
    }
  }

  if (challengeToken) {
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
              <Text style={styles.title}>Two-Factor Authentication</Text>
              <Text style={styles.subtitle}>
                Enter the 6-digit code from your authenticator app.
              </Text>
            </View>

            {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

            <Input
              label="MFA Code"
              value={mfaCode}
              onChangeText={setMfaCode}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleMfa}
            />

            <Button
              title="Verify"
              onPress={handleMfa}
              loading={loginMfa.isPending}
              disabled={mfaCode.length !== 6}
              style={styles.cta}
            />

            <Pressable onPress={() => setChallengeToken(null)}>
              <Text style={styles.link}>Back to login</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
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
            <Text style={styles.title}>Sign In</Text>
            <Text style={styles.subtitle}>
              Analyze any property across 6 investment strategies
            </Text>
          </View>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <Pressable
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={googleLoading || loginGoogle.isPending}
          >
            <Svg width={16} height={16} viewBox="0 0 16 16">
              <Path d="M15.68 8.18c0-.57-.05-1.12-.15-1.64H8v3.1h4.3a3.68 3.68 0 01-1.6 2.42v2h2.58c1.51-1.4 2.38-3.45 2.38-5.88z" fill="#4285F4" />
              <Path d="M8 16c2.16 0 3.97-.72 5.3-1.94l-2.59-2a4.84 4.84 0 01-7.22-2.54H.88v2.06A8 8 0 008 16z" fill="#34A853" />
              <Path d="M3.49 9.52a4.8 4.8 0 010-3.04V4.42H.88a8 8 0 000 7.16l2.6-2.06z" fill="#FBBC05" />
              <Path d="M8 3.16a4.33 4.33 0 013.07 1.2l2.3-2.3A7.72 7.72 0 008 0 8 8 0 00.88 4.42l2.6 2.06A4.77 4.77 0 018 3.16z" fill="#EA4335" />
            </Svg>
            <Text style={styles.googleButtonText}>
              {googleLoading ? 'Signing in…' : 'Continue with Google'}
            </Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.form}>
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

            <Input
              label="Password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setFieldErrors((p) => ({ ...p, password: '' }));
              }}
              placeholder="Enter your password"
              secureTextEntry
              autoComplete="current-password"
              error={fieldErrors.password}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotRow}
            >
              <Text style={styles.linkSmall}>Forgot password?</Text>
            </Pressable>

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={login.isPending}
              style={styles.cta}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.link}>Sign up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.base,
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['2xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
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
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    borderRadius: layout.inputRadius,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    backgroundColor: 'rgba(148,163,184,0.08)',
  },
  googleButtonText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textBody,
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
    color: colors.textSecondary,
    fontWeight: '500',
  },
  form: {
    gap: spacing.md,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
  },
  cta: {
    marginTop: spacing.sm,
  },
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  link: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  linkSmall: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});
