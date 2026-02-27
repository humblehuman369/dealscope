import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Easing,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { usePropertyData } from '@/hooks/usePropertyData';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
} from '@/constants/tokens';

const MICRO_TIPS = [
  'Checking rental comps within 1 mile...',
  'Evaluating 6 investment strategies in parallel...',
  'Calculating breakeven price and target purchase price...',
  'Analyzing cash flow under current market conditions...',
  'Scoring deal opportunity vs. comparable properties...',
  'Running risk-adjusted return scenarios...',
] as const;

const RING_SIZE = 128;
const STROKE_WIDTH = 5;
const RING_RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const MIN_DISPLAY_MS = 2400;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function AnalyzingScreen() {
  const router = useRouter();
  const { address } = useLocalSearchParams<{ address: string }>();
  const insets = useSafeAreaInsets();

  const { fetchProperty } = usePropertyData();

  const [currentTip, setCurrentTip] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const tipOpacity = useRef(new Animated.Value(1)).current;

  const dataReady = useRef(false);
  const minTimeReached = useRef(false);
  const hasNavigated = useRef(false);

  const tryNavigate = useCallback(() => {
    if (dataReady.current && minTimeReached.current && !hasNavigated.current) {
      hasNavigated.current = true;
      router.replace(`/verdict?address=${encodeURIComponent(address ?? '')}`);
    }
  }, [router, address]);

  // Progress ring animation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: MIN_DISPLAY_MS * 0.9,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progressAnim]);

  // Micro-tip rotation
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(tipOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(tipOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      setCurrentTip((prev) => (prev + 1) % MICRO_TIPS.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [tipOpacity]);

  // Minimum display time
  useEffect(() => {
    const timer = setTimeout(() => {
      minTimeReached.current = true;
      tryNavigate();
    }, MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [tryNavigate]);

  // Fetch property data
  useEffect(() => {
    if (!address) return;

    fetchProperty(address)
      .then(() => {
        dataReady.current = true;
        tryNavigate();
      })
      .catch((err) => {
        setError(err.message ?? 'Failed to analyze property');
        dataReady.current = true;
        tryNavigate();
      });
  }, [address, fetchProperty, tryNavigate]);

  const dashOffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.content}>
        {/* ── Progress ring ──────────────────────────────── */}
        <View style={styles.ringContainer}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            {/* Background ring */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke="rgba(148,163,184,0.1)"
              strokeWidth={STROKE_WIDTH}
            />
            {/* Animated progress ring */}
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={colors.accent}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={dashOffset}
              rotation={-90}
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            />
          </Svg>
          {/* Center logo */}
          <View style={styles.ringCenter}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>IQ</Text>
            </View>
          </View>
        </View>

        {/* ── Title ──────────────────────────────────────── */}
        <Text style={styles.title}>Analyzing Property</Text>
        <Text style={styles.subtitle}>
          Just a moment while IQ evaluates this deal...
        </Text>

        {/* ── Rotating micro-tip ─────────────────────────── */}
        <View style={styles.tipContainer}>
          <Animated.Text style={[styles.tipText, { opacity: tipOpacity }]}>
            {MICRO_TIPS[currentTip]}
          </Animated.Text>
        </View>

        {/* ── Error ──────────────────────────────────────── */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* ── Address reference ─────────────────────────────── */}
      <Text style={styles.addressRef} numberOfLines={1}>
        {address}
      </Text>
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
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    marginBottom: spacing.lg,
    position: 'relative',
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    color: colors.accent,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    color: colors.heading,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  tipContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 14,
    backgroundColor: 'rgba(14, 165, 233, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.15)',
    maxWidth: 300,
  },
  tipText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.accent,
    textAlign: 'center',
  },
  errorBox: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.red,
    textAlign: 'center',
  },
  addressRef: {
    position: 'absolute',
    bottom: 40,
    left: spacing.lg,
    right: spacing.lg,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
  },
});
