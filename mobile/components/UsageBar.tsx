import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import { useUsage } from '@/hooks/useUsage';

interface UsageBarProps {
  onUpgrade?: () => void;
}

export function UsageBar({ onUpgrade }: UsageBarProps) {
  const { data: usage } = useUsage();

  if (!usage || usage.searches_limit <= 0) return null;
  if (usage.subscription_tier === 'pro') return null;

  const pct = Math.min(100, (usage.searches_used / usage.searches_limit) * 100);
  const remaining = usage.searches_remaining;
  const isExhausted = remaining <= 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>
          {isExhausted ? 'Analyses used up' : `${remaining} of ${usage.searches_limit} analyses left`}
        </Text>
        {isExhausted && onUpgrade && (
          <Pressable onPress={onUpgrade}>
            <Text style={styles.upgradeText}>Upgrade to Pro</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%` },
            isExhausted && styles.fillExhausted,
          ]}
        />
      </View>
      {usage.days_until_reset > 0 && (
        <Text style={styles.resetText}>
          Resets in {usage.days_until_reset} day{usage.days_until_reset !== 1 ? 's' : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  label: { fontFamily: fontFamilies.body, fontSize: 12, color: colors.textSecondary },
  upgradeText: { fontFamily: fontFamilies.heading, fontSize: 12, fontWeight: '700', color: colors.primary },
  track: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  fillExhausted: { backgroundColor: colors.error },
  resetText: { fontFamily: fontFamilies.body, fontSize: 10, color: colors.textMuted, marginTop: spacing.xs },
});
