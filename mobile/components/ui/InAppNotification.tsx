import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  resolveNotificationRoute,
  type NotificationData,
} from '@/services/notifications';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

type IoniconsName = keyof typeof Ionicons.glyphMap;

const AUTO_DISMISS_MS = 5000;

/**
 * InAppNotification — renders foreground push notifications as an
 * in-app banner instead of the system notification tray.
 *
 * Listens to expo-notifications received events and displays
 * a slide-down banner with tap-to-navigate.
 */
export function InAppNotificationManager() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notification, setNotification] = useState<{
    title: string;
    body: string;
    data: NotificationData;
  } | null>(null);

  const translateY = useSharedValue(-120);

  const dismiss = useCallback(() => {
    translateY.value = withTiming(-120, { duration: 250 });
    setTimeout(() => setNotification(null), 300);
  }, [translateY]);

  const show = useCallback(() => {
    translateY.value = withTiming(0, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });
    // Auto-dismiss
    translateY.value = withDelay(
      AUTO_DISMISS_MS,
      withTiming(-120, { duration: 250 }),
    );
  }, [translateY]);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((event) => {
      const content = event.request.content;
      setNotification({
        title: content.title ?? 'DealGapIQ',
        body: content.body ?? '',
        data: (content.data as NotificationData) ?? {},
      });
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (notification) show();
  }, [notification, show]);

  function handleTap() {
    if (!notification) return;
    const route = resolveNotificationRoute(notification.data);
    dismiss();
    if (route) {
      setTimeout(() => router.push(route as any), 300);
    }
  }

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!notification) return null;

  const icon = getCategoryIcon(notification.data.category);

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.xs },
        animStyle,
      ]}
    >
      <Pressable style={styles.content} onPress={handleTap}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={20} color={colors.accent} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>
        <Pressable onPress={dismiss} hitSlop={12}>
          <Ionicons name="close" size={18} color={colors.muted} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

function getCategoryIcon(category?: string): IoniconsName {
  switch (category) {
    case 'analysis_complete':
      return 'checkmark-circle';
    case 'price_change':
      return 'trending-up';
    case 'trial_expiring':
      return 'time-outline';
    case 'subscription_change':
      return 'diamond';
    case 'announcement':
      return 'megaphone-outline';
    default:
      return 'notifications';
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.elevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.heading,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.secondary,
    marginTop: 1,
  },
});
