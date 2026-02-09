/**
 * DataQuality — Confidence bars for data reliability
 * Per StrategyIQ 3.3 design
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { verdictDark } from '../../theme/colors';
import { verdictTypography } from '../../theme/textStyles';
import { rf, rs } from '../verdict-iq/responsive';

export interface ConfidenceMetric {
  label: string;
  value: number; // 0–100
  color: 'blue' | 'teal';
}

interface DataQualityProps {
  metrics: ConfidenceMetric[];
}

const BAR_COLORS = {
  blue: { start: verdictDark.blueDeep, end: verdictDark.blue, text: verdictDark.blue },
  teal: { start: verdictDark.teal, end: '#5eead4', text: verdictDark.teal },
};

export function DataQuality({ metrics }: DataQualityProps) {
  return (
    <View style={styles.container}>
      {metrics.map((m, i) => {
        const c = BAR_COLORS[m.color];
        return (
          <View key={i} style={styles.row}>
            <Text style={styles.label}>{m.label}</Text>
            <View style={styles.barWrap}>
              <View style={styles.barTrack}>
                <LinearGradient
                  colors={[c.start, c.end]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.barFill, { width: `${m.value}%` }]}
                />
              </View>
            </View>
            <Text style={[styles.pct, { color: c.text }]}>{m.value}%</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
    marginBottom: rs(16),
  },
  label: {
    fontSize: rf(14),
    fontWeight: '500',
    color: verdictDark.textBody,
    width: rs(145),
  },
  barWrap: {
    flex: 1,
  },
  barTrack: {
    height: rs(7),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: rs(4),
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: rs(4),
  },
  pct: {
    ...verdictTypography.financial,
    fontSize: rf(15),
    fontWeight: '700',
    width: rs(50),
    textAlign: 'right',
  },
});
