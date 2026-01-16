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
  Image,
  Alert,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { validateEmail, validatePassword } from '../../services/authService';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register, isLoading, error, clearError } = useAuth();
  const { theme, isDark } = useTheme();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localErrors, setLocalErrors] = useState<string[]>([]);

  const handleRegister = useCallback(async () => {
    // Clear previous errors
    setLocalErrors([]);
    clearError();
    
    const errors: string[] = [];
    
    // Validate inputs
    if (!fullName.trim()) {
      errors.push('Please enter your name');
    }
    
    if (!email.trim()) {
      errors.push('Please enter your email');
    } else if (!validateEmail(email.trim())) {
      errors.push('Please enter a valid email address');
    }
    
    if (!password) {
      errors.push('Please enter a password');
    } else {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        errors.push(...passwordValidation.errors);
      }
    }
    
    if (password !== confirmPassword) {
      errors.push('Passwords do not match');
    }
    
    if (errors.length > 0) {
      setLocalErrors(errors);
      return;
    }
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
      });
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate to main app
      router.replace('/(tabs)/scan');
    } catch (err: any) {
      // Check if this is a verification required message (not really an error)
      const message = err?.message || '';
      if (message.includes('verify your email') || message.includes('check your email')) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Check Your Email',
          'We sent you a verification email. Please click the link in the email to verify your account before signing in.',
          [
            { 
              text: 'OK', 
              onPress: () => router.replace('/auth/login')
            }
          ]
        );
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        // Error is handled by context
      }
    }
  }, [fullName, email, password, confirmPassword, register, router, clearError]);

  const displayErrors = localErrors.length > 0 ? localErrors : error ? [error] : [];

  // Password strength indicator
  const passwordStrength = password.length === 0 ? 0 : 
    password.length < 8 ? 1 :
    (validatePassword(password).valid ? 3 : 2);

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
    strengthBar: { backgroundColor: isDark ? colors.navy[600] : colors.gray[200] },
    strengthText: { color: theme.textMuted },
    passwordHint: { color: isDark ? colors.gray[500] : colors.gray[400] },
    terms: { color: theme.textMuted },
    signinText: { color: isDark ? colors.gray[400] : colors.gray[600] },
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
          <View style={styles.logoContainer}>
            <Image
              source={isDark 
                ? require('../../assets/InvestIQ Logo 3D (Dark View).png')
                : require('../../assets/InvestIQ Logo 3D (Light View).png')
              }
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.logo, dynamicStyles.logo]}>
              Invest<Text style={styles.logoAccent}>IQ</Text>
            </Text>
          </View>
          <Text style={[styles.title, dynamicStyles.title]}>Create account</Text>
          <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
            Join thousands of real estate investors
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Full Name Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, dynamicStyles.label]}>Full Name</Text>
            <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
              <Ionicons name="person-outline" size={20} color={dynamicStyles.inputIcon} />
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                placeholder="John Smith"
                placeholderTextColor={dynamicStyles.inputIcon}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
              />
            </View>
          </View>

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
                placeholder="Create a strong password"
                placeholderTextColor={dynamicStyles.inputIcon}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                returnKeyType="next"
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
            
            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBars}>
                  <View style={[
                    styles.strengthBar,
                    dynamicStyles.strengthBar,
                    passwordStrength >= 1 && styles.strengthBarWeak
                  ]} />
                  <View style={[
                    styles.strengthBar,
                    dynamicStyles.strengthBar,
                    passwordStrength >= 2 && styles.strengthBarMedium
                  ]} />
                  <View style={[
                    styles.strengthBar,
                    dynamicStyles.strengthBar,
                    passwordStrength >= 3 && styles.strengthBarStrong
                  ]} />
                </View>
                <Text style={[
                  styles.strengthText,
                  dynamicStyles.strengthText,
                  passwordStrength === 1 && { color: colors.loss.main },
                  passwordStrength === 2 && { color: '#f59e0b' },
                  passwordStrength === 3 && { color: colors.profit.main },
                ]}>
                  {passwordStrength === 1 && 'Weak'}
                  {passwordStrength === 2 && 'Medium'}
                  {passwordStrength === 3 && 'Strong'}
                </Text>
              </View>
            )}
            
            <Text style={[styles.passwordHint, dynamicStyles.passwordHint]}>
              Min 8 characters, uppercase, lowercase, and number
            </Text>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, dynamicStyles.label]}>Confirm Password</Text>
            <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
              <Ionicons name="lock-closed-outline" size={20} color={dynamicStyles.inputIcon} />
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                placeholder="Confirm your password"
                placeholderTextColor={dynamicStyles.inputIcon}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                returnKeyType="go"
                onSubmitEditing={handleRegister}
              />
              {confirmPassword.length > 0 && (
                <Ionicons
                  name={password === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={password === confirmPassword ? colors.profit.main : colors.loss.main}
                />
              )}
            </View>
          </View>

          {/* Error Messages */}
          {displayErrors.length > 0 && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color={colors.loss.main} />
              <View style={styles.errorList}>
                {displayErrors.map((err, index) => (
                  <Text key={index} style={styles.errorText}>• {err}</Text>
                ))}
              </View>
            </View>
          )}

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Terms */}
          <Text style={[styles.terms, dynamicStyles.terms]}>
            By creating an account, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>

        {/* Sign In Link */}
        <View style={styles.signinRow}>
          <Text style={[styles.signinText, dynamicStyles.signinText]}>Already have an account? </Text>
          <Link href="/auth/login" asChild>
            <TouchableOpacity>
              <Text style={styles.signinLink}>Sign in</Text>
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
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  logoImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
  },
  logoAccent: {
    color: colors.primary[500],
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
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  strengthBarWeak: {
    backgroundColor: colors.loss.main,
  },
  strengthBarMedium: {
    backgroundColor: '#f59e0b',
  },
  strengthBarStrong: {
    backgroundColor: colors.profit.main,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  passwordHint: {
    fontSize: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.loss.light,
    padding: 12,
    borderRadius: 8,
  },
  errorList: {
    flex: 1,
  },
  errorText: {
    fontSize: 14,
    color: colors.loss.main,
    marginBottom: 2,
  },
  registerButton: {
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
  registerButtonDisabled: {
    backgroundColor: colors.gray[400],
    shadowOpacity: 0,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  terms: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary[600],
    fontWeight: '500',
  },
  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signinText: {
    fontSize: 15,
  },
  signinLink: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary[600],
  },
});

