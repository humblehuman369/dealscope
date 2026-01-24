/**
 * NegotiationPlan - Game plan with 3 offer cards and leverage points
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NegotiationPlanData, OfferConfig, LeveragePoint } from './types';

interface NegotiationPlanProps {
  plan: NegotiationPlanData;
  isDark?: boolean;
}

export function NegotiationPlan({ plan, isDark = true }: NegotiationPlanProps) {
  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(7,23,46,0.02)',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }
    ]}>
      <Text style={[styles.title, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
        🎯 NEGOTIATION GAME PLAN
      </Text>

      {/* Offer Cards */}
      <View style={styles.offersRow}>
        <OfferCard offer={plan.openingOffer} type="opening" isDark={isDark} formatCurrency={formatCurrency} />
        <OfferCard offer={plan.targetPrice} type="target" isDark={isDark} formatCurrency={formatCurrency} />
        <OfferCard offer={plan.walkAway} type="walkaway" isDark={isDark} formatCurrency={formatCurrency} />
      </View>

      {/* Leverage Points */}
      {plan.leveragePoints.length > 0 && (
        <View style={styles.leverageSection}>
          <Text style={[styles.leverageTitle, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
            LEVERAGE POINTS
          </Text>
          {plan.leveragePoints.map((point) => (
            <View key={point.id} style={styles.leveragePoint}>
              <Text style={styles.leverageIcon}>{point.icon}</Text>
              <Text style={[
                styles.leverageText,
                { color: point.isPositive ? '#22c55e' : (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(7,23,46,0.7)') }
              ]}>
                {point.text}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

interface OfferCardProps {
  offer: OfferConfig;
  type: 'opening' | 'target' | 'walkaway';
  isDark: boolean;
  formatCurrency: (value: number) => string;
}

function OfferCard({ offer, type, isDark, formatCurrency }: OfferCardProps) {
  const isTarget = type === 'target';
  
  return (
    <View style={[
      styles.offerCard,
      isTarget && styles.offerCardTarget,
      { 
        backgroundColor: isTarget 
          ? 'transparent' 
          : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.03)'),
        borderColor: isTarget 
          ? '#4dd0e1' 
          : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)'),
      }
    ]}>
      {isTarget ? (
        <LinearGradient
          colors={['rgba(77, 208, 225, 0.15)', 'rgba(77, 208, 225, 0.05)']}
          style={styles.offerCardGradient}
        >
          <OfferCardContent offer={offer} type={type} isDark={isDark} formatCurrency={formatCurrency} />
        </LinearGradient>
      ) : (
        <OfferCardContent offer={offer} type={type} isDark={isDark} formatCurrency={formatCurrency} />
      )}
    </View>
  );
}

function OfferCardContent({ offer, type, isDark, formatCurrency }: OfferCardProps) {
  const isTarget = type === 'target';
  const labelColors = {
    opening: '#6b7280',
    target: '#4dd0e1',
    walkaway: '#ef4444',
  };

  return (
    <View style={styles.offerContent}>
      <Text style={[styles.offerLabel, { color: labelColors[type] }]}>
        {offer.label}
      </Text>
      <Text style={[
        styles.offerPrice,
        { color: isTarget ? '#22c55e' : (isDark ? '#fff' : '#07172e') }
      ]}>
        {formatCurrency(offer.price)}
      </Text>
      <Text style={[styles.offerPercent, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)' }]}>
        {Math.round(offer.percentOfList * 100)}% of list
      </Text>
      {offer.isRecommended && (
        <View style={styles.recommendedBadge}>
          <Text style={styles.recommendedText}>★ TARGET</Text>
        </View>
      )}
    </View>
  );
}

// Helper to generate negotiation plan
export function generateNegotiationPlan(
  listPrice: number,
  targetPrice: number,
  openingPct: number = 0.70,
  walkAwayPct?: number,
  leveragePoints: LeveragePoint[] = []
): NegotiationPlanData {
  const calculatedWalkAwayPct = walkAwayPct || Math.min((targetPrice / listPrice) + 0.06, 0.92);
  
  return {
    openingOffer: {
      id: 'opening',
      label: 'Opening Offer',
      price: Math.round(listPrice * openingPct),
      percentOfList: openingPct,
      rationale: 'Start low to leave room for negotiation',
    },
    targetPrice: {
      id: 'target',
      label: 'Buy Price',
      price: targetPrice,
      percentOfList: targetPrice / listPrice,
      isRecommended: true,
      rationale: 'Optimal price for your target returns',
    },
    walkAway: {
      id: 'walkaway',
      label: 'Walk-Away',
      price: Math.round(listPrice * calculatedWalkAwayPct),
      percentOfList: calculatedWalkAwayPct,
      rationale: 'Maximum price before deal becomes unfavorable',
    },
    leveragePoints,
  };
}

// Pre-built leverage points
export const LEVERAGE_POINTS = {
  daysOnMarket: (days: number, avgDays: number = 30): LeveragePoint => ({
    id: 'dom',
    icon: '📅',
    text: `${days} days on market (avg: ${avgDays} days)`,
    isPositive: days > avgDays,
  }),
  priceReduced: (count: number): LeveragePoint => ({
    id: 'price_reduced',
    icon: '📉',
    text: `Price reduced ${count}x already`,
    isPositive: true,
  }),
  cashOffer: (): LeveragePoint => ({
    id: 'cash',
    icon: '💵',
    text: 'Cash offer, quick close = seller appeal',
    isPositive: true,
  }),
  motivated: (): LeveragePoint => ({
    id: 'motivated',
    icon: '🏃',
    text: 'Seller appears motivated',
    isPositive: true,
  }),
  repairs: (amount: number): LeveragePoint => ({
    id: 'repairs',
    icon: '🔧',
    text: `$${amount.toLocaleString()} in needed repairs`,
    isPositive: true,
  }),
  touristArea: (): LeveragePoint => ({
    id: 'tourist',
    icon: '🏖️',
    text: 'Prime tourist/vacation rental area',
    isPositive: true,
  }),
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  offersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  offerCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  offerCardTarget: {
    borderWidth: 1.5,
  },
  offerCardGradient: {
    padding: 12,
  },
  offerContent: {
    padding: 12,
    alignItems: 'center',
  },
  offerLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  offerPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  offerPercent: {
    fontSize: 9,
    marginTop: 2,
  },
  recommendedBadge: {
    backgroundColor: '#4dd0e1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  recommendedText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  leverageSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  leverageTitle: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  leveragePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  leverageIcon: {
    fontSize: 12,
  },
  leverageText: {
    fontSize: 12,
    flex: 1,
  },
});
