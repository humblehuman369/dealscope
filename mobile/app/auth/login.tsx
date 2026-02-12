import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { validateEmail } from '../../services/authService';
import type { MFAChallengeResponse } from '../../services/authService';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, loginMfa, isLoading } = useAuth();
  const { theme, isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // MFA state
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const handleLogin = useCallback(async () => {
    setError(null);

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 1) {
      setError('Please enter your password');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await login(email, password, rememberMe);

      if ('mfa_required' in result && result.mfa_required) {
        setMfaChallenge((result as MFAChallengeResponse).challenge_token);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || 'Login failed. Please try again.');
    }
  }, [email, password, rememberMe, login, router]);

  const handleMfaSubmit = useCallback(async () => {
    if (!mfaChallenge || mfaCode.length !== 6) return;
    setError(null);

    try {
      await loginMfa(mfaChallenge, mfaCode, rememberMe);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || 'Invalid MFA code');
    }
  }, [mfaChallenge, mfaCode, rememberMe, loginMfa, router]);

  const handleForgotPassword = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/auth/forgot-password');
  }, [router]);

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const inputBg = isDark ? '#0f172a' : '#f1f5f9';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#0d9488';

  // MFA Screen
  if (mfaChallenge) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
            <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 24, borderWidth: 1, borderColor }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: textColor, textAlign: 'center', marginBottom: 8 }}>
                Two-Factor Authentication
              </Text>
              <Text style={{ fontSize: 14, color: mutedColor, textAlign: 'center', marginBottom: 24 }}>
                Enter the 6-digit code from your authenticator app.
              </Text>

              {error && (
                <View style={{ backgroundColor: isDark ? '#450a0a33' : '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <Text style={{ color: '#ef4444', fontSize: 13 }}>{error}</Text>
                </View>
              )}

              <TextInput
                value={mfaCode}
                onChangeText={(t) => setMfaCode(t.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={mutedColor}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                style={{
                  backgroundColor: inputBg,
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 24,
                  fontWeight: '600',
                  color: textColor,
                  textAlign: 'center',
                  letterSpacing: 12,
                  borderWidth: 1,
                  borderColor,
                  marginBottom: 16,
                }}
              />

              <TouchableOpacity
                onPress={handleMfaSubmit}
                disabled={isLoading || mfaCode.length !== 6}
                style={{
                  backgroundColor: accentColor,
                  borderRadius: 12,
                  padding: 16,
                  alignItems: 'center',
                  opacity: isLoading || mfaCode.length !== 6 ? 0.5 : 1,
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Verify</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setMfaChallenge(null); setMfaCode(''); setError(null); }}
                style={{ marginTop: 16, alignItems: 'center' }}
              >
                <Text style={{ color: mutedColor, fontSize: 14 }}>Back to login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Login Screen
  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

          {/* Title */}
          <View style={{ marginBottom: 32, alignItems: 'center' }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: textColor }}>
              DealHub<Text style={{ color: accentColor }}>IQ</Text>
            </Text>
            <Text style={{ fontSize: 15, color: mutedColor, marginTop: 6 }}>Sign in to your account</Text>
          </View>

          {/* Card */}
          <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 24, borderWidth: 1, borderColor }}>
            {error && (
              <View style={{ backgroundColor: isDark ? '#450a0a33' : '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={{ color: '#ef4444', fontSize: 13, flex: 1 }}>{error}</Text>
              </View>
            )}

            {/* Email */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: mutedColor, marginBottom: 6 }}>Email</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: inputBg, borderRadius: 12, borderWidth: 1, borderColor, marginBottom: 16 }}>
              <Ionicons name="mail-outline" size={18} color={mutedColor} style={{ paddingLeft: 14 }} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={mutedColor}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                style={{ flex: 1, padding: 14, color: textColor, fontSize: 15 }}
              />
            </View>

            {/* Password */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: mutedColor, marginBottom: 6 }}>Password</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: inputBg, borderRadius: 12, borderWidth: 1, borderColor, marginBottom: 12 }}>
              <Ionicons name="lock-closed-outline" size={18} color={mutedColor} style={{ paddingLeft: 14 }} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={mutedColor}
                secureTextEntry={!showPassword}
                autoComplete="password"
                style={{ flex: 1, padding: 14, color: textColor, fontSize: 15 }}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ paddingRight: 14 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={mutedColor} />
              </TouchableOpacity>
            </View>

            {/* Remember me + Forgot */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <TouchableOpacity onPress={() => setRememberMe(!rememberMe)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={rememberMe ? 'checkbox' : 'square-outline'} size={20} color={rememberMe ? accentColor : mutedColor} />
                <Text style={{ fontSize: 13, color: mutedColor }}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={{ fontSize: 13, color: accentColor }}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              style={{
                backgroundColor: accentColor,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Register link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20, gap: 4 }}>
            <Text style={{ fontSize: 14, color: mutedColor }}>Don't have an account?</Text>
            <Link href="/auth/register" asChild>
              <TouchableOpacity>
                <Text style={{ fontSize: 14, color: accentColor, fontWeight: '600' }}>Sign up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
