import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { validateEmail } from '../../services/authService';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, isLoading, error, clearError } = useAuth();
  const { theme, isDark } = useTheme();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleLogin = useCallback(async () => {
    // Clear previous errors
    setLocalError(null);
    clearError();
    
    // Validate inputs
    if (!email.trim()) {
      setLocalError('Please enter your email');
      return;
    }
    
    if (!validateEmail(email.trim())) {
      setLocalError('Please enter a valid email address');
      return;
    }
    
    if (!password) {
      setLocalError('Please enter your password');
      return;
    }
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await login({
        email: email.trim().toLowerCase(),
        password,
        remember_me: rememberMe,
      });
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate to main app
      router.replace('/(tabs)/scan');
    } catch (err) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // Error is handled by context
    }
  }, [email, password, rememberMe, login, router, clearError]);

  const handleForgotPassword = useCallback(() => {
    if (!email.trim()) {
      Alert.alert(
        'Enter Email',
        'Please enter your email address first, then tap "Forgot Password".'
      );
      return;
    }
    
    Alert.alert(
      'Reset Password',
      `We'll send a password reset link to ${email.trim()}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Link', 
          onPress: () => {
            // TODO: Implement forgot password
            Alert.alert('Email Sent', 'Check your email for a reset link.');
          }
        },
      ]
    );
  }, [email]);

  const displayError = localError || error;

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: { backgroundColor: theme.background },
    backIcon: isDark ? colors.gray[100] : colors.gray[900],
    logo: { color: isDark ? colors.primary[400] : colors.primary[600] },
    title: { color: theme.text },
    subtitle: { color: theme.textMuted },
    label: { color: isDark ? colors.gray[300] : colors.gray[700] },
    inputContainer: { 
      backgroundColor: isDark ? colors.navy[800] : colors.gray[50],
      borderColor: isDark ? colors.navy[600] : colors.gray[200],
    },
    input: { color: theme.text },
    inputIcon: isDark ? colors.gray[500] : colors.gray[400],
    checkbox: { borderColor: isDark ? colors.gray[600] : colors.gray[300] },
    rememberText: { color: isDark ? colors.gray[400] : colors.gray[600] },
    dividerLine: { backgroundColor: isDark ? colors.navy[700] : colors.gray[200] },
    dividerText: { color: theme.textMuted },
    skipButton: { borderColor: isDark ? colors.navy[600] : colors.gray[300] },
    skipButtonText: { color: isDark ? colors.gray[400] : colors.gray[600] },
    signupText: { color: isDark ? colors.gray[400] : colors.gray[600] },
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, dynamicStyles.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={dynamicStyles.backIcon} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.logo, dynamicStyles.logo]}>InvestIQ</Text>
          <Text style={[styles.title, dynamicStyles.title]}>Welcome back</Text>
          <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
            Sign in to sync your scans and portfolio
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, dynamicStyles.label]}>Email</Text>
            <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
              <Ionicons name="mail-outline" size={20} color={dynamicStyles.inputIcon} />
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                placeholder="you@example.com"
                placeholderTextColor={dynamicStyles.inputIcon}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, dynamicStyles.label]}>Password</Text>
            <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
              <Ionicons name="lock-closed-outline" size={20} color={dynamicStyles.inputIcon} />
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                placeholder="Enter your password"
                placeholderTextColor={dynamicStyles.inputIcon}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={dynamicStyles.inputIcon}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember Me & Forgot Password */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, dynamicStyles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
              <Text style={[styles.rememberText, dynamicStyles.rememberText]}>Remember me</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {displayError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={colors.loss.main} />
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          )}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, dynamicStyles.dividerLine]} />
          <Text style={[styles.dividerText, dynamicStyles.dividerText]}>or</Text>
          <View style={[styles.dividerLine, dynamicStyles.dividerLine]} />
        </View>

        {/* Skip for Now */}
        <TouchableOpacity
          style={[styles.skipButton, dynamicStyles.skipButton]}
          onPress={() => router.replace('/(tabs)/scan')}
        >
          <Text style={[styles.skipButtonText, dynamicStyles.skipButtonText]}>Continue without account</Text>
        </TouchableOpacity>

        {/* Sign Up Link */}
        <View style={styles.signupRow}>
          <Text style={[styles.signupText, dynamicStyles.signupText]}>Don't have an account? </Text>
          <Link href="/auth/register" asChild>
            <TouchableOpacity>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 4,
    marginBottom: 20,
  },
  header: {
    marginBottom: 32,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  rememberText: {
    fontSize: 14,
  },
  forgotText: {
    fontSize: 14,
    color: colors.primary[600],
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.loss.light,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.loss.main,
  },
  loginButton: {
    backgroundColor: colors.primary[600],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: colors.gray[400],
    shadowOpacity: 0,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    paddingHorizontal: 16,
  },
  skipButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signupText: {
    fontSize: 15,
  },
  signupLink: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary[600],
  },
});

