/**
 * VerdictHero Component - Decision-Grade UI (Polished)
 * Score ring with glow + Verdict pill label + Confidence metrics
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
  if (score >= 80) return decisionGrade.pacificTeal;
  if (score >= 50) return '#6B7F99';  // Slate blue - harmonious neutral
  return '#C45B5B';                    // Soft coral - muted concern
};

const getVerdictPillBg = (score: number): string => {
  if (score >= 80) return 'rgba(8,145,178,0.10)';
  if (score >= 50) return 'rgba(107,127,153,0.10)';
  return 'rgba(196,91,91,0.10)';
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
  const pillBg = getVerdictPillBg(score);

  return (
    <View style={styles.container}>
      <View style={styles.contentWrap}>
        {/* Compact horizontal layout: Score ring + Verdict info */}
        <View style={styles.verdictContent}>
          {/* Score Ring - Compact */}
          <View style={styles.scoreContainer}>
            <View style={[styles.scoreRing, { borderColor: verdictColor }]}>
              <Text style={[styles.scoreValue, { color: verdictColor }]}>{score}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
          </View>

          {/* Verdict Info - Right side */}
          <View style={styles.verdictInfo}>
            <View style={styles.verdictTitleRow}>
              <Text style={styles.verdictTitle}>
                <Text style={styles.verdictTitleNavy}>Verdict</Text>
                <Text style={styles.verdictTitleTeal}>IQ</Text>
              </Text>
              {/* Pill verdict label */}
              <View style={[styles.verdictPill, { backgroundColor: pillBg }]}>
                <Text style={[styles.verdictLabel, { color: verdictColor }]}>
                  {verdictLabel}
                </Text>
              </View>
            </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: decisionGrade.bgPrimary,
  },
  contentWrap: {
    paddingBottom: rs(16),
  },
  verdictContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rs(16),
    paddingHorizontal: rs(16),
    gap: rs(14),
  },
  scoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRing: {
    width: rs(70),
    height: rs(70),
    borderRadius: rs(35),
    borderWidth: rs(4),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: decisionGrade.bgPrimary,
  },
  scoreValue: {
    fontSize: rf(26),
    fontWeight: '800',
    lineHeight: rf(28),
  },
  scoreMax: {
    fontSize: rf(9),
    fontWeight: '500',
    color: decisionGrade.textMuted,
    marginTop: rs(-1),
  },
  verdictInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  verdictTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginBottom: rs(4),
  },
  verdictTitle: {
    fontSize: rf(14),
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  verdictTitleNavy: {
    color: decisionGrade.deepNavy,
  },
  verdictTitleTeal: {
    color: decisionGrade.pacificTeal,
  },
  verdictPill: {
    paddingHorizontal: rs(10),
    paddingVertical: rs(3),
    borderRadius: rs(10),
  },
  verdictLabel: {
    fontSize: rf(13),
    fontWeight: '700',
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
    color: decisionGrade.textMuted,
  },
  confidenceSection: {
    paddingHorizontal: rs(20),
  },
  confidenceHeader: {
    fontSize: rf(10),
    fontWeight: '700',
    color: decisionGrade.textSecondary,
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
    height: rs(8),
    backgroundColor: 'rgba(229,229,229,0.5)',
    borderRadius: rs(4),
    overflow: 'hidden',
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
