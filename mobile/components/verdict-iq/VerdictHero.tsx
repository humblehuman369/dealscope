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
import { LinearGradient } from 'expo-linear-gradient';
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

const getVerdictPillBg = (score: number): string => {
  if (score >= 70) return 'rgba(8,145,178,0.10)';
  if (score >= 50) return 'rgba(217,119,6,0.10)';
  return 'rgba(220,38,38,0.10)';
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
      {/* Teal accent line at top */}
      <View style={styles.accentLine} />

      <LinearGradient
        colors={[
          decisionGrade.gradientTealStart,
          'rgba(255,255,255,0)',
          'rgba(255,255,255,0)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientBg}
      >
        {/* Verdict Content - Grid Layout */}
        <View style={styles.verdictContent}>
          {/* Score Container - Centered in left half */}
          <View style={styles.scoreContainer}>
            {/* Glow behind ring */}
            <View style={[styles.scoreGlow, { shadowColor: verdictColor }]} />
            <View style={[styles.scoreRing, { borderColor: verdictColor }]}>
              <Text style={[styles.scoreValue, { color: verdictColor }]}>{score}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
          </View>

          {/* Verdict Info - Right half */}
          <View style={styles.verdictInfo}>
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
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: decisionGrade.bgPrimary,
  },
  accentLine: {
    height: rs(3),
    backgroundColor: decisionGrade.pacificTeal,
  },
  gradientBg: {
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
  scoreGlow: {
    position: 'absolute',
    width: rs(100),
    height: rs(100),
    borderRadius: rs(50),
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 0,
  },
  scoreRing: {
    width: rs(90),
    height: rs(90),
    borderRadius: rs(45),
    borderWidth: rs(5),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: decisionGrade.bgPrimary,
    shadowColor: 'rgba(8,145,178,0.15)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  scoreValue: {
    fontSize: rf(36),
    fontWeight: '800',
  },
  scoreMax: {
    fontSize: rf(11),
    fontWeight: '500',
    color: decisionGrade.textMuted,
    marginTop: rs(-2),
  },
  verdictInfo: {
    flex: 1,
    paddingLeft: rs(8),
    justifyContent: 'center',
  },
  verdictTitle: {
    fontSize: rf(16),
    fontWeight: '800',
    marginBottom: rs(4),
    letterSpacing: -0.3,
  },
  verdictTitleNavy: {
    color: decisionGrade.deepNavy,
  },
  verdictTitleTeal: {
    color: decisionGrade.pacificTeal,
  },
  verdictPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: rs(12),
    paddingVertical: rs(4),
    borderRadius: rs(12),
    marginBottom: rs(4),
  },
  verdictLabel: {
    fontSize: rf(16),
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
