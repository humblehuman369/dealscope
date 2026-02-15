/**
 * CompareTab Component
 * Side-by-side comparison of saved scenarios
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { colors } from '@/theme/colors';
import { Scenario, CalculatedMetrics } from '../types';
import { formatCurrency, formatPercent } from '../calculations';

interface CompareTabProps {
  scenarios: Scenario[];
  onAddScenario?: () => void;
  onSelectScenario?: (id: string) => void;
}

export const CompareTab: React.FC<CompareTabProps> = ({
  scenarios,
  onAddScenario,
  onSelectScenario,
}) => {
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;

  // Find the winner (highest score)
  const winner = scenarios.length > 0
    ? scenarios.reduce((best, s) => s.score > best.score ? s : best, scenarios[0])
    : null;

  // Calculate deltas between winner and base
  const base = scenarios.find(s => s.name.toLowerCase().includes('base')) || scenarios[0];
  const delta = winner && base && winner.id !== base.id ? {
    cashFlow: winner.metrics.monthlyCashFlow - base.metrics.monthlyCashFlow,
    cashOnCash: winner.metrics.cashOnCash - base.metrics.cashOnCash,
    score: winner.score - base.score,
  } : null;

  if (scenarios.length === 0) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            No Scenarios to Compare
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Save different deal scenarios from the What-If tab to compare them here.
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={onAddScenario}
          >
            <Text style={styles.addButtonText}>+ Create Scenario</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Winner Banner */}
      {winner && scenarios.length > 1 && (
        <View style={styles.winnerBanner}>
          <Text style={styles.winnerTrophy}>🏆</Text>
          <View style={styles.winnerContent}>
            <Text style={styles.winnerLabel}>Best Scenario</Text>
            <Text style={[styles.winnerName, { color: theme.text }]}>{winner.name}</Text>
            {delta && (
              <Text style={styles.winnerStat}>
                {formatCurrency(delta.cashFlow)}/mo more cash flow
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Scenario Cards */}
      <View style={styles.scenarioCardsContainer}>
        {scenarios.map((scenario) => (
          <TouchableOpacity
            key={scenario.id}
            style={[
              styles.scenarioCard,
              { 
                backgroundColor: theme.surface,
                borderColor: scenario.id === winner?.id ? colors.success : theme.border,
                borderWidth: scenario.id === winner?.id ? 2 : 1,
              },
            ]}
            onPress={() => onSelectScenario?.(scenario.id)}
          >
            {scenario.id === winner?.id && scenarios.length > 1 && (
              <View style={styles.winnerBadge}>
                <Text style={styles.winnerBadgeText}>Winner</Text>
              </View>
            )}
            <Text style={styles.scenarioIcon}>
              {scenario.name.toLowerCase().includes('base') ? '📋' : '🎯'}
            </Text>
            <Text style={[styles.scenarioName, { color: theme.text }]}>
              {scenario.name}
            </Text>
            <Text style={[styles.scenarioValue, { color: colors.primary }]}>
              {formatCurrency(scenario.metrics.monthlyCashFlow)}/mo
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.addScenarioCard, { borderColor: theme.border }]}
          onPress={onAddScenario}
        >
          <Text style={[styles.addScenarioText, { color: colors.primary }]}>
            + Add Scenario
          </Text>
        </TouchableOpacity>
      </View>

      {/* Delta Card */}
      {delta && (
        <View style={[styles.deltaCard, { borderColor: colors.success }]}>
          <Text style={[styles.deltaTitle, { color: theme.text }]}>
            ⚡ {winner?.name} vs {base?.name}
          </Text>
          <View style={styles.deltaGrid}>
            <View style={styles.deltaItem}>
              <Text style={styles.deltaValue}>+{formatCurrency(delta.cashFlow)}</Text>
              <Text style={[styles.deltaLabel, { color: theme.textSecondary }]}>CF/mo</Text>
            </View>
            <View style={styles.deltaItem}>
              <Text style={styles.deltaValue}>+{formatPercent(delta.cashOnCash)}</Text>
              <Text style={[styles.deltaLabel, { color: theme.textSecondary }]}>CoC</Text>
            </View>
            <View style={styles.deltaItem}>
              <Text style={styles.deltaValue}>+{delta.score}</Text>
              <Text style={[styles.deltaLabel, { color: theme.textSecondary }]}>Score</Text>
            </View>
          </View>
        </View>
      )}

      {/* Visual Comparison */}
      {scenarios.length > 1 && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>📊 Visual Comparison</Text>
          
          {/* Cash Flow Comparison */}
          <ComparisonBar
            label="Monthly Cash Flow"
            scenarios={scenarios}
            getValue={(s) => s.metrics.monthlyCashFlow}
            formatValue={formatCurrency}
            winner={winner}
            theme={theme}
          />
          
          {/* Cash-on-Cash Comparison */}
          <ComparisonBar
            label="Cash-on-Cash"
            scenarios={scenarios}
            getValue={(s) => s.metrics.cashOnCash}
            formatValue={(v) => formatPercent(v)}
            winner={winner}
            theme={theme}
          />
          
          {/* Deal Score Comparison */}
          <ComparisonBar
            label="Deal Score"
            scenarios={scenarios}
            getValue={(s) => s.score}
            formatValue={(v) => v.toString()}
            winner={winner}
            theme={theme}
          />
        </View>
      )}

      {/* Detailed Table */}
      {scenarios.length > 1 && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>🔧 Key Assumptions</Text>
          
          <ComparisonTable
            scenarios={scenarios}
            rows={[
              { label: 'Buy Price', getValue: (s) => formatCurrency(s.inputs.purchasePrice) },
              { label: 'Down Payment', getValue: (s) => formatPercent(s.inputs.downPaymentPercent) },
              { label: 'Interest Rate', getValue: (s) => formatPercent(s.inputs.interestRate) },
              { label: 'Monthly Rent', getValue: (s) => formatCurrency(s.inputs.monthlyRent) },
            ]}
            winner={winner}
            theme={theme}
          />

          <Text style={[styles.cardTitle, { color: theme.text, marginTop: 16 }]}>📅 Year 1 Performance</Text>
          
          <ComparisonTable
            scenarios={scenarios}
            rows={[
              { label: 'Cash Required', getValue: (s) => formatCurrency(s.metrics.totalCashRequired) },
              { label: 'Annual CF', getValue: (s) => formatCurrency(s.metrics.annualCashFlow) },
              { label: 'Cash-on-Cash', getValue: (s) => formatPercent(s.metrics.cashOnCash) },
              { label: 'DSCR', getValue: (s) => s.metrics.dscr.toFixed(2) },
            ]}
            winner={winner}
            theme={theme}
          />
        </View>
      )}

      {/* Action Buttons */}
      {winner && scenarios.length > 1 && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.exportButton}>
            <Text style={styles.exportButtonText}>📤 Export</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.useButton, { backgroundColor: colors.success }]}>
            <Text style={styles.useButtonText}>✅ Use {winner.name}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

