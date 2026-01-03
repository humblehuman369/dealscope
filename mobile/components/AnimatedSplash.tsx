import React, { useEffect, useRef } from 'react';
import {
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors } from '../theme/colors';

// Original splash image size (you can adjust based on actual asset)
const ORIGINAL_SIZE = 200;
// Reduced by 40% = 60% of original
const REDUCED_SIZE = ORIGINAL_SIZE * 0.6;

interface AnimatedSplashProps {
  onAnimationComplete: () => void;
}

/**
 * Animated splash screen with pulsating logo effect.
 * Shows for a few seconds with a cool pulse animation before the app loads.
 */
export function AnimatedSplash({ onAnimationComplete }: AnimatedSplashProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Create pulsating animation sequence
    const pulseSequence = Animated.sequence([
      // Pulse 1
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Small delay
      Animated.delay(100),
      // Pulse 2
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Small delay
      Animated.delay(100),
      // Pulse 3 (slightly bigger for emphasis)
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
      // Final delay before fade out
      Animated.delay(200),
    ]);

    // Run pulse animation, then fade out
    pulseSequence.start(() => {
      // Fade out the splash screen
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        onAnimationComplete();
      });
    });

    return () => {
      pulseAnim.stopAnimation();
      fadeAnim.stopAnimation();
    };
  }, [pulseAnim, fadeAnim, onAnimationComplete]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Image
          source={require('../assets/splash.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
      
      {/* Subtle glow effect that pulses with the logo */}
      <Animated.View
        style={[
          styles.glow,
          {
            transform: [{ scale: pulseAnim }],
            opacity: Animated.multiply(pulseAnim, 0.3),
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E8EDF5', // Match splash background from app.json
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: REDUCED_SIZE,
    height: REDUCED_SIZE,
  },
  glow: {
    position: 'absolute',
    width: REDUCED_SIZE * 1.5,
    height: REDUCED_SIZE * 1.5,
    borderRadius: REDUCED_SIZE * 0.75,
    backgroundColor: colors.primary[400],
    opacity: 0.2,
  },
});

