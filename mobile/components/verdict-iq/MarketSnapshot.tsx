/**
 * MarketSnapshot — 2x2 grid of market signal tiles
 * Per VerdictIQ 3.3 design: Deal Gap, Urgency, Market, Vacancy
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { verdictDark } from '../../theme/colors';
import { verdictTypography } from '../../theme/textStyles';
import { rf, rs } from './responsive';

export interface MarketTile {
  label: string;
  subLabel: string;
  value: string;
  color: 'red' | 'gold' | 'teal' | 'green' | 'blue';
}

interface MarketSnapshotProps {
  tiles: MarketTile[];
  onLearnMore?: () => void;
}

const COLOR_MAP = {
  red: { text: verdictDark.red, sub: verdictDark.red },
  gold: { text: verdictDark.gold, sub: verdictDark.gold },
  teal: { text: verdictDark.teal, sub: verdictDark.teal },
  green: { text: verdictDark.green, sub: verdictDark.green },
  blue: { text: verdictDark.blue, sub: verdictDark.blue },
};

export function MarketSnapshot({ tiles, onLearnMore }: MarketSnapshotProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MARKET SNAPSHOT</Text>
        {onLearnMore && (
          <Text style={styles.learnMore} onPress={onLearnMore}>
            What do these mean?
          </Text>
        )}
      </View>
      <View style={styles.grid}>
        {tiles.map((tile, i) => {
          const c = COLOR_MAP[tile.color];
          return (
            <View key={i} style={styles.tile}>
              <View style={styles.tileLeft}>
                <Text style={styles.tileLabel}>{tile.label}</Text>
                <Text style={[styles.tileSub, { color: c.sub }]}>{tile.subLabel}</Text>
              </View>
              <Text style={[styles.tileValue, { color: c.text }]}>{tile.value}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: rs(20),
    paddingBottom: rs(24),
    backgroundColor: verdictDark.black,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rs(12),
  },
  title: {
    ...verdictTypography.sectionLabel,
    fontSize: rf(11),
    color: verdictDark.textHeading,
    letterSpacing: 1,
  },
  learnMore: {
    fontSize: rf(12),
    fontWeight: '500',
    color: verdictDark.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(10),
  },
  tile: {
    width: '48.5%' as any,
    backgroundColor: verdictDark.card,
    borderWidth: 1,
    borderColor: verdictDark.border,
    borderRadius: rs(12),
    paddingVertical: rs(14),
    paddingHorizontal: rs(14),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tileLeft: {},
  tileLabel: {
    fontSize: rf(12),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    color: verdictDark.textBody,
    marginBottom: rs(2),
  },
  tileSub: {
    fontSize: rf(12),
    fontWeight: '500',
  },
  tileValue: {
    ...verdictTypography.financialLarge,
    fontSize: rf(19),
  },
});
