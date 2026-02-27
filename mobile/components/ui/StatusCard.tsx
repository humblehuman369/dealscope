import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

type StatusType = 'success' | 'error' | 'loading';

const statusConfig: Record<StatusType, { icon: keyof typeof Ionicons.glyphMap; iconColor: string; bgColor: string }> = {
  success: { icon: 'checkmark-circle', iconColor: colors.green, bgColor: 'rgba(52, 211, 153, 0.15)' },
  error: { icon: 'close-circle', iconColor: colors.red, bgColor: 'rgba(248, 113, 113, 0.15)' },
  loading: { icon: 'hourglass-outline', iconColor: colors.accent, bgColor: 'rgba(14, 165, 233, 0.15)' },
};

interface StatusCardProps {
  type: StatusType;
  title: string;
  message: string;
  children?: React.ReactNode;
}

export function StatusCard({ type, title, message, children }: StatusCardProps) {
  const config = statusConfig[type];

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={36} color={config.iconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    color: colors.heading,
    textAlign: 'center',
  },
  message: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.5,
    paddingHorizontal: spacing.md,
  },
});
