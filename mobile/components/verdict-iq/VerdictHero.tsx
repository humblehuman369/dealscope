/**
 * VerdictHero Component - Decision-Grade UI (Redesigned)
 *
 * Premium centered vertical layout with:
 * - SVG arc gauge score display
 * - Verdict pill + subtitle
 * - Signal indicators row (Deal Gap, Urgency, Market, Vacancy)
 * - Harmonized confidence metric bars
 * - Card container with teal accent
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
import { ArcGauge } from './ArcGauge';

// =============================================================================
// TYPES
// =============================================================================

export interface ConfidenceMetric {
  label: string;
  value: number;
  color: 'teal' | 'amber' | 'negative';
}

export interface SignalIndicator {
  label: string;
  value: string;
  status: string;
  color: 'teal' | 'amber' | 'negative';
}

export interface VerdictHeroProps {
  score: number;
  verdictLabel: string;
  verdictSubtitle: string;
  confidenceMetrics: ConfidenceMetric[];
  signalIndicators?: SignalIndicator[];
  onHowItWorksPress?: () => void;
  onHowWeScorePress?: () => void;
}

// =============================================================================
// COLOR HELPERS (Harmonized palette)
// =============================================================================

const getVerdictColor = (score: number): string => {
  if (score >= 80) return decisionGrade.pacificTeal;
  if (score >= 50) return decisionGrade.slateBlue;
  return decisionGrade.softCoral;
};

const getVerdictPillBg = (score: number): string => {
  if (score >= 80) return 'rgba(8,145,178,0.10)';
  if (score >= 50) return 'rgba(107,127,153,0.10)';
  return 'rgba(196,91,91,0.10)';
};

const getHarmonizedColor = (color: 'teal' | 'amber' | 'negative'): string => {
  switch (color) {
    case 'teal': return decisionGrade.pacificTeal;
    case 'amber': return decisionGrade.slateBlue;
    case 'negative': return decisionGrade.softCoral;
  }
};

const getSignalAccentBg = (color: 'teal' | 'amber' | 'negative'): string => {
  switch (color) {
    case 'teal': return 'rgba(8,145,178,0.08)';
    case 'amber': return 'rgba(107,127,153,0.08)';
    case 'negative': return 'rgba(196,91,91,0.08)';
  }
};

// =============================================================================
// COMPONENT
// =============================================================================

export function VerdictHero({
  score,
  verdictLabel,
  verdictSubtitle,
  confidenceMetrics,
  signalIndicators,
  onHowItWorksPress,
  onHowWeScorePress,
}: VerdictHeroProps) {
  const verdictColor = getVerdictColor(score);
  const pillBg = getVerdictPillBg(score);

  return (
    <View style={styles.outerContainer}>
      <View style={styles.card}>
        {/* Top accent bar */}
        <View style={styles.accentBar} />

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            <Text style={styles.titleNavy}>Verdict</Text>
            <Text style={styles.titleTeal}>IQ</Text>
          </Text>
        </View>

        {/* Arc Gauge - Centered hero */}
        <View style={styles.gaugeContainer}>
          <ArcGauge score={score} color={verdictColor} size={120} strokeWidth={10} />
        </View>

        {/* Verdict Pill + Subtitle */}
        <View style={styles.verdictInfoCenter}>
          <View style={[styles.verdictPill, { backgroundColor: pillBg }]}>
            <Text style={[styles.verdictLabel, { color: verdictColor }]}>
              {verdictLabel}
            </Text>
          </View>
          <Text style={styles.verdictSubtitle}>{verdictSubtitle}</Text>
          <View style={styles.verdictLinks}>
            <TouchableOpacity onPress={onHowItWorksPress}>
              <Text style={styles.verdictLink}>How VerdictIQ Works</Text>
            </TouchableOpacity>
            <Text style={styles.linkSeparator}>|</Text>
            <TouchableOpacity onPress={onHowWeScorePress}>
              <Text style={styles.verdictLink}>How We Score</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Signal Indicators Row */}
        {signalIndicators && signalIndicators.length > 0 && (
          <>
            <View style={styles.internalDivider} />
            <View style={styles.signalRow}>
              {signalIndicators.map((signal, index) => {
                const signalColor = getHarmonizedColor(signal.color);
                return (
                  <View key={index} style={styles.signalCard}>
                    <View style={[styles.signalAccentBar, { backgroundColor: signalColor }]} />
                    <Text style={styles.signalLabel}>{signal.label}</Text>
                    <Text style={[styles.signalValue, { color: signalColor }]}>
                      {signal.value}
                    </Text>
                    <View style={[styles.signalStatusPill, { backgroundColor: getSignalAccentBg(signal.color) }]}>
                      <Text style={[styles.signalStatusText, { color: signalColor }]}>
                        {signal.status}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Confidence Metrics */}
        <View style={styles.internalDivider} />
        <View style={styles.confidenceSection}>
          <Text style={styles.confidenceHeader}>CONFIDENCE METRICS</Text>
          {confidenceMetrics.map((metric, index) => {
            const metricColor = getHarmonizedColor(metric.color);
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

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Card container
  outerContainer: {
    paddingHorizontal: rs(16),
    paddingVertical: rs(4),
    backgroundColor: decisionGrade.bgSecondary,
  },
  card: {
    backgroundColor: decisionGrade.bgPrimary,
    borderRadius: rs(12),
    borderWidth: 1,
    borderColor: decisionGrade.verdictCardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  accentBar: {
    height: rs(3),
    backgroundColor: decisionGrade.pacificTeal,
  },

  // Section header
  sectionHeader: {
    alignItems: 'center',
    paddingTop: rs(16),
    paddingBottom: rs(4),
  },
  sectionTitle: {
    fontSize: rf(15),
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  titleNavy: {
    color: decisionGrade.deepNavy,
  },
  titleTeal: {
    color: decisionGrade.pacificTeal,
  },

  // Arc gauge
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs(8),
  },

  // Verdict info (centered)
  verdictInfoCenter: {
    alignItems: 'center',
    paddingHorizontal: rs(20),
    paddingBottom: rs(16),
  },
  verdictPill: {
    paddingHorizontal: rs(16),
    paddingVertical: rs(5),
    borderRadius: rs(14),
    marginBottom: rs(6),
  },
  verdictLabel: {
    fontSize: rf(14),
    fontWeight: '700',
  },
  verdictSubtitle: {
    fontSize: rf(12),
    fontWeight: '500',
    color: decisionGrade.textSecondary,
    textAlign: 'center',
    marginBottom: rs(8),
  },
  verdictLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
  },
  verdictLink: {
    fontSize: rf(11),
    fontWeight: '600',
    color: decisionGrade.pacificTeal,
  },
  linkSeparator: {
    fontSize: rf(11),
    color: decisionGrade.textMuted,
  },

  // Internal divider
  internalDivider: {
    height: 1,
    backgroundColor: decisionGrade.borderLight,
    marginHorizontal: rs(16),
  },

  // Signal indicators
  signalRow: {
    flexDirection: 'row',
    paddingHorizontal: rs(12),
    paddingVertical: rs(14),
    gap: rs(6),
  },
  signalCard: {
    flex: 1,
    backgroundColor: decisionGrade.signalCardBg,
    borderRadius: rs(8),
    paddingTop: rs(10),
    paddingBottom: rs(8),
    paddingHorizontal: rs(6),
    alignItems: 'center',
    overflow: 'hidden',
  },
  signalAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: rs(3),
    borderTopLeftRadius: rs(8),
    borderTopRightRadius: rs(8),
  },
  signalLabel: {
    fontSize: rf(8),
    fontWeight: '700',
    letterSpacing: 0.5,
    color: decisionGrade.textTertiary,
    textTransform: 'uppercase',
    marginBottom: rs(4),
  },
  signalValue: {
    fontSize: rf(14),
    fontWeight: '800',
    marginBottom: rs(4),
  },
  signalStatusPill: {
    paddingHorizontal: rs(8),
    paddingVertical: rs(2),
    borderRadius: rs(8),
  },
  signalStatusText: {
    fontSize: rf(8),
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Confidence metrics (harmonized)
  confidenceSection: {
    paddingHorizontal: rs(20),
    paddingVertical: rs(16),
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
    marginBottom: rs(10),
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
    height: rs(6),
    backgroundColor: decisionGrade.confidenceTrack,
    borderRadius: rs(3),
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: rs(3),
  },
  confidenceValue: {
    fontSize: rf(13),
    fontWeight: '700',
    width: rs(40),
    textAlign: 'right',
  },
});

export default VerdictHero;
