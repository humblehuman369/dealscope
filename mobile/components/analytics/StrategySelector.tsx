/**
 * StrategySelector - Tabs for switching between investment strategies
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { StrategyType } from './types';

interface Strategy {
  id: StrategyType;
  name: string;
  shortName: string;
  icon: string;
  color: string;
}

export const STRATEGY_LIST: Strategy[] = [
  { id: 'longTermRental', name: 'Long-Term Rental', shortName: 'LTR', icon: '🏠', color: '#0097a7' },
  { id: 'shortTermRental', name: 'Short-Term Rental', shortName: 'STR', icon: '🏨', color: '#9333ea' },
  { id: 'brrrr', name: 'BRRRR', shortName: 'BRRRR', icon: '🔄', color: '#f97316' },
  { id: 'fixAndFlip', name: 'Fix & Flip', shortName: 'Flip', icon: '🔨', color: '#22c55e' },
  { id: 'houseHack', name: 'House Hack', shortName: 'Hack', icon: '🏡', color: '#3b82f6' },
  { id: 'wholesale', name: 'Wholesale', shortName: 'WS', icon: '📋', color: '#eab308' },
];

interface StrategySelectorProps {
  activeStrategy: StrategyType;
  onStrategyChange: (strategy: StrategyType) => void;
  strategyScores?: Record<StrategyType, { score: number; viable: boolean }>;
  isDark?: boolean;
}

export function StrategySelector({ 
  activeStrategy, 
  onStrategyChange,
  strategyScores,
  isDark = true 
}: StrategySelectorProps) {
  
  const handlePress = (strategyId: StrategyType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onStrategyChange(strategyId);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
        Investment Strategies
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {STRATEGY_LIST.map((strategy) => {
          const isActive = activeStrategy === strategy.id;
          const scoreData = strategyScores?.[strategy.id];
          const isViable = scoreData?.viable ?? true;
          
          return (
            <TouchableOpacity
              key={strategy.id}
              style={[
                styles.tab,
                !isViable && styles.tabNotViable,
              ]}
              onPress={() => handlePress(strategy.id)}
              activeOpacity={0.7}
            >
              {isActive ? (
                <LinearGradient
                  colors={[strategy.color, adjustColorBrightness(strategy.color, 30)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tabActiveGradient}
                >
                  <Text style={styles.tabIcon}>{strategy.icon}</Text>
                  <Text style={styles.tabLabelActive}>{strategy.shortName}</Text>
                  {scoreData && (
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreBadgeText}>{scoreData.score}</Text>
                    </View>
                  )}
                </LinearGradient>
              ) : (
                <View style={[
                  styles.tabInner,
                  { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.03)',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)',
                  }
                ]}>
                  <Text style={[styles.tabIcon, !isViable && styles.tabIconDimmed]}>{strategy.icon}</Text>
                  <Text style={[
                    styles.tabLabel, 
                    { color: isDark ? '#aab2bd' : '#6b7280' },
                    !isViable && styles.tabLabelDimmed,
                  ]}>
                    {strategy.shortName}
                  </Text>
                  {scoreData && (
                    <Text style={[
                      styles.scoreText,
                      { color: getScoreColor(scoreData.score) },
                      !isViable && styles.scoreTextDimmed,
                    ]}>
                      {scoreData.score}
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Helper to lighten/darken colors
function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)
  ).toString(16).slice(1);
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 50) return '#f97316';
  return '#ef4444';
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  scrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  tab: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabNotViable: {
    opacity: 0.5,
  },
  tabActiveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabIcon: {
    fontSize: 14,
  },
  tabIconDimmed: {
    opacity: 0.5,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabLabelActive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  tabLabelDimmed: {
    opacity: 0.5,
  },
  scoreBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 2,
  },
  scoreBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  scoreTextDimmed: {
    opacity: 0.5,
  },
});

