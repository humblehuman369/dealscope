/**
 * FinancialBreakdown Component - Decision-Grade UI
 * Expandable financial tables with adjust buttons
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
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
}

export interface BreakdownGroup {
  title: string;
  adjustLabel?: string;
  rows: BreakdownRow[];
  totalRow?: BreakdownRow;
  onAdjust?: () => void;
}

interface FinancialBreakdownProps {
  isOpen?: boolean;
  onToggle?: () => void;
  purchaseTerms: BreakdownGroup;
  income: BreakdownGroup;
  operatingExpenses: BreakdownGroup;
  noi: { label: string; value: string };
  debtService: BreakdownGroup;
  cashflow: {
    annual: { label: string; value: string; isNegative: boolean };
    monthly: { label: string; value: string; isNegative: boolean };
  };
}

function TableGroup({ group }: { group: BreakdownGroup }) {
  return (
    <View style={styles.tableGroup}>
      <View style={styles.tableGroupHeader}>
        <Text style={styles.tableGroupTitle}>{group.title}</Text>
        {group.adjustLabel && (
          <TouchableOpacity
            style={styles.adjustBtn}
            onPress={group.onAdjust}
          >
            <Text style={styles.adjustBtnText}>{group.adjustLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
      {group.rows.map((row, index) => (
        <View key={index} style={styles.tableRow}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <Text style={[
            styles.rowValue,
            row.isNegative && styles.rowValueNegative,
            row.isTeal && styles.rowValueTeal,
          ]}>
            {row.value}
          </Text>
        </View>
      ))}
      {group.totalRow && (
        <View style={styles.totalRow}>
          <Text style={styles.totalRowLabel}>{group.totalRow.label}</Text>
          <Text style={styles.totalRowValue}>{group.totalRow.value}</Text>
        </View>
      )}
    </View>
  );
}

export function FinancialBreakdown({
  isOpen = true,
  onToggle,
  purchaseTerms,
  income,
  operatingExpenses,
  noi,
  debtService,
  cashflow,
}: FinancialBreakdownProps) {
  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle?.();
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <TouchableOpacity style={styles.sectionHeader} onPress={handleToggle}>
        <Text style={styles.sectionTitle}>Financial Breakdown</Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={decisionGrade.textPrimary}
        />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.content}>
          {/* Purchase Terms */}
          <TableGroup group={purchaseTerms} />
          
          <View style={styles.spacer} />

          {/* Income */}
          <TableGroup group={income} />
          
          <View style={styles.spacer} />

          {/* Operating Expenses */}
          <TableGroup group={operatingExpenses} />

          {/* NOI Highlight Box */}
          <View style={styles.highlightBox}>
            <Text style={styles.highlightLabel}>{noi.label}</Text>
            <Text style={styles.highlightValue}>{noi.value}</Text>
          </View>

          {/* Debt Service */}
          <TableGroup group={debtService} />

          {/* Cashflow Box */}
          <View style={styles.cashflowBox}>
            <View style={styles.cashflowHeader}>
              <Text style={styles.cashflowLabel}>{cashflow.annual.label}</Text>
              <Text style={[
                styles.cashflowValue,
                cashflow.annual.isNegative && styles.cashflowValueNegative,
              ]}>
                {cashflow.annual.value}
              </Text>
            </View>
            <View style={styles.cashflowDetail}>
              <Text style={styles.cashflowDetailLabel}>{cashflow.monthly.label}</Text>
              <Text style={[
                styles.cashflowDetailValue,
                cashflow.monthly.isNegative && styles.cashflowDetailValueNegative,
              ]}>
                {cashflow.monthly.value}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: decisionGrade.bgPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: rs(16),
    paddingHorizontal: rs(16),
  },
  sectionTitle: {
    fontSize: rf(13),
    fontWeight: '700',
    color: decisionGrade.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    paddingBottom: rs(20),
  },
  tableGroup: {
    paddingHorizontal: rs(16),
  },
  tableGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: rs(10),
    borderBottomWidth: 2,
    borderBottomColor: decisionGrade.pacificTeal,
  },
  tableGroupTitle: {
    fontSize: rf(10),
    fontWeight: '700',
    color: decisionGrade.pacificTeal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  adjustBtn: {
    paddingVertical: rs(5),
    paddingHorizontal: rs(12),
    backgroundColor: decisionGrade.pacificTeal,
    borderRadius: rs(4),
  },
  adjustBtnText: {
    fontSize: rf(9),
    fontWeight: '600',
    color: 'white',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: rs(10),
    borderBottomWidth: 1,
    borderBottomColor: decisionGrade.borderLight,
  },
  rowLabel: {
    fontSize: rf(12),
    fontWeight: '500',
    color: decisionGrade.textSecondary,
  },
  rowValue: {
    fontSize: rf(12),
    fontWeight: '600',
    color: decisionGrade.textPrimary,
  },
  rowValueNegative: {
    color: decisionGrade.negative,
  },
  rowValueTeal: {
    color: decisionGrade.pacificTeal,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: rs(12),
    marginTop: rs(4),
    borderTopWidth: 2,
    borderTopColor: decisionGrade.pacificTeal,
  },
  totalRowLabel: {
    fontSize: rf(12),
    fontWeight: '700',
    color: decisionGrade.textPrimary,
  },
  totalRowValue: {
    fontSize: rf(12),
    fontWeight: '700',
    color: decisionGrade.textPrimary,
  },
  spacer: {
    height: rs(16),
  },
  highlightBox: {
    marginHorizontal: rs(16),
    marginVertical: rs(12),
    paddingVertical: rs(14),
    paddingHorizontal: rs(16),
    backgroundColor: decisionGrade.bgSelected,
    borderWidth: 2,
    borderColor: decisionGrade.pacificTeal,
    borderRadius: rs(8),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  highlightLabel: {
    fontSize: rf(12),
    fontWeight: '700',
    color: decisionGrade.textPrimary,
    flex: 1,
  },
  highlightValue: {
    fontSize: rf(16),
    fontWeight: '800',
    color: decisionGrade.pacificTeal,
  },
  cashflowBox: {
    marginHorizontal: rs(16),
    marginTop: rs(12),
    marginBottom: rs(20),
    paddingVertical: rs(14),
    paddingHorizontal: rs(16),
    backgroundColor: decisionGrade.bgSecondary,
    borderWidth: 2,
    borderColor: decisionGrade.borderMedium,
    borderRadius: rs(8),
  },
  cashflowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rs(6),
  },
  cashflowLabel: {
    fontSize: rf(12),
    fontWeight: '700',
    color: decisionGrade.textPrimary,
  },
  cashflowValue: {
    fontSize: rf(16),
    fontWeight: '800',
    color: decisionGrade.pacificTeal,
  },
  cashflowValueNegative: {
    color: decisionGrade.negative,
  },
  cashflowDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cashflowDetailLabel: {
    fontSize: rf(11),
    fontWeight: '500',
    color: decisionGrade.textSecondary,
  },
  cashflowDetailValue: {
    fontSize: rf(12),
    fontWeight: '600',
    color: decisionGrade.pacificTeal,
  },
  cashflowDetailValueNegative: {
    color: decisionGrade.negative,
  },
});

export default FinancialBreakdown;
