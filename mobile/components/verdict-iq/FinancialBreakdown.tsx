/**
 * FinancialBreakdown Component - Decision-Grade UI
 * Two-column mini financial statement layout:
 *   Left:  Purchase & Financing
 *   Right: Income & Expenses
 * Always fully expanded. Assumption variables inline.
 * Full-width NOI and Cashflow summary boxes below.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { verdictDark } from '../../theme/colors';
import { verdictTypography } from '../../theme/textStyles';
import { rf, rs } from './responsive';

export interface BreakdownRow {
  label: string;
  value: string;
  isNegative?: boolean;
  isTeal?: boolean;
  isSubHeader?: boolean;
}

export interface BreakdownGroup {
  title: string;
  adjustLabel?: string;
  rows: BreakdownRow[];
  totalRow?: BreakdownRow;
  onAdjust?: () => void;
}

interface FinancialBreakdownProps {
  leftColumn: BreakdownGroup[];
  rightColumn: BreakdownGroup[];
  noi: {
    label: string;
    value: string;
    monthlyLabel: string;
    monthlyValue: string;
  };
  cashflow: {
    annual: { label: string; value: string; isNegative: boolean };
    monthly: { label: string; value: string; isNegative: boolean };
  };
}

function ColumnGroup({ group }: { group: BreakdownGroup }) {
  return (
    <View style={styles.columnGroup}>
      {/* Sub-group header */}
      <View style={styles.subGroupHeader}>
        <View style={styles.subGroupAccent} />
        <Text style={styles.subGroupTitle}>{group.title}</Text>
      </View>

      {/* Rows */}
      {group.rows.map((row, index) => (
        <View key={index} style={styles.row}>
          <Text
            style={[
              styles.rowLabel,
              row.isSubHeader && styles.rowLabelSubHeader,
            ]}
            numberOfLines={1}
          >
            {row.label}
          </Text>
          {!row.isSubHeader && (
            <Text
              style={[
                styles.rowValue,
                row.isNegative && styles.rowValueNegative,
                row.isTeal && styles.rowValueTeal,
              ]}
              numberOfLines={1}
            >
              {row.value}
            </Text>
          )}
        </View>
      ))}

      {/* Total row */}
      {group.totalRow && (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{group.totalRow.label}</Text>
          <Text style={styles.totalValue}>{group.totalRow.value}</Text>
        </View>
      )}
    </View>
  );
}

