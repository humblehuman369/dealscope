/**
 * InsightCard - AI insight display with type variants
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { InsightData, InsightType } from './types';

interface InsightCardProps {
  insight: InsightData;
  isDark?: boolean;
}

const INSIGHT_STYLES: Record<InsightType, { bg: string; border: string; iconBg: string }> = {
  success: {
    bg: 'rgba(34, 197, 94, 0.08)',
    border: 'rgba(34, 197, 94, 0.3)',
    iconBg: 'rgba(34, 197, 94, 0.2)',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.3)',
    iconBg: 'rgba(245, 158, 11, 0.2)',
  },
  danger: {
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.3)',
    iconBg: 'rgba(239, 68, 68, 0.2)',
  },
  tip: {
    bg: 'rgba(77, 208, 225, 0.08)',
    border: 'rgba(77, 208, 225, 0.3)',
    iconBg: 'rgba(77, 208, 225, 0.2)',
  },
};

const INSIGHT_COLORS: Record<InsightType, string> = {
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  tip: '#4dd0e1',
};

export function InsightCard({ insight, isDark = true }: InsightCardProps) {
  const style = INSIGHT_STYLES[insight.type];
  const color = INSIGHT_COLORS[insight.type];

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: style.bg,
        borderColor: style.border,
      }
    ]}>
      <View style={[styles.iconContainer, { backgroundColor: style.iconBg }]}>
        <Text style={styles.icon}>{insight.icon}</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color }]}>{insight.title}</Text>
        <Text style={[styles.description, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(7,23,46,0.7)' }]}>
          {insight.description}
        </Text>
      </View>
    </View>
  );
}

// Helper to create IQ insight
export function createIQInsight(
  type: InsightType,
  title: string,
  description: string
): InsightData {
  const icons: Record<InsightType, string> = {
    success: '✅',
    warning: '⚠️',
    danger: '🚨',
    tip: '💡',
  };
  
  return {
    type,
    icon: icons[type],
    title,
    description,
  };
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    marginBottom: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
  },
});
