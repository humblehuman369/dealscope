import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Card } from '@/components/ui';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';
import type { WorksheetResult } from '@/hooks/useWorksheet';

function fmtC(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  const abs = Math.round(Math.abs(v));
  const formatted = '$' + abs.toLocaleString();
  return v < 0 ? '-' + formatted : formatted;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  return v.toFixed(1) + '%';
}

function fmtMo(v: number | null | undefined): string {
  if (v == null) return 'N/A';
  return fmtC(v) + '/mo';
}

interface LineItem {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}

interface SectionProps {
  title: string;
  items: LineItem[];
  defaultOpen?: boolean;
}

function Section({ title, items, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.section}>
      <Pressable onPress={() => setOpen(!open)} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
      </Pressable>
      {open && (
        <View style={styles.sectionContent}>
          {items.map((item, i) => (
            <View key={i} style={[styles.lineItem, item.bold && styles.lineItemBold]}>
              <Text style={[styles.lineLabel, item.bold && styles.lineLabelBold]}>
                {item.label}
              </Text>
              <Text style={[styles.lineValue, item.bold && styles.lineValueBold, item.color ? { color: item.color } : null]}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

interface FinancialBreakdownProps {
  worksheet: WorksheetResult;
  strategyId: string;
}

export function FinancialBreakdown({ worksheet: w, strategyId }: FinancialBreakdownProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.headerLabel}>FINANCIAL BREAKDOWN</Text>

      <Card glow="sm" style={styles.card}>
        <Section
          title="Purchase Terms"
          items={[
            { label: 'Purchase Price', value: fmtC(w.purchase_price) },
            { label: 'Down Payment', value: fmtC(w.down_payment) },
            { label: 'Down Payment %', value: fmtPct(w.down_payment_pct) },
            { label: 'Loan Amount', value: fmtC(w.loan_amount) },
            { label: 'Interest Rate', value: fmtPct(w.interest_rate) },
            { label: 'Loan Term', value: `${w.loan_term_years} years` },
            { label: 'Monthly P&I', value: fmtMo(w.monthly_pi) },
          ]}
          defaultOpen
        />

        <Section
          title="Income"
          items={[
            { label: 'Gross Scheduled Rent', value: fmtMo(w.gross_scheduled_rent ? w.gross_scheduled_rent / 12 : w.monthly_rent) },
            { label: 'Vacancy Allowance', value: fmtC(w.vacancy_allowance) },
            { label: 'Effective Gross Income', value: fmtC(w.effective_gross_income), bold: true },
          ]}
        />

        <Section
          title="Operating Expenses"
          items={[
            { label: 'Property Taxes', value: fmtC(w.property_taxes) },
            { label: 'Insurance', value: fmtC(w.insurance) },
            { label: 'HOA', value: fmtC(w.hoa) },
            { label: 'Management', value: fmtC(w.management) },
            { label: 'Maintenance', value: fmtC(w.maintenance) },
            { label: 'CapEx', value: fmtC(w.capex) },
            { label: 'Total Expenses', value: fmtC(w.total_operating_expenses), bold: true },
          ]}
        />

        <Section
          title="Net Operating Income"
          items={[
            { label: 'NOI', value: fmtC(w.noi), bold: true, color: (w.noi ?? 0) >= 0 ? colors.success : colors.error },
          ]}
          defaultOpen
        />

        <Section
          title="Debt Service & Cash Flow"
          items={[
            { label: 'Annual Mortgage', value: fmtC(w.annual_debt_service) },
            { label: 'Pre-Tax Cash Flow', value: fmtC(w.pre_tax_cash_flow), bold: true, color: (w.pre_tax_cash_flow ?? 0) >= 0 ? colors.success : colors.error },
            { label: 'Monthly Cash Flow', value: fmtMo(w.monthly_cash_flow), bold: true, color: (w.monthly_cash_flow ?? 0) >= 0 ? colors.success : colors.error },
          ]}
          defaultOpen
        />

        {strategyId === 'brrrr' && (
          <>
            <Section
              title="BRRRR — Rehab & Refinance"
              items={[
                { label: 'Rehab Budget', value: fmtC(w.rehab_budget) },
                { label: 'ARV', value: fmtC(w.arv) },
                { label: 'Refinance LTV', value: fmtPct(w.refinance_ltv) },
                { label: 'Equity Created', value: fmtC(w.equity_created), color: colors.success },
                { label: 'Cash Recoup', value: fmtPct(w.cash_recoup_pct) },
                { label: 'Post-Refi Cash Flow', value: fmtMo(w.post_refi_cash_flow), bold: true },
              ]}
            />
          </>
        )}

        {strategyId === 'flip' && (
          <Section
            title="Fix & Flip — Sale"
            items={[
              { label: 'Rehab Budget', value: fmtC(w.rehab_budget) },
              { label: 'ARV', value: fmtC(w.arv) },
              { label: 'Holding Costs', value: fmtC(w.holding_costs) },
              { label: 'Selling Costs', value: fmtC(w.selling_costs) },
              { label: 'Net Profit', value: fmtC(w.net_profit), bold: true, color: (w.net_profit ?? 0) >= 0 ? colors.success : colors.error },
            ]}
          />
        )}

        {strategyId === 'wholesale' && (
          <Section
            title="Wholesale — Assignment"
            items={[
              { label: 'MAO', value: fmtC(w.mao) },
              { label: 'Assignment Fee', value: fmtC(w.assignment_fee), bold: true, color: colors.success },
            ]}
          />
        )}

        {strategyId === 'house_hack' && (
          <Section
            title="House Hack — Net Housing Cost"
            items={[
              { label: 'Effective Housing Cost', value: fmtMo(w.effective_housing_cost) },
              { label: 'Cost Reduction', value: fmtPct(w.cost_reduction_pct), color: colors.success },
            ]}
          />
        )}

        {strategyId === 'str' && (
          <Section
            title="STR — Revenue Metrics"
            items={[
              { label: 'ADR', value: fmtC(w.adr) },
              { label: 'Occupancy Rate', value: fmtPct(w.occupancy_rate) },
              { label: 'RevPAR', value: fmtC(w.revpar) },
            ]}
          />
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  headerLabel: {
    ...typography.label,
    color: colors.textLabel,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.textHeading,
  },
  chevron: {
    fontSize: 14,
    color: colors.textMuted,
  },
  sectionContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: 8,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineItemBold: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  lineLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  lineLabelBold: {
    color: colors.textBody,
    fontWeight: '600',
  },
  lineValue: {
    ...typography.financial,
    color: colors.textHeading,
  },
  lineValueBold: {
    fontWeight: '700',
    fontSize: 16,
  },
});
