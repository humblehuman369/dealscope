import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SessionList } from '@/components/profile/SessionList';
import {
  useInvestorProfile,
  useUpdateInvestorProfile,
} from '@/hooks/useProfileData';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled,
  getBiometricType,
  authenticateWithBiometric,
} from '@/services/biometric';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profile } = useInvestorProfile();
  const updateProfile = useUpdateInvestorProfile();

  // Notification toggles
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [pushAnalysis, setPushAnalysis] = useState(false);
  const [pushPrices, setPushPrices] = useState(false);
  const [marketing, setMarketing] = useState(false);

  // Biometric
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioType, setBioType] = useState('Biometric');

  useEffect(() => {
    if (profile) {
      setEmailAlerts(profile.email_deal_alerts ?? false);
      setWeeklyDigest(profile.email_weekly_digest ?? false);
      setPushAnalysis(profile.push_new_analysis ?? false);
      setPushPrices(profile.push_price_changes ?? false);
      setMarketing(profile.marketing_emails ?? false);
    }
  }, [profile]);

  useEffect(() => {
    (async () => {
      const avail = await isBiometricAvailable();
      setBioAvailable(avail);
      if (avail) {
        setBioEnabled(await isBiometricEnabled());
        setBioType(await getBiometricType());
      }
    })();
  }, []);

  function saveNotification(key: string, value: boolean) {
    updateProfile.mutate({ [key]: value });
  }

  async function toggleBiometric(value: boolean) {
    if (value) {
      const success = await authenticateWithBiometric();
      if (success) {
        await setBiometricEnabled(true);
        setBioEnabled(true);
      }
    } else {
      await setBiometricEnabled(false);
      setBioEnabled(false);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing['2xl'] },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.heading} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Notifications */}
      <Text style={styles.sectionTitle}>Notifications</Text>
      <View style={styles.group}>
        <ToggleRow
          label="Deal Alerts"
          desc="Email when saved properties change"
          value={emailAlerts}
          onToggle={(v) => { setEmailAlerts(v); saveNotification('email_deal_alerts', v); }}
        />
        <ToggleRow
          label="Weekly Digest"
          desc="Summary of market activity"
          value={weeklyDigest}
          onToggle={(v) => { setWeeklyDigest(v); saveNotification('email_weekly_digest', v); }}
        />
        <ToggleRow
          label="New Analysis"
          desc="Push when analysis completes"
          value={pushAnalysis}
          onToggle={(v) => { setPushAnalysis(v); saveNotification('push_new_analysis', v); }}
        />
        <ToggleRow
          label="Price Changes"
          desc="Push when saved property prices change"
          value={pushPrices}
          onToggle={(v) => { setPushPrices(v); saveNotification('push_price_changes', v); }}
        />
        <ToggleRow
          label="Marketing"
          desc="Product updates and tips"
          value={marketing}
          onToggle={(v) => { setMarketing(v); saveNotification('marketing_emails', v); }}
        />
      </View>

      {/* Security */}
      <Text style={styles.sectionTitle}>Security</Text>
      <View style={styles.group}>
        {bioAvailable && (
          <ToggleRow
            label={`${bioType} Unlock`}
            desc="Require biometric to open app"
            value={bioEnabled}
            onToggle={toggleBiometric}
          />
        )}
        <Pressable
          style={styles.menuRow}
          onPress={() => router.push('/(auth)/login')}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.secondary} />
          <Text style={styles.menuLabel}>Two-Factor Auth</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
      </View>

      {/* Sessions */}
      <SessionList />

      {/* About */}
      <Text style={styles.sectionTitle}>About</Text>
      <View style={styles.group}>
        <View style={styles.aboutRow}>
          <Text style={styles.aboutLabel}>App Version</Text>
          <Text style={styles.aboutValue}>1.0.0</Text>
        </View>
        <Pressable style={styles.menuRow} onPress={() => {}}>
          <Ionicons name="document-text-outline" size={20} color={colors.secondary} />
          <Text style={styles.menuLabel}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
        <Pressable style={styles.menuRow} onPress={() => {}}>
          <Ionicons name="shield-outline" size={20} color={colors.secondary} />
          <Text style={styles.menuLabel}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ToggleRow({
  label,
  desc,
  value,
  onToggle,
}: {
  label: string;
  desc: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={toggleStyles.row}>
      <View style={toggleStyles.text}>
        <Text style={toggleStyles.label}>{label}</Text>
        <Text style={toggleStyles.desc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.white}
      />
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  text: { flex: 1, marginRight: spacing.sm },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.heading,
  },
  desc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: 1,
  },
});

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.base },
  content: { paddingHorizontal: spacing.md, gap: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.heading,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.label,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  group: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuLabel: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.heading,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  aboutLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.heading,
  },
  aboutValue: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.secondary,
  },
});
