import { useState } from 'react';
import { Animated, LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { colors, cardGlow } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface BreakdownRow {
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
}

interface BreakdownSection {
  title: string;
  rows: BreakdownRow[];
}

interface FinancialBreakdownProps {
  sections: BreakdownSection[];
}

export function buildLTRSections(ws: any): BreakdownSection[] {
  return [
    {
      title: 'Purchase Terms',
      rows: [
        { label: 'Purchase Price', value: money(ws.purchase_price) },
        { label: 'Down Payment', value: money(ws.down_payment) },
        { label: 'Loan Amount', value: money(ws.loan_amount) },
        { label: 'Closing Costs', value: money(ws.closing_costs ?? ws.purchase_price * 0.03) },
        { label: 'Total Cash Needed', value: money(ws.total_cash_needed), highlight: true },
      ],
    },
    {
      title: 'Rental Income',
      rows: [
        { label: 'Monthly Rent', value: moneyMo(ws.monthly_rent), highlight: true },
        { label: 'Vacancy Loss', value: moneyMo(ws.vacancy_cost), negative: true },
        { label: 'Effective Gross Income', value: moneyMo((ws.monthly_rent ?? 0) - (ws.vacancy_cost ?? 0)) },
      ],
    },
    {
      title: 'Operating Expenses',
      rows: [
        { label: 'Property Taxes', value: moneyMo(ws.property_taxes_monthly), negative: true },
        { label: 'Insurance', value: moneyMo(ws.insurance_cost), negative: true },
        { label: 'Management', value: moneyMo(ws.management_cost), negative: true },
        { label: 'Maintenance', value: moneyMo(ws.maintenance_cost), negative: true },
        { label: 'Total Expenses', value: moneyMo(ws.monthly_expenses), negative: true },
      ],
    },
    {
      title: 'Cash Flow',
      rows: [
        { label: 'NOI (Annual)', value: money(ws.noi) },
        { label: 'Mortgage (P&I)', value: moneyMo(ws.monthly_mortgage), negative: true },
        { label: 'Monthly Cash Flow', value: moneyMo(ws.monthly_cash_flow), highlight: true },
        { label: 'Annual Cash Flow', value: money(ws.annual_cash_flow), highlight: true },
      ],
    },
    {
      title: 'Key Ratios',
      rows: [
        { label: 'Cap Rate', value: pct(ws.cap_rate) },
        { label: 'Cash on Cash', value: pct(ws.cash_on_cash) },
        { label: 'DSCR', value: ratio(ws.dscr) },
      ],
    },
  ];
}

export function buildGenericSections(ws: any): BreakdownSection[] {
  return buildLTRSections(ws);
}

export function FinancialBreakdown({ sections }: FinancialBreakdownProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  function toggle(idx: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  return (
    <View style={[styles.container, cardGlow.sm]}>
      <Text style={styles.sectionLabel}>FINANCIAL BREAKDOWN</Text>
      {sections.map((section, i) => (
        <View key={i} style={styles.section}>
          <Pressable onPress={() => toggle(i)} style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.chevron}>{expanded[i] ? '−' : '+'}</Text>
          </Pressable>
          {expanded[i] && (
            <View style={styles.sectionBody}>
              {section.rows.map((row, j) => (
                <View key={j} style={styles.row}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text
                    style={[
                      styles.rowValue,
                      row.highlight && styles.rowHighlight,
                      row.negative && styles.rowNegative,
                    ]}
                  >
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function money(n: number | null | undefined): string {
  if (n == null) return '—';
  return '$' + Math.round(n).toLocaleString();
}
function moneyMo(n: number | null | undefined): string {
  if (n == null) return '—';
  return '$' + Math.round(n).toLocaleString() + '/mo';
}
function pct(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${Number(n).toFixed(1)}%`;
}
function ratio(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${Number(n).toFixed(2)}x`;
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.base, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md },
  sectionLabel: { fontFamily: fontFamilies.heading, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: colors.primary, textTransform: 'uppercase', marginBottom: spacing.sm },
  section: { borderBottomWidth: 1, borderBottomColor: colors.border },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  sectionTitle: { fontFamily: fontFamilies.heading, fontSize: 14, fontWeight: '600', color: colors.textHeading },
  chevron: { fontSize: 18, color: colors.primary, fontWeight: '600' },
  sectionBody: { paddingBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontFamily: fontFamilies.body, fontSize: 13, color: colors.textSecondary },
  rowValue: { fontFamily: fontFamilies.mono, fontSize: 13, fontWeight: '600', color: colors.textHeading },
  rowHighlight: { color: colors.primary, fontWeight: '700' },
  rowNegative: { color: colors.error },
});
