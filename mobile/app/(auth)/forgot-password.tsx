import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { authApi } from '@/services/auth';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email) return;
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      Alert.alert(
        'Check Your Email',
        'If an account exists with that email, we sent a password reset link.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err: any) {
      const status = err?.response?.status;
      if (status && status >= 500) {
        Alert.alert(
          'Something Went Wrong',
          'We couldn\'t process your request right now. Please try again later.',
        );
      } else {
        Alert.alert(
          'Check Your Email',
          'If an account exists with that email, we sent a password reset link.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      }
    } finally {
      setLoading(false);
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
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a link to reset your password.
        </Text>

        <Input
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
        />

        <Button
          title="Send Reset Link"
          onPress={handleSubmit}
          loading={loading}
          disabled={!email}
        />

        <Link href="/(auth)/login" style={styles.backLink}>
          <Text style={styles.backText}>Back to Sign In</Text>
        </Link>
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
  backLink: {
    alignSelf: 'center',
    marginTop: 20,
  },
  backText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
