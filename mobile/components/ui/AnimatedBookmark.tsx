import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/tokens';

interface AnimatedBookmarkProps {
  isSaved: boolean;
  isSaving: boolean;
  onPress: () => void;
  size?: number;
  savedColor?: string;
  unsavedColor?: string;
}

/**
 * Animated save/bookmark toggle with scale bounce and haptic feedback.
 */
export function AnimatedBookmark({
  isSaved,
  isSaving,
  onPress,
  size = 22,
  savedColor = colors.accent,
  unsavedColor = colors.heading,
}: AnimatedBookmarkProps) {
  const scale = useSharedValue(1);

  function handlePress() {
    Haptics.impactAsync(
      isSaved
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium,
    );
    scale.value = withSequence(
      withTiming(1.35, { duration: 120, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 8, stiffness: 200 }),
    );
    onPress();
  }

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      disabled={isSaving}
      hitSlop={12}
      style={{ opacity: isSaving ? 0.5 : 1 }}
    >
      <Animated.View style={animStyle}>
        <Ionicons
          name={isSaved ? 'bookmark' : 'bookmark-outline'}
          size={size}
          color={isSaved ? savedColor : unsavedColor}
        />
      </Animated.View>
    </Pressable>
  );
}
