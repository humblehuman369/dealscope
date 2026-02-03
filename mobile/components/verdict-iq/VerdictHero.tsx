/**
 * VerdictHero Component - Decision-Grade UI
 * Score ring + Verdict label + Confidence metrics
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { decisionGrade } from '../../theme/colors';
import { rf, rs } from './responsive';

interface ConfidenceMetric {
  label: string;
  value: number;
  color: 'teal' | 'amber' | 'negative';
}

interface VerdictHeroProps {
  score: number;
  verdictLabel: string;
  verdictSubtitle: string;
  confidenceMetrics: ConfidenceMetric[];
  onHowItWorksPress?: () => void;
  onHowWeScorePress?: () => void;
}

const getVerdictColor = (score: number): string => {
  if (score >= 70) return decisionGrade.pacificTeal;
  if (score >= 50) return decisionGrade.caution;
  return decisionGrade.negative;
};

const getMetricColor = (color: 'teal' | 'amber' | 'negative'): string => {
  switch (color) {
    case 'teal': return decisionGrade.pacificTeal;
    case 'amber': return decisionGrade.caution;
    case 'negative': return decisionGrade.negative;
  }
};

export function VerdictHero({
  score,
  verdictLabel,
  verdictSubtitle,
  confidenceMetrics,
  onHowItWorksPress,
  onHowWeScorePress,
}: VerdictHeroProps) {
  const verdictColor = getVerdictColor(score);

  return (
    <View style={styles.container}>
      {/* Verdict Content - Grid Layout */}
      <View style={styles.verdictContent}>
        {/* Score Container - Centered in left half */}
        <View style={styles.scoreContainer}>
          <View style={[styles.scoreRing, { borderColor: decisionGrade.pacificTeal }]}>
            <Text style={styles.scoreValue}>{score}</Text>
          </View>
        </View>

        {/* Verdict Info - Right half */}
        <View style={styles.verdictInfo}>
          <Text style={styles.verdictTitle}>
            <Text style={styles.verdictTitleNavy}>Verdict</Text>
            <Text style={styles.verdictTitleTeal}>IQ</Text>
          </Text>
          <Text style={[styles.verdictLabel, { color: verdictColor }]}>
            {verdictLabel}
          </Text>
          <Text style={styles.verdictSubtitle}>{verdictSubtitle}</Text>
          <View style={styles.verdictLinks}>
            <TouchableOpacity onPress={onHowItWorksPress}>
              <Text style={styles.verdictLink}>How Verdict IQ Works</Text>
            </TouchableOpacity>
            <Text style={styles.linkSeparator}>|</Text>
            <TouchableOpacity onPress={onHowWeScorePress}>
              <Text style={styles.verdictLink}>How We Score</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Confidence Metrics */}
      <View style={styles.confidenceSection}>
        <Text style={styles.confidenceHeader}>CONFIDENCE METRICS</Text>
        {confidenceMetrics.map((metric, index) => {
          const metricColor = getMetricColor(metric.color);
          return (
            <View key={index} style={styles.confidenceRow}>
              <Text style={styles.confidenceLabel}>{metric.label}</Text>
              <View style={styles.confidenceBar}>
                <View
                  style={[
                    styles.confidenceFill,
                    { width: `${metric.value}%`, backgroundColor: metricColor },
                  ]}
                />
              </View>
              <Text style={[styles.confidenceValue, { color: metricColor }]}>
                {metric.value}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: decisionGrade.bgPrimary,
    paddingBottom: rs(20),
  },
  verdictContent: {
    flexDirection: 'row',
    paddingVertical: rs(24),
    paddingHorizontal: rs(20),
  },
  scoreContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRing: {
    width: rs(90),
    height: rs(90),
    borderRadius: rs(45),
    borderWidth: rs(5),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: decisionGrade.bgPrimary,
  },
  scoreValue: {
    fontSize: rf(38),
    fontWeight: '800',
    color: decisionGrade.deepNavy,
  },
  verdictInfo: {
    flex: 1,
    paddingLeft: rs(8),
    justifyContent: 'center',
  },
  verdictTitle: {
    fontSize: rf(16),
    fontWeight: '800',
    marginBottom: 0,
    letterSpacing: -0.3,
  },
  verdictTitleNavy: {
    color: decisionGrade.deepNavy,
  },
  verdictTitleTeal: {
    color: decisionGrade.pacificTeal,
  },
  verdictLabel: {
    fontSize: rf(18),
    fontWeight: '700',
    lineHeight: rf(22),
    marginBottom: rs(1),
  },
  verdictSubtitle: {
    fontSize: rf(11),
    fontWeight: '500',
    color: decisionGrade.textSecondary,
    marginBottom: rs(4),
  },
  verdictLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    marginTop: rs(3),
    flexWrap: 'wrap',
  },
  verdictLink: {
    fontSize: rf(10),
    fontWeight: '600',
    color: decisionGrade.pacificTeal,
  },
  linkSeparator: {
    fontSize: rf(10),
    color: decisionGrade.textPrimary,
  },
  confidenceSection: {
    paddingHorizontal: rs(20),
  },
  confidenceHeader: {
    fontSize: rf(10),
    fontWeight: '700',
    color: decisionGrade.textPrimary,
    letterSpacing: 0.8,
    marginBottom: rs(12),
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rs(8),
    gap: rs(10),
  },
  confidenceLabel: {
    fontSize: rf(12),
    fontWeight: '500',
    color: decisionGrade.textSecondary,
    width: rs(110),
  },
  confidenceBar: {
    flex: 1,
    height: rs(10),
    backgroundColor: decisionGrade.bgSecondary,
    borderRadius: rs(5),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: decisionGrade.borderLight,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: rs(4),
  },
  confidenceValue: {
    fontSize: rf(13),
    fontWeight: '700',
    width: rs(40),
    textAlign: 'right',
  },
});

export default VerdictHero;
