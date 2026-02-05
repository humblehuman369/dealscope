import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import type { SavedPropertySummary, PropertyStatus } from '../../types';
import { PROPERTY_STATUS_LABELS } from '../../types';
import PropertyStatusBadge from './PropertyStatusBadge';

interface PropertyCardProps {
  property: SavedPropertySummary;
  onPress: () => void;
  onLongPress?: () => void;
  selected?: boolean;
}

export default function PropertyCard({
  property,
  onPress,
  onLongPress,
  selected = false,
}: PropertyCardProps) {
  const { theme, isDark } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const handleLongPress = () => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress();
    }
  };

  const displayName = property.nickname || property.address_street;
  const cityState = [property.address_city, property.address_state]
    .filter(Boolean)
    .join(', ');

  // Format cash flow
  const formatCurrency = (value: number | null) => {
    if (value === null) return '--';
    const formatted = Math.abs(value).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return value < 0 ? `-${formatted}` : formatted;
  };

  // Format percentage
  const formatPercent = (value: number | null) => {
    if (value === null) return '--';
    return `${(value * 100).toFixed(1)}%`;
  };

  // Get color label style
  const colorLabelStyle = property.color_label
    ? { backgroundColor: getColorValue(property.color_label) }
    : null;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: selected ? colors.primary[500] : isDark ? colors.primary[700] : colors.primary[200],
        },
        selected && styles.containerSelected,
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      {/* Color Label */}
      {colorLabelStyle && <View style={[styles.colorLabel, colorLabelStyle]} />}

      <View style={styles.content}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            {cityState && (
              <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
                {cityState}
              </Text>
            )}
          </View>
          <PropertyStatusBadge status={property.status} />
        </View>

        {/* Metrics Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Cash Flow</Text>
            <Text
              style={[
                styles.metricValue,
                {
                  color:
                    property.best_cash_flow === null
                      ? theme.textMuted
                      : property.best_cash_flow >= 0
                      ? colors.profit.main
                      : colors.loss.main,
                },
              ]}
            >
              {formatCurrency(property.best_cash_flow)}/mo
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: theme.textMuted }]}>CoC Return</Text>
            <Text
              style={[
                styles.metricValue,
                {
                  color:
                    property.best_coc_return === null
                      ? theme.textMuted
                      : property.best_coc_return >= 0.08
                      ? colors.profit.main
                      : property.best_coc_return >= 0
                      ? colors.warning.main
                      : colors.loss.main,
                },
              ]}
            >
              {formatPercent(property.best_coc_return)}
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metric}>
            <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Best Strategy</Text>
            <Text style={[styles.metricValue, { color: colors.primary[isDark ? 300 : 600] }]}>
              {property.best_strategy?.toUpperCase() || '--'}
            </Text>
          </View>
        </View>

        {/* Footer Row */}
        <View style={styles.footerRow}>
          {/* Tags */}
          {property.tags && property.tags.length > 0 && (
            <View style={styles.tags}>
              {property.tags.slice(0, 3).map((tag, index) => (
                <View
                  key={index}
                  style={[styles.tag, { backgroundColor: isDark ? colors.navy[700] : colors.gray[100] }]}
                >
                  <Text style={[styles.tagText, { color: theme.textSecondary }]}>{tag}</Text>
                </View>
              ))}
              {property.tags.length > 3 && (
                <Text style={[styles.moreText, { color: theme.textMuted }]}>
                  +{property.tags.length - 3}
                </Text>
              )}
            </View>
          )}

          {/* Priority */}
          {property.priority && (
            <View style={styles.priority}>
              {[...Array(property.priority)].map((_, i) => (
                <Ionicons key={i} name="star" size={12} color={colors.warning.main} />
              ))}
            </View>
          )}

          {/* Chevron */}
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getColorValue(colorLabel: string): string {
  const colorMap: Record<string, string> = {
    red: '#ef4444',
    green: '#22c55e',
    blue: '#3b82f6',
    yellow: '#eab308',
    purple: '#a855f7',
    orange: '#f97316',
    gray: '#6b7280',
  };
  return colorMap[colorLabel] || colorMap.gray;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
    overflow: 'hidden',
  },
  containerSelected: {
    borderWidth: 2,
  },
  colorLabel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  content: {
    padding: 16,
    paddingLeft: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.gray[200],
    marginHorizontal: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tags: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  moreText: {
    fontSize: 11,
    marginLeft: 4,
  },
  priority: {
    flexDirection: 'row',
    marginRight: 8,
  },
});
