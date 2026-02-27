import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { colors, fontFamily, fontSize, spacing } from '@/constants/tokens';

/**
 * OfflineBanner — slides down from the top when the device goes offline.
 * Hides automatically when connectivity is restored.
 */
export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const translateY = useSharedValue(-50);

  useEffect(() => {
    translateY.value = withTiming(isOffline ? 0 : -50, { duration: 300 });
  }, [isOffline, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!isOffline) return null;

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <Ionicons name="cloud-offline-outline" size={16} color={colors.white} />
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
}

/**
 * CachedDataNotice — small label showing when data was last refreshed.
 */
export function CachedDataNotice({
  dataUpdatedAt,
}: {
  dataUpdatedAt: number | undefined;
}) {
  const { isOffline } = useNetworkStatus();

  if (!isOffline || !dataUpdatedAt) return null;

  const ago = formatTimeAgo(dataUpdatedAt);

  return (
    <View style={styles.cachedNotice}>
      <Ionicons name="time-outline" size={12} color={colors.gold} />
      <Text style={styles.cachedText}>Cached · Last updated {ago}</Text>
    </View>
  );
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    backgroundColor: colors.red,
  },
  text: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.white,
  },
  cachedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
  },
  cachedText: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.gold,
  },
});
