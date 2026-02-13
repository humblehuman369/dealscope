/**
 * SaveCTA — Account creation CTA at bottom of strategy page
 * Per StrategyIQ 3.3 design
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { verdictDark } from '../../theme/colors';
import { verdictTypography } from '../../theme/textStyles';
import { rf, rs } from '../verdict-iq/responsive';

interface SaveCTAProps {
  onPress: () => void;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  note?: string;
}

export function SaveCTA({
  onPress,
  title = "Don't Lose This Deal",
  subtitle = "Save it to your DealVaultIQ. We'll keep the numbers fresh and alert you if anything changes.",
  buttonLabel = 'Create Free Account',
  note = 'No credit card · 3 free scans per month',
}: SaveCTAProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <TouchableOpacity 
        style={styles.button} 
        onPress={onPress} 
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        accessibilityHint="Creates a free account to save this property analysis"
      >
        <Text style={styles.buttonText}>{buttonLabel}</Text>
      </TouchableOpacity>
      {note && <Text style={styles.note}>{note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: rs(40),
    paddingHorizontal: rs(20),
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: verdictDark.border,
  },
  title: {
    ...verdictTypography.heading,
    fontSize: rf(21),
    color: verdictDark.textHeading,
    textAlign: 'center',
    marginBottom: rs(8),
  },
  subtitle: {
    ...verdictTypography.body,
    fontSize: rf(15),
    color: verdictDark.textBody,
    textAlign: 'center',
    lineHeight: rf(15) * 1.55,
    marginBottom: rs(24),
  },
  button: {
    paddingVertical: rs(16),
    paddingHorizontal: rs(32),
    backgroundColor: verdictDark.blueDeep,
    borderRadius: rs(100),
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonText: {
    ...verdictTypography.cta,
    fontSize: rf(17),
  },
  note: {
    marginTop: rs(12),
    fontSize: rf(13),
    fontWeight: '400',
    color: verdictDark.textSecondary,
  },
});
