/**
 * MetricGrading - Pure grading functions and GradeBadge for investment metrics
 * Ported from frontend LTRWorksheet with spec-aligned thresholds.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';

// =============================================================================
// TYPES
// =============================================================================

export interface GradeResult {
  grade: string; // A, B, C, D, F
  label: string;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'bad';
}

// =============================================================================
// GRADE CALCULATION FUNCTIONS
// =============================================================================

/** Cap Rate grading: A >= 8%, B >= 6%, C >= 4%, D >= 2%, F < 2% */
export function getCapRateGrade(capRate: number): GradeResult {
  if (capRate >= 8) return { grade: 'A', label: 'STRONG', status: 'excellent' };
  if (capRate >= 6) return { grade: 'B', label: 'MODERATE', status: 'good' };
  if (capRate >= 4) return { grade: 'C', label: 'POTENTIAL', status: 'fair' };
  if (capRate >= 2) return { grade: 'D', label: 'WEAK', status: 'poor' };
  return { grade: 'F', label: 'WEAK', status: 'bad' };
}

/** Cash-on-Cash: A >= 12%, B >= 8%, C >= 5%, D >= 2%, F < 2% */
export function getCoCGrade(coc: number): GradeResult {
  if (coc >= 12) return { grade: 'A', label: 'STRONG', status: 'excellent' };
  if (coc >= 8) return { grade: 'B', label: 'MODERATE', status: 'good' };
  if (coc >= 5) return { grade: 'C', label: 'POTENTIAL', status: 'fair' };
  if (coc >= 2) return { grade: 'D', label: 'WEAK', status: 'poor' };
  return { grade: 'F', label: 'WEAK', status: 'bad' };
}

/** Equity Capture: A >= 20%, B >= 10%, C >= 5%, D >= 0%, F < 0% */
export function getEquityCaptureGrade(equity: number, purchasePrice: number): GradeResult {
  const equityPct = purchasePrice > 0 ? (equity / purchasePrice) * 100 : 0;
  if (equityPct >= 20) return { grade: 'A', label: 'STRONG', status: 'excellent' };
  if (equityPct >= 10) return { grade: 'B', label: 'MODERATE', status: 'good' };
  if (equityPct >= 5) return { grade: 'C', label: 'POTENTIAL', status: 'fair' };
  if (equityPct >= 0) return { grade: 'D', label: 'WEAK', status: 'poor' };
  return { grade: 'F', label: 'WEAK', status: 'bad' };
}

/** Cash Flow Yield: A >= 10%, B >= 7%, C >= 4%, D >= 1%, F < 1% */
export function getCashFlowYieldGrade(cfy: number): GradeResult {
  if (cfy >= 10) return { grade: 'A', label: 'STRONG', status: 'excellent' };
  if (cfy >= 7) return { grade: 'B', label: 'MODERATE', status: 'good' };
  if (cfy >= 4) return { grade: 'C', label: 'POTENTIAL', status: 'fair' };
  if (cfy >= 1) return { grade: 'D', label: 'WEAK', status: 'poor' };
  return { grade: 'F', label: 'WEAK', status: 'bad' };
}

/** DSCR: A >= 1.5, B >= 1.25, C >= 1.1, D >= 1.0, F < 1.0 */
export function getDSCRGrade(dscr: number): GradeResult {
  if (dscr >= 1.5) return { grade: 'A', label: 'STRONG', status: 'excellent' };
  if (dscr >= 1.25) return { grade: 'B', label: 'MODERATE', status: 'good' };
  if (dscr >= 1.1) return { grade: 'C', label: 'POTENTIAL', status: 'fair' };
  if (dscr >= 1.0) return { grade: 'D', label: 'WEAK', status: 'poor' };
  return { grade: 'F', label: 'WEAK', status: 'bad' };
}

/** Expense Ratio: A <= 35%, B <= 45%, C <= 55%, D <= 65%, F > 65% */
export function getExpenseRatioGrade(ratio: number): GradeResult {
  if (ratio <= 35) return { grade: 'A', label: 'STRONG', status: 'excellent' };
  if (ratio <= 45) return { grade: 'B', label: 'MODERATE', status: 'good' };
  if (ratio <= 55) return { grade: 'C', label: 'POTENTIAL', status: 'fair' };
  if (ratio <= 65) return { grade: 'D', label: 'WEAK', status: 'poor' };
  return { grade: 'F', label: 'WEAK', status: 'bad' };
}

/** Breakeven Occupancy: A <= 60%, B <= 70%, C <= 80%, D <= 90%, F > 90% */
export function getBreakevenOccGrade(breakeven: number): GradeResult {
  if (breakeven <= 60) return { grade: 'A', label: 'STRONG', status: 'excellent' };
  if (breakeven <= 70) return { grade: 'B', label: 'MODERATE', status: 'good' };
  if (breakeven <= 80) return { grade: 'C', label: 'POTENTIAL', status: 'fair' };
  if (breakeven <= 90) return { grade: 'D', label: 'WEAK', status: 'poor' };
  return { grade: 'F', label: 'WEAK', status: 'bad' };
}

// =============================================================================
// GRADE BADGE COLORS
// =============================================================================

export function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return '#10b981'; // emerald
    case 'B': return '#06b6d4'; // cyan
    case 'C': return '#f59e0b'; // amber
    case 'D': return '#f97316'; // orange
    case 'F': return '#ef4444'; // red
    default: return '#64748b';
  }
}

// =============================================================================
// GRADE BADGE COMPONENT
// =============================================================================

export interface GradeBadgeProps {
  grade: string;
  size?: 'sm' | 'md';
}

export function GradeBadge({ grade, size = 'md' }: GradeBadgeProps) {
  const { isDark } = useTheme();
  const color = getGradeColor(grade);

  const sizeConfig = size === 'sm'
    ? { circle: 24, fontSize: 12 }
    : { circle: 32, fontSize: 14 };

  return (
    <View
      style={[
        styles.badge,
        {
          width: sizeConfig.circle,
          height: sizeConfig.circle,
          borderRadius: sizeConfig.circle / 2,
          backgroundColor: color,
          ...(isDark && {
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)',
          }),
        },
      ]}
    >
      <Text style={[styles.badgeText, { fontSize: sizeConfig.fontSize, color: colors.text.inverse }]}>
        {grade}
      </Text>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
