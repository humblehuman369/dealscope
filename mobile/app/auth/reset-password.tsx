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
import { useRouter, useLocalSearchParams, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';
import { resetPassword } from '../../services/authService';
import { isValidToken } from '../../hooks/useValidatedParams';

function validatePassword(pwd: string): string[] {
  const errors: string[] = [];
  if (pwd.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(pwd)) errors.push('One uppercase letter');
  if (!/[a-z]/.test(pwd)) errors.push('One lowercase letter');
  if (!/[0-9]/.test(pwd)) errors.push('One number');
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pwd)) errors.push('One special character');
  return errors;
}

const PASSWORD_RULES = [
  'At least 8 characters',
  'One uppercase letter',
  'One lowercase letter',
  'One number',
  'One special character',
];

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const inputBg = isDark ? '#0f172a' : '#f1f5f9';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#0d9488';

  const passwordErrors = validatePassword(password);
  const passwordsMatch = password === confirmPassword;
  const isValid = password && confirmPassword && passwordErrors.length === 0 && passwordsMatch;

  const handleSubmit = useCallback(async () => {
    if (!isValid || !token) return;

    setStatus('loading');
    setMessage('');

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const data = await resetPassword(token, password);
      setStatus('success');
      setMessage(data.message || 'Password reset successfully!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStatus('error');
      setMessage(err.message || 'Reset failed. The link may have expired.');
    }
  }, [isValid, token, password]);

  // Invalid / missing token
  if (!isValidToken(token)) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 24, borderWidth: 1, borderColor, alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? '#450a0a33' : '#fef2f2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="close-circle" size={32} color="#ef4444" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: textColor, textAlign: 'center', marginBottom: 8 }}>
              Invalid Reset Link
            </Text>
            <Text style={{ fontSize: 14, color: mutedColor, textAlign: 'center', marginBottom: 24 }}>
              This password reset link is invalid or has expired.
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/auth/forgot-password')}
              style={{ backgroundColor: accentColor, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center', width: '100%' }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Request New Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 24, borderWidth: 1, borderColor, alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? '#052e1633' : '#f0fdf4', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="checkmark-circle" size={32} color="#22c55e" />
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: textColor, textAlign: 'center', marginBottom: 8 }}>
              Password Reset!
            </Text>
            <Text style={{ fontSize: 14, color: mutedColor, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
              {message}
            </Text>
            <TouchableOpacity
              onPress={() => router.replace('/auth/login')}
              style={{ backgroundColor: accentColor, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%' }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Sign In</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Form state
  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

          {/* Back */}
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 }}>
            <Ionicons name="arrow-back" size={18} color={mutedColor} />
            <Text style={{ color: mutedColor, fontSize: 14 }}>Back</Text>
          </TouchableOpacity>

          {/* Card */}
          <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 24, borderWidth: 1, borderColor }}>
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? '#0d948833' : '#f0fdfa', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="lock-closed-outline" size={28} color={accentColor} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: textColor, textAlign: 'center', marginBottom: 4 }}>
                Reset Password
              </Text>
              <Text style={{ fontSize: 14, color: mutedColor, textAlign: 'center' }}>
                Enter your new password below.
              </Text>
            </View>

            {/* Error */}
            {status === 'error' && (
              <View style={{ backgroundColor: isDark ? '#450a0a33' : '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <Text style={{ color: '#ef4444', fontSize: 13 }}>{message}</Text>
              </View>
            )}

            {/* New Password */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: mutedColor, marginBottom: 6 }}>New Password</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: inputBg, borderRadius: 12, borderWidth: 1, borderColor, marginBottom: 8 }}>
              <Ionicons name="lock-closed-outline" size={18} color={mutedColor} style={{ paddingLeft: 14 }} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter new password"
                placeholderTextColor={mutedColor}
                secureTextEntry={!showPassword}
                autoFocus
                style={{ flex: 1, padding: 14, color: textColor, fontSize: 15 }}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ paddingRight: 14 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={mutedColor} />
              </TouchableOpacity>
            </View>

            {/* Password requirements */}
            {password.length > 0 && (
              <View style={{ marginBottom: 16, gap: 4 }}>
                {PASSWORD_RULES.map((rule, i) => {
                  const passed = !passwordErrors.includes(rule);
                  return (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons
                        name={passed ? 'checkmark-circle' : 'ellipse-outline'}
                        size={14}
                        color={passed ? '#22c55e' : mutedColor}
                      />
                      <Text style={{ fontSize: 12, color: passed ? '#22c55e' : mutedColor }}>{rule}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Confirm Password */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: mutedColor, marginBottom: 6 }}>Confirm Password</Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: inputBg,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: confirmPassword && !passwordsMatch ? '#ef4444' : borderColor,
              marginBottom: confirmPassword && !passwordsMatch ? 4 : 20,
            }}>
              <Ionicons name="lock-closed-outline" size={18} color={mutedColor} style={{ paddingLeft: 14 }} />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={mutedColor}
                secureTextEntry={!showPassword}
                style={{ flex: 1, padding: 14, color: textColor, fontSize: 15 }}
              />
            </View>
            {confirmPassword && !passwordsMatch && (
              <Text style={{ fontSize: 12, color: '#ef4444', marginBottom: 16 }}>Passwords don't match</Text>
            )}

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={status === 'loading' || !isValid}
              style={{
                backgroundColor: accentColor,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                opacity: status === 'loading' || !isValid ? 0.5 : 1,
              }}
            >
              {status === 'loading' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
