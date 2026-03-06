import { StyleSheet, Text, View } from 'react-native';
import { colors, cardGlow } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

interface MetricBar {
  label: string;
  value: number;
  maxValue?: number;
}

interface ConfidenceMetricsProps {
  dealScore: number;
  dealGapPercent: number | null;
  incomeGapPercent: number | null;
}

function scoreToConfidence(score: number): number {
  return Math.min(100, Math.max(0, (score / 95) * 100));
}

function gapToAlignment(gap: number | null): number {
  if (gap == null) return 50;
  if (gap <= -20) return 95;
  if (gap <= -10) return 80;
  if (gap <= 0) return 65;
  if (gap <= 10) return 40;
  return 20;
}

export function ConfidenceMetrics({ dealScore, dealGapPercent, incomeGapPercent }: ConfidenceMetricsProps) {
  const bars: MetricBar[] = [
    { label: 'Deal Probability', value: scoreToConfidence(dealScore) },
    { label: 'Market Alignment', value: gapToAlignment(dealGapPercent) },
    { label: 'Price Confidence', value: gapToAlignment(incomeGapPercent) },
  ];

  return (
    <View style={[styles.container, cardGlow.sm]}>
      <Text style={styles.sectionLabel}>CONFIDENCE METRICS</Text>
      {bars.map((bar) => (
        <View key={bar.label} style={styles.barRow}>
          <View style={styles.barHeader}>
            <Text style={styles.barLabel}>{bar.label}</Text>
            <Text style={[styles.barValue, { color: getBarColor(bar.value) }]}>{Math.round(bar.value)}%</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${bar.value}%`, backgroundColor: getBarColor(bar.value) }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function getBarColor(value: number): string {
  if (value >= 70) return colors.success;
  if (value >= 40) return colors.warning;
  return colors.error;
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.base, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md },
  sectionLabel: { fontFamily: fontFamilies.heading, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: colors.primary, textTransform: 'uppercase', marginBottom: spacing.sm },
  barRow: { marginBottom: spacing.sm },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { fontFamily: fontFamilies.body, fontSize: 12, color: colors.textSecondary },
  barValue: { fontFamily: fontFamilies.monoBold, fontSize: 12, fontWeight: '700' },
  barTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
});
