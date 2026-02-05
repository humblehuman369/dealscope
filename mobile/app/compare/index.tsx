import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { colors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { savedPropertiesService } from '../../services/savedPropertiesService';
import type { SavedPropertySummary, StrategyType } from '../../types';
import { STRATEGY_LABELS } from '../../types';

interface ComparisonMetric {
  label: string;
  key: string;
  format: 'currency' | 'percent' | 'number';
  higherIsBetter?: boolean;
}

const METRICS: ComparisonMetric[] = [
  { label: 'List Price', key: 'list_price', format: 'currency', higherIsBetter: false },
  { label: 'Monthly Cash Flow', key: 'best_cash_flow', format: 'currency', higherIsBetter: true },
  { label: 'CoC Return', key: 'best_coc_return', format: 'percent', higherIsBetter: true },
  { label: 'Best Strategy', key: 'best_strategy', format: 'number' },
];

export default function CompareScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ ids?: string }>();
  const { theme, isDark } = useTheme();

  // State
  const [properties, setProperties] = useState<SavedPropertySummary[]>([]);
  const [allProperties, setAllProperties] = useState<SavedPropertySummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Load properties
  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (params.ids) {
      setSelectedIds(params.ids.split(','));
    }
  }, [params.ids]);

  const loadProperties = async () => {
    try {
      const data = await savedPropertiesService.getSavedProperties({ limit: 100 });
      setAllProperties(data);

      if (params.ids) {
        const ids = params.ids.split(',');
        setProperties(data.filter((p) => ids.includes(p.id)));
      } else {
        setIsSelectMode(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load properties');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProperty = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= 4) {
        Alert.alert('Limit Reached', 'You can compare up to 4 properties at a time');
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleStartComparison = () => {
    if (selectedIds.length < 2) {
      Alert.alert('Select Properties', 'Please select at least 2 properties to compare');
      return;
    }
    setProperties(allProperties.filter((p) => selectedIds.includes(p.id)));
    setIsSelectMode(false);
  };

  const formatValue = (value: any, format: string): string => {
    if (value === null || value === undefined) return '--';

    switch (format) {
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'percent':
        return `${(value * 100).toFixed(1)}%`;
      default:
        return String(value);
    }
  };

  const getBestValue = (key: string, metric: ComparisonMetric): number | null => {
    const values = properties.map((p: any) => p[key]).filter((v) => v !== null);
    if (values.length === 0) return null;
    return metric.higherIsBetter ? Math.max(...values) : Math.min(...values);
  };

  // Dynamic styles
  const dynamicStyles = {
    container: { backgroundColor: theme.background },
    header: { backgroundColor: theme.headerBackground, borderBottomColor: theme.headerBorder },
    title: { color: theme.text },
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, dynamicStyles.container]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  // Selection mode
  if (isSelectMode) {
    return (
      <View style={[styles.container, dynamicStyles.container]}>
        <View style={[styles.header, dynamicStyles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, dynamicStyles.title]}>Select Properties</Text>
          <TouchableOpacity onPress={handleStartComparison}>
            <Text style={styles.compareButton}>Compare ({selectedIds.length})</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <Text style={[styles.selectHint, { color: theme.textMuted }]}>
            Select 2-4 properties to compare side by side
          </Text>

          {allProperties.map((property) => (
            <TouchableOpacity
              key={property.id}
              style={[
                styles.selectCard,
                {
                  backgroundColor: theme.card,
                  borderColor: selectedIds.includes(property.id)
                    ? colors.primary[500]
                    : isDark
                    ? colors.primary[700]
                    : colors.primary[200],
                  borderWidth: selectedIds.includes(property.id) ? 2 : 1.5,
                },
              ]}
              onPress={() => handleSelectProperty(property.id)}
            >
              <View style={styles.selectCardContent}>
                <Text style={[styles.selectCardTitle, { color: theme.text }]} numberOfLines={1}>
                  {property.nickname || property.address_street}
                </Text>
                <Text style={[styles.selectCardSubtitle, { color: theme.textMuted }]}>
                  {[property.address_city, property.address_state].filter(Boolean).join(', ')}
                </Text>
              </View>
              <View
                style={[
                  styles.selectCheckbox,
                  {
                    backgroundColor: selectedIds.includes(property.id) ? colors.primary[500] : 'transparent',
                    borderColor: selectedIds.includes(property.id) ? colors.primary[500] : theme.border,
                  },
                ]}
              >
                {selectedIds.includes(property.id) && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Comparison view
  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.header, dynamicStyles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, dynamicStyles.title]}>Compare Properties</Text>
        <TouchableOpacity onPress={() => setIsSelectMode(true)}>
          <Ionicons name="swap-horizontal" size={24} color={colors.primary[500]} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Property Headers */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.headerRow}>
              <View style={styles.labelCell} />
              {properties.map((property) => (
                <View key={property.id} style={[styles.headerCell, { backgroundColor: theme.card }]}>
                  <Text style={[styles.propertyName, { color: theme.text }]} numberOfLines={2}>
                    {property.nickname || property.address_street}
                  </Text>
                  <Text style={[styles.propertyCity, { color: theme.textMuted }]}>
                    {property.address_city}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Metrics */}
          <ScrollView>
            {METRICS.map((metric) => {
              const bestValue = getBestValue(metric.key, metric);

              return (
                <View key={metric.key} style={styles.metricRow}>
                  <View style={[styles.labelCell, { backgroundColor: isDark ? colors.navy[800] : colors.gray[100] }]}>
                    <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{metric.label}</Text>
                  </View>
                  {properties.map((property: any) => {
                    const value = property[metric.key];
                    const isBest = value === bestValue && bestValue !== null;

                    return (
                      <View
                        key={property.id}
                        style={[
                          styles.valueCell,
                          {
                            backgroundColor: isBest
                              ? isDark
                                ? colors.profit.dark + '20'
                                : colors.profit.light
                              : theme.card,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.metricValue,
                            {
                              color: isBest ? colors.profit.main : theme.text,
                              fontWeight: isBest ? '700' : '500',
                            },
                          ]}
                        >
                          {formatValue(value, metric.format)}
                        </Text>
                        {isBest && metric.higherIsBetter !== undefined && (
                          <Ionicons name="trophy" size={14} color={colors.warning.main} />
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8, marginLeft: -8 },
  title: { fontSize: 18, fontWeight: '700' },
  compareButton: { fontSize: 15, fontWeight: '600', color: colors.primary[600] },
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  selectHint: { fontSize: 14, marginBottom: 16, textAlign: 'center' },
  selectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  selectCardContent: { flex: 1 },
  selectCardTitle: { fontSize: 15, fontWeight: '600' },
  selectCardSubtitle: { fontSize: 13, marginTop: 2 },
  selectCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: { flexDirection: 'row' },
  labelCell: { width: 120, padding: 12, justifyContent: 'center' },
  headerCell: { width: 140, padding: 12, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: colors.gray[200] },
  propertyName: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  propertyCity: { fontSize: 11, marginTop: 4 },
  metricRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.gray[200] },
  metricLabel: { fontSize: 13, fontWeight: '500' },
  valueCell: {
    width: 140,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderLeftWidth: 1,
    borderLeftColor: colors.gray[200],
  },
  metricValue: { fontSize: 14 },
});
