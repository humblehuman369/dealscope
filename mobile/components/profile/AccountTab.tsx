import { useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useUpdateUser, type UserProfile } from '@/hooks/useProfileData';
import { authApi } from '@/services/auth';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

interface AccountTabProps {
  user: UserProfile;
}

export function AccountTab({ user }: AccountTabProps) {
  const [fullName, setFullName] = useState(user.full_name ?? '');
  const [error, setError] = useState('');
  const updateMutation = useUpdateUser();

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  async function handleSaveName() {
    if (!fullName.trim()) return;
    setError('');
    try {
      await updateMutation.mutateAsync({ full_name: fullName.trim() } as Partial<UserProfile>);
      Alert.alert('Saved', 'Your name has been updated.');
    } catch (err: any) {
      setError(err.message ?? 'Failed to save');
    }
  }

  async function handleChangePassword() {
    if (newPw.length < 8) {
      setPwError('Password must be at least 8 characters');
      return;
    }
    setPwError('');
    setPwSuccess(false);
    setPwLoading(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      setPwSuccess(true);
      setCurrentPw('');
      setNewPw('');
    } catch (err: any) {
      setPwError(err.message ?? 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {error ? <ErrorBanner message={error} /> : null}

      {/* Name */}
      <Input
        label="Full Name"
        icon="person-outline"
        value={fullName}
        onChangeText={setFullName}
        autoComplete="name"
        returnKeyType="done"
      />
      <Button
        title="Save Name"
        onPress={handleSaveName}
        loading={updateMutation.isPending}
        disabled={fullName.trim() === (user.full_name ?? '')}
        variant={fullName.trim() !== (user.full_name ?? '') ? 'primary' : 'ghost'}
      />

      {/* Email (read-only) */}
      <View style={styles.readOnlyField}>
        <Text style={styles.fieldLabel}>Email</Text>
        <Text style={styles.fieldValue}>{user.email}</Text>
      </View>

      {/* Account stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Member since</Text>
          <Text style={styles.statValue}>
            {new Date(user.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Verified</Text>
          <Text style={[styles.statValue, { color: user.is_verified ? colors.green : colors.red }]}>
            {user.is_verified ? 'Yes' : 'No'}
          </Text>
        </View>
      </View>

      {/* Password change */}
      <Text style={styles.sectionTitle}>Change Password</Text>
      {pwError ? <ErrorBanner message={pwError} /> : null}
      {pwSuccess && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>Password changed successfully</Text>
        </View>
      )}
      <Input
        label="Current Password"
        icon="lock-closed-outline"
        value={currentPw}
        onChangeText={setCurrentPw}
        secureTextEntry
        secureToggle
      />
      <Input
        label="New Password"
        icon="lock-open-outline"
        value={newPw}
        onChangeText={setNewPw}
        secureTextEntry
        secureToggle
      />
      <Button
        title="Change Password"
        onPress={handleChangePassword}
        loading={pwLoading}
        disabled={!currentPw || newPw.length < 8}
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  readOnlyField: {
    backgroundColor: colors.panel,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginBottom: 2,
  },
  fieldValue: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.secondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  statValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.heading,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: colors.heading,
    marginTop: spacing.md,
  },
  successBanner: {
    padding: spacing.sm + 2,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderRadius: radius.md,
  },
  successText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.green,
    textAlign: 'center',
  },
});
