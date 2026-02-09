/**
 * ResultCards — NOI and Cash Flow result cards
 * Per StrategyIQ 3.3 design: green for positive, red for negative
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { verdictDark } from '../../theme/colors';
import { verdictTypography } from '../../theme/textStyles';
import { rf, rs } from '../verdict-iq/responsive';

interface ResultCardData {
  title: string;
  subtitle: string;
  amount: string;
  monthly: string;
  isPositive: boolean;
}

interface ResultCardsProps {
  cards: ResultCardData[];
}

export function ResultCards({ cards }: ResultCardsProps) {
  return (
    <View style={styles.container}>
      {cards.map((card, i) => {
        const accentColor = card.isPositive ? verdictDark.green : verdictDark.red;
        const bgColor = card.isPositive ? verdictDark.greenBg : verdictDark.redBg;
        const borderColor = card.isPositive
          ? 'rgba(52,211,153,0.2)'
          : 'rgba(248,113,113,0.2)';

        return (
          <View key={i} style={[styles.card, { backgroundColor: bgColor, borderColor }]}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={[styles.cardSub, { color: accentColor }]}>{card.subtitle}</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={[styles.cardAmount, { color: accentColor }]}>{card.amount}</Text>
              <Text style={[styles.cardMonthly, { color: accentColor }]}>{card.monthly}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: rs(10),
  },
  card: {
    borderRadius: rs(12),
    borderWidth: 1,
    paddingVertical: rs(14),
    paddingHorizontal: rs(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {},
  cardTitle: {
    fontSize: rf(14),
    fontWeight: '600',
    color: verdictDark.textHeading,
  },
  cardSub: {
    fontSize: rf(12),
    fontWeight: '500',
    marginTop: rs(2),
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  cardAmount: {
    ...verdictTypography.financialLarge,
    fontSize: rf(17),
  },
  cardMonthly: {
    fontSize: rf(12),
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    marginTop: rs(2),
  },
});
