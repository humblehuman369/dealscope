/**
 * ArcGauge Component - Premium SVG Arc Gauge
 * 240-degree semi-circular arc with score display
 * Uses react-native-svg for crisp rendering
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { decisionGrade } from '../../theme/colors';
import { rf, rs } from './responsive';

interface ArcGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  color: string;
}

export function ArcGauge({
  score,
  size = 120,
  strokeWidth = 10,
  color,
}: ArcGaugeProps) {
  const scaledSize = rs(size);
  const scaledStroke = rs(strokeWidth);
  const radius = (scaledSize - scaledStroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // 240-degree arc = 2/3 of the full circle
  const arcFraction = 240 / 360;
  const arcLength = circumference * arcFraction;
  const gapLength = circumference - arcLength;

  // How much of the arc to fill based on score (0-100)
  const clampedScore = Math.max(0, Math.min(100, score));
  const fillLength = arcLength * (clampedScore / 100);
  const emptyLength = arcLength - fillLength;

  // Rotation: start from bottom-left (150 degrees from 3 o'clock)
  // The gap is at the bottom, centered
  const rotation = 150;

  return (
    <View style={[styles.container, { width: scaledSize, height: scaledSize }]}>
      <Svg width={scaledSize} height={scaledSize}>
        {/* Track (unfilled arc) */}
        <Circle
          cx={scaledSize / 2}
          cy={scaledSize / 2}
          r={radius}
          stroke="rgba(229,229,229,0.4)"
          strokeWidth={scaledStroke}
          fill="none"
          strokeDasharray={`${arcLength} ${gapLength}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          rotation={rotation}
          origin={`${scaledSize / 2}, ${scaledSize / 2}`}
        />
        {/* Filled arc */}
        <Circle
          cx={scaledSize / 2}
          cy={scaledSize / 2}
          r={radius}
          stroke={color}
          strokeWidth={scaledStroke}
          fill="none"
          strokeDasharray={`${fillLength} ${circumference - fillLength}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          rotation={rotation}
          origin={`${scaledSize / 2}, ${scaledSize / 2}`}
        />
      </Svg>
      {/* Score text overlay */}
      <View style={styles.scoreOverlay}>
        <Text style={[styles.scoreValue, { color }]}>{score}</Text>
        <Text style={styles.scoreMax}>/100</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: rf(34),
    fontWeight: '800',
    lineHeight: rf(38),
  },
  scoreMax: {
    fontSize: rf(12),
    fontWeight: '500',
    color: decisionGrade.textMuted,
    marginTop: rs(-2),
  },
});

export default ArcGauge;
