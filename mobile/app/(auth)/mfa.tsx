import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useLoginMfa } from '@/hooks/useSession';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
  textStyles,
} from '@/constants/tokens';

/**
 * Standalone MFA screen — used when navigating from login
 * with a challenge token passed as a search param.
 *
 * The login screen handles inline MFA for immediate challenges,
 * but deep links or other flows may route here directly.
 */
export default function MFAScreen() {
  const router = useRouter();
  const { challengeToken, rememberMe } = useLocalSearchParams<{
    challengeToken?: string;
    rememberMe?: string;
  }>();
  const insets = useSafeAreaInsets();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  const mfaMutation = useLoginMfa();

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  async function handleVerify() {
    if (!challengeToken || code.length !== 6) return;
    setError('');
    try {
      await mfaMutation.mutateAsync({
        challengeToken,
        totpCode: code,
        rememberMe: rememberMe === 'true',
      });
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Invalid code. Please try again.');
      setCode('');
    }
  }

  if (!challengeToken) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing['3xl'] }]}>
        <View style={styles.errorCard}>
          <Ionicons name="warning" size={32} color={colors.gold} />
          <Text style={styles.errorTitle}>Missing Challenge</Text>
          <Text style={styles.errorText}>
            No MFA challenge token found. Please sign in again.
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.backLink}>Back to sign in</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.content, { paddingTop: insets.top + spacing['3xl'] }]}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={36} color={colors.accent} />
        </View>

        <Text style={styles.title}>Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code from your authenticator app.
        </Text>

        {error ? <ErrorBanner message={error} /> : null}

        <TextInput
          ref={inputRef}
          style={styles.codeInput}
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
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
          onPress={handleVerify}
          loading={mfaMutation.isPending}
          disabled={code.length !== 6}
          style={styles.verifyBtn}
        />

        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Text style={styles.backLink}>Back to login</Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...textStyles.h2,
    textAlign: 'center',
  },
  subtitle: {
    ...textStyles.body,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  codeInput: {
    width: '100%',
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    color: colors.heading,
    textAlign: 'center',
    letterSpacing: 12,
    paddingVertical: 18,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  verifyBtn: {
    width: '100%',
  },
  backLink: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    marginTop: spacing.sm,
  },
  errorCard: {
    alignItems: 'center',
    gap: spacing.md,
  },
  errorTitle: {
    ...textStyles.h2,
    textAlign: 'center',
  },
  errorText: {
    ...textStyles.body,
    color: colors.secondary,
    textAlign: 'center',
  },
});
