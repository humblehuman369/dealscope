/**
 * InsightBox — Plain-English insight callout with left border
 * Per StrategyIQ 3.3 design. Reusable across sections.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { verdictDark } from '../../theme/colors';
import { verdictTypography } from '../../theme/textStyles';
import { rf, rs } from '../verdict-iq/responsive';

interface InsightBoxProps {
  label?: string;
  children: React.ReactNode;
  accentColor?: string;
}

export function InsightBox({
  label = 'What this means for you',
  children,
  accentColor = verdictDark.blue,
}: InsightBoxProps) {
  return (
    <View style={[styles.container, { borderLeftColor: accentColor }]}>
      <View style={styles.labelRow}>
        <Ionicons name="layers-outline" size={rf(14)} color={accentColor} />
        <Text style={[styles.label, { color: accentColor }]}>{label}</Text>
      </View>
      <View>{children}</View>
    </View>
  );
}

/** Convenience for rendering a simple text insight */
export function InsightText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.text}>{children}</Text>;
}

export function InsightBold({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bold}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: verdictDark.card,
    borderWidth: 1,
    borderColor: verdictDark.border,
    borderLeftWidth: 3,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: rs(12),
    borderBottomRightRadius: rs(12),
    paddingVertical: rs(16),
    paddingHorizontal: rs(20),
    marginTop: rs(20),
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    marginBottom: rs(8),
  },
  label: {
    fontSize: rf(11),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  text: {
    ...verdictTypography.bodySmall,
    fontSize: rf(14),
    lineHeight: rf(14) * 1.65,
    color: verdictDark.textBody,
  },
  bold: {
    fontWeight: '600',
    color: verdictDark.textHeading,
  },
});
