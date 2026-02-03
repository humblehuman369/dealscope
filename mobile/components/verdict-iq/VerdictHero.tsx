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
    paddingBottom: 20,
  },
  verdictContent: {
    flexDirection: 'row',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  scoreContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: decisionGrade.bgPrimary,
  },
  scoreValue: {
    fontSize: 42,
    fontWeight: '800',
    color: decisionGrade.deepNavy,
  },
  verdictInfo: {
    flex: 1,
    paddingLeft: 8,
    justifyContent: 'center',
  },
  verdictTitle: {
    fontSize: 18,
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
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 1,
  },
  verdictSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: decisionGrade.textSecondary,
    marginBottom: 4,
  },
  verdictLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  verdictLink: {
    fontSize: 11,
    fontWeight: '600',
    color: decisionGrade.pacificTeal,
  },
  linkSeparator: {
    fontSize: 11,
    color: decisionGrade.textPrimary,
  },
  confidenceSection: {
    paddingHorizontal: 20,
  },
  confidenceHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: decisionGrade.textPrimary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  confidenceLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: decisionGrade.textSecondary,
    width: 130,
  },
  confidenceBar: {
    flex: 1,
    height: 10,
    backgroundColor: decisionGrade.bgSecondary,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: decisionGrade.borderLight,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: '700',
    width: 42,
    textAlign: 'right',
  },
});

export default VerdictHero;
