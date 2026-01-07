/**
 * InsightsSection Component
 * Displays strategy-specific insights
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { colors } from '@/theme/colors';
import { Insight } from '../../types';

interface InsightsSectionProps {
  insights: Insight[];
  title?: string;
}

export const InsightsSection: React.FC<InsightsSectionProps> = ({
  insights,
  title = 'Key Insights',
}) => {
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;

  if (insights.length === 0) return null;

  const getInsightStyle = (type: Insight['type']) => {
    switch (type) {
      case 'strength':
        return {
          bg: 'rgba(34,197,94,0.1)',
          border: 'rgba(34,197,94,0.3)',
          iconBg: colors.success,
        };
      case 'concern':
        return {
          bg: 'rgba(249,115,22,0.1)',
          border: 'rgba(249,115,22,0.3)',
          iconBg: colors.warning,
        };
      case 'tip':
        return {
          bg: 'rgba(59,130,246,0.1)',
          border: 'rgba(59,130,246,0.3)',
          iconBg: colors.primary,
        };
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      
      <View style={styles.insightsList}>
        {insights.map((insight, index) => {
          const style = getInsightStyle(insight.type);
          
          return (
            <View
              key={index}
              style={[
                styles.insightCard,
                {
                  backgroundColor: style.bg,
                  borderColor: style.border,
                },
              ]}
            >
              <View style={[styles.iconContainer, { backgroundColor: style.iconBg }]}>
                <Text style={styles.icon}>{insight.icon}</Text>
              </View>
              <View style={styles.insightContent}>
                <Text style={[styles.insightText, { color: theme.text }]}>
                  {insight.text}
                </Text>
                {insight.highlight && (
                  <Text style={[styles.highlight, { color: style.iconBg }]}>
                    {insight.highlight}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  insightsList: {
    gap: 10,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 14,
  },
  insightContent: {
    flex: 1,
  },
  insightText: {
    fontSize: 13,
    lineHeight: 18,
  },
  highlight: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default InsightsSection;

