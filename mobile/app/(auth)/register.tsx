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
import { useRegister } from '@/hooks/useSession';

export default function RegisterScreen() {
  const router = useRouter();
  const register = useRegister();

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const passwordsMatch = password === confirm;
  const canSubmit =
    fullName.length >= 2 &&
    email.length > 0 &&
    password.length >= 8 &&
    passwordsMatch;

  async function handleRegister() {
    if (!canSubmit) return;
    try {
      const result = await register.mutateAsync({ email, password, fullName });
      if (result.requires_verification) {
        Alert.alert(
          'Check Your Email',
          'We sent a verification link to your email address.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
        );
      } else {
        router.replace('/(tabs)/search');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ?? 'Registration failed. Try again.';
      Alert.alert('Error', msg);
    }
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
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          Start analyzing investment properties today.
        </Text>

        <Input
          label="Full Name"
          placeholder="Jane Doe"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />

        <Input
          ref={emailRef}
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
          placeholder="Min 8 characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
        />

        <Input
          ref={confirmRef}
          label="Confirm Password"
          placeholder="Re-enter password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          returnKeyType="go"
          error={
            confirm.length > 0 && !passwordsMatch
              ? 'Passwords do not match'
              : undefined
          }
          onSubmitEditing={handleRegister}
        />

        <Button
          title="Create Account"
          onPress={handleRegister}
          loading={register.isPending}
          disabled={!canSubmit}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login">
            <Text style={styles.footerLink}>Sign In</Text>
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
