/**
 * PriceScale — Gradient bar showing price zones vs asking price
 * Per VerdictIQ 3.3 design: teal→blue→gold gradient with two dot markers
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { verdictDark } from '../../theme/colors';
import { verdictTypography } from '../../theme/textStyles';
import { rf, rs } from './responsive';

interface PriceScaleProps {
  /** Formatted asking price string, e.g. "$4.5M" */
  askingPriceLabel: string;
  /** Position of the target/profit entry dot (0–1) */
  targetPosition: number;
  /** Position of the asking price dot (0–1, usually near or past 1) */
  askingPosition: number;
  /** Labels below the scale bar */
  labels: string[];
  /** Financing terms note, e.g. "20% down · 6.0% rate · 30-year term" */
  termsNote?: string;
}

export function PriceScale({
  askingPriceLabel,
  targetPosition,
  askingPosition,
  labels,
  termsNote,
}: PriceScaleProps) {
  const clampedTarget = Math.min(Math.max(targetPosition, 0.02), 0.98);
  const clampedAsking = Math.min(Math.max(askingPosition, 0.02), 0.98);

  return (
    <View style={styles.container}>
      {/* Context row */}
      <View style={styles.contextRow}>
        <Text style={styles.askingLabel}>
          Asking: <Text style={styles.askingValue}>{askingPriceLabel}</Text>
        </Text>
      </View>

      {/* Scale bar */}
      <View style={styles.barWrap}>
        <LinearGradient
          colors={[verdictDark.teal, verdictDark.blue, verdictDark.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bar}
        />
        {/* Target dot (blue) */}
        <View style={[styles.dot, styles.dotTarget, { left: `${clampedTarget * 100}%` }]} />
        {/* Asking dot (red) */}
        <View style={[styles.dot, styles.dotAsking, { left: `${clampedAsking * 100}%` }]} />
      </View>

      {/* Scale labels */}
      <View style={styles.labelsRow}>
        {labels.map((label, i) => (
          <Text
            key={i}
            style={[
              styles.scaleLabel,
              i === labels.length - 1 && { color: verdictDark.red },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>

      {/* Terms note */}
      {termsNote && (
        <Text style={styles.termsNote}>
          Based on <Text style={styles.termsHighlight}>{termsNote}</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: rs(12),
  },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: rs(12),
  },
  askingLabel: {
    fontSize: rf(13),
    fontWeight: '500',
    color: verdictDark.textBody,
  },
  askingValue: {
    color: verdictDark.red,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  barWrap: {
    position: 'relative',
    marginBottom: rs(8),
    height: rs(6),
  },
  bar: {
    height: rs(6),
    borderRadius: rs(3),
  },
  dot: {
    position: 'absolute',
    top: rs(-5),
    width: rs(16),
    height: rs(16),
    borderRadius: rs(8),
    borderWidth: 2.5,
    borderColor: verdictDark.white,
    marginLeft: rs(-8),
  },
  dotTarget: {
    backgroundColor: verdictDark.blue,
    shadowColor: verdictDark.blue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  dotAsking: {
    backgroundColor: verdictDark.red,
    shadowColor: verdictDark.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 4,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    fontSize: rf(11),
    fontWeight: '600',
    color: verdictDark.textSecondary,
  },
  termsNote: {
    textAlign: 'center',
    marginTop: rs(14),
    fontSize: rf(13),
    fontWeight: '400',
    color: verdictDark.textSecondary,
  },
  termsHighlight: {
    color: verdictDark.blue,
    fontWeight: '600',
  },
});
