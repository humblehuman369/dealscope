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
import { decisionGrade } from '../../theme/colors';
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
            <Ionicons name="cash-outline" size={14} color={decisionGrade.pacificTeal} />
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
            <Ionicons name="people-outline" size={14} color={decisionGrade.pacificTeal} />
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
            <Ionicons name="construct-outline" size={14} color={decisionGrade.pacificTeal} />
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
    backgroundColor: decisionGrade.bgPrimary,
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
    backgroundColor: decisionGrade.deepNavy,
    borderRadius: rs(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: rf(13),
    fontWeight: '700',
    color: decisionGrade.textPrimary,
  },
  sectionSubtitle: {
    fontSize: rf(10),
    fontWeight: '500',
    color: decisionGrade.textSecondary,
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
    borderBottomColor: decisionGrade.pacificTeal,
    marginBottom: rs(4),
  },
  subGroupAccent: {
    width: rs(3),
    height: rs(12),
    backgroundColor: decisionGrade.pacificTeal,
    borderRadius: rs(1.5),
    marginRight: rs(6),
  },
  subGroupTitle: {
    fontSize: rf(9),
    fontWeight: '700',
    color: decisionGrade.pacificTeal,
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
    borderBottomColor: decisionGrade.borderLight,
  },
  rowLabel: {
    fontSize: rf(10),
    fontWeight: '500',
    color: decisionGrade.textSecondary,
    flex: 1,
    marginRight: rs(4),
  },
  rowLabelSubHeader: {
    fontWeight: '700',
    color: decisionGrade.textPrimary,
    fontSize: rf(10),
  },
  rowValue: {
    fontSize: rf(10),
    fontWeight: '600',
    color: decisionGrade.textPrimary,
  },
  rowValueNegative: {
    color: decisionGrade.negative,
  },
  rowValueTeal: {
    color: decisionGrade.pacificTeal,
  },

  /* ── Total row ── */
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: rs(6),
    borderTopWidth: 1.5,
    borderTopColor: decisionGrade.pacificTeal,
    marginTop: rs(2),
  },
  totalLabel: {
    fontSize: rf(10),
    fontWeight: '700',
    color: decisionGrade.textPrimary,
    flex: 1,
    marginRight: rs(4),
  },
  totalValue: {
    fontSize: rf(10),
    fontWeight: '700',
    color: decisionGrade.pacificTeal,
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
    backgroundColor: decisionGrade.bgPrimary,
    borderWidth: 1.5,
    borderColor: decisionGrade.pacificTeal,
    borderRadius: rs(8),
    marginBottom: rs(6),
  },
  resourceBtnText: {
    fontSize: rf(9),
    fontWeight: '700',
    color: decisionGrade.pacificTeal,
    letterSpacing: 0.4,
  },

  /* ── NOI Box ── */
  noiBox: {
    paddingVertical: rs(10),
    paddingHorizontal: rs(12),
    paddingLeft: rs(16),
    backgroundColor: 'rgba(8,145,178,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(8,145,178,0.20)',
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
    backgroundColor: decisionGrade.pacificTeal,
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
    color: decisionGrade.textPrimary,
    flex: 1,
  },
  noiValue: {
    fontSize: rf(12),
    fontWeight: '800',
    color: decisionGrade.pacificTeal,
  },
  noiBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noiMonthlyLabel: {
    fontSize: rf(9),
    fontWeight: '500',
    color: decisionGrade.textSecondary,
  },
  noiMonthlyValue: {
    fontSize: rf(10),
    fontWeight: '600',
    color: decisionGrade.pacificTeal,
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
    backgroundColor: decisionGrade.pacificTeal,
  },
  cashflowAccentNegative: {
    backgroundColor: decisionGrade.negative,
  },
  cashflowBoxPositive: {
    backgroundColor: 'rgba(8,145,178,0.05)',
    borderColor: 'rgba(8,145,178,0.20)',
  },
  cashflowBoxNegative: {
    backgroundColor: 'rgba(220,38,38,0.05)',
    borderColor: 'rgba(220,38,38,0.20)',
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
    color: decisionGrade.textPrimary,
  },
  cashflowValue: {
    fontSize: rf(12),
    fontWeight: '800',
    color: decisionGrade.pacificTeal,
  },
  cashflowValueNeg: {
    color: decisionGrade.negative,
  },
  cashflowMonthlyLabel: {
    fontSize: rf(9),
    fontWeight: '500',
    color: decisionGrade.textSecondary,
  },
  cashflowMonthlyValue: {
    fontSize: rf(10),
    fontWeight: '600',
    color: decisionGrade.pacificTeal,
  },
});

export default FinancialBreakdown;
