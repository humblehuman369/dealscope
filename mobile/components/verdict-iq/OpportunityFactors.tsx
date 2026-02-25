/**
 * OpportunityFactors — Deal Score factor breakdown.
 *
 * Displays: Deal Gap %, Seller Motivation (expandable), Days on Market, Distressed Sale.
 * Matches frontend/src/components/iq-verdict/OpportunityFactors.tsx.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export interface SellerMotivationData {
  score: number;
  label: string;
  negotiation_leverage?: 'high' | 'medium' | 'low';
  suggested_discount_range?: { min: number; max: number };
  indicators?: { name: string; detected: boolean }[];
}

export interface OpportunityFactorsData {
  dealGap: number;
  motivation: number;
  motivationLabel: string;
  daysOnMarket: number | null;
  distressedSale: boolean;
}

interface OpportunityFactorsProps {
  factors: OpportunityFactorsData;
  sellerMotivation?: SellerMotivationData;
}

const COLORS = {
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  gray: '#94a3b8',
  teal: '#0d9488',
};

function motivationColor(score: number) {
  if (score >= 70) return COLORS.green;
  if (score >= 40) return COLORS.amber;
  return COLORS.red;
}

export function OpportunityFactors({ factors, sellerMotivation }: OpportunityFactorsProps) {
  const { isDark } = useTheme();
  const [showDetails, setShowDetails] = useState(false);

  const textColor = isDark ? '#e2e8f0' : '#334155';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const detailsBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

  const motivationScore = sellerMotivation?.score ?? factors.motivation;
  const motivationLabel = sellerMotivation?.label ?? factors.motivationLabel;

  return (
    <View>
      <Text style={[styles.header, { color: mutedColor }]}>
        Deal Score Factors
      </Text>

      {/* Deal Gap */}
      <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: borderColor }]}>
        <View style={styles.labelGroup}>
          <Ionicons name="trending-down-outline" size={14} color={mutedColor} />
          <Text style={[styles.label, { color: textColor }]}>Deal Gap</Text>
        </View>
        <Text
          style={[
            styles.value,
            { color: factors.dealGap <= 10 ? COLORS.green : factors.dealGap <= 25 ? COLORS.amber : COLORS.red },
          ]}
        >
          {factors.dealGap.toFixed(1)}%
        </Text>
      </View>

      {/* Seller Motivation */}
      <TouchableOpacity
        onPress={() => sellerMotivation && setShowDetails(!showDetails)}
        activeOpacity={sellerMotivation ? 0.7 : 1}
        style={[styles.row, { borderBottomWidth: 1, borderBottomColor: borderColor }]}
      >
        <View style={styles.labelGroup}>
          <Ionicons name="flag-outline" size={14} color={mutedColor} />
          <Text style={[styles.label, { color: textColor }]}>Seller Motivation</Text>
          {sellerMotivation && (
            <Ionicons
              name={showDetails ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={mutedColor}
            />
          )}
        </View>
        <View style={styles.motivationRight}>
          <Text style={[styles.value, { color: motivationColor(motivationScore) }]}>
            {motivationLabel}
          </Text>
          {sellerMotivation && (
            <View style={[styles.scoreBadge, { backgroundColor: `${motivationColor(motivationScore)}18` }]}>
              <Text style={[styles.scoreBadgeText, { color: motivationColor(motivationScore) }]}>
                {motivationScore}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded motivation details */}
      {showDetails && sellerMotivation && (
        <View style={[styles.detailsContainer, { backgroundColor: detailsBg }]}>
          {sellerMotivation.negotiation_leverage && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: mutedColor }]}>Negotiation Leverage</Text>
              <Text
                style={[
                  styles.detailValue,
                  {
                    color:
                      sellerMotivation.negotiation_leverage === 'high'
                        ? COLORS.green
                        : sellerMotivation.negotiation_leverage === 'medium'
                          ? COLORS.amber
                          : COLORS.gray,
                  },
                ]}
              >
                {sellerMotivation.negotiation_leverage.charAt(0).toUpperCase() +
                  sellerMotivation.negotiation_leverage.slice(1)}
              </Text>
            </View>
          )}
          {sellerMotivation.suggested_discount_range && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: mutedColor }]}>Suggested Discount</Text>
              <Text style={[styles.detailValue, { color: COLORS.teal }]}>
                {sellerMotivation.suggested_discount_range.min}% - {sellerMotivation.suggested_discount_range.max}%
              </Text>
            </View>
          )}
          {sellerMotivation.indicators && sellerMotivation.indicators.length > 0 && (
            <View style={styles.indicatorsSection}>
              <Text style={[styles.indicatorsHeader, { color: mutedColor }]}>KEY FACTORS</Text>
              {sellerMotivation.indicators.slice(0, 3).map((ind, i) => (
                <View key={i} style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: textColor }]}>{ind.name}</Text>
                  <Text style={{ color: ind.detected ? COLORS.green : COLORS.gray }}>
                    {ind.detected ? '✓' : '—'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Days on Market */}
      <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: borderColor }]}>
        <View style={styles.labelGroup}>
          <Ionicons name="time-outline" size={14} color={mutedColor} />
          <Text style={[styles.label, { color: textColor }]}>Long Listing Duration</Text>
        </View>
        <Text
          style={[
            styles.value,
            {
              color:
                factors.daysOnMarket !== null && factors.daysOnMarket > 60
                  ? COLORS.green
                  : textColor,
            },
          ]}
        >
          {factors.daysOnMarket !== null ? `${factors.daysOnMarket} days` : 'No'}
        </Text>
      </View>

      {/* Distressed Sale */}
      <View style={styles.row}>
        <View style={styles.labelGroup}>
          <Ionicons name="alert-circle-outline" size={14} color={mutedColor} />
          <Text style={[styles.label, { color: textColor }]}>Distressed Sale</Text>
        </View>
        <Text style={[styles.value, { color: factors.distressedSale ? COLORS.green : COLORS.gray }]}>
          {factors.distressedSale ? 'Yes' : 'No'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  motivationRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scoreBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailsContainer: {
    marginLeft: 22,
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  indicatorsSection: {
    marginTop: 6,
    paddingTop: 6,
  },
  indicatorsHeader: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
});

export default OpportunityFactors;