// Comparison Bar Component
interface ComparisonBarProps {
  label: string;
  scenarios: Scenario[];
  getValue: (s: Scenario) => number;
  formatValue: (v: number) => string;
  winner: Scenario | null;
  theme: typeof colors.dark;
}

const ComparisonBar: React.FC<ComparisonBarProps> = ({
  label,
  scenarios,
  getValue,
  formatValue,
  winner,
  theme,
}) => {
  const maxValue = Math.max(...scenarios.map(getValue));
  const minValue = Math.min(...scenarios.map(getValue));
  const delta = maxValue - minValue;

  return (
    <View style={styles.comparisonRow}>
      <View style={styles.comparisonHeader}>
        <Text style={[styles.comparisonLabel, { color: theme.textSecondary }]}>{label}</Text>
        {delta > 0 && (
          <Text style={styles.comparisonDelta}>+{formatValue(delta)}</Text>
        )}
      </View>
      {scenarios.map((scenario) => {
        const value = getValue(scenario);
        const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
        const isWinner = scenario.id === winner?.id;
        
        return (
          <View key={scenario.id} style={styles.barRow}>
            <Text style={[styles.barLabel, { color: theme.textSecondary }]}>
              {scenario.name.length > 10 ? scenario.name.substring(0, 10) + '...' : scenario.name}
            </Text>
            <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
              <View 
                style={[
                  styles.barFill,
                  { 
                    width: `${Math.max(5, percentage)}%`,
                    backgroundColor: isWinner ? colors.success : theme.textSecondary,
                  }
                ]} 
              />
            </View>
            <Text style={[
              styles.barValue,
              { color: isWinner ? colors.success : theme.text }
            ]}>
              {formatValue(value)}
              {isWinner && scenarios.length > 1 && ' ✓'}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// Comparison Table Component
interface ComparisonTableProps {
  scenarios: Scenario[];
  rows: { label: string; getValue: (s: Scenario) => string }[];
  winner: Scenario | null;
  theme: typeof colors.dark;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({
  scenarios,
  rows,
  winner,
  theme,
}) => {
  return (
    <View style={styles.table}>
      {/* Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { color: theme.textSecondary }]}>Metric</Text>
        {scenarios.map((s) => (
          <Text 
            key={s.id} 
            style={[
              styles.tableHeaderCell, 
              { color: s.id === winner?.id ? colors.success : theme.textSecondary }
            ]}
          >
            {s.name.length > 8 ? s.name.substring(0, 8) : s.name}
          </Text>
        ))}
      </View>
      
      {/* Rows */}
      {rows.map((row, index) => (
        <View 
          key={row.label} 
          style={[
            styles.tableRow,
            { borderBottomColor: theme.border }
          ]}
        >
          <Text style={[styles.tableCell, { color: theme.textSecondary }]}>{row.label}</Text>
          {scenarios.map((s) => (
            <Text 
              key={s.id} 
              style={[
                styles.tableCell, 
                { 
                  color: s.id === winner?.id ? colors.success : theme.text,
                  fontWeight: s.id === winner?.id ? '600' : '400',
                }
              ]}
            >
              {row.getValue(s)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  addButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  winnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
  },
  winnerTrophy: {
    fontSize: 32,
  },
  winnerContent: {
    flex: 1,
  },
  winnerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22c55e',
    textTransform: 'uppercase',
  },
  winnerName: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  winnerStat: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '600',
    marginTop: 2,
  },
  scenarioCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 16,
  },
  scenarioCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    position: 'relative',
  },
  winnerBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  winnerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  scenarioIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  scenarioName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  scenarioValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  addScenarioCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addScenarioText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deltaCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    padding: 14,
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  deltaTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  deltaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  deltaItem: {
    alignItems: 'center',
  },
  deltaValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22c55e',
  },
  deltaLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  card: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
  },
  comparisonRow: {
    marginBottom: 16,
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  comparisonLabel: {
    fontSize: 12,
  },
  comparisonDelta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  barLabel: {
    width: 60,
    fontSize: 11,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    width: 60,
    fontSize: 11,
    fontWeight: '600',
  },
  table: {},
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  exportButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  useButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  useButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default CompareTab;

