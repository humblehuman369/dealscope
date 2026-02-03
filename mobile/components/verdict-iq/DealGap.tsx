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
    padding: 16,
    backgroundColor: decisionGrade.bgPrimary,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: decisionGrade.caution,
    marginBottom: 12,
  },
  calloutBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: decisionGrade.caution,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  calloutIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: decisionGrade.caution,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutIconText: {
    fontSize: 12,
    fontWeight: '800',
    color: decisionGrade.caution,
  },
  calloutText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: decisionGrade.textSecondary,
    lineHeight: 18,
  },
  calloutTextBold: {
    fontWeight: '700',
    color: decisionGrade.textPrimary,
  },
  gapRowMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: decisionGrade.borderMedium,
  },
  gapLabelMain: {
    fontSize: 14,
    fontWeight: '700',
    color: decisionGrade.textPrimary,
  },
  gapValueMain: {
    fontSize: 16,
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: decisionGrade.borderLight,
  },
  gapLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: decisionGrade.textSecondary,
  },
  gapValue: {
    fontSize: 13,
    fontWeight: '600',
    color: decisionGrade.textPrimary,
  },
  gapValueTeal: {
    fontSize: 13,
    fontWeight: '600',
    color: decisionGrade.pacificTeal,
  },
  recommendedBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: decisionGrade.bgSelected,
    borderWidth: 2,
    borderColor: decisionGrade.pacificTeal,
    borderRadius: 8,
  },
  recommendedLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: decisionGrade.pacificTeal,
    marginBottom: 4,
  },
  recommendedText: {
    fontSize: 14,
    fontWeight: '600',
    color: decisionGrade.textPrimary,
  },
});

export default DealGap;
