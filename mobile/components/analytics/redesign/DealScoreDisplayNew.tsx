/**
 * DealScoreDisplayNew - Score ring with breakdown bars
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { DealScoreData, ScoreBreakdownItem } from './types';

interface DealScoreDisplayNewProps {
  data: DealScoreData;
  strengths?: string[];
  weaknesses?: string[];
  isDark?: boolean;
}

export function DealScoreDisplayNew({ data, strengths = [], weaknesses = [], isDark = true }: DealScoreDisplayNewProps) {
  const { score, grade, label, color, breakdown } = data;

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(7,23,46,0.02)',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }
    ]}>
      {/* Score Ring */}
      <View style={styles.ringContainer}>
        <ScoreRing score={score} color={color} isDark={isDark} />
        <View style={styles.ringCenter}>
          <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
          <Text style={[styles.gradeText, { color }]}>{grade}</Text>
        </View>
      </View>

      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.statusText, { color }]}>{label}</Text>
      </View>

      {/* Breakdown Bars */}
      <View style={styles.breakdownSection}>
        <Text style={[styles.sectionTitle, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
          SCORE BREAKDOWN
        </Text>
        {breakdown.map((item) => (
          <BreakdownBar key={item.id} item={item} isDark={isDark} />
        ))}
      </View>

      {/* Strengths & Weaknesses */}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <View style={styles.swSection}>
          {strengths.length > 0 && (
            <View style={styles.swColumn}>
              <Text style={styles.swTitle}>✅ Strengths</Text>
              {strengths.map((s, i) => (
                <Text key={i} style={[styles.swItem, { color: '#22c55e' }]}>• {s}</Text>
              ))}
            </View>
          )}
          {weaknesses.length > 0 && (
            <View style={styles.swColumn}>
              <Text style={styles.swTitle}>⚠️ Watch</Text>
              {weaknesses.map((w, i) => (
                <Text key={i} style={[styles.swItem, { color: '#f59e0b' }]}>• {w}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

interface ScoreRingProps {
  score: number;
  color: string;
  isDark: boolean;
}

function ScoreRing({ score, color, isDark }: ScoreRingProps) {
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)'}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${progress}, ${circumference}`}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}

interface BreakdownBarProps {
  item: ScoreBreakdownItem;
  isDark: boolean;
}

function BreakdownBar({ item, isDark }: BreakdownBarProps) {
  const percentage = (item.points / item.maxPoints) * 100;
  const barColor = percentage >= 80 ? '#22c55e' : percentage >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <View style={styles.breakdownItem}>
      <View style={styles.breakdownHeader}>
        <Text style={[styles.breakdownLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(7,23,46,0.7)' }]}>
          {item.label}
        </Text>
        <Text style={[styles.breakdownPoints, { color: barColor }]}>
          {item.points}/{item.maxPoints}
        </Text>
      </View>
      <View style={[styles.barBackground, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)' }]}>
        <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

// Helper to calculate deal score
export function calculateDealScoreData(metrics: {
  cashFlow: number;
  cashOnCash: number;
  capRate: number;
  onePercentRule: number;
  dscr: number;
  equityPotential: number;
  riskBuffer: number;
}): DealScoreData {
  const breakdown: ScoreBreakdownItem[] = [];
  let totalScore = 0;

  // Cash Flow (20 points)
  const cashFlowPoints = Math.min(20, Math.max(0, Math.round(metrics.cashFlow / 50) * 2));
  breakdown.push({ id: 'cashflow', label: 'Cash Flow', points: cashFlowPoints, maxPoints: 20 });
  totalScore += cashFlowPoints;

  // Cash-on-Cash (20 points)
  const cocPoints = Math.min(20, Math.round(metrics.cashOnCash * 100));
  breakdown.push({ id: 'coc', label: 'Cash-on-Cash', points: cocPoints, maxPoints: 20 });
  totalScore += cocPoints;

  // Cap Rate (15 points)
  const capPoints = Math.min(15, Math.round(metrics.capRate * 150));
  breakdown.push({ id: 'cap', label: 'Cap Rate', points: capPoints, maxPoints: 15 });
  totalScore += capPoints;

  // 1% Rule (15 points)
  const onePercentPoints = metrics.onePercentRule >= 0.01 ? 15 : Math.round(metrics.onePercentRule * 1500);
  breakdown.push({ id: 'onepercent', label: '1% Rule', points: onePercentPoints, maxPoints: 15 });
  totalScore += onePercentPoints;

  // DSCR (15 points)
  const dscrPoints = Math.min(15, Math.round((metrics.dscr - 0.8) * 37.5));
  breakdown.push({ id: 'dscr', label: 'DSCR', points: Math.max(0, dscrPoints), maxPoints: 15 });
  totalScore += Math.max(0, dscrPoints);

  // Equity Potential (15 points)
  const equityPoints = Math.min(15, Math.round(metrics.equityPotential * 100));
  breakdown.push({ id: 'equity', label: 'Equity Potential', points: equityPoints, maxPoints: 15 });
  totalScore += equityPoints;

  // Determine grade and color
  const { grade, label, color } = getScoreGrading(totalScore);

  return {
    score: Math.min(100, Math.max(0, totalScore)),
    grade,
    label,
    color,
    breakdown,
  };
}

function getScoreGrading(score: number): { grade: string; label: string; color: string } {
  if (score >= 90) return { grade: 'A+', label: 'Excellent Deal', color: '#22c55e' };
  if (score >= 80) return { grade: 'A', label: 'Great Deal', color: '#22c55e' };
  if (score >= 70) return { grade: 'B+', label: 'Good Deal', color: '#84cc16' };
  if (score >= 60) return { grade: 'B', label: 'Solid Deal', color: '#84cc16' };
  if (score >= 50) return { grade: 'C+', label: 'Fair Deal', color: '#f59e0b' };
  if (score >= 40) return { grade: 'C', label: 'Below Average', color: '#f59e0b' };
  if (score >= 30) return { grade: 'D', label: 'Poor Deal', color: '#f97316' };
  return { grade: 'F', label: 'Not Recommended', color: '#ef4444' };
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 36,
    fontWeight: '800',
  },
  gradeText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: -4,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  breakdownSection: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  breakdownItem: {
    marginBottom: 12,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 12,
  },
  breakdownPoints: {
    fontSize: 12,
    fontWeight: '600',
  },
  barBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  swSection: {
    width: '100%',
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  swColumn: {
    flex: 1,
  },
  swTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    color: '#fff',
  },
  swItem: {
    fontSize: 11,
    marginBottom: 3,
  },
});
