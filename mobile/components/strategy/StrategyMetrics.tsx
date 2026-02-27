import { View, Text, StyleSheet } from 'react-native';
import { GlowCard } from '@/components/ui/GlowCard';
import { formatCurrency, formatPercent, formatCompactCurrency } from '@/utils/formatters';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';
import type { StrategyId } from '@dealscope/shared';

interface MetricDef {
  label: string;
  value: string;
  positive: boolean;
}

interface StrategyMetricsProps {
  strategyId: StrategyId;
  data: Record<string, unknown> | null;
  accentColor: string;
}

function n(v: unknown): number {
  if (v == null) return 0;
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

function buildLTRMetrics(d: Record<string, unknown>): MetricDef[] {
  const coc = n(d.cash_on_cash);
  const capRate = n(d.cap_rate);
  const dscr = n(d.dscr);
  const cashFlow = n(d.monthly_cash_flow);
  const noi = n(d.annual_noi ?? d.noi);
  const cashNeeded = n(d.cash_needed ?? d.total_cash_required);
  return [
    { label: 'Cash-on-Cash', value: formatPercent(coc), positive: coc >= 8 },
    { label: 'Cap Rate', value: formatPercent(capRate), positive: capRate >= 5 },
    { label: 'DSCR', value: dscr.toFixed(2), positive: dscr >= 1.2 },
    { label: 'Monthly Cash Flow', value: formatCurrency(cashFlow), positive: cashFlow > 0 },
    { label: 'Annual NOI', value: formatCompactCurrency(noi), positive: noi > 0 },
    { label: 'Cash Needed', value: formatCompactCurrency(cashNeeded), positive: true },
  ];
}

function buildSTRMetrics(d: Record<string, unknown>): MetricDef[] {
  const coc = n(d.cash_on_cash);
  const adr = n(d.average_daily_rate ?? d.adr);
  const occ = n(d.occupancy_rate);
  const revpar = n(d.revpar);
  const grossRev = n(d.annual_gross_revenue ?? d.total_gross_revenue);
  const cashFlow = n(d.monthly_cash_flow);
  return [
    { label: 'Cash-on-Cash', value: formatPercent(coc), positive: coc >= 12 },
    { label: 'Avg Daily Rate', value: formatCurrency(adr), positive: adr >= 150 },
    { label: 'Occupancy', value: formatPercent(occ * 100), positive: occ >= 0.65 },
    { label: 'RevPAR', value: formatCurrency(revpar), positive: revpar > 0 },
    { label: 'Gross Revenue', value: formatCompactCurrency(grossRev), positive: grossRev > 0 },
    { label: 'Monthly Cash Flow', value: formatCurrency(cashFlow), positive: cashFlow > 0 },
  ];
}

function buildBRRRRMetrics(d: Record<string, unknown>): MetricDef[] {
  const cashRecovery = n(d.cash_recovery_percent ?? d.cash_left_in_deal);
  const equityCreated = n(d.equity_created ?? d.equity_position);
  const postRefiCF = n(d.post_refi_cash_flow ?? d.post_refi_cash_on_cash);
  const arv = n(d.arv);
  const rehabCost = n(d.rehab_budget ?? d.rehab_costs);
  const infiniteRoi = d.infinite_roi_achieved === true;
  return [
    { label: 'Cash Recovery', value: formatPercent(cashRecovery), positive: cashRecovery >= 80 },
    { label: 'Equity Created', value: formatCompactCurrency(equityCreated), positive: equityCreated > 0 },
    { label: 'Post-Refi Cash Flow', value: formatCurrency(postRefiCF), positive: postRefiCF > 0 },
    { label: 'ARV', value: formatCompactCurrency(arv), positive: arv > 0 },
    { label: 'Rehab Budget', value: formatCompactCurrency(rehabCost), positive: true },
    { label: 'Infinite ROI', value: infiniteRoi ? 'Yes' : 'No', positive: infiniteRoi },
  ];
}

function buildFlipMetrics(d: Record<string, unknown>): MetricDef[] {
  const netProfit = n(d.net_profit ?? d.net_profit_before_tax);
  const roi = n(d.roi);
  const annualizedRoi = n(d.annualized_roi);
  const meets70 = d.meets_70_rule === true;
  const holdPeriod = n(d.holding_period_months);
  const sellingCosts = n(d.selling_costs);
  return [
    { label: 'Net Profit', value: formatCompactCurrency(netProfit), positive: netProfit > 0 },
    { label: 'ROI', value: formatPercent(roi), positive: roi >= 20 },
    { label: 'Annualized ROI', value: formatPercent(annualizedRoi), positive: annualizedRoi >= 30 },
    { label: '70% Rule', value: meets70 ? 'Passes' : 'Fails', positive: meets70 },
    { label: 'Hold Period', value: `${holdPeriod} mo`, positive: holdPeriod <= 6 },
    { label: 'Selling Costs', value: formatCompactCurrency(sellingCosts), positive: true },
  ];
}

function buildHouseHackMetrics(d: Record<string, unknown>): MetricDef[] {
  const netCost = n(d.net_housing_cost ?? d.net_housing_cost_scenario_a);
  const savings = n(d.savings_vs_renting ?? d.savings_vs_renting_a);
  const costOffset = n(d.housing_cost_offset_pct ?? d.cost_reduction_percent);
  const rentalIncome = n(d.rental_income);
  const totalPayment = n(d.total_housing_payment);
  const cashFlow = n(d.monthly_cash_flow);
  return [
    { label: 'Net Housing Cost', value: `${formatCurrency(netCost)}/mo`, positive: netCost < 1000 },
    { label: 'Savings vs Renting', value: `${formatCurrency(savings)}/mo`, positive: savings > 0 },
    { label: 'Cost Reduction', value: formatPercent(costOffset), positive: costOffset >= 50 },
    { label: 'Rental Income', value: `${formatCurrency(rentalIncome)}/mo`, positive: rentalIncome > 0 },
    { label: 'Total Payment', value: `${formatCurrency(totalPayment)}/mo`, positive: true },
    { label: 'Monthly Cash Flow', value: formatCurrency(cashFlow), positive: cashFlow >= 0 },
  ];
}

function buildWholesaleMetrics(d: Record<string, unknown>): MetricDef[] {
  const assignmentFee = n(d.assignment_fee);
  const mao = n(d.mao ?? d.max_allowable_offer);
  const roiOnEmd = n(d.roi_on_emd ?? d.roi);
  const netProfit = n(d.net_profit);
  const earnestMoney = n(d.earnest_money);
  const viable = d.deal_viability === 'Viable' || d.deal_viability === 'viable';
  return [
    { label: 'Assignment Fee', value: formatCompactCurrency(assignmentFee), positive: assignmentFee >= 10000 },
    { label: 'MAO (70% Rule)', value: formatCompactCurrency(mao), positive: mao > 0 },
    { label: 'ROI on EMD', value: formatPercent(roiOnEmd), positive: roiOnEmd >= 500 },
    { label: 'Net Profit', value: formatCompactCurrency(netProfit), positive: netProfit > 0 },
    { label: 'Earnest Money', value: formatCompactCurrency(earnestMoney), positive: true },
    { label: 'Deal Viable', value: viable ? 'Yes' : 'No', positive: viable },
  ];
}

const BUILDERS: Record<StrategyId, (d: Record<string, unknown>) => MetricDef[]> = {
  ltr: buildLTRMetrics,
  str: buildSTRMetrics,
  brrrr: buildBRRRRMetrics,
  flip: buildFlipMetrics,
  house_hack: buildHouseHackMetrics,
  wholesale: buildWholesaleMetrics,
};

export function StrategyMetrics({ strategyId, data, accentColor }: StrategyMetricsProps) {
  const metrics = data ? BUILDERS[strategyId](data) : [];

  if (!data || metrics.length === 0) {
    return (
      <GlowCard glowColor={accentColor} style={styles.emptyCard}>
        <Text style={styles.emptyText}>
          No analysis data available for this strategy.
        </Text>
      </GlowCard>
    );
  }

  return (
    <GlowCard glowColor={accentColor} style={styles.container}>
      <View style={styles.grid}>
        {metrics.map((m) => (
          <View key={m.label} style={styles.metricItem}>
            <Text
              style={[
                styles.metricValue,
                { color: m.positive ? accentColor : colors.red },
              ]}
            >
              {m.value}
            </Text>
            <Text style={styles.metricLabel}>{m.label}</Text>
          </View>
        ))}
      </View>
    </GlowCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
  },
  metricValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    fontVariant: ['tabular-nums'],
    marginBottom: 2,
  },
  metricLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
  },
});
