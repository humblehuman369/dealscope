/**
 * DealGap Component - Decision-Grade UI
 * Deal gap analysis with recommendation
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How Likely Can You Get This Price?</Text>

      {/* Off-Market Callout */}
      {isOffMarket && (
        <View style={styles.calloutBox}>
          <View style={styles.calloutIcon}>
            <Text style={styles.calloutIconText}>!</Text>
          </View>
          <Text style={styles.calloutText}>
            <Text style={styles.calloutTextBold}>Off-Market Property:</Text>
            {' '}No asking price available. Using Market Estimate of {formatPrice(marketEstimate)} for Deal Gap calculation.
          </Text>
        </View>
      )}

      {/* Deal Gap Main Row */}
      <View style={styles.gapRowMain}>
        <Text style={styles.gapLabelMain}>Deal Gap</Text>
        <Text style={[
          styles.gapValueMain,
          isNegativeGap && styles.gapValueNegative,
        ]}>
          {dealGapPercent > 0 ? '+' : ''}{dealGapPercent}%
        </Text>
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

      {/* Recommended Box */}
      <View style={styles.recommendedBox}>
        <Text style={styles.recommendedLabel}>RECOMMENDED</Text>
        <Text style={styles.recommendedText}>
          Suggested opening offer: {suggestedOfferRange}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: rs(16),
    backgroundColor: decisionGrade.bgPrimary,
  },
  title: {
    fontSize: rf(13),
    fontWeight: '700',
    color: decisionGrade.caution,
    marginBottom: rs(12),
  },
  calloutBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(10),
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: decisionGrade.caution,
    borderRadius: rs(8),
    padding: rs(12),
    marginBottom: rs(14),
  },
  calloutIcon: {
    width: rs(18),
    height: rs(18),
    borderRadius: rs(9),
    borderWidth: 2,
    borderColor: decisionGrade.caution,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutIconText: {
    fontSize: rf(11),
    fontWeight: '800',
    color: decisionGrade.caution,
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
  gapValueMain: {
    fontSize: rf(15),
    fontWeight: '800',
    color: decisionGrade.pacificTeal,
  },
  gapValueNegative: {
    color: decisionGrade.negative,
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
    padding: rs(12),
    backgroundColor: decisionGrade.bgSelected,
    borderWidth: 2,
    borderColor: decisionGrade.pacificTeal,
    borderRadius: rs(8),
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
