import { View, Text, StyleSheet } from 'react-native';
import { colors, fontFamily, fontSize, spacing } from '@/constants/tokens';

interface ComponentScores {
  deal_gap: number;
  return_quality: number;
  market_alignment: number;
  deal_probability: number;
}

function componentColor(value: number): string {
  if (value >= 75) return colors.accent;
  if (value >= 55) return colors.accentLight;
  if (value >= 40) return colors.gold;
  if (value >= 20) return colors.orange;
  return colors.red;
}

function componentLabel(value: number, name: string): string {
  if (name === 'Deal Gap') {
    if (value >= 75) return 'Minimal';
    if (value >= 55) return 'Mild';
    if (value >= 40) return 'Moderate';
    if (value >= 20) return 'Large';
    return 'Excessive';
  }
  if (name === 'Market Alignment') {
    if (value >= 75) return 'Strong';
    if (value >= 55) return 'Favorable';
    if (value >= 40) return 'Neutral';
    if (value >= 20) return 'Weak';
    return 'Misaligned';
  }
  if (name === 'Deal Probability') {
    if (value >= 75) return 'Highly Probable';
    if (value >= 55) return 'Probable';
    if (value >= 40) return 'Possible';
    if (value >= 20) return 'Unlikely';
    return 'Improbable';
  }
  if (value >= 75) return 'Excellent';
  if (value >= 55) return 'Strong';
  if (value >= 40) return 'Good';
  if (value >= 20) return 'Fair';
  return 'Weak';
}

const COMPONENTS: { key: keyof ComponentScores; label: string }[] = [
  { key: 'deal_gap', label: 'Deal Gap' },
  { key: 'return_quality', label: 'Return Quality' },
  { key: 'market_alignment', label: 'Market Alignment' },
  { key: 'deal_probability', label: 'Deal Probability' },
];

interface ScoreComponentBarsProps {
  scores: ComponentScores;
}

export function ScoreComponentBars({ scores }: ScoreComponentBarsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Score Components</Text>
      {COMPONENTS.map(({ key, label }) => {
        const value = scores[key];
        const clr = componentColor(value);
        const lbl = componentLabel(value, label);
        const barPct = Math.min(100, (value / 90) * 100);

        return (
          <View key={key} style={styles.row}>
            <Text style={styles.name}>{label}</Text>
            <View style={styles.barTrack}>
              <View
                style={[styles.barFill, { width: `${barPct}%`, backgroundColor: clr }]}
              />
            </View>
            <Text style={[styles.value, { color: clr }]}>{lbl}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm + 2,
  },
  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.body,
    width: 110,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  value: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    width: 80,
    textAlign: 'right',
  },
});
