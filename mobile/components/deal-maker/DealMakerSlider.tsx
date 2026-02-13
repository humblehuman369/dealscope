/**
 * DealMakerSlider - Deal Maker IQ slider component
 * EXACT implementation from design files
 * 
 * Design specs:
 * - Input label: 14px, font-weight 600, color #0A1628
 * - Input value: 16px, font-weight 700, color #0891B2 (tappable to edit)
 * - Slider track: #E2E8F0, height 6px
 * - Slider fill: #0891B2
 * - Slider thumb: #0891B2 with 2px white border
 * - Range text: 11px, color #94A3B8
 */

import React, { useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Platform, 
  TextInput, 
  TouchableOpacity,
  Keyboard,
} from 'react-native';
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

// Parse input string back to number based on format
function parseInputValue(input: string, format: SliderFormat): number | null {
  // Remove currency symbols, commas, %, /mo, /yr, yr
  const cleaned = input
    .replace(/[$,]/g, '')
    .replace(/\/mo$/i, '')
    .replace(/\/yr$/i, '')
    .replace(/\s*yr$/i, '')
    .replace(/%$/g, '')
    .trim();
  
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  
  // Convert percentage back to decimal
  if (format === 'percentage') {
    return num / 100;
  }
  
  return num;
}

export function DealMakerSlider({
  config,
  value,
  onChange,
  onChangeComplete,
  defaultValue,
  onReset,
  showReset,
}: DealMakerSliderProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const hasSubmittedRef = useRef(false);

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

  const handleValuePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Reset submission flag when starting to edit
    hasSubmittedRef.current = false;
    // Set initial input text based on format
    let initialText = '';
    if (config.format === 'percentage') {
      initialText = (localValue * 100).toFixed(localValue < 0.1 ? 2 : 1);
    } else if (config.format === 'years') {
      initialText = String(localValue);
    } else {
      initialText = String(Math.round(localValue));
    }
    setInputText(initialText);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [localValue, config.format]);

  const handleInputSubmit = useCallback(() => {
    // Prevent double submission (onSubmitEditing + onBlur both fire)
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    const parsed = parseInputValue(inputText, config.format);
    if (parsed !== null) {
      // Clamp to min/max
      const clamped = Math.max(config.min, Math.min(config.max, parsed));
      // Round to step
      const rounded = Math.round(clamped / config.step) * config.step;
      setLocalValue(rounded);
      onChange(rounded);
      onChangeComplete?.(rounded);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsEditing(false);
    Keyboard.dismiss();
  }, [inputText, config, onChange, onChangeComplete]);

  const handleInputBlur = useCallback(() => {
    // Only submit if not already submitted via onSubmitEditing
    if (!hasSubmittedRef.current) {
      handleInputSubmit();
    }
  }, [handleInputSubmit]);

  const formattedValue = formatSliderValue(localValue, config.format);
  const formattedMin = formatSliderValue(config.min, config.format);
  const formattedMax = formatSliderValue(config.max, config.format);

  // Determine keyboard type based on format
  const keyboardType = config.format === 'percentage' ? 'decimal-pad' : 'numeric';

  // Check if data is stale
  const isStale = (() => {
    if (!config.lastUpdated) return false;
    const thresholdDays = config.staleThresholdDays ?? 7;
    const daysSinceUpdate = Math.floor((Date.now() - config.lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceUpdate > thresholdDays;
  })();

  const getStaleMessage = () => {
    if (!config.lastUpdated) return '';
    const daysSinceUpdate = Math.floor((Date.now() - config.lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
    return `Data is ${daysSinceUpdate} days old`;
  };

  // Check if value differs from default (for showing reset button)
  const canReset = showReset && defaultValue !== undefined && Math.abs(value - defaultValue) > 0.0001;

  const handleReset = useCallback(() => {
    if (onReset) {
      onReset();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [onReset]);

  return (
    <View style={styles.inputRow}>
      {/* Label and Value */}
      <View style={styles.inputLabel}>
        <Text style={styles.inputLabelText}>{config.label}</Text>
        
        {isEditing ? (
          <View style={styles.inputContainer}>
            {config.format === 'currency' || config.format === 'currencyPerMonth' || config.format === 'currencyPerYear' ? (
              <Text style={styles.inputPrefix}>$</Text>
            ) : null}
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleInputSubmit}
              onBlur={handleInputBlur}
              keyboardType={keyboardType}
              returnKeyType="done"
              selectTextOnFocus
              autoFocus
              accessibilityLabel={`Edit ${config.label}`}
            />
            {config.format === 'percentage' && (
              <Text style={styles.inputSuffix}>%</Text>
            )}
            {config.format === 'currencyPerMonth' && (
              <Text style={styles.inputSuffix}>/mo</Text>
            )}
            {config.format === 'currencyPerYear' && (
              <Text style={styles.inputSuffix}>/yr</Text>
            )}
            {config.format === 'years' && (
              <Text style={styles.inputSuffix}>yr</Text>
            )}
          </View>
        ) : (
          <TouchableOpacity 
            onPress={handleValuePress} 
            activeOpacity={0.6}
            accessibilityRole="button"
            accessibilityLabel={`${config.label}, ${formattedValue}. Double tap to edit`}
          >
            <Text style={styles.inputValue}>{formattedValue}</Text>
          </TouchableOpacity>
        )}
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
          accessibilityLabel={config.label}
          accessibilityValue={{ min: config.min, max: config.max, now: localValue, text: formattedValue }}
          accessibilityRole="adjustable"
        />
      </View>

      {/* Range Labels */}
      <View style={styles.sliderRange}>
        <Text style={styles.rangeText}>{formattedMin}</Text>
        <Text style={styles.rangeText}>{formattedMax}</Text>
      </View>

      {/* Source Attribution */}
      {config.sourceLabel && (
        <View style={styles.sourceRow}>
          {config.isEstimate ? (
            <View style={[styles.sourceIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Text style={{ fontSize: 8, color: '#F59E0B' }}>!</Text>
            </View>
          ) : (
            <View style={[styles.sourceIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Text style={{ fontSize: 8, color: '#10B981' }}>✓</Text>
            </View>
          )}
          <Text style={styles.sourceText}>{config.sourceLabel}</Text>
        </View>
      )}

      {/* Stale Data Warning */}
      {isStale && (
        <View style={styles.staleWarning}>
          <View style={styles.staleIconContainer}>
            <Text style={{ fontSize: 10, color: '#F59E0B' }}>⚠</Text>
          </View>
          <Text style={styles.staleText}>
            {getStaleMessage()} — rate may have changed
          </Text>
        </View>
      )}

      {/* Reset Button */}
      {canReset && (
        <TouchableOpacity 
          onPress={handleReset} 
          style={styles.resetButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Reset to default value"
        >
          <Text style={styles.resetIcon}>↺</Text>
          <Text style={styles.resetText}>Reset to IQ Default</Text>
        </TouchableOpacity>
      )}
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#0891B2',
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0891B2',
    marginRight: 2,
  },
  inputSuffix: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 2,
  },
  textInput: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0891B2',
    minWidth: 60,
    textAlign: 'right',
    padding: 0,
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
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  sourceIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  staleWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  staleIconContainer: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staleText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#D97706',
    flex: 1,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(8, 145, 178, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(8, 145, 178, 0.3)',
  },
  resetIcon: {
    fontSize: 12,
    color: '#0891B2',
  },
  resetText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#0891B2',
  },
});

export default DealMakerSlider;
