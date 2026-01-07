/**
 * TuneSliders - Collapsible slider groups for tuning deal parameters
 */

import React, { useState } from 'react';
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
import { SliderGroup, AnalyticsInputs } from './types';
import { formatCurrency, formatPercent } from './calculations';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface TuneSlidersProps {
  groups: SliderGroup[];
  inputs: AnalyticsInputs;
  onInputChange: (key: keyof AnalyticsInputs, value: number) => void;
  isDark?: boolean;
}

export function TuneSliders({ groups, inputs, onInputChange, isDark = true }: TuneSlidersProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['purchase']); // First group expanded by default

  const toggleGroup = (groupId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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

  return (
    <View style={styles.container}>
      {groups.map((group, groupIndex) => {
        const isExpanded = expandedGroups.includes(group.id);
        
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
                    {group.icon}
                  </Text>
                </View>
                <Text style={[
                  styles.headerTitle,
                  { color: isDark ? '#fff' : '#07172e' }
                ]}>
                  {group.title}
                </Text>
              </View>
              <Text style={[styles.chevron, { color: '#6b7280' }]}>
                {isExpanded ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {/* Content */}
            {isExpanded && (
              <View style={styles.content}>
                {group.sliders.map((slider) => {
                  const value = inputs[slider.id] as number;
                  
                  return (
                    <View key={slider.id} style={styles.sliderRow}>
                      <View style={styles.sliderLabel}>
                        <Text style={[
                          styles.sliderName,
                          { color: isDark ? '#aab2bd' : '#6b7280' }
                        ]}>
                          {slider.label}
                        </Text>
                        <Text style={[
                          styles.sliderValue,
                          { color: isDark ? '#fff' : '#07172e' }
                        ]}>
                          {formatValue(value, slider.format)}
                        </Text>
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
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 11,
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
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
});

