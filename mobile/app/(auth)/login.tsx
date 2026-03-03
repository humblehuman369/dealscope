import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { useLogin, useLoginMfa } from '@/hooks/useSession';
import { isMFA } from '@/services/auth';

export default function LoginScreen() {
  const router = useRouter();
  const login = useLogin();
  const loginMfa = useLoginMfa();
  const passwordRef = useRef<TextInput>(null);
  const mfaRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');

  const isLoading = login.isPending || loginMfa.isPending;

  async function handleLogin() {
    if (!email || !password) return;
    try {
      const result = await login.mutateAsync({ email, password });
      if (isMFA(result)) {
        setChallengeToken(result.challenge_token);
      } else {
        router.replace('/(tabs)/search');
      }
    } catch (err: any) {
      let msg: string;
      if (err?.response?.data?.detail) {
        msg = err.response.data.detail;
      } else if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network')) {
        msg = 'Cannot reach the server. Check your internet connection and try again.';
      } else {
        msg = err?.message ?? 'Login failed. Check your credentials.';
      }
      Alert.alert('Login Error', msg);
    }
  }

  async function handleMfa() {
    if (!challengeToken || totpCode.length !== 6) return;
    try {
      await loginMfa.mutateAsync({ challengeToken, totpCode });
      router.replace('/(tabs)/search');
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Invalid code. Try again.';
      Alert.alert('MFA Error', msg);
    }
  }

  if (challengeToken) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Two-Factor Authentication</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code from your authenticator app.
          </Text>

          <Input
            ref={mfaRef}
            label="Verification Code"
            placeholder="000000"
            value={totpCode}
            onChangeText={setTotpCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            onSubmitEditing={handleMfa}
          />

          <Button
            title="Verify"
            onPress={handleMfa}
            loading={loginMfa.isPending}
            disabled={totpCode.length !== 6}
          />

          <Button
            title="Back to Login"
            variant="ghost"
            onPress={() => {
              setChallengeToken(null);
              setTotpCode('');
            }}
            style={{ marginTop: 12 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>
          DealGap<Text style={styles.brandAccent}>IQ</Text>
        </Text>
        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.subtitle}>
          Analyze any property in seconds.
        </Text>

        <Input
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <Input
          ref={passwordRef}
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleLogin}
        />

        <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Link>

        <Button
          title="Sign In"
          onPress={handleLogin}
          loading={isLoading}
          disabled={!email || !password}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/register">
            <Text style={styles.footerLink}>Sign Up</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brand: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textHeading,
    marginBottom: 8,
  },
  brandAccent: {
    color: colors.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textHeading,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 28,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -8,
  },
  forgotText: {
    color: colors.primary,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