export function FinancialBreakdown({
  leftColumn,
  rightColumn,
  noi,
  cashflow,
}: FinancialBreakdownProps) {
  const isPositiveCashflow = !cashflow.annual.isNegative;

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.sectionIcon}>
            <Ionicons name="calculator" size={16} color="white" />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Financial Breakdown</Text>
            <Text style={styles.sectionSubtitle}>Mini proforma statement</Text>
          </View>
        </View>
      </View>

      {/* Two-Column Layout */}
      <View style={styles.columnsRow}>
        {/* Left Column: Purchase & Financing */}
        <View style={styles.column}>
          {leftColumn.map((group, idx) => (
            <ColumnGroup key={idx} group={group} />
          ))}
        </View>

        {/* Right Column: Income & Expenses */}
        <View style={styles.column}>
          {rightColumn.map((group, idx) => (
            <ColumnGroup key={idx} group={group} />
          ))}
        </View>
      </View>

      {/* Bottom Row: Resources (left) + NOI/Cashflow (right) */}
      <View style={styles.bottomRow}>
        {/* Left: Resources */}
        <View style={styles.bottomColumn}>
          {/* Resources sub-header (same style as FINANCING) */}
          <View style={styles.subGroupHeader}>
            <View style={styles.subGroupAccent} />
            <Text style={styles.subGroupTitle}>Resources</Text>
          </View>

          <TouchableOpacity
            style={styles.resourceBtn}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Get Funding', 'Funding resources coming soon');
            }}
          >
            <Ionicons name="cash-outline" size={14} color={verdictDark.teal} />
            <Text style={styles.resourceBtnText}>GET FUNDING</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resourceBtn}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Talk to an Agent', 'Agent matching coming soon');
            }}
          >
            <Ionicons name="people-outline" size={14} color={verdictDark.teal} />
            <Text style={styles.resourceBtnText}>TALK TO AN AGENT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resourceBtn}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert('Need a Contractor', 'Contractor matching coming soon');
            }}
          >
            <Ionicons name="construct-outline" size={14} color={verdictDark.teal} />
            <Text style={styles.resourceBtnText}>NEED A CONTRACTOR</Text>
          </TouchableOpacity>
        </View>

        {/* Right: NOI + Cashflow */}
        <View style={styles.bottomColumn}>
          {/* NOI Highlight */}
          <View style={styles.noiBox}>
            <View style={styles.noiAccent} />
            <View style={styles.noiTopRow}>
              <Text style={styles.noiLabel}>{noi.label}</Text>
              <Text style={styles.noiValue}>{noi.value}</Text>
            </View>
            <View style={styles.noiBottomRow}>
              <Text style={styles.noiMonthlyLabel}>{noi.monthlyLabel}</Text>
              <Text style={styles.noiMonthlyValue}>{noi.monthlyValue}</Text>
            </View>
          </View>

          {/* Cashflow Box */}
          <View
            style={[
              styles.cashflowBox,
              isPositiveCashflow
                ? styles.cashflowBoxPositive
                : styles.cashflowBoxNegative,
            ]}
          >
            <View
              style={[
                styles.cashflowAccent,
                isPositiveCashflow
                  ? styles.cashflowAccentPositive
                  : styles.cashflowAccentNegative,
              ]}
            />
            <View style={styles.cashflowRow}>
              <Text style={styles.cashflowLabel}>{cashflow.annual.label}</Text>
              <Text
                style={[
                  styles.cashflowValue,
                  cashflow.annual.isNegative && styles.cashflowValueNeg,
                ]}
              >
                {cashflow.annual.value}
              </Text>
            </View>
            <View style={styles.cashflowRow}>
              <Text style={styles.cashflowMonthlyLabel}>
                {cashflow.monthly.label}
              </Text>
              <Text
                style={[
                  styles.cashflowMonthlyValue,
                  cashflow.monthly.isNegative && styles.cashflowValueNeg,
                ]}
              >
                {cashflow.monthly.value}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: verdictDark.black,
    paddingBottom: rs(12),
  },

  /* ── Header ── */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: rs(14),
    paddingHorizontal: rs(16),
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  sectionIcon: {
    width: rs(36),
    height: rs(36),
    backgroundColor: verdictDark.blueBg,
    borderRadius: rs(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: rf(13),
    fontWeight: '700',
    color: verdictDark.textHeading,
  },
  sectionSubtitle: {
    fontSize: rf(10),
    fontWeight: '500',
    color: verdictDark.textSecondary,
  },

  /* ── Two-column area ── */
  columnsRow: {
    flexDirection: 'row',
    paddingHorizontal: rs(12),
    gap: rs(10),
  },
  column: {
    flex: 1,
  },

  /* ── Sub-group inside a column ── */
  columnGroup: {
    marginBottom: rs(10),
  },
  subGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: rs(6),
    borderBottomWidth: 2,
    borderBottomColor: verdictDark.blue,
    marginBottom: rs(4),
  },
  subGroupAccent: {
    width: rs(3),
    height: rs(12),
    backgroundColor: verdictDark.blue,
    borderRadius: rs(1.5),
    marginRight: rs(6),
  },
  subGroupTitle: {
    fontSize: rf(9),
    fontWeight: '700',
    color: verdictDark.blue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* ── Rows ── */
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: rs(5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: verdictDark.border,
  },
  rowLabel: {
    fontSize: rf(10),
    fontWeight: '500',
    color: verdictDark.textBody,
    flex: 1,
    marginRight: rs(4),
  },
  rowLabelSubHeader: {
    fontWeight: '700',
    color: verdictDark.textHeading,
    fontSize: rf(10),
  },
  rowValue: {
    fontSize: rf(10),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: verdictDark.textHeading,
  },
  rowValueNegative: {
    color: verdictDark.red,
  },
  rowValueTeal: {
    color: verdictDark.blue,
  },

  /* ── Total row ── */
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: rs(6),
    borderTopWidth: 1.5,
    borderTopColor: verdictDark.blue,
    marginTop: rs(2),
  },
  totalLabel: {
    fontSize: rf(10),
    fontWeight: '700',
    color: verdictDark.textHeading,
    flex: 1,
    marginRight: rs(4),
  },
  totalValue: {
    fontSize: rf(10),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: verdictDark.blue,
  },

  /* ── Bottom row (Resources left, NOI/Cash right) ── */
  bottomRow: {
    flexDirection: 'row',
    paddingHorizontal: rs(12),
    gap: rs(10),
  },
  bottomColumn: {
    flex: 1,
  },

  /* ── Resource Buttons ── */
  resourceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    paddingVertical: rs(10),
    paddingHorizontal: rs(12),
    backgroundColor: verdictDark.card,
    borderWidth: 1,
    borderColor: verdictDark.border,
    borderRadius: rs(8),
    marginBottom: rs(6),
  },
  resourceBtnText: {
    fontSize: rf(9),
    fontWeight: '700',
    color: verdictDark.teal,
    letterSpacing: 0.4,
  },

  /* ── NOI Box ── */
  noiBox: {
    paddingVertical: rs(10),
    paddingHorizontal: rs(12),
    paddingLeft: rs(16),
    backgroundColor: verdictDark.greenBg,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.2)',
    borderRadius: rs(10),
    overflow: 'hidden',
    marginBottom: rs(6),
  },
  noiAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: rs(4),
    backgroundColor: verdictDark.green,
    borderTopLeftRadius: rs(10),
    borderBottomLeftRadius: rs(10),
  },
  noiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rs(3),
  },
  noiLabel: {
    fontSize: rf(9),
    fontWeight: '700',
    color: verdictDark.textHeading,
    flex: 1,
  },
  noiValue: {
    ...verdictTypography.financial,
    fontSize: rf(12),
    fontWeight: '700',
    color: verdictDark.green,
  },
  noiBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noiMonthlyLabel: {
    fontSize: rf(9),
    fontWeight: '500',
    color: verdictDark.textSecondary,
  },
  noiMonthlyValue: {
    fontSize: rf(10),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: verdictDark.green,
  },

  /* ── Cashflow Box ── */
  cashflowBox: {
    paddingVertical: rs(10),
    paddingHorizontal: rs(12),
    paddingLeft: rs(16),
    borderRadius: rs(10),
    borderWidth: 1,
    overflow: 'hidden',
  },
  cashflowAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: rs(4),
    borderTopLeftRadius: rs(10),
    borderBottomLeftRadius: rs(10),
  },
  cashflowAccentPositive: {
    backgroundColor: verdictDark.green,
  },
  cashflowAccentNegative: {
    backgroundColor: verdictDark.red,
  },
  cashflowBoxPositive: {
    backgroundColor: verdictDark.greenBg,
    borderColor: 'rgba(52,211,153,0.2)',
  },
  cashflowBoxNegative: {
    backgroundColor: verdictDark.redBg,
    borderColor: 'rgba(248,113,113,0.2)',
  },
  cashflowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rs(3),
  },
  cashflowLabel: {
    fontSize: rf(9),
    fontWeight: '700',
    color: verdictDark.textHeading,
  },
  cashflowValue: {
    ...verdictTypography.financial,
    fontSize: rf(12),
    fontWeight: '700',
    color: verdictDark.green,
  },
  cashflowValueNeg: {
    color: verdictDark.red,
  },
  cashflowMonthlyLabel: {
    fontSize: rf(9),
    fontWeight: '500',
    color: verdictDark.textSecondary,
  },
  cashflowMonthlyValue: {
    fontSize: rf(10),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: verdictDark.green,
  },
});

export default FinancialBreakdown;
