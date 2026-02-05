/**
 * TuneSectionNew - Collapsible tune sliders with groups
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TuneGroup, SliderConfig, TargetAssumptions } from './types';
import { useAnalysis } from './AnalysisContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface TuneSectionNewProps {
  // Props are now optional/removed as we use context
  isDark?: boolean;
}

export function TuneSectionNew({ isDark = true }: TuneSectionNewProps) {
  const { assumptions, updateAssumption } = useAnalysis();
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Generate tune groups from context assumptions
  const groups = useMemo((): TuneGroup[] => {
    return [
      {
        id: 'purchase',
        title: 'Buy Price',
        sliders: [
          createSliderConfig('listPrice', 'Buy Price', assumptions.listPrice, 100000, 1000000, 5000, formatCurrency),
        ],
      },
      {
        id: 'financing',
        title: 'Financing',
        sliders: [
          createSliderConfig('downPaymentPct', 'Down Payment', assumptions.downPaymentPct, 0.05, 0.30, 0.01, (v) => formatPercent(v, 0)),
          createSliderConfig('interestRate', 'Interest Rate', assumptions.interestRate, 0.05, 0.10, 0.00125, (v) => formatPercent(v, 2)),
        ],
      },
      {
        id: 'rental',
        title: 'Rental Income',
        sliders: [
          createSliderConfig('monthlyRent', 'Monthly Rent', assumptions.monthlyRent, 1000, 8000, 50, formatCurrency),
          createSliderConfig('vacancyRate', 'Vacancy', assumptions.vacancyRate, 0, 0.15, 0.01, (v) => formatPercent(v, 0)),
        ],
      },
    ];
  }, [assumptions]);

  const toggleSection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleGroup = (groupId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(7,23,46,0.02)',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }
    ]}>
      {/* Header - Collapsible */}
      <TouchableOpacity style={styles.header} onPress={toggleSection} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>🔧</Text>
          <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#07172e' }]}>
            Tune the Deal
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.tapHint, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)' }]}>
            {isExpanded ? 'Tap to collapse' : 'Tap to adjust'}
          </Text>
          <Ionicons 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={18} 
            color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)'} 
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.content}>
          {groups.map((group) => (
            <TuneGroupComponent
              key={group.id}
              group={group}
              isExpanded={expandedGroups.has(group.id)}
              onToggle={() => toggleGroup(group.id)}
              onSliderChange={updateAssumption}
              isDark={isDark}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface TuneGroupComponentProps {
  group: TuneGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onSliderChange: (key: keyof TargetAssumptions, value: number) => void;
  isDark: boolean;
}

function TuneGroupComponent({ group, isExpanded, onToggle, onSliderChange, isDark }: TuneGroupComponentProps) {
  return (
    <View style={[
      styles.group,
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(7,23,46,0.02)',
        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.04)',
      }
    ]}>
      <TouchableOpacity style={styles.groupHeader} onPress={onToggle} activeOpacity={0.7}>
        <Text style={[styles.groupTitle, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(7,23,46,0.7)' }]}>
          {group.title}
        </Text>
        <Ionicons 
          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
          size={16} 
          color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)'} 
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.sliders}>
          {group.sliders.map((slider) => (
            <TuneSlider
              key={slider.id}
              config={slider}
              onChange={(value) => onSliderChange(slider.id as keyof TargetAssumptions, value)}
              isDark={isDark}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface TuneSliderProps {
  config: SliderConfig;
  onChange: (value: number) => void;
  isDark: boolean;
}

function TuneSlider({ config, onChange, isDark }: TuneSliderProps) {
  const [localValue, setLocalValue] = useState(config.value);

  const handleValueChange = (value: number) => {
    // Round to step
    const rounded = Math.round(value / config.step) * config.step;
    setLocalValue(rounded);
  };

  const handleSlidingComplete = (value: number) => {
    const rounded = Math.round(value / config.step) * config.step;
    onChange(rounded);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.slider}>
      <View style={styles.sliderHeader}>
        <Text style={[styles.sliderLabel, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(7,23,46,0.6)' }]}>
          {config.label}
        </Text>
        <Text style={[styles.sliderValue, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
          {config.format(localValue)}
        </Text>
      </View>
      <Slider
        style={styles.sliderTrack}
        minimumValue={config.min}
        maximumValue={config.max}
        step={config.step}
        value={localValue}
        onValueChange={handleValueChange}
        onSlidingComplete={handleSlidingComplete}
        minimumTrackTintColor={isDark ? '#4dd0e1' : '#007ea7'}
        maximumTrackTintColor={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(7,23,46,0.15)'}
        thumbTintColor={isDark ? '#4dd0e1' : '#007ea7'}
      />
      <View style={styles.sliderRange}>
        <Text style={[styles.rangeText, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(7,23,46,0.3)' }]}>
          {config.format(config.min)}
        </Text>
        <Text style={[styles.rangeText, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(7,23,46,0.3)' }]}>
          {config.format(config.max)}
        </Text>
      </View>
    </View>
  );
}

// Helper to create slider configs
export function createSliderConfig(
  id: string,
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  format: (value: number) => string
): SliderConfig {
  return { id, label, value, min, max, step, format };
}

// Format helpers
export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export const formatPercent = (value: number, decimals: number = 1): string =>
  `${(value * 100).toFixed(decimals)}%`;

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tapHint: {
    fontSize: 11,
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  group: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  sliders: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 16,
  },
  slider: {},
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sliderLabel: {
    fontSize: 12,
  },
  sliderValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  sliderTrack: {
    width: '100%',
    height: 40,
  },
  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  rangeText: {
    fontSize: 10,
  },
});
