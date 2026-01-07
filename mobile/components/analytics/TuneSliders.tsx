/**
 * TuneSliders - Collapsible slider groups for tuning deal parameters
 * Features: Circled step numbers, slider deltas showing % change from base
 */

import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { SliderGroup, AnalyticsInputs, DEFAULT_INPUTS } from './types';
import { formatCurrency, formatPercent } from './calculations';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Circled numbers for step indicators
const STEP_NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

interface TuneSlidersProps {
  groups: SliderGroup[];
  inputs: AnalyticsInputs;
  onInputChange: (key: keyof AnalyticsInputs, value: number) => void;
  baseInputs?: AnalyticsInputs; // For calculating deltas
  isDark?: boolean;
}

export function TuneSliders({ 
  groups, 
  inputs, 
  onInputChange, 
  baseInputs = DEFAULT_INPUTS,
  isDark = true 
}: TuneSlidersProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['purchase']); // First group expanded by default

  const toggleGroup = (groupId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync();
    setExpandedGroups(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const formatValue = (value: number, format: string): string => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return formatPercent(value * 100);
      case 'years':
        return `${value} yrs`;
      default:
        return String(value);
    }
  };

  // Calculate delta percentage between current and base value
  const calculateDelta = (currentValue: number, baseValue: number): { percent: number; text: string } | null => {
    if (baseValue === 0 || currentValue === baseValue) return null;
    
    const percent = ((currentValue - baseValue) / baseValue) * 100;
    if (Math.abs(percent) < 0.5) return null; // Ignore tiny differences
    
    const sign = percent > 0 ? '+' : '';
    return {
      percent,
      text: `${sign}${percent.toFixed(0)}%`,
    };
  };

  return (
    <View style={styles.container}>
      {groups.map((group, groupIndex) => {
        const isExpanded = expandedGroups.includes(group.id);
        const stepNumber = STEP_NUMBERS[groupIndex] || String(groupIndex + 1);
        
        return (
          <View 
            key={group.id}
            style={[
              styles.section,
              { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(7,23,46,0.02)',
                borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(7,23,46,0.05)',
              }
            ]}
          >
            {/* Header */}
            <TouchableOpacity 
              style={styles.header}
              onPress={() => toggleGroup(group.id)}
              activeOpacity={0.7}
            >
              <View style={styles.headerLeft}>
                <View style={[
                  styles.stepNum,
                  { backgroundColor: isDark ? '#4dd0e1' : '#007ea7' }
                ]}>
                  <Text style={[
                    styles.stepNumText,
                    { color: isDark ? '#07172e' : '#fff' }
                  ]}>
                    {stepNumber}
                  </Text>
                </View>
                <Text style={[
                  styles.headerTitle,
                  { color: isDark ? '#fff' : '#07172e' }
                ]}>
                  {group.title}
                </Text>
              </View>
              <View style={styles.headerRight}>
                <Text style={[styles.chevron, { color: '#6b7280' }]}>
                  {isExpanded ? '▲' : '▼'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Content */}
            {isExpanded && (
              <View style={styles.content}>
                {group.sliders.map((slider) => {
                  const value = inputs[slider.id] as number;
                  const baseValue = baseInputs[slider.id] as number;
                  const delta = calculateDelta(value, baseValue);
                  
                  return (
                    <View key={slider.id} style={styles.sliderRow}>
                      <View style={styles.sliderLabel}>
                        <Text style={[
                          styles.sliderName,
                          { color: isDark ? '#aab2bd' : '#6b7280' }
                        ]}>
                          {slider.label}
                        </Text>
                        <View style={styles.sliderValueRow}>
                          <Text style={[
                            styles.sliderValue,
                            { color: isDark ? '#fff' : '#07172e' }
                          ]}>
                            {formatValue(value, slider.format)}
                          </Text>
                          {delta && (
                            <View style={[
                              styles.deltaBadge,
                              { 
                                backgroundColor: delta.percent > 0 
                                  ? 'rgba(34,197,94,0.15)' 
                                  : 'rgba(239,68,68,0.15)',
                              }
                            ]}>
                              <Text style={[
                                styles.deltaText,
                                { color: delta.percent > 0 ? '#22c55e' : '#ef4444' }
                              ]}>
                                {delta.text}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      
                      <Slider
                        style={styles.slider}
                        minimumValue={slider.min}
                        maximumValue={slider.max}
                        step={slider.step}
                        value={value}
                        onValueChange={(newValue) => {
                          Haptics.selectionAsync();
                          onInputChange(slider.id, newValue);
                        }}
                        minimumTrackTintColor={isDark ? '#4dd0e1' : '#007ea7'}
                        maximumTrackTintColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(7,23,46,0.1)'}
                        thumbTintColor={isDark ? '#fff' : '#fff'}
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 10,
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    gap: 16,
  },
  sliderRow: {
    gap: 8,
  },
  sliderLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderName: {
    fontSize: 13,
  },
  sliderValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  deltaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deltaText: {
    fontSize: 10,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
