/**
 * StrategyGrid - 2x3 grid of strategy selection boxes for mobile
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StrategyId } from './types';

interface Strategy {
  id: StrategyId;
  name: string;
  tagline: string;
  color: string;
}

const STRATEGIES: Strategy[] = [
  { 
    id: 'ltr', 
    name: 'Long-Term Rental', 
    tagline: 'Steady income & equity',
    color: '#3b82f6'
  },
  { 
    id: 'str', 
    name: 'Short-Term Rental', 
    tagline: 'Vacation & Airbnb income',
    color: '#8b5cf6'
  },
  { 
    id: 'brrrr', 
    name: 'BRRRR', 
    tagline: 'Buy-Rehab-Rent-Refi-Repeat',
    color: '#f97316'
  },
  { 
    id: 'flip', 
    name: 'Fix & Flip', 
    tagline: 'Buy low, sell high',
    color: '#ec4899'
  },
  { 
    id: 'house_hack', 
    name: 'House Hack', 
    tagline: 'Live free, rent rooms',
    color: '#14b8a6'
  },
  { 
    id: 'wholesale', 
    name: 'Wholesale', 
    tagline: 'Assign contracts for profit',
    color: '#84cc16'
  },
];

interface StrategyGridProps {
  activeStrategy: StrategyId | null;
  onSelectStrategy: (id: StrategyId) => void;
  isDark?: boolean;
}

export function StrategyGrid({ activeStrategy, onSelectStrategy, isDark = true }: StrategyGridProps) {
  const bgColor = isDark ? '#0d1e38' : '#ffffff';
  const borderColor = isDark ? 'rgba(0,126,167,0.4)' : 'rgba(7,23,46,0.12)';
  const borderHoverColor = isDark ? '#4dd0e1' : '#007ea7';
  const textColor = isDark ? '#fff' : '#07172e';
  const mutedColor = isDark ? '#9ca3af' : '#6b7280';

  return (
    <View style={styles.grid}>
      {STRATEGIES.map((strategy) => {
        const isActive = activeStrategy === strategy.id;
        
        return (
          <TouchableOpacity
            key={strategy.id}
            style={[
              styles.box,
              { 
                backgroundColor: isActive 
                  ? (isDark ? 'rgba(77,208,225,0.1)' : 'rgba(0,126,167,0.05)')
                  : bgColor,
                borderColor: isActive ? borderHoverColor : borderColor,
              }
            ]}
            onPress={() => onSelectStrategy(strategy.id)}
            activeOpacity={0.8}
          >
            {/* Color indicator bar */}
            <View 
              style={[styles.indicator, { backgroundColor: strategy.color }]}
            />
            
            <Text style={[styles.name, { color: textColor }]}>
              {strategy.name}
            </Text>
            <Text style={[styles.tagline, { color: mutedColor }]}>
              {strategy.tagline}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

interface StrategyPromptProps {
  title?: string;
  subtitle?: string;
  action?: string;
  isDark?: boolean;
}

export function StrategyPrompt({ 
  title = 'Compare 6 Profit Models',
  subtitle = 'Which model is best for you?',
  action = 'Select & review',
  isDark = true
}: StrategyPromptProps) {
  const accentColor = isDark ? '#4dd0e1' : '#007ea7';
  const subtitleColor = isDark ? '#d1d5db' : '#4b5563';
  const actionColor = isDark ? '#6b7280' : '#9ca3af';

  return (
    <View style={styles.prompt}>
      <Text style={[styles.promptTitle, { color: accentColor }]}>
        {title}
      </Text>
      <Text style={[styles.promptSubtitle, { color: subtitleColor }]}>
        {subtitle}
      </Text>
      <Text style={[styles.promptAction, { color: actionColor }]}>
        {action}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  box: {
    width: '48%',
    borderWidth: 2,
    borderRadius: 14,
    padding: 16,
    paddingTop: 20,
    alignItems: 'center',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 40,
    height: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 4,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  prompt: {
    alignItems: 'center',
    marginBottom: 16,
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  promptSubtitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  promptAction: {
    fontSize: 12,
  },
});
