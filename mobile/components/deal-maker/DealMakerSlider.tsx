/**
 * DealMakerSlider - Deal Maker Pro slider component
 * Features: Teal accent colors, exact design spec typography, haptic feedback
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';

import { DealMakerSliderProps, SliderFormat, DEAL_MAKER_PRO_COLORS } from './types';

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
        <Text style={styles.label}>
          {config.label}
        </Text>
        <Text style={styles.value}>
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
          minimumTrackTintColor={DEAL_MAKER_PRO_COLORS.sliderFill}
          maximumTrackTintColor={DEAL_MAKER_PRO_COLORS.sliderTrack}
          thumbTintColor={Platform.OS === 'android' 
            ? DEAL_MAKER_PRO_COLORS.sliderThumb
            : undefined
          }
          tapToSeek={true}
        />
      </View>

      {/* Range Labels */}
      <View style={styles.rangeContainer}>
        <Text style={styles.rangeText}>
          {formattedMin}
        </Text>
        <Text style={styles.rangeText}>
          {formattedMax}
        </Text>
      </View>
    </View>
  );
}

// =============================================================================
// STYLES - Exact match to design specification
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
    fontSize: 14,
    fontWeight: '600',
    color: DEAL_MAKER_PRO_COLORS.inputLabel,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: DEAL_MAKER_PRO_COLORS.inputValue,
    fontVariant: ['tabular-nums'],
  },
  sliderWrapper: {
    paddingVertical: 4,
    marginHorizontal: -4,
    paddingHorizontal: 4,
  },
  slider: {
    width: '100%',
    height: 24,
  },
  rangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  rangeText: {
    fontSize: 11,
    color: DEAL_MAKER_PRO_COLORS.rangeText,
  },
});

export default DealMakerSlider;
