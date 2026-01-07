import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface DistanceSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

const SLIDER_WIDTH = 280;
const THUMB_SIZE = 28;
const TOUCH_TARGET_SIZE = 48; // Larger hit area for easier touch

/**
 * Distance slider for adjusting estimated property distance.
 * Updated for Reanimated 4 using new Gesture API.
 */
export function DistanceSlider({
  value,
  onChange,
  min = 10,
  max = 200,
}: DistanceSliderProps) {
  const translateX = useSharedValue(
    ((value - min) / (max - min)) * (SLIDER_WIDTH - THUMB_SIZE)
  );
  const startX = useSharedValue(0);

  const updateValue = (x: number) => {
    const newValue = Math.round(
      min + (x / (SLIDER_WIDTH - THUMB_SIZE)) * (max - min)
    );
    onChange(Math.max(min, Math.min(max, newValue)));
  };

  // New Gesture API for Reanimated 4
  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      const newX = startX.value + event.translationX;
      translateX.value = Math.max(0, Math.min(SLIDER_WIDTH - THUMB_SIZE, newX));
      runOnJS(updateValue)(translateX.value);
    })
    .onEnd(() => {
      translateX.value = withSpring(translateX.value);
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE / 2,
  }));

  const handleQuickAdjust = (delta: number) => {
    const newValue = Math.max(min, Math.min(max, value + delta));
    onChange(newValue);
    translateX.value = withSpring(
      ((newValue - min) / (max - min)) * (SLIDER_WIDTH - THUMB_SIZE)
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Distance</Text>
        <Text style={styles.value}>{value}m</Text>
      </View>

      <View style={styles.sliderContainer}>
        {/* Quick adjust buttons */}
        <Pressable
          style={styles.adjustButton}
          onPress={() => handleQuickAdjust(-10)}
        >
          <Ionicons name="remove" size={16} color="#fff" />
        </Pressable>

        {/* Slider track */}
        <View style={styles.trackContainer}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, fillStyle]} />
          </View>

          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.thumbHitArea, thumbStyle]}>
              <View style={styles.thumb}>
                <View style={styles.thumbInner} />
              </View>
            </Animated.View>
          </GestureDetector>

          {/* Distance markers */}
          <View style={styles.markers}>
            <Text style={styles.markerText}>{min}m</Text>
            <Text style={styles.markerText}>100m</Text>
            <Text style={styles.markerText}>{max}m</Text>
          </View>
        </View>

        {/* Quick adjust buttons */}
        <Pressable
          style={styles.adjustButton}
          onPress={() => handleQuickAdjust(10)}
        >
          <Ionicons name="add" size={16} color="#fff" />
        </Pressable>
      </View>

      <Text style={styles.hint}>
        Adjust to match estimated distance to the property
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontWeight: '500',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  value: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.primary[400],
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adjustButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackContainer: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: 3,
  },
  thumbHitArea: {
    position: 'absolute',
    width: TOUCH_TARGET_SIZE,
    height: TOUCH_TARGET_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: (THUMB_SIZE - TOUCH_TARGET_SIZE) / 2, // Center the larger hit area over the visual thumb
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary[500],
  },
  markers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: THUMB_SIZE / 2,
  },
  markerText: {
    fontWeight: '400',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  hint: {
    fontWeight: '400',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 8,
  },
});
