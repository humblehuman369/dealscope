import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, Input } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/services/auth';
import { clearTokens } from '@/services/token-manager';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing, layout } from '@/constants/spacing';

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters');
      return;
    }
    setPwLoading(true);
    setPwError('');
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPwSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err?.response?.data?.detail ?? 'Failed to update password');
    } finally {
      setPwLoading(false);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, saved properties, and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: () => confirmDeleteAccount(),
        },
      ],
    );
  }

  async function confirmDeleteAccount() {
    setDeleting(true);
    try {
      await authApi.deleteAccount();
      queryClient.clear();
      router.replace('/(auth)/login');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail ?? 'Failed to delete account. Please try again.');
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card glow="sm" style={styles.section}>
          <Text style={styles.sectionTitle}>CHANGE PASSWORD</Text>

          {pwError ? <Text style={styles.error}>{pwError}</Text> : null}
          {pwSuccess ? <Text style={styles.success}>{pwSuccess}</Text> : null}

          <Input
            label="Current Password"
            value={currentPassword}
            onChangeText={(t) => { setCurrentPassword(t); setPwError(''); setPwSuccess(''); }}
            secureTextEntry
            placeholder="Current password"
          />
          <Input
            label="New Password"
            value={newPassword}
            onChangeText={(t) => { setNewPassword(t); setPwError(''); }}
            secureTextEntry
            placeholder="New password"
          />
          <Input
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); setPwError(''); }}
            secureTextEntry
            placeholder="Confirm new password"
          />
          <Button
            title="Update Password"
            onPress={handleChangePassword}
            loading={pwLoading}
            disabled={!currentPassword || !newPassword || !confirmPassword}
          />
        </Card>

        <Card glow="sm" style={styles.section}>
          <Text style={styles.sectionTitle}>TWO-FACTOR AUTHENTICATION</Text>
          <Text style={styles.sectionDesc}>
            {user?.mfa_enabled
              ? 'Two-factor authentication is enabled on your account.'
              : 'Add an extra layer of security to your account. MFA can be configured in your account settings on the web.'}
          </Text>
        </Card>

        <Card glow="sm" style={[styles.section, styles.dangerSection]}>
          <Text style={styles.sectionTitle}>DELETE ACCOUNT</Text>
          <Text style={styles.sectionDesc}>
            Permanently delete your account and all associated data including saved
            properties, search history, and subscription. This cannot be undone.
          </Text>
          <Button
            title={deleting ? 'Deleting...' : 'Delete Account'}
            variant="secondary"
            onPress={handleDeleteAccount}
            loading={deleting}
            style={styles.deleteBtn}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backArrow: { fontSize: 22, color: colors.textBody },
  headerTitle: { ...typography.h3, color: colors.textHeading },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  section: { padding: spacing.md, gap: spacing.md },
  dangerSection: {
    borderColor: 'rgba(248,113,113,0.3)',
  },
  sectionTitle: { ...typography.label, color: colors.textLabel },
  sectionDesc: { ...typography.bodySmall, color: colors.textSecondary },
  error: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.error,
    backgroundColor: colors.errorBg,
    padding: spacing.sm,
    borderRadius: layout.inputRadius,
    overflow: 'hidden',
  },
  success: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.success,
    backgroundColor: colors.successBg,
    padding: spacing.sm,
    borderRadius: layout.inputRadius,
    overflow: 'hidden',
  },
  deleteBtn: {
    borderColor: colors.error,
  },
});
