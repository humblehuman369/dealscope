import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useLogin, useLoginMfa } from '@/hooks/useSession';
import {
  isBiometricAvailable,
  getBiometricType,
  setBiometricEnabled,
  authenticateWithBiometric,
} from '@/services/biometric';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
  textStyles,
} from '@/constants/tokens';
import type { MFAChallengeResponse } from '@/services/auth';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  // MFA state
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const mfaInputRef = useRef<TextInput>(null);

  const loginMutation = useLogin();
  const mfaMutation = useLoginMfa();
  const passwordRef = useRef<TextInput>(null);

  const isLoading = loginMutation.isPending || mfaMutation.isPending;

  const emailError =
    email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? 'Enter a valid email'
      : undefined;

  const passwordError =
    password.length > 0 && password.length < 1
      ? 'Password is required'
      : undefined;

  const canSubmit = email.length > 0 && password.length > 0 && !emailError;

  async function handleLogin() {
    if (!canSubmit) return;
    setError('');
    try {
      const result = await loginMutation.mutateAsync({
        email: email.trim(),
        password,
        rememberMe,
      });

      if ('mfa_required' in result && result.mfa_required) {
        setMfaChallenge((result as MFAChallengeResponse).challenge_token);
        return;
      }

      await promptBiometric();
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    }
  }

  async function handleMfaSubmit() {
    if (!mfaChallenge || mfaCode.length !== 6) return;
    setError('');
    try {
      await mfaMutation.mutateAsync({
        challengeToken: mfaChallenge,
        totpCode: mfaCode,
        rememberMe,
      });
      await promptBiometric();
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Invalid code. Please try again.');
    }
  }

  async function promptBiometric() {
    const available = await isBiometricAvailable();
    if (!available) return;
    const type = await getBiometricType();
    Alert.alert(
      `Enable ${type}?`,
      `Unlock DealGapIQ with ${type} for faster access next time.`,
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Enable',
          onPress: async () => {
            const success = await authenticateWithBiometric();
            if (success) await setBiometricEnabled(true);
          },
        },
      ],
    );
  }

  useEffect(() => {
    if (mfaChallenge) {
      setTimeout(() => mfaInputRef.current?.focus(), 300);
    }
  }, [mfaChallenge]);

  // ── MFA Screen ───────────────────────────────────────────────────
  if (mfaChallenge) {
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
          <View style={styles.mfaContainer}>
            <View style={styles.mfaIconCircle}>
              <Ionicons name="shield-checkmark" size={36} color={colors.accent} />
            </View>
            <Text style={styles.mfaTitle}>Two-Factor Authentication</Text>
            <Text style={styles.mfaSubtitle}>
              Enter the 6-digit code from your authenticator app.
            </Text>

            {error ? <ErrorBanner message={error} /> : null}

            <TextInput
              ref={mfaInputRef}
              style={styles.mfaInput}
              value={mfaCode}
              onChangeText={(t) => setMfaCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              selectionColor={colors.accent}
            />

            <Button
              title="Verify"
              onPress={handleMfaSubmit}
              loading={mfaMutation.isPending}
              disabled={mfaCode.length !== 6}
            />

            <Pressable
              onPress={() => {
                setMfaChallenge(null);
                setMfaCode('');
                setError('');
              }}
            >
              <Text style={styles.linkText}>Back to login</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Login Screen ─────────────────────────────────────────────────
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
          <Text style={styles.logo}>DealGapIQ</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
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
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <Input
            ref={passwordRef}
            label="Password"
            icon="lock-closed-outline"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            secureTextEntry
            secureToggle
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />

          <View style={styles.optionsRow}>
            <Pressable
              style={styles.rememberRow}
              onPress={() => setRememberMe((v) => !v)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe && (
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                )}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </Pressable>

            <Link href="/(auth)/forgot-password" asChild>
              <Pressable>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            </Link>
          </View>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={isLoading}
            disabled={!canSubmit}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google OAuth */}
          <Pressable style={styles.googleButton} onPress={() => {
            // Google OAuth will be wired to expo-auth-session in deep link config.
            // For now, placeholder that demonstrates the UI.
            Alert.alert('Google Sign-In', 'Google OAuth will be configured with your Google Cloud Console credentials.');
          }}>
            <Ionicons name="logo-google" size={20} color={colors.heading} />
            <Text style={styles.googleText}>Continue with Google</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={styles.footerLink}>Sign up</Text>
            </Pressable>
          </Link>
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
  logo: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    color: colors.accent,
    marginBottom: spacing.md,
  },
  title: {
    ...textStyles.h1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.secondary,
  },
  form: {
    gap: spacing.md,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  rememberText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  forgotText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.accent,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.muted,
    marginHorizontal: spacing.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    minHeight: 50,
  },
  googleText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    color: colors.heading,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  footerLink: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.accent,
  },
  // MFA
  mfaContainer: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing['3xl'],
  },
  mfaIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  mfaTitle: {
    ...textStyles.h2,
    textAlign: 'center',
  },
  mfaSubtitle: {
    ...textStyles.body,
    color: colors.secondary,
    textAlign: 'center',
  },
  mfaInput: {
    width: '100%',
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    color: colors.heading,
    textAlign: 'center',
    letterSpacing: 12,
    paddingVertical: 16,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  linkText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginTop: spacing.sm,
  },
});
