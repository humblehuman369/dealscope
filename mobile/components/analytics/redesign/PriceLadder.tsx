/**
 * PriceLadder - Visual price position rungs
 * Shows List → 90% → Breakeven → Target → Aggressive
 * Design matches: investiq-property-analytics-complete-redesign (final).html
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PriceRung } from './types';

// Color mapping for rung types
const RUNG_COLORS: Record<string, string> = {
  list: '#ef4444',      // Red
  ninety: '#f97316',    // Orange
  breakeven: '#eab308', // Yellow
  target: '#22c55e',    // Green
  aggressive: '#4dd0e1', // Cyan
  opening: '#4dd0e1',   // Cyan
};

interface PriceLadderProps {
  rungs: PriceRung[];
  isDark?: boolean;
}

export function PriceLadder({ rungs, isDark = true }: PriceLadderProps) {
  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const getMarkerColor = (rungId: string): string => {
    return RUNG_COLORS[rungId] || '#6b7280';
  };

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(7,23,46,0.02)',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }
    ]}>
      <Text style={[styles.title, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
        PRICE POSITION LADDER
      </Text>
      
      <View style={styles.ladder}>
        {rungs.map((rung) => {
          const markerColor = getMarkerColor(rung.id);
          const isTarget = rung.id === 'target';
          
          return (
            <View 
              key={rung.id} 
              style={[
                styles.rung,
                isTarget && styles.rungHighlighted,
              ]}
            >
              {/* Colored Dot Marker */}
              <View 
                style={[
                  styles.marker,
                  { backgroundColor: markerColor },
                  isTarget && styles.markerGlow,
                ]} 
              />
              
              {/* Rung Info */}
              <View style={styles.rungInfo}>
                <Text style={[
                  styles.rungLabel,
                  isTarget && styles.rungLabelTarget,
                  { color: isTarget ? '#22c55e' : (isDark ? 'rgba(255,255,255,0.9)' : 'rgba(7,23,46,0.9)') }
                ]}>
                  {rung.label}
                </Text>
                {rung.description && (
                  <Text style={[styles.rungDescription, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)' }]}>
                    {rung.description}
                  </Text>
                )}
              </View>
              
              {/* Price and Percent */}
              <View style={styles.rungRight}>
                <Text style={[
                  styles.rungPrice,
                  { color: isTarget ? '#22c55e' : (isDark ? '#fff' : '#07172e') }
                ]}>
                  {formatCurrency(rung.price)}
                </Text>
                <Text style={[styles.rungPercent, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)' }]}>
                  {Math.round(rung.percentOfList * 100)}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// Helper to generate price ladder
export function generatePriceLadder(
  listPrice: number,
  targetPrice: number,
  targetLabel: string = 'IQ Target',
  targetDescription?: string,
  breakevenPrice?: number,
  breakevenLabel: string = 'Breakeven',
  breakevenDescription?: string,
  openingOfferPct: number = 0.70
): PriceRung[] {
  const rungs: PriceRung[] = [
    {
      id: 'list',
      label: 'List Price',
      price: listPrice,
      percentOfList: 1.0,
    },
    {
      id: 'ninety',
      label: '90% of List',
      price: listPrice * 0.9,
      percentOfList: 0.9,
    },
  ];

  // Add breakeven if provided
  if (breakevenPrice && breakevenPrice > targetPrice) {
    rungs.push({
      id: 'breakeven',
      label: breakevenLabel,
      price: breakevenPrice,
      percentOfList: breakevenPrice / listPrice,
      description: breakevenDescription,
    });
  }

  // Add target
  rungs.push({
    id: 'target',
    label: targetLabel,
    price: targetPrice,
    percentOfList: targetPrice / listPrice,
    isHighlighted: true,
    description: targetDescription,
    badge: 'RECOMMENDED',
  });

  // Add opening offer
  const openingPrice = listPrice * openingOfferPct;
  if (openingPrice < targetPrice) {
    rungs.push({
      id: 'opening',
      label: 'Opening Offer',
      price: openingPrice,
      percentOfList: openingOfferPct,
      description: 'Start negotiations here',
    });
  }

  // Sort by price descending
  return rungs.sort((a, b) => b.price - a.price);
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  ladder: {
    gap: 0,
  },
  rung: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  rungHighlighted: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  marker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  markerGlow: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  rungInfo: {
    flex: 1,
  },
  rungLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  rungLabelTarget: {
    fontWeight: '700',
  },
  rungDescription: {
    fontSize: 11,
    marginTop: 1,
  },
  rungRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  rungPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  rungPercent: {
    fontSize: 11,
  },
});
