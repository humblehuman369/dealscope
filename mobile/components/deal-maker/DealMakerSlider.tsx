/**
 * DealMakerSlider - Deal Maker Pro slider component
 * EXACT implementation from design files - no modifications
 * 
 * Design specs:
 * - Input label: 14px, font-weight 600, color #0A1628
 * - Input value: 16px, font-weight 700, color #0891B2
 * - Slider track: #E2E8F0, height 6px
 * - Slider fill: #0891B2
 * - Slider thumb: #0891B2 with 2px white border
 * - Range text: 11px, color #94A3B8
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';

import { DealMakerSliderProps, SliderFormat } from './types';

// Formatters
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

export function DealMakerSlider({
  config,
  value,
  onChange,
  onChangeComplete,
}: DealMakerSliderProps) {
  const [localValue, setLocalValue] = useState(value);

  // Update local value when prop changes
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleValueChange = useCallback((newValue: number) => {
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
    <View style={styles.inputRow}>
      {/* Label and Value */}
      <View style={styles.inputLabel}>
        <Text style={styles.inputLabelText}>{config.label}</Text>
        <Text style={styles.inputValue}>{formattedValue}</Text>
      </View>

      {/* Slider */}
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={config.min}
          maximumValue={config.max}
          step={config.step}
          value={localValue}
          onValueChange={handleValueChange}
          onSlidingComplete={handleSlidingComplete}
          minimumTrackTintColor="#0891B2"
          maximumTrackTintColor="#E2E8F0"
          thumbTintColor={Platform.OS === 'android' ? '#0891B2' : undefined}
          tapToSeek={true}
        />
      </View>

      {/* Range Labels */}
      <View style={styles.sliderRange}>
        <Text style={styles.rangeText}>{formattedMin}</Text>
        <Text style={styles.rangeText}>{formattedMax}</Text>
      </View>
    </View>
  );
}

// Styles - EXACT from design files
const styles = StyleSheet.create({
  inputRow: {
    marginTop: 16,
  },
  inputLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A1628',
  },
  inputValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0891B2',
    fontVariant: ['tabular-nums'],
  },
  sliderContainer: {
    height: 24,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 24,
  },
  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  rangeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
});

export default DealMakerSlider;
