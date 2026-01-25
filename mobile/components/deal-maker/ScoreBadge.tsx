/**
 * ScoreBadge - Circular score/grade badge component for Deal Maker header
 * Displays either a numeric score (0-100) or a letter grade (A+, A, B, C, D, F)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { colors } from '../../theme/colors';
import { ScoreBadgeProps, DealGrade, ProfitGrade } from './types';

// =============================================================================
// GRADE COLORS
// =============================================================================

export function getGradeColor(grade: DealGrade | ProfitGrade): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return colors.profit.main;
    case 'B':
      return '#84cc16'; // Lime
    case 'C':
      return colors.warning.main;
    case 'D':
      return '#f97316'; // Orange
    case 'F':
      return colors.loss.main;
    default:
      return colors.gray[400];
  }
}

export function getScoreColor(score: number): string {
  if (score >= 85) return colors.profit.main;
  if (score >= 70) return '#84cc16';
  if (score >= 55) return colors.warning.main;
  if (score >= 40) return '#f97316';
  return colors.loss.main;
}

export function getScoreGrade(score: number): DealGrade {
  if (score >= 85) return 'A+';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B';
  if (score >= 40) return 'C';
  if (score >= 25) return 'D';
  return 'F';
}

// =============================================================================
// SIZE CONFIG
// =============================================================================

const SIZES = {
  small: { outer: 56, strokeWidth: 4, fontSize: 16, labelSize: 8 },
  medium: { outer: 72, strokeWidth: 5, fontSize: 22, labelSize: 10 },
  large: { outer: 90, strokeWidth: 6, fontSize: 28, labelSize: 12 },
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ScoreBadge({
  type,
  score,
  grade,
  size = 'medium',
}: ScoreBadgeProps) {
  const sizeConfig = SIZES[size];
  const { outer, strokeWidth, fontSize, labelSize } = sizeConfig;
  const radius = (outer - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Determine display value and color
  const isScoreType = type === 'dealScore';
  const displayValue = isScoreType ? (score ?? 0) : (grade ?? 'B');
  const progressValue = isScoreType ? (score ?? 0) : gradeToProgress(grade ?? 'B');
  const accentColor = isScoreType 
    ? getScoreColor(score ?? 0)
    : getGradeColor(grade ?? 'B');
  
  const progress = (progressValue / 100) * circumference;
  const label = isScoreType ? 'DEAL\nSCORE' : 'Profit\nQuality';

  return (
    <View style={styles.container}>
      {/* Circular ring */}
      <View style={[styles.ringWrapper, { width: outer, height: outer }]}>
        <Svg width={outer} height={outer}>
          <G rotation="-90" origin={`${outer / 2}, ${outer / 2}`}>
            {/* Background circle */}
            <Circle
              cx={outer / 2}
              cy={outer / 2}
              r={radius}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress circle */}
            <Circle
              cx={outer / 2}
              cy={outer / 2}
              r={radius}
              stroke={accentColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${progress}, ${circumference}`}
              strokeLinecap="round"
            />
          </G>
        </Svg>

        {/* Center content */}
        <View style={styles.centerContent}>
          <Text style={[
            styles.scoreText,
            { fontSize, color: accentColor }
          ]}>
            {displayValue}
          </Text>
        </View>
      </View>

      {/* Label below */}
      <Text style={[styles.label, { fontSize: labelSize }]}>
        {label}
      </Text>
    </View>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function gradeToProgress(grade: DealGrade | ProfitGrade): number {
  switch (grade) {
    case 'A+': return 95;
    case 'A': return 85;
    case 'B': return 70;
    case 'C': return 55;
    case 'D': return 40;
    case 'F': return 20;
    default: return 50;
  }
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  ringWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontWeight: '800',
  },
  label: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 12,
  },
});

export default ScoreBadge;
