import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

interface OfflineGuardProps {
  children: React.ReactNode;
  /** What to say when offline and no cached data */
  offlineMessage?: string;
  /** If true, always render children (cached fallback is sufficient) */
  hasCachedData?: boolean;
}

/**
 * OfflineGuard — wraps interactive content that requires a network connection.
 *
 * When offline and hasCachedData is true: renders children (cached data).
 * When offline and hasCachedData is false: shows offline message.
 * When online: renders children.
 */
export function OfflineGuard({
  children,
  offlineMessage = 'This feature requires an internet connection.',
  hasCachedData = false,
}: OfflineGuardProps) {
  const { isOffline } = useNetworkStatus();

  if (!isOffline || hasCachedData) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.muted} />
      </View>
      <Text style={styles.title}>You're Offline</Text>
      <Text style={styles.message}>{offlineMessage}</Text>
      <Text style={styles.hint}>
        Connect to the internet and try again.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 80,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    color: colors.heading,
  },
  message: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: fontSize.md * 1.5,
    maxWidth: 280,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: spacing.xs,
  },
});
