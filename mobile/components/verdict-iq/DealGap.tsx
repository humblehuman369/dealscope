/**
 * DealGap Component - Decision-Grade UI (Polished)
 * Icon header, colored gap pill, gradient recommended box
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { decisionGrade } from '../../theme/colors';
import { rf, rs } from './responsive';

interface DealGapProps {
  isOffMarket: boolean;
  marketEstimate: number;
  targetPrice: number;
  dealGapPercent: number;
  discountNeeded: number;
  suggestedOfferRange: string;
}

const formatPrice = (price: number): string => {
  return '$' + price.toLocaleString();
};

export function DealGap({
  isOffMarket,
  marketEstimate,
  targetPrice,
  dealGapPercent,
  discountNeeded,
  suggestedOfferRange,
}: DealGapProps) {
  const isNegativeGap = dealGapPercent < 0;
  const gapColor = isNegativeGap ? decisionGrade.negative : decisionGrade.pacificTeal;
  const gapPillBg = isNegativeGap ? 'rgba(220,38,38,0.10)' : 'rgba(8,145,178,0.10)';

  return (
    <View style={styles.container}>
      {/* Header with icon */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="swap-vertical" size={16} color="white" />
          </View>
          <View>
            <Text style={styles.title}>Deal Gap Analysis</Text>
            <Text style={styles.headerSubtitle}>How likely can you get this price?</Text>
          </View>
        </View>
      </View>

      {/* Off-Market Callout */}
      {isOffMarket && (
        <View style={styles.calloutBox}>
          <View style={styles.calloutIcon}>
            <Ionicons name="alert" size={12} color={decisionGrade.caution} />
          </View>
          <Text style={styles.calloutText}>
            <Text style={styles.calloutTextBold}>Off-Market Property:</Text>
            {' '}No asking price available. Using Market Estimate of {formatPrice(marketEstimate)} for Deal Gap calculation.
          </Text>
        </View>
      )}

      {/* Deal Gap Main Row with Pill */}
      <View style={styles.gapRowMain}>
        <Text style={styles.gapLabelMain}>Deal Gap</Text>
        <View style={[styles.gapPill, { backgroundColor: gapPillBg }]}>
          <Text style={[styles.gapValueMain, { color: gapColor }]}>
            {dealGapPercent > 0 ? '+' : ''}{dealGapPercent}%
          </Text>
        </View>
      </View>

      {/* Detail Rows */}
      <View style={styles.gapRow}>
        <Text style={styles.gapLabel}>Market Estimate</Text>
        <Text style={styles.gapValue}>{formatPrice(marketEstimate)}</Text>
      </View>
      <View style={styles.gapRow}>
        <Text style={styles.gapLabel}>Your Target</Text>
        <Text style={styles.gapValueTeal}>{formatPrice(targetPrice)}</Text>
      </View>
      <View style={styles.gapRow}>
        <Text style={styles.gapLabel}>Discount Needed</Text>
        <Text style={styles.gapValue}>{formatPrice(discountNeeded)}</Text>
      </View>

      {/* Recommended Box - Gradient */}
      <View style={styles.recommendedBox}>
        <View style={styles.recommendedAccent} />
        <View style={styles.recommendedContent}>
          <Text style={styles.recommendedLabel}>RECOMMENDED</Text>
          <Text style={styles.recommendedText}>
            Suggested opening offer: {suggestedOfferRange}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: rs(16),
    backgroundColor: decisionGrade.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rs(14),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  headerIcon: {
    width: rs(36),
    height: rs(36),
    backgroundColor: decisionGrade.caution,
    borderRadius: rs(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: rf(13),
    fontWeight: '700',
    color: decisionGrade.textPrimary,
  },
  headerSubtitle: {
    fontSize: rf(10),
    fontWeight: '500',
    color: decisionGrade.textSecondary,
  },
  calloutBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(10),
    backgroundColor: 'rgba(217,119,6,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.25)',
    borderRadius: rs(10),
    padding: rs(12),
    marginBottom: rs(14),
  },
  calloutIcon: {
    width: rs(22),
    height: rs(22),
    borderRadius: rs(11),
    backgroundColor: 'rgba(217,119,6,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutText: {
    flex: 1,
    fontSize: rf(12),
    fontWeight: '500',
    color: decisionGrade.textSecondary,
    lineHeight: rf(17),
  },
  calloutTextBold: {
    fontWeight: '700',
    color: decisionGrade.textPrimary,
  },
  gapRowMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: rs(10),
    borderBottomWidth: 2,
    borderBottomColor: decisionGrade.borderMedium,
  },
  gapLabelMain: {
    fontSize: rf(13),
    fontWeight: '700',
    color: decisionGrade.textPrimary,
  },
  gapPill: {
    paddingHorizontal: rs(12),
    paddingVertical: rs(4),
    borderRadius: rs(12),
  },
  gapValueMain: {
    fontSize: rf(15),
    fontWeight: '800',
  },
  gapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: rs(10),
    borderBottomWidth: 1,
    borderBottomColor: decisionGrade.borderLight,
  },
  gapLabel: {
    fontSize: rf(12),
    fontWeight: '600',
    color: decisionGrade.textSecondary,
  },
  gapValue: {
    fontSize: rf(12),
    fontWeight: '600',
    color: decisionGrade.textPrimary,
  },
  gapValueTeal: {
    fontSize: rf(12),
    fontWeight: '600',
    color: decisionGrade.pacificTeal,
  },
  recommendedBox: {
    marginTop: rs(14),
    backgroundColor: 'rgba(8,145,178,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(8,145,178,0.20)',
    borderRadius: rs(10),
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: decisionGrade.pacificTeal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  recommendedAccent: {
    width: rs(4),
    backgroundColor: decisionGrade.pacificTeal,
  },
  recommendedContent: {
    flex: 1,
    padding: rs(12),
  },
  recommendedLabel: {
    fontSize: rf(9),
    fontWeight: '700',
    letterSpacing: 1,
    color: decisionGrade.pacificTeal,
    marginBottom: rs(4),
  },
  recommendedText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: decisionGrade.textPrimary,
  },
});

export default DealGap;
