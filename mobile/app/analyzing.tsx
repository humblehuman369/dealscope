import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

const MICRO_TIPS = [
  'Checking rental comps within 1 mile...',
  'Evaluating 6 investment strategies in parallel...',
  'Calculating breakeven price and target purchase price...',
  'Analyzing cash flow under current market conditions...',
  'Scoring deal opportunity vs. comparable properties...',
  'Running risk-adjusted return scenarios...',
];

const MIN_DISPLAY_MS = 2200;

export default function AnalyzingScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  const router = useRouter();
  const [tipIndex, setTipIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const tipFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: MIN_DISPLAY_MS * 0.9,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(tipFade, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setTipIndex((prev) => (prev + 1) % MICRO_TIPS.length);
        Animated.timing(tipFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace({
        pathname: '/verdict',
        params: { address },
      });
    }, MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [address]);

  const SIZE = 128;
  const STROKE = 5;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.center}>
        {/* Progress ring */}
        <View style={styles.ringContainer}>
          <Animated.View style={styles.svgWrap}>
            <View style={styles.ringTrack} />
            <Animated.View
              style={[
                styles.ringProgress,
                {
                  borderColor: colors.primary,
                  transform: [
                    {
                      rotate: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            />
          </Animated.View>
          <Text style={styles.logoText}>
            IQ<Text style={styles.logoAccent}>.</Text>
          </Text>
        </View>

        <Text style={styles.analyzing}>Analyzing property...</Text>
        <Text style={styles.address} numberOfLines={2}>
          {address}
        </Text>

        <Animated.Text style={[styles.tip, { opacity: tipFade }]}>
          {MICRO_TIPS[tipIndex]}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: { alignItems: 'center', paddingHorizontal: spacing.lg },
  ringContainer: {
    width: 128,
    height: 128,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  svgWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringTrack: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 5,
    borderColor: 'rgba(14,165,233,0.12)',
    position: 'absolute',
  },
  ringProgress: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 5,
    borderTopColor: colors.primary,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    position: 'absolute',
  },
  logoText: {
    fontFamily: fontFamilies.heading,
    fontSize: 36,
    fontWeight: '700',
    color: colors.textHeading,
  },
  logoAccent: { color: colors.primary },
  analyzing: {
    fontFamily: fontFamilies.heading,
    fontSize: 18,
    fontWeight: '600',
    color: colors.textHeading,
    marginBottom: spacing.sm,
  },
  address: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  tip: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.primary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
