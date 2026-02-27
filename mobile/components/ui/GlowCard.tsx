import { type ReactNode } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { colors, radius } from '@/constants/tokens';

interface GlowCardProps {
  children: ReactNode;
  glowColor?: string;
  style?: ViewStyle;
  active?: boolean;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Card with animated teal glow border effect.
 *
 * Glow values from frontend globals.css:
 * - Default border: rgba(14,165,233,0.25)
 * - Default shadow: 0 0 30px rgba(14,165,233,0.08)
 * - Active border: rgba(14,165,233,0.55)
 * - Active shadow: stronger glow
 */
export function GlowCard({
  children,
  glowColor = colors.accent,
  style,
  active = false,
  onPress,
}: GlowCardProps) {
  const pressed = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => {
    const intensity = active ? 1 : pressed.value;
    return {
      borderColor: interpolateColor(
        intensity,
        [0, 1],
        [`${glowColor}40`, `${glowColor}8E`],
      ),
      shadowOpacity: 0.06 + intensity * 0.08,
      transform: [{ scale: 1 - pressed.value * 0.015 }],
    };
  });

  function handlePressIn() {
    pressed.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) });
  }

  function handlePressOut() {
    pressed.value = withSpring(0, { damping: 15, stiffness: 150 });
  }

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.card, { shadowColor: glowColor }, animStyle, style]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View
      style={[
        styles.card,
        {
          shadowColor: glowColor,
          borderColor: active ? `${glowColor}8E` : `${glowColor}40`,
          shadowOpacity: active ? 0.14 : 0.06,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderRadius: radius.lg,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    elevation: 4,
  },
});
