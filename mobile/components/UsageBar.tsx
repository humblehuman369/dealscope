import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useUsage } from '@/hooks/useSubscription';
import { useSession } from '@/hooks/useSession';
import { colors } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

export function UsageBar() {
  const router = useRouter();
  const { isPro } = useSession();
  const { data: usage } = useUsage();

  if (isPro || !usage) return null;

  const pct = Math.min(100, (usage.searches_used / usage.searches_limit) * 100);
  const remaining = Math.max(0, usage.searches_limit - usage.searches_used);
  const isLow = remaining <= 1;

  return (
    <Pressable
      onPress={() => router.push('/pricing')}
      style={styles.container}
    >
      <View style={styles.row}>
        <Text style={styles.text}>
          {remaining} search{remaining !== 1 ? 'es' : ''} remaining
        </Text>
        {isLow && <Text style={styles.upgrade}>Upgrade</Text>}
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%` },
            isLow && styles.fillLow,
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.panel,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  text: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  upgrade: {
    fontFamily: fontFamilies.heading,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  track: {
    height: 3,
    backgroundColor: colors.card,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  fillLow: {
    backgroundColor: colors.warning,
  },
});
