/**
 * BestStrategyCard - Shows recommended investment strategy
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { formatPercent } from './calculations';
import { colors } from '../../theme/colors';

interface StrategyInfo {
  name: string;
  icon: string;
  color: string;
  roi: number;
}

interface BestStrategyCardProps {
  strategy: StrategyInfo;
  onPress?: () => void;
  isDark?: boolean;
}

export function BestStrategyCard({ strategy, onPress, isDark = true }: BestStrategyCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isDark 
            ? 'rgba(4,101,242,0.12)' 
            : 'rgba(4,101,242,0.08)',
          borderColor: isDark 
            ? 'rgba(4,101,242,0.25)' 
            : 'rgba(4,101,242,0.2)',
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Best Fit</Text>
          </View>
          <Text style={styles.icon}>{strategy.icon}</Text>
        </View>
        <Text style={[
          styles.name,
          { color: isDark ? '#fff' : '#07172e' }
        ]}>
          {strategy.name}
        </Text>
      </View>
      
      <View style={styles.right}>
        <Text style={[styles.roi, { color: strategy.color }]}>
          {formatPercent(strategy.roi)}
        </Text>
        <Text style={[styles.roiLabel, { color: '#6b7280' }]}>
          Est. ROI
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Default strategies configuration
export const STRATEGIES = {
  longTermRental: {
    name: 'Long-Term Rental',
    icon: '🏠',
    color: colors.strategies.longTermRental.primary,
  },
  shortTermRental: {
    name: 'Short-Term Rental',
    icon: '🏨',
    color: colors.strategies.shortTermRental.primary,
  },
  brrrr: {
    name: 'BRRRR',
    icon: '🔄',
    color: colors.strategies.brrrr.primary,
  },
  fixAndFlip: {
    name: 'Fix & Flip',
    icon: '🔨',
    color: colors.strategies.fixAndFlip.primary,
  },
  houseHack: {
    name: 'House Hack',
    icon: '🏡',
    color: colors.strategies.houseHack.primary,
  },
  wholesale: {
    name: 'Wholesale',
    icon: '📋',
    color: colors.strategies.wholesale.primary,
  },
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  left: {
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: '#0465f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  icon: {
    fontSize: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  right: {
    alignItems: 'flex-end',
  },
  roi: {
    fontSize: 24,
    fontWeight: '800',
  },
  roiLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});

