/**
 * PriceLadder - Visual price position rungs
 * Shows List → 90% → Breakeven → Target → Offer
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PriceRung } from './types';

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

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(7,23,46,0.02)',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }
    ]}>
      <Text style={[styles.title, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
        PRICE POSITION
      </Text>
      
      <View style={styles.ladder}>
        {rungs.map((rung, index) => (
          <View key={rung.id} style={styles.rungContainer}>
            {/* Connecting line */}
            {index > 0 && (
              <View style={[
                styles.connector,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(7,23,46,0.1)' }
              ]} />
            )}
            
            {/* Rung */}
            <View style={[
              styles.rung,
              rung.isHighlighted && styles.rungHighlighted,
              { 
                backgroundColor: rung.isHighlighted 
                  ? 'rgba(77, 208, 225, 0.15)' 
                  : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.03)',
                borderColor: rung.isHighlighted 
                  ? '#4dd0e1' 
                  : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)',
              }
            ]}>
              <View style={styles.rungLeft}>
                <View style={styles.rungLabelRow}>
                  <Text style={[
                    styles.rungLabel,
                    { color: rung.isHighlighted ? '#4dd0e1' : (isDark ? '#fff' : '#07172e') }
                  ]}>
                    {rung.label}
                  </Text>
                  {rung.badge && (
                    <View style={[
                      styles.badge,
                      { backgroundColor: rung.isHighlighted ? '#4dd0e1' : '#6b7280' }
                    ]}>
                      <Text style={styles.badgeText}>{rung.badge}</Text>
                    </View>
                  )}
                </View>
                {rung.description && (
                  <Text style={[styles.rungDescription, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
                    {rung.description}
                  </Text>
                )}
              </View>
              
              <View style={styles.rungRight}>
                <Text style={[
                  styles.rungPrice,
                  { color: rung.isHighlighted ? '#22c55e' : (isDark ? '#fff' : '#07172e') }
                ]}>
                  {formatCurrency(rung.price)}
                </Text>
                <Text style={[styles.rungPercent, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)' }]}>
                  {Math.round(rung.percentOfList * 100)}% of list
                </Text>
              </View>
            </View>
          </View>
        ))}
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
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  ladder: {
    gap: 0,
  },
  rungContainer: {
    position: 'relative',
  },
  connector: {
    position: 'absolute',
    left: 20,
    top: -8,
    width: 2,
    height: 8,
  },
  rung: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  rungHighlighted: {
    borderWidth: 1.5,
  },
  rungLeft: {
    flex: 1,
  },
  rungLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rungLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  rungDescription: {
    fontSize: 11,
    marginTop: 2,
  },
  rungRight: {
    alignItems: 'flex-end',
  },
  rungPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  rungPercent: {
    fontSize: 10,
    marginTop: 2,
  },
});
