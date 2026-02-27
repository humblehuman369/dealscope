import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { colors, fontFamily, fontSize, spacing, textStyles } from '@/constants/tokens';

interface BiometricLockScreenProps {
  onRetry: () => void;
}

export function BiometricLockScreen({ onRetry }: BiometricLockScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="finger-print" size={48} color={colors.accent} />
      </View>
      <Text style={styles.title}>DealGapIQ</Text>
      <Text style={styles.subtitle}>Unlock to continue</Text>
      <Button
        title="Unlock"
        onPress={onRetry}
        style={styles.button}
      />
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
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...textStyles.h1,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...textStyles.body,
    color: colors.secondary,
    marginBottom: spacing.xl,
  },
  button: {
    minWidth: 200,
  },
});
