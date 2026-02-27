import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { StatusCard } from '@/components/ui/StatusCard';
import { useRegister } from '@/hooks/useSession';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
  textStyles,
} from '@/constants/tokens';

function getPasswordStrength(pwd: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 2) return { score, label: 'Weak', color: colors.red };
  if (score <= 3) return { score, label: 'Fair', color: colors.gold };
  if (score <= 4) return { score, label: 'Good', color: colors.accent };
  return { score, label: 'Strong', color: colors.green };
}

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const registerMutation = useRegister();

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const nameError =
    fullName.length > 0 && fullName.trim().length < 2
      ? 'Name must be at least 2 characters'
      : undefined;
  const emailError =
    email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? 'Enter a valid email'
      : undefined;
  const pwdErrors: string[] = [];
  if (password.length > 0) {
    if (password.length < 8) pwdErrors.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) pwdErrors.push('One uppercase letter');
    if (!/[a-z]/.test(password)) pwdErrors.push('One lowercase letter');
    if (!/[0-9]/.test(password)) pwdErrors.push('One number');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password))
      pwdErrors.push('One special character');
  }
  const confirmError =
    confirmPassword.length > 0 && password !== confirmPassword
      ? 'Passwords do not match'
      : undefined;

  const strength = password ? getPasswordStrength(password) : null;
  const canSubmit =
    fullName.trim().length >= 2 &&
    email.length > 0 &&
    !emailError &&
    password.length >= 8 &&
    pwdErrors.length === 0 &&
    password === confirmPassword;

  async function handleRegister() {
    if (!canSubmit) return;
    setError('');
    try {
      const result = await registerMutation.mutateAsync({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
      });

      if (result.user && result.access_token) {
        router.replace('/');
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    }
  }

  if (success) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <StatusCard
          type="success"
          title="Check your email"
          message="We've sent a verification link to your email address. Please verify your account to sign in."
        >
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.successLink}>Back to sign in</Text>
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
          <Text style={styles.logo}>DealGapIQ</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Start analyzing deals in minutes</Text>
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        <View style={styles.form}>
          <Input
            label="Full Name"
            icon="person-outline"
            placeholder="John Doe"
            value={fullName}
            onChangeText={setFullName}
            error={nameError}
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />

          <Input
            ref={emailRef}
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

          <View>
            <Input
              ref={passwordRef}
              label="Password"
              icon="lock-closed-outline"
              placeholder="Create a strong password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              secureToggle
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            {strength && password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthSegment,
                        {
                          backgroundColor:
                            i <= strength.score ? strength.color : colors.border,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.strengthLabel}>
                  Strength: {strength.label}
                </Text>
              </View>
            )}
            {password.length > 0 && pwdErrors.length > 0 && (
              <View style={styles.requirements}>
                {pwdErrors.map((req) => (
                  <Text key={req} style={styles.requirementText}>
                    • {req}
                  </Text>
                ))}
              </View>
            )}
          </View>

          <Input
            ref={confirmRef}
            label="Confirm Password"
            icon="lock-closed-outline"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={confirmError}
            secureTextEntry
            secureToggle
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={handleRegister}
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={registerMutation.isPending}
            disabled={!canSubmit}
          />

          <Text style={styles.terms}>
            By creating an account, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.footerLink}>Sign in</Text>
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
  strengthContainer: {
    marginTop: spacing.sm,
  },
  strengthBar: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.secondary,
  },
  requirements: {
    marginTop: spacing.sm,
    gap: 2,
  },
  requirementText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.red,
  },
  terms: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: fontSize.xs * 1.6,
  },
  termsLink: {
    color: colors.accent,
    textDecorationLine: 'underline',
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
  successLink: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.accent,
    marginTop: spacing.sm,
  },
});
