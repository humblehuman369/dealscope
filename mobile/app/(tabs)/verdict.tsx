import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

export default function VerdictTabScreen() {
  const { address } = useLocalSearchParams<{ address?: string }>();
  const router = useRouter();

  if (!address) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No Property Selected</Text>
          <Text style={styles.emptySubtitle}>
            Search for an address to see the IQ Verdict
          </Text>
          <Button
            title="Search Property"
            onPress={() => router.push('/(tabs)/search')}
            style={styles.btn}
          />
        </View>
      </SafeAreaView>
    );
  }

  router.replace({ pathname: '/verdict', params: { address } });
  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.textHeading,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  btn: { width: 200 },
});
