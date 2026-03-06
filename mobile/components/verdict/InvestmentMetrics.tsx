import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

interface InvestmentMetricsProps {
  capRate: number | null;
  cashOnCash: number | null;
  dscr: number | null;
  monthlyCashFlow: number | null;
  annualNoi: number | null;
  cashNeeded: number | null;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  return v.toFixed(2) + '%';
}

function fmtCurrency(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  const abs = Math.round(Math.abs(v));
  const formatted = '$' + abs.toLocaleString();
  return v < 0 ? '-' + formatted : formatted;
}

function fmtRatio(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  return v.toFixed(2) + 'x';
}

function MetricBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

export function InvestmentMetrics({
  capRate,
  cashOnCash,
  dscr,
  monthlyCashFlow,
  annualNoi,
  cashNeeded,
}: InvestmentMetricsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>YOUR INVESTMENT ANALYSIS</Text>
      <Text style={styles.sectionSubtitle}>Based on your financing terms</Text>

      <Card glow="sm" style={styles.card}>
        <View style={styles.primaryRow}>
          <MetricBox label="Cap Rate" value={fmtPct(capRate)} />
          <MetricBox label="Cash-on-Cash" value={fmtPct(cashOnCash)} />
          <MetricBox label="DSCR" value={fmtRatio(dscr)} />
        </View>

        <View style={styles.divider} />

        <View style={styles.secondaryRow}>
          <MetricBox
            label="Cash Flow"
            value={fmtCurrency(monthlyCashFlow) + '/mo'}
            color={monthlyCashFlow != null && monthlyCashFlow >= 0 ? colors.success : colors.error}
          />
          <MetricBox label="Annual NOI" value={fmtCurrency(annualNoi)} />
          <MetricBox label="Cash Needed" value={fmtCurrency(cashNeeded)} />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textLabel,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  card: {
    padding: spacing.md,
    gap: spacing.md,
  },
  primaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    ...typography.tag,
    color: colors.textLabel,
  },
  metricValue: {
    fontFamily: fontFamilies.mono,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textHeading,
  },
});
