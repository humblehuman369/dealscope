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
import { register as registerUser, validateEmail, validatePassword } from '../../services/authService';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(true);

  const passwordValidation = password.length > 0 ? validatePassword(password) : null;

  // Simple password strength
  const strengthScore = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (password.length >= 12) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[a-z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthLabel = strengthScore <= 2 ? 'Weak' : strengthScore <= 3 ? 'Fair' : strengthScore <= 4 ? 'Good' : 'Strong';
  const strengthColor = strengthScore <= 2 ? '#ef4444' : strengthScore <= 3 ? '#eab308' : strengthScore <= 4 ? '#3b82f6' : '#22c55e';

  const handleRegister = useCallback(async () => {
    setError(null);

    if (fullName.trim().length < 2) { setError('Name must be at least 2 characters'); return; }
    if (!validateEmail(email)) { setError('Please enter a valid email address'); return; }
    if (!validatePassword(password).valid) { setError('Password does not meet requirements'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setIsLoading(true);
    try {
      const result = await registerUser(email, password, fullName.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRequiresVerification((result as any).requires_verification ?? true);
      setSuccess(true);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  }, [fullName, email, password, confirmPassword]);

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const inputBg = isDark ? '#0f172a' : '#f1f5f9';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#0d9488';

  // Success screen — conditional based on whether email verification is required
  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 32, borderWidth: 1, borderColor, alignItems: 'center', width: '100%' }}>
          <Ionicons name="checkmark-circle" size={56} color="#22c55e" />
          <Text style={{ fontSize: 20, fontWeight: '700', color: textColor, marginTop: 16, textAlign: 'center' }}>
            {requiresVerification ? 'Check your email' : 'Account created'}
          </Text>
          <Text style={{ fontSize: 14, color: mutedColor, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
            {requiresVerification
              ? "We've sent a verification link to your email. Please verify your account before signing in."
              : 'Your account has been created successfully. You can now sign in.'}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/auth/login')}
            style={{ marginTop: 24, backgroundColor: accentColor, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              {requiresVerification ? 'Go to Sign In' : 'Sign In Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

          {/* Back button */}
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20 }}>
            <Ionicons name="arrow-back" size={20} color={mutedColor} />
            <Text style={{ fontSize: 14, color: mutedColor }}>Back</Text>
          </TouchableOpacity>

          <View style={{ marginBottom: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: textColor }}>Create Account</Text>
            <Text style={{ fontSize: 14, color: mutedColor, marginTop: 4 }}>Start analyzing investment deals</Text>
          </View>

          <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 24, borderWidth: 1, borderColor }}>
            {error && (
              <View style={{ backgroundColor: isDark ? '#450a0a33' : '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text style={{ color: '#ef4444', fontSize: 13, flex: 1 }}>{error}</Text>
              </View>
            )}

            {/* Full Name */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: mutedColor, marginBottom: 6 }}>Full Name</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: inputBg, borderRadius: 12, borderWidth: 1, borderColor, marginBottom: 16 }}>
              <Ionicons name="person-outline" size={18} color={mutedColor} style={{ paddingLeft: 14 }} />
              <TextInput value={fullName} onChangeText={setFullName} placeholder="John Doe" placeholderTextColor={mutedColor} autoComplete="name" style={{ flex: 1, padding: 14, color: textColor, fontSize: 15 }} />
            </View>

            {/* Email */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: mutedColor, marginBottom: 6 }}>Email</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: inputBg, borderRadius: 12, borderWidth: 1, borderColor, marginBottom: 16 }}>
              <Ionicons name="mail-outline" size={18} color={mutedColor} style={{ paddingLeft: 14 }} />
              <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={mutedColor} autoCapitalize="none" keyboardType="email-address" autoComplete="email" style={{ flex: 1, padding: 14, color: textColor, fontSize: 15 }} />
            </View>

            {/* Password */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: mutedColor, marginBottom: 6 }}>Password</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: inputBg, borderRadius: 12, borderWidth: 1, borderColor, marginBottom: 8 }}>
              <Ionicons name="lock-closed-outline" size={18} color={mutedColor} style={{ paddingLeft: 14 }} />
              <TextInput value={password} onChangeText={setPassword} placeholder="Create a strong password" placeholderTextColor={mutedColor} secureTextEntry={!showPassword} autoComplete="new-password" style={{ flex: 1, padding: 14, color: textColor, fontSize: 15 }} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ paddingRight: 14 }}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={mutedColor} />
              </TouchableOpacity>
            </View>

            {/* Strength bar */}
            {password.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 3, marginBottom: 4 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: i <= strengthScore ? strengthColor : (isDark ? '#334155' : '#e2e8f0') }} />
                  ))}
                </View>
                <Text style={{ fontSize: 11, color: mutedColor }}>Strength: {strengthLabel}</Text>
              </View>
            )}

            {/* Confirm Password */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: mutedColor, marginBottom: 6 }}>Confirm Password</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: inputBg, borderRadius: 12, borderWidth: 1, borderColor, marginBottom: 20 }}>
              <Ionicons name="lock-closed-outline" size={18} color={mutedColor} style={{ paddingLeft: 14 }} />
              <TextInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm your password" placeholderTextColor={mutedColor} secureTextEntry={!showPassword} autoComplete="new-password" style={{ flex: 1, padding: 14, color: textColor, fontSize: 15 }} />
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={isLoading}
              style={{ backgroundColor: accentColor, borderRadius: 12, padding: 16, alignItems: 'center', opacity: isLoading ? 0.6 : 1 }}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Create Account</Text>}
            </TouchableOpacity>

            <Text style={{ fontSize: 11, color: mutedColor, textAlign: 'center', marginTop: 12 }}>
              By creating an account, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20, gap: 4 }}>
            <Text style={{ fontSize: 14, color: mutedColor }}>Already have an account?</Text>
            <Link href="/auth/login" asChild>
              <TouchableOpacity>
                <Text style={{ fontSize: 14, color: accentColor, fontWeight: '600' }}>Sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
