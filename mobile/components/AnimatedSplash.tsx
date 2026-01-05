import React, { useEffect, useRef } from 'react';
import {
  Image,
  StyleSheet,
  Animated,
} from 'react-native';

// Logo size - larger to fill the space
const LOGO_SIZE = 180;

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
          toValue: 1.1,
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
          toValue: 1.1,
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
          toValue: 1.15,
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
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
});
