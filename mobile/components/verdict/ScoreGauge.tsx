import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { getScoreColor, getScoreLabel } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ScoreGaugeProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  verdictLabel?: string;
}

export function ScoreGauge({
  score,
  maxScore = 95,
  size = 140,
  strokeWidth = 8,
  verdictLabel,
}: ScoreGaugeProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const fillPct = Math.min(score / maxScore, 1);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: fillPct,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [fillPct]);

  const scoreColor = getScoreColor(score);
  const label = verdictLabel ?? getScoreLabel(score);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [arcLength, 0],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          rotation={135}
          origin={`${center}, ${center}`}
        />
        {/* Fill */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={135}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={styles.labelContainer}>
        <Text style={[styles.scoreText, { color: scoreColor }]}>{Math.round(score)}</Text>
        <Text style={styles.maxText}>/{maxScore}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: scoreColor + '18', borderColor: scoreColor + '40' }]}>
        <Text style={[styles.badgeText, { color: scoreColor }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    top: '32%',
  },
  scoreText: { fontFamily: fontFamilies.monoBold, fontSize: 38, fontWeight: '800' },
  maxText: { fontFamily: fontFamilies.mono, fontSize: 14, color: colors.textMuted, marginTop: 14 },
  badge: {
    position: 'absolute',
    bottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  badgeText: { fontFamily: fontFamilies.heading, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
});
