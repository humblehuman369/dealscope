import { StyleSheet, Text, View } from 'react-native';
import { colors, cardGlow } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

interface SignalData {
  dealGapPercent: number | null;
  opportunity: string | null;
  returnRating: string | null;
  opportunityFactors: string[];
}

function getSignalStatus(value: string | null): { label: string; color: string } {
  if (!value) return { label: '—', color: colors.textMuted };
  const v = value.toLowerCase();
  if (v.includes('strong') || v.includes('high') || v.includes('good') || v.includes('deep'))
    return { label: value, color: colors.success };
  if (v.includes('moderate') || v.includes('fair') || v.includes('medium'))
    return { label: value, color: colors.warning };
  return { label: value, color: colors.error };
}

function getDealGapSignal(pct: number | null): { label: string; color: string } {
  if (pct == null) return { label: '—', color: colors.textMuted };
  if (pct <= -15) return { label: 'Deep Value', color: colors.success };
  if (pct <= -5) return { label: 'Good', color: colors.success };
  if (pct <= 5) return { label: 'Fair', color: colors.warning };
  return { label: 'Overpriced', color: colors.error };
}

export function SignalCards({ dealGapPercent, opportunity, returnRating, opportunityFactors }: SignalData) {
  const gap = getDealGapSignal(dealGapPercent);
  const opp = getSignalStatus(opportunity);
  const ret = getSignalStatus(returnRating);

  const cards = [
    { title: 'Deal Gap', status: gap.label, color: gap.color, detail: dealGapPercent != null ? `${dealGapPercent > 0 ? '+' : ''}${dealGapPercent.toFixed(1)}%` : null },
    { title: 'Opportunity', status: opp.label, color: opp.color, detail: null },
    { title: 'Returns', status: ret.label, color: ret.color, detail: null },
    { title: 'Factors', status: `${opportunityFactors.length}`, color: opportunityFactors.length >= 3 ? colors.success : opportunityFactors.length >= 1 ? colors.warning : colors.textMuted, detail: opportunityFactors[0] ?? null },
  ];

  return (
    <View style={styles.grid}>
      {cards.map((c) => (
        <View key={c.title} style={[styles.card, cardGlow.sm]}>
          <Text style={styles.cardTitle}>{c.title}</Text>
          <View style={[styles.pill, { backgroundColor: c.color + '18', borderColor: c.color + '40' }]}>
            <Text style={[styles.pillText, { color: c.color }]}>{c.status}</Text>
          </View>
          {c.detail && <Text style={styles.detail} numberOfLines={1}>{c.detail}</Text>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  card: {
    width: '48%',
    backgroundColor: colors.base,
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardTitle: { fontFamily: fontFamilies.body, fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9999, borderWidth: 1 },
  pillText: { fontFamily: fontFamilies.heading, fontSize: 11, fontWeight: '700' },
  detail: { fontFamily: fontFamilies.mono, fontSize: 11, color: colors.textMuted },
});
