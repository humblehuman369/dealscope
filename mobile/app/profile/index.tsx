import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { userService } from '../../services/userService';
import { changePassword } from '../../services/authService';
import type { UserResponse, UserProfileResponse, ExperienceLevel, RiskTolerance } from '../../types';

const EXPERIENCE_OPTIONS: { label: string; value: ExperienceLevel }[] = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
  { label: 'Expert', value: 'expert' },
];

const RISK_OPTIONS: { label: string; value: RiskTolerance }[] = [
  { label: 'Conservative', value: 'conservative' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Aggressive', value: 'aggressive' },
];

const STRATEGY_OPTIONS = [
  { label: 'Long-Term Rental', value: 'ltr' },
  { label: 'Short-Term Rental', value: 'str' },
  { label: 'BRRRR', value: 'brrrr' },
  { label: 'Fix & Flip', value: 'flip' },
  { label: 'House Hack', value: 'house_hack' },
  { label: 'Wholesale', value: 'wholesale' },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { theme, isDark } = useTheme();

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // User data
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);

  // Form state - Account
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseState, setLicenseState] = useState('');
  const [bio, setBio] = useState('');

  // Form state - Investor Profile
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance | null>(null);
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Load user data
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const [userData, profileData] = await Promise.all([
        userService.getCurrentUser(),
        userService.getUserProfile().catch(() => null),
      ]);

      // Set account fields
      setFullName(userData.full_name || '');
      setBusinessName(userData.business_name || '');
      setBusinessType(userData.business_type || '');
      setLicenseNumber(userData.license_number || '');
      setLicenseState(userData.license_state || '');
      setBio(userData.bio || '');

      // Set profile fields
      if (profileData) {
        setProfile(profileData);
        setExperience(profileData.investment_experience);
        setRiskTolerance(profileData.risk_tolerance);
        setSelectedStrategies(profileData.preferred_strategies || []);
        setBudgetMin(profileData.investment_budget_min?.toString() || '');
        setBudgetMax(profileData.investment_budget_max?.toString() || '');
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAccount = async () => {
    try {
      setIsSaving(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await userService.updateUser({
        full_name: fullName || null,
        business_name: businessName || null,
        business_type: businessType || null,
        license_number: licenseNumber || null,
        license_state: licenseState || null,
        bio: bio || null,
      });

      await refreshUser?.();
      Alert.alert('Success', 'Account information saved');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await userService.updateUserProfile({
        investment_experience: experience,
        risk_tolerance: riskTolerance,
        preferred_strategies: selectedStrategies.length > 0 ? selectedStrategies : null,
        investment_budget_min: budgetMin ? parseFloat(budgetMin) : null,
        investment_budget_max: budgetMax ? parseFloat(budgetMax) : null,
      });

      Alert.alert('Success', 'Investor profile saved');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    try {
      setIsChangingPassword(true);
      await changePassword(currentPassword, newPassword);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert('Success', 'Password changed successfully');
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await userService.deleteAccount();
              router.replace('/auth/login');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const toggleStrategy = (strategy: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStrategies((prev) =>
      prev.includes(strategy) ? prev.filter((s) => s !== strategy) : [...prev, strategy]
    );
  };

  // Dynamic styles
  const dynamicStyles = {
    container: { backgroundColor: theme.background },
    header: { backgroundColor: theme.headerBackground, borderBottomColor: theme.headerBorder },
    title: { color: theme.text },
    section: { backgroundColor: theme.card, borderColor: isDark ? colors.primary[700] : colors.primary[200] },
    sectionTitle: { color: theme.sectionTitle },
    label: { color: theme.textSecondary },
    input: { backgroundColor: theme.backgroundTertiary, color: theme.text, borderColor: theme.border },
    divider: { backgroundColor: theme.divider },
  };

  if (isLoading) {
    return (
      <View style={[styles.container, dynamicStyles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, dynamicStyles.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, dynamicStyles.title]}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Account Information */}
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>ACCOUNT INFORMATION</Text>
          <View style={[styles.section, dynamicStyles.section]}>
            <View style={styles.field}>
              <Text style={[styles.label, dynamicStyles.label]}>Full Name</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your name"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <View style={styles.field}>
              <Text style={[styles.label, dynamicStyles.label]}>Email</Text>
              <Text style={[styles.valueText, { color: theme.textMuted }]}>{user?.email}</Text>
            </View>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <View style={styles.field}>
              <Text style={[styles.label, dynamicStyles.label]}>Business Name</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Your company name"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <View style={styles.field}>
              <Text style={[styles.label, dynamicStyles.label]}>Business Type</Text>
              <TextInput
                style={[styles.input, dynamicStyles.input]}
                value={businessType}
                onChangeText={setBusinessType}
                placeholder="e.g., LLC, Sole Proprietor"
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <View style={styles.fieldRow}>
              <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, dynamicStyles.label]}>License #</Text>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  placeholder="License number"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View style={[styles.field, { width: 80 }]}>
                <Text style={[styles.label, dynamicStyles.label]}>State</Text>
                <TextInput
                  style={[styles.input, dynamicStyles.input]}
                  value={licenseState}
                  onChangeText={setLicenseState}
                  placeholder="FL"
                  placeholderTextColor={theme.textMuted}
                  maxLength={2}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <View style={styles.field}>
              <Text style={[styles.label, dynamicStyles.label]}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea, dynamicStyles.input]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself..."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSaveAccount}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Account Info</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Investor Profile */}
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>INVESTOR PROFILE</Text>
          <View style={[styles.section, dynamicStyles.section]}>
            <View style={styles.field}>
              <Text style={[styles.label, dynamicStyles.label]}>Experience Level</Text>
              <View style={styles.optionRow}>
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionChip,
                      experience === opt.value && styles.optionChipSelected,
                      { borderColor: experience === opt.value ? colors.primary[500] : theme.border },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setExperience(opt.value);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        { color: experience === opt.value ? colors.primary[500] : theme.textSecondary },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <View style={styles.field}>
              <Text style={[styles.label, dynamicStyles.label]}>Risk Tolerance</Text>
              <View style={styles.optionRow}>
                {RISK_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionChip,
                      riskTolerance === opt.value && styles.optionChipSelected,
                      { borderColor: riskTolerance === opt.value ? colors.primary[500] : theme.border },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRiskTolerance(opt.value);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        { color: riskTolerance === opt.value ? colors.primary[500] : theme.textSecondary },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <View style={styles.field}>
              <Text style={[styles.label, dynamicStyles.label]}>Preferred Strategies</Text>
              <View style={styles.strategyGrid}>
                {STRATEGY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.strategyChip,
                      selectedStrategies.includes(opt.value) && styles.strategyChipSelected,
                      {
                        borderColor: selectedStrategies.includes(opt.value)
                          ? colors.primary[500]
                          : theme.border,
                        backgroundColor: selectedStrategies.includes(opt.value)
                          ? isDark
                            ? colors.primary[900]
                            : colors.primary[50]
                          : 'transparent',
                      },
                    ]}
                    onPress={() => toggleStrategy(opt.value)}
                  >
                    <Ionicons
                      name={selectedStrategies.includes(opt.value) ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={selectedStrategies.includes(opt.value) ? colors.primary[500] : theme.textMuted}
                    />
                    <Text
                      style={[
                        styles.strategyChipText,
                        {
                          color: selectedStrategies.includes(opt.value)
                            ? colors.primary[500]
                            : theme.textSecondary,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <View style={styles.field}>
              <Text style={[styles.label, dynamicStyles.label]}>Investment Budget</Text>
              <View style={styles.fieldRow}>
                <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
                  <TextInput
                    style={[styles.input, dynamicStyles.input]}
                    value={budgetMin}
                    onChangeText={setBudgetMin}
                    placeholder="Min ($)"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <Text style={{ color: theme.textMuted, marginTop: 8 }}>to</Text>
                <View style={[styles.field, { flex: 1, marginLeft: 8 }]}>
                  <TextInput
                    style={[styles.input, dynamicStyles.input]}
                    value={budgetMax}
                    onChangeText={setBudgetMax}
                    placeholder="Max ($)"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSaveProfile}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Investor Profile</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Security */}
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>SECURITY</Text>
          <View style={[styles.section, dynamicStyles.section]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowPasswordChange(!showPasswordChange)}
            >
              <View
                style={[styles.menuIcon, { backgroundColor: isDark ? colors.info.dark + '30' : colors.info.light }]}
              >
                <Ionicons name="lock-closed" size={18} color={colors.info.main} />
              </View>
              <Text style={[styles.menuTitle, { color: theme.text }]}>Change Password</Text>
              <Ionicons
                name={showPasswordChange ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.textMuted}
              />
            </TouchableOpacity>

            {showPasswordChange && (
              <View style={styles.passwordSection}>
                <TextInput
                  style={[styles.input, dynamicStyles.input, { marginBottom: 12 }]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Current password"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry
                />
                <TextInput
                  style={[styles.input, dynamicStyles.input, { marginBottom: 12 }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry
                />
                <TextInput
                  style={[styles.input, dynamicStyles.input, { marginBottom: 12 }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry
                />
                <TouchableOpacity
                  style={[styles.saveButton, isChangingPassword && styles.saveButtonDisabled]}
                  onPress={handlePasswordChange}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>DANGER ZONE</Text>
          <View style={[styles.section, dynamicStyles.section]}>
            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
              <View
                style={[
                  styles.menuIcon,
                  { backgroundColor: isDark ? colors.loss.dark + '30' : colors.loss.light },
                ]}
              >
                <Ionicons name="trash" size={18} color={colors.loss.main} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, { color: colors.loss.main }]}>Delete Account</Text>
                <Text style={[styles.menuSubtitle, { color: theme.textMuted }]}>
                  Permanently delete your account and all data
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionWrapper: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  field: {
    marginBottom: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  valueText: {
    fontSize: 15,
    paddingVertical: 10,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  optionChipSelected: {
    backgroundColor: 'transparent',
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  strategyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  strategyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  strategyChipSelected: {},
  strategyChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: colors.primary[600],
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    backgroundColor: colors.gray[400],
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  menuSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  passwordSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
});
