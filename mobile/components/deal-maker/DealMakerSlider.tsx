/**
 * DealMakerSlider - Reusable slider component for Deal Maker worksheet
 * Features: Label, value display, range indicators, haptic feedback
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';

import { colors } from '../../theme/colors';
import { DealMakerSliderProps, SliderFormat } from './types';

// =============================================================================
// FORMATTERS
// =============================================================================

export function formatSliderValue(value: number, format: SliderFormat): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    
    case 'currencyPerMonth':
      return `${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)}/mo`;
    
    case 'currencyPerYear':
      return `${new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)}/yr`;
    
    case 'percentage':
      return `${(value * 100).toFixed(value < 0.1 ? 2 : 1)}%`;
    
    case 'years':
      return `${value} yr`;
    
    default:
      return String(value);
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DealMakerSlider({
  config,
  value,
  onChange,
  onChangeComplete,
  isDark = false,
}: DealMakerSliderProps) {
  const [localValue, setLocalValue] = useState(value);

  // Update local value when prop changes
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleValueChange = useCallback((newValue: number) => {
    // Round to step
    const rounded = Math.round(newValue / config.step) * config.step;
    setLocalValue(rounded);
  }, [config.step]);

  const handleSlidingComplete = useCallback((newValue: number) => {
    const rounded = Math.round(newValue / config.step) * config.step;
    onChange(rounded);
    onChangeComplete?.(rounded);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [config.step, onChange, onChangeComplete]);

  const formattedValue = formatSliderValue(localValue, config.format);
  const formattedMin = formatSliderValue(config.min, config.format);
  const formattedMax = formatSliderValue(config.max, config.format);

  return (
    <View style={styles.container}>
      {/* Header: Label and Value */}
      <View style={styles.header}>
        <Text style={[
          styles.label,
          { color: isDark ? 'rgba(255,255,255,0.8)' : colors.gray[700] }
        ]}>
          {config.label}
        </Text>
        <Text style={[
          styles.value,
          { color: isDark ? colors.accent[500] : colors.primary[600] }
        ]}>
          {formattedValue}
        </Text>
      </View>

      {/* Slider Track */}
      <View style={styles.sliderWrapper}>
        <Slider
          style={styles.slider}
          minimumValue={config.min}
          maximumValue={config.max}
          step={config.step}
          value={localValue}
          onValueChange={handleValueChange}
          onSlidingComplete={handleSlidingComplete}
          minimumTrackTintColor={isDark ? colors.accent[500] : colors.primary[500]}
          maximumTrackTintColor={isDark ? 'rgba(255,255,255,0.15)' : colors.gray[200]}
          thumbTintColor={Platform.OS === 'android' 
            ? (isDark ? colors.accent[500] : colors.primary[500])
            : undefined
          }
          tapToSeek={true}
        />
      </View>

      {/* Range Labels */}
      <View style={styles.rangeContainer}>
        <Text style={[
          styles.rangeText,
          { color: isDark ? 'rgba(255,255,255,0.4)' : colors.gray[400] }
        ]}>
          {formattedMin}
        </Text>
        <Text style={[
          styles.rangeText,
          { color: isDark ? 'rgba(255,255,255,0.4)' : colors.gray[400] }
        ]}>
          {formattedMax}
        </Text>
      </View>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
  value: {
    fontSize: 17,
    fontWeight: '700',
  },
  sliderWrapper: {
    paddingVertical: 8,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  slider: {
    width: '100%',
    height: 44,
  },
  rangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  rangeText: {
    fontSize: 12,
  },
});

export default DealMakerSlider;
