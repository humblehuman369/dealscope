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
import { verdictDark } from '../../theme/colors';
import { verdictTypography } from '../../theme/textStyles';
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
// COLOR HELPERS (VerdictIQ 3.3 dark theme)
// =============================================================================

const getVerdictColor = (score: number): string => {
  if (score >= 80) return verdictDark.green;
  if (score >= 60) return verdictDark.gold;
  if (score >= 40) return verdictDark.blue;
  return verdictDark.red;
};

const getVerdictPillBg = (score: number): string => {
  if (score >= 80) return verdictDark.greenBg;
  if (score >= 60) return verdictDark.goldBg;
  if (score >= 40) return verdictDark.blueBg;
  return verdictDark.redBg;
};

const getHarmonizedColor = (color: 'teal' | 'amber' | 'negative'): string => {
  switch (color) {
    case 'teal': return verdictDark.teal;
    case 'amber': return verdictDark.gold;
    case 'negative': return verdictDark.red;
  }
};

const getSignalAccentBg = (color: 'teal' | 'amber' | 'negative'): string => {
  switch (color) {
    case 'teal': return verdictDark.tealBg;
    case 'amber': return verdictDark.goldBg;
    case 'negative': return verdictDark.redBg;
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

        {/* Score Components — real backend values that feed the headline score */}
        <View style={styles.internalDivider} />
        <View style={styles.confidenceSection}>
          <Text style={styles.confidenceHeader}>SCORE COMPONENTS</Text>
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
  // Card container — dark theme
  outerContainer: {
    paddingHorizontal: rs(20),
    paddingVertical: rs(32),
    backgroundColor: verdictDark.bg,
  },
  card: {
    backgroundColor: verdictDark.bg,
    overflow: 'hidden',
    alignItems: 'center',
  },
  accentBar: {
    height: 0, // Hidden in dark theme — hero uses radial glow instead
  },

  // Section header
  sectionHeader: {
    alignItems: 'center',
    paddingBottom: rs(4),
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  titleNavy: {
    color: verdictDark.textBody,
  },
  titleTeal: {
    color: verdictDark.textBody,
  },

  // Arc gauge
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs(12),
  },

  // Verdict info (centered)
  verdictInfoCenter: {
    alignItems: 'center',
    paddingHorizontal: rs(20),
    paddingBottom: rs(20),
  },
  verdictPill: {
    paddingHorizontal: rs(24),
    paddingVertical: rs(8),
    borderRadius: rs(100),
    borderWidth: 1.5,
    marginBottom: rs(16),
  },
  verdictLabel: {
    fontSize: rf(15),
    fontWeight: '700',
  },
  verdictSubtitle: {
    ...verdictTypography.body,
    fontSize: rf(16),
    color: verdictDark.textBody,
    textAlign: 'center',
    marginBottom: rs(20),
    maxWidth: 340,
    lineHeight: rf(16) * 1.65,
  },
  verdictLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  verdictLink: {
    fontSize: rf(13),
    fontWeight: '500',
    color: verdictDark.textSecondary,
  },
  linkSeparator: {
    fontSize: rf(13),
    color: verdictDark.textLabel,
  },

  // Internal divider
  internalDivider: {
    height: 1,
    backgroundColor: verdictDark.border,
    marginHorizontal: rs(16),
    width: '90%',
    alignSelf: 'center',
  },

  // Signal indicators — hidden in new verdict page (moved to MarketSnapshot)
  signalRow: {
    flexDirection: 'row',
    paddingHorizontal: rs(12),
    paddingVertical: rs(14),
    gap: rs(6),
  },
  signalCard: {
    flex: 1,
    backgroundColor: verdictDark.card,
    borderRadius: rs(8),
    paddingTop: rs(10),
    paddingBottom: rs(8),
    paddingHorizontal: rs(6),
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: verdictDark.border,
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
    color: verdictDark.textLabel,
    textTransform: 'uppercase',
    marginBottom: rs(4),
  },
  signalValue: {
    fontSize: rf(14),
    fontWeight: '700',
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

  // Confidence metrics
  confidenceSection: {
    paddingHorizontal: rs(20),
    paddingVertical: rs(16),
    width: '100%',
  },
  confidenceHeader: {
    fontSize: rf(10),
    fontWeight: '700',
    color: verdictDark.textSecondary,
    letterSpacing: 0.8,
    marginBottom: rs(12),
    textTransform: 'uppercase',
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
    color: verdictDark.textBody,
    width: rs(110),
  },
  confidenceBar: {
    flex: 1,
    height: rs(6),
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    fontVariant: ['tabular-nums'],
    width: rs(40),
    textAlign: 'right',
  },
});

export default VerdictHero;
