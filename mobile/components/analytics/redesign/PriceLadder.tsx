/**
 * PriceLadder - Visual gradient arrow price ladder
 * Shows price spectrum from List Price (red/top) to Offer (blue/bottom)
 * with a gradient arrow visualization
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PriceRung } from './types';
import { getPriceLabel } from '../../../utils/priceUtils';

interface PriceLadderProps {
  rungs: PriceRung[];
  isDark?: boolean;
  isOffMarket?: boolean;
  listingStatus?: string;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export function PriceLadder({ rungs, isDark = true, isOffMarket = false, listingStatus }: PriceLadderProps) {
  const priceLabel = useMemo(() => getPriceLabel(isOffMarket, listingStatus), [isOffMarket, listingStatus]);
  // Sort rungs by price descending to get positions
  const sortedRungs = useMemo(() => 
    [...rungs].sort((a, b) => b.price - a.price), 
    [rungs]
  );

  // Find specific rungs
  const listRung = sortedRungs.find(r => r.id === 'list');
  const breakevenRung = sortedRungs.find(r => r.id === 'breakeven');
  const targetRung = sortedRungs.find(r => r.id === 'target');
  const offerRung = sortedRungs.find(r => r.id === 'opening' || r.id === 'offer');

  // Calculate positions (0-100) based on price relative to list and lowest offer
  const maxPrice = listRung?.price || Math.max(...rungs.map(r => r.price));
  const minPrice = offerRung?.price || Math.min(...rungs.map(r => r.price));
  const priceRange = maxPrice - minPrice;

  const getPosition = (price: number) => {
    if (priceRange === 0) return 50;
    return ((maxPrice - price) / priceRange) * 100;
  };

  const gradientHeight = 320;
  const arrowHeight = 50;

  // Dynamic colors based on theme
  const textColor = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(7,23,46,0.9)';
  const mutedColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)';
  const borderColor = isDark ? 'rgba(77,208,225,0.3)' : 'rgba(7,23,46,0.15)';
  const bgColor = isDark ? 'rgba(255,255,255,0.02)' : '#ffffff';
  const rulerColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(7,23,46,0.2)';

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor }]}>
      {/* Header */}
      <Text style={[styles.title, { color: textColor }]}>PRICE LADDER</Text>

      {/* Main Ladder Container */}
      <View style={styles.ladderWrapper}>
        
        {/* Left Side - Seller Label & IQ Target */}
        <View style={styles.leftSide}>
          {/* Seller Pricing Label */}
          <Text style={[styles.zoneLabel, { color: mutedColor }]}>
            SELLER ZONE
          </Text>

          {/* IQ Target - positioned on left side */}
          {targetRung && (
            <View style={[styles.targetLeft, { top: getPosition(targetRung.price) * 0.7 + 15 + '%' as any }]}>
              <View style={styles.targetLabelRow}>
                <MaterialCommunityIcons name="target" size={16} color="#22c55e" />
                <Text style={styles.targetLabelText}>IQ Target</Text>
              </View>
              <Text style={styles.targetDescription}>
                {targetRung.description || 'Cash flow positive'}
              </Text>
              <Text style={[styles.targetPrice, { color: textColor }]}>
                {formatCurrency(targetRung.price)}
              </Text>
            </View>
          )}
        </View>

        {/* Ruler Column */}
        <View style={styles.rulerColumn}>
          <View style={[styles.rulerLine, { backgroundColor: rulerColor }]}>
            {/* Top circle */}
            <View style={[styles.rulerCircle, { borderColor: rulerColor, top: -4 }]} />
            
            {/* Tick marks */}
            {[...Array(10)].map((_, i) => (
              <View 
                key={i}
                style={[
                  styles.rulerTick, 
                  { backgroundColor: rulerColor, top: `${(i + 1) * 9}%` }
                ]}
              />
            ))}

            {/* Bottom circle */}
            <View style={[styles.rulerCircle, { borderColor: rulerColor, bottom: -4 }]} />
          </View>
        </View>

        {/* Gradient Arrow */}
        <View style={styles.arrowContainer}>
          {/* Gradient Bar */}
          <View style={[styles.gradientBar, { height: gradientHeight }]}>
            {/* List Price Marker */}
            {listRung && (
              <View 
                style={[
                  styles.marker, 
                  styles.markerRight,
                  { backgroundColor: '#ef4444', top: `${getPosition(listRung.price) * 0.7 + 5}%` }
                ]}
              />
            )}

            {/* Breakeven Marker */}
            {breakevenRung && (
              <View 
                style={[
                  styles.marker,
                  styles.markerRight,
                  { backgroundColor: '#f97316', top: `${getPosition(breakevenRung.price) * 0.7 + 5}%` }
                ]}
              />
            )}

            {/* IQ Target Marker - on left side */}
            {targetRung && (
              <View 
                style={[
                  styles.marker,
                  styles.markerLeft,
                  styles.markerGlow,
                  { backgroundColor: '#22c55e', top: `${getPosition(targetRung.price) * 0.7 + 5}%` }
                ]}
              />
            )}
          </View>

          {/* Arrow Point */}
          <View style={styles.arrowPoint} />
        </View>

        {/* Right Side - Price Labels */}
        <View style={styles.rightSide}>
          {/* List Price */}
          {listRung && (
            <View style={[styles.priceLabel, { top: `${getPosition(listRung.price) * 0.7 + 3}%` as any }]}>
              <Text style={styles.priceLabelTitle}>{priceLabel}</Text>
              <Text style={[styles.priceLabelSub, { color: mutedColor }]}>
                Current Asking
              </Text>
              <Text style={[styles.priceLabelValue, { color: textColor }]}>
                {formatCurrency(listRung.price)}
              </Text>
              <Text style={[styles.priceLabelPercent, { color: mutedColor }]}>
                {Math.round(listRung.percentOfList * 100)}%
              </Text>
            </View>
          )}

          {/* Breakeven */}
          {breakevenRung && (
            <View style={[styles.priceLabel, { top: `${getPosition(breakevenRung.price) * 0.7 + 3}%` as any }]}>
              <Text style={[styles.priceLabelTitle, { color: '#f97316' }]}>Breakeven</Text>
              <Text style={[styles.priceLabelSub, { color: mutedColor }]}>
                $0 Cash Flow
              </Text>
              <Text style={[styles.priceLabelValue, { color: textColor }]}>
                {formatCurrency(breakevenRung.price)}
              </Text>
              <Text style={[styles.priceLabelPercent, { color: mutedColor }]}>
                {Math.round(breakevenRung.percentOfList * 100)}%
              </Text>
            </View>
          )}

          {/* Investor Opportunity Label */}
          <View style={styles.opportunityLabel}>
            <Text style={[styles.zoneLabel, { color: mutedColor, textAlign: 'right' }]}>
              BUYER ZONE
            </Text>
          </View>
        </View>
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
  openingOfferPct: number = 0.70,
  priceLabel: string = 'List Price'
): PriceRung[] {
  const rungs: PriceRung[] = [
    {
      id: 'list',
      label: priceLabel,
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
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  ladderWrapper: {
    flexDirection: 'row',
    minHeight: 380,
    position: 'relative',
  },
  leftSide: {
    width: 100,
    paddingRight: 8,
    position: 'relative',
  },
  zoneLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    lineHeight: 14,
    marginTop: 20,
  },
  targetLeft: {
    position: 'absolute',
    right: 8,
    alignItems: 'flex-end',
  },
  targetLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  targetLabelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22c55e',
  },
  targetDescription: {
    fontSize: 11,
    color: 'rgba(34,197,94,0.8)',
    marginTop: 2,
    textAlign: 'right',
  },
  targetPrice: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  rulerColumn: {
    width: 20,
    paddingTop: 20,
    alignItems: 'flex-end',
  },
  rulerLine: {
    width: 2,
    height: '85%',
    position: 'relative',
  },
  rulerCircle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    backgroundColor: 'transparent',
    right: -3,
  },
  rulerTick: {
    position: 'absolute',
    width: 10,
    height: 2,
    right: 0,
  },
  arrowContainer: {
    width: 50,
    paddingTop: 20,
  },
  gradientBar: {
    width: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'relative',
    // Gradient approximation using background color
    // Note: React Native doesn't support CSS linear-gradient
    // We use a solid color and markers to indicate positions
    backgroundColor: '#4CAF50',
    overflow: 'visible',
  },
  marker: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  markerRight: {
    right: -6,
  },
  markerLeft: {
    left: -6,
  },
  markerGlow: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  arrowPoint: {
    width: 0,
    height: 0,
    borderLeftWidth: 40,
    borderRightWidth: 40,
    borderTopWidth: 50,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1565c0',
    marginLeft: -20,
  },
  rightSide: {
    flex: 1,
    paddingLeft: 16,
    paddingTop: 20,
    position: 'relative',
  },
  priceLabel: {
    position: 'absolute',
    left: 16,
  },
  priceLabelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
  priceLabelSub: {
    fontSize: 11,
    marginTop: 2,
  },
  priceLabelValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  priceLabelPercent: {
    fontSize: 11,
  },
  opportunityLabel: {
    position: 'absolute',
    right: 0,
    bottom: 60,
  },
});
