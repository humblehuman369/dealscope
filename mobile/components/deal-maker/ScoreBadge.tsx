/**
 * ScoreBadge - Circular score/grade badge component for Deal Maker header
 * Displays either a numeric score (0-100) or a letter grade (A+, A, B, C, D, F)
 * 
 * Uses simple View-based circular design for reliability
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
  small: { outer: 50, border: 3, fontSize: 16, labelSize: 8 },
  medium: { outer: 64, border: 3, fontSize: 20, labelSize: 9 },
  large: { outer: 80, border: 4, fontSize: 26, labelSize: 11 },
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
  const { outer, border, fontSize, labelSize } = sizeConfig;

  // Determine display value and color
  const isScoreType = type === 'dealScore';
  const displayValue = isScoreType ? (score ?? 0) : (grade ?? 'B');
  const accentColor = isScoreType 
    ? getScoreColor(score ?? 0)
    : getGradeColor(grade ?? 'B');
  
  const label = isScoreType ? 'DEAL\nSCORE' : 'Profit\nQuality';

  return (
    <View style={styles.container}>
      {/* Circular badge */}
      <View 
        style={[
          styles.circle, 
          { 
            width: outer, 
            height: outer, 
            borderRadius: outer / 2,
            borderWidth: border,
            borderColor: accentColor,
          }
        ]}
      >
        <Text style={[styles.scoreText, { fontSize, color: accentColor }]}>
          {displayValue}
        </Text>
      </View>

      {/* Label below */}
      <Text style={[styles.label, { fontSize: labelSize }]}>
        {label}
      </Text>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  scoreText: {
    fontWeight: '800',
    textAlign: 'center',
  },
  label: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 11,
  },
});

export default ScoreBadge;
