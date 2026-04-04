import { View, Text, ScrollView, Pressable, Linking, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Card } from '@/components/ui';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

const STRATEGIES = [
  { icon: '🏠', name: 'Long-Term Rental', desc: 'Cash flow, cap rate, DSCR' },
  { icon: '🏨', name: 'Short-Term Rental', desc: 'ADR, occupancy, RevPAR' },
  { icon: '🔄', name: 'BRRRR', desc: 'Cash recovery, equity created' },
  { icon: '🔨', name: 'Fix & Flip', desc: 'Net profit, ROI, 70% rule' },
  { icon: '🏡', name: 'House Hack', desc: 'Effective housing cost' },
  { icon: '📋', name: 'Wholesale', desc: 'Assignment fee, MAO' },
];

const METRICS = [
  { name: 'Income Value', desc: 'The maximum price where cash flow equals zero — your breakeven.' },
  { name: 'Target Buy', desc: 'Income Value with a 5% safety margin. This is what you should offer.' },
  { name: 'Deal Gap', desc: 'The percentage difference between asking price and your Target Buy.' },
  { name: 'Verdict Score', desc: 'A 0-100 composite score weighing deal gap, returns, market conditions, and deal probability.' },
];

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Text style={styles.brand}>DealGapIQ</Text>
          <Text style={styles.tagline}>Real Estate Investment Analytics</Text>
          <Text style={styles.desc}>
            Analyze any property across 6 investment strategies in seconds.
            Know the real numbers before you buy.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>PROPRIETARY METRICS</Text>
        {METRICS.map((m) => (
          <Card key={m.name} glow="sm" style={styles.metricCard}>
            <Text style={styles.metricName}>{m.name}</Text>
            <Text style={styles.metricDesc}>{m.desc}</Text>
          </Card>
        ))}

        <Text style={styles.sectionLabel}>6 INVESTMENT STRATEGIES</Text>
        {STRATEGIES.map((s) => (
          <Card key={s.name} glow="none" style={styles.stratCard}>
            <Text style={styles.stratIcon}>{s.icon}</Text>
            <View style={styles.stratContent}>
              <Text style={styles.stratName}>{s.name}</Text>
              <Text style={styles.stratDesc}>{s.desc}</Text>
            </View>
          </Card>
        ))}

        <View style={styles.legalSection}>
          <View style={styles.legalLinks}>
            <Pressable onPress={() => Linking.openURL('https://dealgapiq.com/terms')}>
              <Text style={styles.legalLink}>Terms of Service</Text>
            </Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable onPress={() => Linking.openURL('https://dealgapiq.com/privacy')}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </Pressable>
          </View>
          <Text style={styles.version}>
            Version {Constants.expoConfig?.version ?? '1.0.0'}
            {Constants.expoConfig?.ios?.buildNumber
              ? ` (${Constants.expoConfig.ios.buildNumber})`
              : ''}
          </Text>
        </View>
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
    gap: spacing.md,
  },
  hero: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  brand: { fontFamily: fontFamilies.heading, fontSize: 32, fontWeight: '700', color: colors.primary },
  tagline: { ...typography.h4, color: colors.textHeading },
  desc: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', maxWidth: 300 },
  sectionLabel: { ...typography.label, color: colors.textLabel, marginTop: spacing.lg },
  metricCard: { padding: spacing.md, gap: 4 },
  metricName: { ...typography.h4, color: colors.textHeading },
  metricDesc: { ...typography.bodySmall, color: colors.textSecondary },
  stratCard: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.panel,
    borderRadius: 10,
  },
  stratIcon: { fontSize: 24, marginTop: 2 },
  stratContent: { flex: 1 },
  stratName: { ...typography.h4, color: colors.textHeading },
  stratDesc: { ...typography.caption, color: colors.textSecondary },
  legalSection: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legalLink: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  legalDot: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  version: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
