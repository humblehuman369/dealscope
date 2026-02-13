/**
 * VerdictCTA — CTA section to navigate from VerdictIQ → StrategyIQ
 * Per VerdictIQ 3.3 design: "Show Me the Numbers" with trust features
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { verdictDark } from '../../theme/colors';
import { verdictTypography } from '../../theme/textStyles';
import { rf, rs } from './responsive';

interface VerdictCTAProps {
  onPress: () => void;
  headline?: string;
  body?: string;
  buttonLabel?: string;
}

export function VerdictCTA({
  onPress,
  headline = 'See If the Numbers\nActually Work',
  body = 'Get a plain-English financial breakdown — what you\'d pay, what you\'d earn, and whether it\'s worth it.',
  buttonLabel = 'Show Me the Numbers',
}: VerdictCTAProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Think there's an opportunity?</Text>
      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.body}>{body}</Text>

      <TouchableOpacity 
        style={styles.button} 
        onPress={onPress} 
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        accessibilityHint="Opens the StrategyIQ screen with detailed financial breakdown"
      >
        <Text style={styles.buttonText}>{buttonLabel}</Text>
        <Ionicons name="chevron-forward" size={rf(18)} color={verdictDark.white} />
      </TouchableOpacity>

      <View style={styles.features}>
        <Feature label="Free to use" />
        <Feature label="No signup needed" />
        <Feature label="60 seconds" />
      </View>
    </View>
  );
}

function Feature({ label }: { label: string }) {
  return (
    <View style={styles.feature}>
      <Ionicons name="checkmark" size={rf(14)} color={verdictDark.teal} />
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

/** Trust strip shown below CTA */
export function TrustStrip() {
  return (
    <View style={styles.trustContainer}>
      <Text style={styles.trustText}>
        VerdictIQ analyzes{' '}
        <Text style={styles.trustBold}>rental income, expenses, market conditions</Text> and{' '}
        <Text style={styles.trustBold}>comparable sales</Text> to score every property. No guesswork — just data.
      </Text>
    </View>
  );
}

/** Simple footer */
export function VerdictFooter() {
  return (
    <View style={styles.footerContainer}>
      <Text style={styles.footerText}>
        Powered by{' '}
        <Text style={styles.footerBrand}>
          Invest<Text style={styles.footerIQ}>IQ</Text>
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: rs(40),
    paddingHorizontal: rs(20),
    alignItems: 'center',
    backgroundColor: verdictDark.bg,
    borderTopWidth: 1,
    borderTopColor: verdictDark.border,
  },
  eyebrow: {
    fontSize: rf(12),
    fontWeight: '700',
    color: verdictDark.teal,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: rs(12),
  },
  headline: {
    ...verdictTypography.heading,
    fontSize: rf(22),
    textAlign: 'center',
    color: verdictDark.textHeading,
    marginBottom: rs(12),
    lineHeight: rf(22) * 1.3,
  },
  body: {
    ...verdictTypography.body,
    fontSize: rf(15),
    textAlign: 'center',
    color: verdictDark.textBody,
    marginBottom: rs(28),
    maxWidth: 340,
    lineHeight: rf(15) * 1.55,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    paddingVertical: rs(16),
    paddingHorizontal: rs(36),
    backgroundColor: verdictDark.blueDeep,
    borderRadius: rs(100),
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    ...verdictTypography.cta,
    fontSize: rf(17),
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: rs(24),
    marginTop: rs(20),
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
  },
  featureText: {
    fontSize: rf(12),
    fontWeight: '500',
    color: verdictDark.textSecondary,
  },
  // Trust strip
  trustContainer: {
    paddingVertical: rs(20),
    paddingHorizontal: rs(20),
    alignItems: 'center',
    backgroundColor: verdictDark.black,
    borderTopWidth: 1,
    borderTopColor: verdictDark.border,
  },
  trustText: {
    fontSize: rf(12),
    fontWeight: '400',
    lineHeight: rf(12) * 1.5,
    color: verdictDark.textSecondary,
    textAlign: 'center',
  },
  trustBold: {
    fontWeight: '600',
    color: verdictDark.blue,
  },
  // Footer
  footerContainer: {
    paddingVertical: rs(20),
    alignItems: 'center',
  },
  footerText: {
    fontSize: rf(12),
    fontWeight: '400',
    color: verdictDark.textSecondary,
  },
  footerBrand: {
    fontWeight: '600',
    color: verdictDark.textBody,
  },
  footerIQ: {
    color: verdictDark.blue,
  },
});
