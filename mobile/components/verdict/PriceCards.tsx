import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, cardGlow } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

type PriceCardId = 'income' | 'target' | 'wholesale';

interface PriceCard {
  id: PriceCardId;
  label: string;
  value: number | null;
  sublabel: string;
  color: string;
}

interface PriceCardsProps {
  incomeValue: number | null;
  targetBuy: number | null;
  wholesalePrice: number | null;
  listPrice: number | null;
  onSelect?: (id: PriceCardId) => void;
}

function money(n: number | null | undefined): string {
  if (n == null) return '—';
  return '$' + Math.round(n).toLocaleString();
}

export function PriceCards({ incomeValue, targetBuy, wholesalePrice, listPrice, onSelect }: PriceCardsProps) {
  const [selected, setSelected] = useState<PriceCardId>('target');

  const cards: PriceCard[] = [
    { id: 'income', label: 'Income Value', value: incomeValue, sublabel: 'Breakeven price', color: colors.incomeValue },
    { id: 'target', label: 'Target Buy', value: targetBuy, sublabel: 'Best target', color: colors.primary },
    { id: 'wholesale', label: 'Wholesale', value: wholesalePrice, sublabel: 'Deep value', color: colors.wholesale },
  ];

  function handleSelect(id: PriceCardId) {
    setSelected(id);
    onSelect?.(id);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>IQ PRICE ANALYSIS</Text>
      <View style={styles.row}>
        {cards.map((card) => {
          const isActive = selected === card.id;
          return (
            <Pressable
              key={card.id}
              onPress={() => handleSelect(card.id)}
              style={[
                styles.card,
                isActive ? [cardGlow.active, { borderColor: card.color + '60' }] : cardGlow.sm,
              ]}
            >
              <Text style={[styles.cardLabel, isActive && { color: card.color }]}>{card.label}</Text>
              <Text style={[styles.cardValue, { color: isActive ? card.color : colors.textHeading }]}>
                {money(card.value)}
              </Text>
              <Text style={styles.cardSub}>{card.sublabel}</Text>
            </Pressable>
          );
        })}
      </View>
      {listPrice != null && listPrice > 0 && (
        <View style={styles.listRow}>
          <Text style={styles.listLabel}>List Price</Text>
          <Text style={styles.listValue}>{money(listPrice)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  sectionLabel: { fontFamily: fontFamilies.heading, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: colors.primary, textTransform: 'uppercase', marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  card: {
    flex: 1,
    backgroundColor: colors.base,
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  cardLabel: { fontFamily: fontFamilies.body, fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },
  cardValue: { fontFamily: fontFamilies.monoBold, fontSize: 16, fontWeight: '700' },
  cardSub: { fontFamily: fontFamilies.body, fontSize: 9, color: colors.textMuted },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  listLabel: { fontFamily: fontFamilies.body, fontSize: 12, color: colors.textSecondary },
  listValue: { fontFamily: fontFamilies.mono, fontSize: 12, color: colors.textHeading },
});
