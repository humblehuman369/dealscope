import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors, fontFamily, fontSize, spacing } from '@/constants/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 132;
const STROKE = 10;
const R = (SIZE - STROKE) / 2;
const ARC_DEG = 240;
const FULL_C = 2 * Math.PI * R;
const ARC_LEN = FULL_C * (ARC_DEG / 360);
const GAP_LEN = FULL_C * ((360 - ARC_DEG) / 360);

export function scoreColor(score: number): string {
  if (score >= 80) return colors.green;
  if (score >= 65) return colors.accent;
  if (score >= 50) return colors.gold;
  if (score >= 30) return colors.orange;
  return colors.red;
}

export function verdictLabelForScore(score: number): string {
  if (score >= 80) return 'Strong Opportunity';
  if (score >= 65) return 'Good Opportunity';
  if (score >= 50) return 'Moderate Opportunity';
  if (score >= 30) return 'Below Average';
  return 'Poor Opportunity';
}

interface VerdictScoreRingProps {
  score: number;
  verdictLabel?: string;
}

export function VerdictScoreRing({ score, verdictLabel }: VerdictScoreRingProps) {
  const color = scoreColor(score);
  const label = verdictLabel ?? verdictLabelForScore(score);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(score / 100, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [score, progress]);

  const animatedProps = useAnimatedProps(() => {
    const filled = ARC_LEN * progress.value;
    return {
      strokeDasharray: `${filled} ${FULL_C - filled}`,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.ringWrapper}>
        <Svg
          width={SIZE}
          height={SIZE}
          style={{ transform: [{ rotate: '-150deg' }] }}
        >
          {/* Background track */}
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={STROKE}
            strokeDasharray={`${ARC_LEN} ${GAP_LEN}`}
            strokeLinecap="round"
          />
          {/* Animated filled arc */}
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            animatedProps={animatedProps}
          />
        </Svg>
        {/* Center score */}
        <View style={styles.centerLabel}>
          <Text style={[styles.scoreNum, { color }]}>{score}</Text>
          <Text style={styles.scoreDenom}>/100</Text>
        </View>
      </View>

      {/* Verdict badge */}
      <View style={[styles.badge, { borderColor: `${color}40`, backgroundColor: `${color}15` }]}>
        <Text style={[styles.badgeText, { color }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
  },
  ringWrapper: {
    width: SIZE,
    height: SIZE,
    position: 'relative',
  },
  centerLabel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNum: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    fontVariant: ['tabular-nums'],
    lineHeight: fontSize['4xl'],
  },
  scoreDenom: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.secondary,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
  },
});
