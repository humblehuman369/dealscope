/**
 * SmartInsights - AI-generated insights cards
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Insight } from './types';

interface SmartInsightsProps {
  insights: Insight[];
  isDark?: boolean;
}

export function SmartInsights({ insights, isDark = true }: SmartInsightsProps) {
  if (insights.length === 0) return null;

  return (
    <View style={styles.container}>
      {insights.map((insight, index) => {
        const bgColor = getInsightBackground(insight.type, isDark);
        const borderColor = getInsightBorder(insight.type, isDark);
        
        return (
          <View 
            key={index} 
            style={[
              styles.insightCard,
              { backgroundColor: bgColor, borderColor: borderColor }
            ]}
          >
            <Text style={styles.icon}>{insight.icon}</Text>
            <Text style={[
              styles.text, 
              { color: isDark ? '#e1e8ed' : '#374151' }
            ]}>
              {insight.highlight ? (
                <>
                  <Text style={[styles.highlight, { color: isDark ? '#fff' : '#07172e' }]}>
                    {insight.highlight}
                  </Text>
                  {' '}
                </>
              ) : null}
              {insight.text}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function getInsightBackground(type: Insight['type'], isDark: boolean): string {
  switch (type) {
    case 'strength':
      return isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.08)';
    case 'concern':
      return isDark ? 'rgba(249,115,22,0.1)' : 'rgba(249,115,22,0.08)';
    case 'tip':
      return isDark ? 'rgba(77,208,225,0.1)' : 'rgba(0,126,167,0.08)';
    default:
      return isDark ? 'rgba(255,255,255,0.05)' : 'rgba(7,23,46,0.03)';
  }
}

function getInsightBorder(type: Insight['type'], isDark: boolean): string {
  switch (type) {
    case 'strength':
      return isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.15)';
    case 'concern':
      return isDark ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.15)';
    case 'tip':
      return isDark ? 'rgba(77,208,225,0.2)' : 'rgba(0,126,167,0.15)';
    default:
      return isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.06)';
  }
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  icon: {
    fontSize: 14,
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  highlight: {
    fontWeight: '700',
  },
});

