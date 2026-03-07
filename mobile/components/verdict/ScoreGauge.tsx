import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { getScoreColor, getScoreLabel } from '@/constants/theme';
import { fontFamilies } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

const ARC_START = 135;
const ARC_SWEEP = 270;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const large = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}

export function ScoreGauge({ score, size = 160 }: ScoreGaugeProps) {
  const animValue = useRef(new Animated.Value(0)).current;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 12;
  const safeScore = Number.isFinite(score) ? score : 0;
  const scoreColor = getScoreColor(safeScore);
  const verdictLabel = getScoreLabel(safeScore);
  const clampedScore = Math.max(0, Math.min(100, safeScore));
  const scoreAngle = ARC_START + (clampedScore / 100) * ARC_SWEEP;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();
  }, [animValue]);

  const bgArc = describeArc(cx, cy, r, ARC_START, ARC_START + ARC_SWEEP);
  const showScoreArc = clampedScore > 0;
  const scoreArc = showScoreArc
    ? describeArc(cx, cy, r, ARC_START, scoreAngle)
    : '';

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Path
          d={bgArc}
          stroke={colors.panel}
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
        />
        {showScoreArc && (
          <Path
            d={scoreArc}
            stroke={scoreColor}
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
          />
        )}
      </Svg>
      <View style={styles.center}>
        <Animated.Text
          style={[
            styles.score,
            { color: scoreColor, opacity: animValue },
          ]}
        >
          {clampedScore}
        </Animated.Text>
        <Text style={[styles.label, { color: scoreColor }]}>{verdictLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  score: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 48,
  },
  label: {
    fontFamily: fontFamilies.heading,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
});
