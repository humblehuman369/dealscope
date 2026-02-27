import { View, Text, StyleSheet } from 'react-native';
import { colors, textStyles, spacing } from '@/constants/tokens';

/**
 * Placeholder home screen — will be replaced by the Search tab
 * in Phase 2. Exists only to validate the foundation builds
 * and runs correctly.
 */
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>DealGapIQ</Text>
      <Text style={styles.subtitle}>Foundation ready</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    ...textStyles.displaySmall,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.secondary,
  },
});
