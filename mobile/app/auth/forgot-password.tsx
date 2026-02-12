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

import { useTheme } from '../../context/ThemeContext';
import { validateEmail, forgotPassword } from '../../services/authService';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const inputBg = isDark ? '#0f172a' : '#f1f5f9';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#0d9488';

  const handleSubmit = useCallback(async () => {
    if (!validateEmail(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await forgotPassword(email.trim());
      // Always show success to prevent email enumeration
      setStatus('success');
      setMessage('If an account exists with that email, a reset link has been sent.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Even on error, show success to prevent email enumeration
      setStatus('success');
      setMessage('If an account exists with that email, a reset link has been sent.');
    }
  }, [email]);

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
              Check Your Email
            </Text>
            <Text style={{ fontSize: 14, color: mutedColor, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
              {message}
            </Text>

            <Text style={{ fontSize: 13, color: mutedColor, textAlign: 'center', marginBottom: 20 }}>
              Didn't receive an email? Check your spam folder or{' '}
              <Text
                onPress={() => { setStatus('idle'); setEmail(''); }}
                style={{ color: accentColor }}
              >
                try again
              </Text>
            </Text>

            <TouchableOpacity
              onPress={() => router.replace('/auth/login')}
              style={{ backgroundColor: accentColor, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center', width: '100%' }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Back to Login</Text>
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

          {/* Back button */}
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 }}>
            <Ionicons name="arrow-back" size={18} color={mutedColor} />
            <Text style={{ color: mutedColor, fontSize: 14 }}>Back</Text>
          </TouchableOpacity>

          {/* Card */}
          <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 24, borderWidth: 1, borderColor }}>
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? '#0d948833' : '#f0fdfa', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="mail-outline" size={28} color={accentColor} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: textColor, textAlign: 'center', marginBottom: 4 }}>
                Forgot Password?
              </Text>
              <Text style={{ fontSize: 14, color: mutedColor, textAlign: 'center' }}>
                No worries, we'll send you reset instructions.
              </Text>
            </View>

            {/* Error */}
            {status === 'error' && (
              <View style={{ backgroundColor: isDark ? '#450a0a33' : '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={{ color: '#ef4444', fontSize: 13, flex: 1 }}>{message}</Text>
              </View>
            )}

            {/* Email input */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: mutedColor, marginBottom: 6 }}>Email Address</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: inputBg, borderRadius: 12, borderWidth: 1, borderColor, marginBottom: 20 }}>
              <Ionicons name="mail-outline" size={18} color={mutedColor} style={{ paddingLeft: 14 }} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={mutedColor}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                autoFocus
                style={{ flex: 1, padding: 14, color: textColor, fontSize: 15 }}
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={status === 'loading' || !email.trim()}
              style={{
                backgroundColor: accentColor,
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: status === 'loading' || !email.trim() ? 0.5 : 1,
              }}
            >
              {status === 'loading' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Send Reset Link</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Login link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20, gap: 4 }}>
            <Text style={{ fontSize: 14, color: mutedColor }}>Remember your password?</Text>
            <Link href="/auth/login" asChild>
              <TouchableOpacity>
                <Text style={{ fontSize: 14, color: accentColor, fontWeight: '600' }}>Back to login</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
