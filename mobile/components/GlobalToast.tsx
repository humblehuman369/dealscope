import React, { useEffect } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useToast, useUIStore } from '../stores/uiStore';
import { verdictDark } from '../theme/colors';

const ICON_MAP: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  success: { name: 'checkmark-circle', color: verdictDark.green },
  error: { name: 'alert-circle', color: verdictDark.red },
  info: { name: 'information-circle', color: verdictDark.blue },
};

export function GlobalToast() {
  const toast = useToast();
  const clearToast = useUIStore((s) => s.clearToast);
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (toast) {
      translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      translateY.value = withDelay(
        100,
        withTiming(100, { duration: 200, easing: Easing.in(Easing.cubic) }),
      );
    }
  }, [toast, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!toast) return null;

  const { name: iconName, color: iconColor } = ICON_MAP[toast.type] ?? ICON_MAP.info;
  const bottomOffset = insets.bottom + 72;

  return (
    <Animated.View
      style={[styles.container, { bottom: bottomOffset }, animatedStyle]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.toast}
        activeOpacity={0.85}
        onPress={() => runOnJS(clearToast)()}
        accessibilityRole="alert"
        accessibilityLabel={toast.message}
      >
        <Ionicons name={iconName} size={20} color={iconColor} style={styles.icon} />
        <Text style={styles.message} numberOfLines={2}>
          {toast.message}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: verdictDark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: verdictDark.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: 480,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    color: verdictDark.textBody,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
