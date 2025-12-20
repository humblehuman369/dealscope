import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '../../theme/colors';

interface ScanTargetProps {
  isScanning: boolean;
  size?: number;
}

/**
 * Animated scan target reticle displayed in the camera view.
 * Animates when actively scanning.
 */
export function ScanTarget({ isScanning, size = 200 }: ScanTargetProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isScanning) {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Rotation animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      pulseAnim.setValue(1);
      rotateAnim.setValue(0);
    }
  }, [isScanning]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.outerRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      
      <Animated.View
        style={[
          styles.middleRing,
          {
            width: size * 0.75,
            height: size * 0.75,
            borderRadius: (size * 0.75) / 2,
            transform: [{ rotate: rotation }],
          },
        ]}
      >
        {/* Corner marks */}
        {[0, 90, 180, 270].map((angle) => (
          <View
            key={angle}
            style={[
              styles.cornerMark,
              {
                transform: [
                  { rotate: `${angle}deg` },
                  { translateY: -(size * 0.375) + 2 },
                ],
              },
            ]}
          />
        ))}
      </Animated.View>

      <View
        style={[
          styles.innerRing,
          {
            width: size * 0.5,
            height: size * 0.5,
            borderRadius: (size * 0.5) / 2,
          },
        ]}
      />

      {/* Crosshair */}
      <View style={styles.crosshair}>
        <View style={[styles.crosshairLine, styles.crosshairHorizontal]} />
        <View style={[styles.crosshairLine, styles.crosshairVertical]} />
        <View style={styles.crosshairCenter} />
      </View>

      {/* Scanning indicator */}
      {isScanning && (
        <View style={styles.scanningBadge}>
          <View style={styles.scanningDot} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.scanner.reticle,
    borderStyle: 'dashed',
  },
  middleRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.scanner.target,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerMark: {
    position: 'absolute',
    width: 20,
    height: 3,
    backgroundColor: colors.scanner.target,
    borderRadius: 2,
  },
  innerRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  crosshair: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairLine: {
    position: 'absolute',
    backgroundColor: colors.scanner.reticle,
  },
  crosshairHorizontal: {
    width: 24,
    height: 1,
  },
  crosshairVertical: {
    width: 1,
    height: 24,
  },
  crosshairCenter: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.scanner.target,
  },
  scanningBadge: {
    position: 'absolute',
    top: -30,
  },
  scanningDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.scanner.target,
    shadowColor: colors.scanner.target,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
});

