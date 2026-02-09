/**
 * BenchmarkTable — Investor benchmarks table with status tags
 * Per StrategyIQ 3.3 design: metric, value, target, status tag (Poor/Fair/Good)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { verdictDark } from '../../theme/colors';
import { verdictTypography } from '../../theme/textStyles';
import { rf, rs } from '../verdict-iq/responsive';

export interface BenchmarkRow {
  metric: string;
  value: string;
  target: string;
  status: 'poor' | 'fair' | 'good';
}

interface BenchmarkTableProps {
  rows: BenchmarkRow[];
  helperText?: string;
}

const STATUS_STYLES = {
  poor: { color: verdictDark.red, bg: verdictDark.redBg, label: 'Below' },
  fair: { color: verdictDark.gold, bg: verdictDark.goldBg, label: 'Fair' },
  good: { color: verdictDark.green, bg: verdictDark.greenBg, label: 'Good' },
};

export function BenchmarkTable({ rows, helperText }: BenchmarkTableProps) {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, { flex: 1.2 }]}>Metric</Text>
        <Text style={[styles.headerCell, { flex: 1 }]}>This Deal</Text>
        <Text style={[styles.headerCell, { flex: 1 }]}>Target</Text>
        <Text style={[styles.headerCell, { flex: 0.7, textAlign: 'right' }]}></Text>
      </View>

      {/* Rows */}
      {rows.map((row, i) => {
        const s = STATUS_STYLES[row.status];
        return (
          <View key={i} style={styles.dataRow}>
            <Text style={[styles.metricCell, { flex: 1.2 }]}>{row.metric}</Text>
            <Text style={[styles.valueCell, { flex: 1 }]}>{row.value}</Text>
            <Text style={[styles.targetCell, { flex: 1 }]}>{row.target}</Text>
            <View style={{ flex: 0.7, alignItems: 'flex-end' }}>
              <View style={[styles.statusTag, { backgroundColor: s.bg }]}>
                <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
              </View>
            </View>
          </View>
        );
      })}

      {/* Helper */}
      {helperText && (
        <View style={styles.helper}>
          <View style={styles.helperIcon}>
            <Ionicons name="information-circle-outline" size={rf(14)} color={verdictDark.gold} />
          </View>
          <Text style={styles.helperText}>
            <Text style={styles.helperBold}>Reading this table: </Text>
            {helperText}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  headerRow: {
    flexDirection: 'row',
    paddingVertical: rs(12),
    borderBottomWidth: 1,
    borderBottomColor: verdictDark.border,
  },
  headerCell: {
    fontSize: rf(11),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: verdictDark.textSecondary,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rs(12),
    borderBottomWidth: 1,
    borderBottomColor: verdictDark.border,
  },
  metricCell: {
    fontSize: rf(14),
    fontWeight: '500',
    color: verdictDark.textHeading,
  },
  valueCell: {
    ...verdictTypography.financial,
    fontSize: rf(14),
    color: verdictDark.textHeading,
  },
  targetCell: {
    fontSize: rf(14),
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    color: verdictDark.textSecondary,
  },
  statusTag: {
    paddingVertical: rs(3),
    paddingHorizontal: rs(8),
    borderRadius: rs(4),
  },
  statusText: {
    fontSize: rf(10),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  helper: {
    marginTop: rs(14),
    paddingVertical: rs(12),
    paddingHorizontal: rs(14),
    backgroundColor: verdictDark.card,
    borderWidth: 1,
    borderColor: verdictDark.border,
    borderRadius: rs(10),
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(10),
  },
  helperIcon: {
    width: rs(28),
    height: rs(28),
    backgroundColor: verdictDark.goldBg,
    borderRadius: rs(7),
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    flex: 1,
    fontSize: rf(13),
    fontWeight: '400',
    lineHeight: rf(13) * 1.55,
    color: verdictDark.textBody,
  },
  helperBold: {
    fontWeight: '600',
    color: verdictDark.gold,
  },
});
