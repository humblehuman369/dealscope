import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { useSession } from '@/hooks/useSession';
import api from '@/services/api';

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useSession();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);
  const [togglingMfa, setTogglingMfa] = useState(false);

  const passwordsMatch = newPw === confirmPw;
  const canChangePw = currentPw.length > 0 && newPw.length >= 8 && passwordsMatch;

  async function handleChangePassword() {
    if (!canChangePw) return;
    setChangingPw(true);
    try {
      await api.post('/api/v1/auth/change-password', {
        current_password: currentPw,
        new_password: newPw,
      });
      Alert.alert('Success', 'Password changed successfully.');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Failed to change password.';
      Alert.alert('Error', msg);
    } finally {
      setChangingPw(false);
    }
  }

  async function handleToggleMfa() {
    if (!user) return;
    setTogglingMfa(true);
    try {
      if (user.mfa_enabled) {
        await api.delete('/api/v1/auth/mfa');
        Alert.alert('MFA Disabled', 'Two-factor authentication has been disabled.');
      } else {
        const { data } = await api.post<{ secret: string; provisioning_uri: string }>(
          '/api/v1/auth/mfa/setup',
        );
        Alert.alert(
          'MFA Setup',
          `Add this secret to your authenticator app:\n\n${data.secret}\n\nThen verify with a 6-digit code on the profile screen.`,
        );
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Failed to update MFA.';
      Alert.alert('Error', msg);
    } finally {
      setTogglingMfa(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Button
          title="← Back"
          variant="ghost"
          onPress={() => router.back()}
          style={{ alignSelf: 'flex-start', marginBottom: 16 }}
        />

        <Text style={styles.title}>Settings</Text>

        {/* Change Password */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change Password</Text>

          <Input
            label="Current Password"
            placeholder="Enter current password"
            value={currentPw}
            onChangeText={setCurrentPw}
            secureTextEntry
          />
          <Input
            label="New Password"
            placeholder="Min 8 characters"
            value={newPw}
            onChangeText={setNewPw}
            secureTextEntry
          />
          <Input
            label="Confirm New Password"
            placeholder="Re-enter new password"
            value={confirmPw}
            onChangeText={setConfirmPw}
            secureTextEntry
            error={confirmPw.length > 0 && !passwordsMatch ? 'Passwords do not match' : undefined}
          />
          <Button
            title="Change Password"
            onPress={handleChangePassword}
            loading={changingPw}
            disabled={!canChangePw}
          />
        </View>

        {/* MFA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Two-Factor Authentication</Text>
          <Text style={styles.sectionDesc}>
            {user?.mfa_enabled
              ? 'MFA is currently enabled. Disable it below.'
              : 'Add an extra layer of security to your account.'}
          </Text>
          <Button
            title={user?.mfa_enabled ? 'Disable MFA' : 'Enable MFA'}
            variant={user?.mfa_enabled ? 'secondary' : 'primary'}
            onPress={handleToggleMfa}
            loading={togglingMfa}
          />
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <InfoRow label="App Version" value="1.0.0" />
          <InfoRow label="Account" value={user?.email ?? ''} />
          <InfoRow label="Subscription" value={user?.subscription_tier ?? 'Free'} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  scroll: { padding: 24, paddingTop: 56, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: colors.textHeading, marginBottom: 24 },

  section: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.textHeading, marginBottom: 8 },
  sectionDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: 12, lineHeight: 18 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: 14, color: colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.textHeading },
});
