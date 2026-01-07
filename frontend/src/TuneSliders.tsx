// ============================================
// TuneSliders Component
// ============================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, useHaptics, useSliderImpact } from '../hooks/usePropertyAnalytics';
import { colors, typography, spacing, radius, sliderConfigs } from '../constants/theme';
import { AnalyticsInputs } from '../types/analytics';
import { formatCurrency, formatPercent, formatImpact } from '../utils/formatters';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================
// Slider Group Configuration
// ============================================

interface SliderConfig {
  id: keyof AnalyticsInputs;
  label: string;
  getMin: (inputs: AnalyticsInputs) => number;
  getMax: (inputs: AnalyticsInputs) => number;
  step: number;
  format: 'currency' | 'percentage' | 'decimal' | 'years';
}

interface SliderGroupConfig {
  id: string;
  title: string;
  icon: string;
  stepNumber: number;
  sliders: SliderConfig[];
}

const SLIDER_GROUPS: SliderGroupConfig[] = [
  {
    id: 'purchase',
    title: 'Purchase Terms',
    icon: '🏷️',
    stepNumber: 1,
    sliders: [
      {
        id: 'purchasePrice',
        label: 'Purchase Price',
        getMin: (inputs) => inputs.purchasePrice * 0.8,
        getMax: (inputs) => inputs.purchasePrice * 1.1,
        step: 1000,
        format: 'currency',
      },
      {
        id: 'downPaymentPercent',
        label: 'Down Payment',
        getMin: () => 5,
        getMax: () => 50,
        step: 5,
        format: 'percentage',
      },
      {
        id: 'closingCostsPercent',
        label: 'Closing Costs',
        getMin: () => 1,
        getMax: () => 6,
        step: 0.5,
        format: 'percentage',
      },
    ],
  },
  {
    id: 'financing',
    title: 'Financing',
    icon: '🏦',
    stepNumber: 2,
    sliders: [
      {
        id: 'interestRate',
        label: 'Interest Rate',
        getMin: () => 3,
        getMax: () => 12,
        step: 0.125,
        format: 'percentage',
      },
      {
        id: 'loanTermYears',
        label: 'Loan Term',
        getMin: () => 15,
        getMax: () => 30,
        step: 5,
        format: 'years',
      },
    ],
  },
  {
    id: 'income',
    title: 'Property Income',
    icon: '💰',
    stepNumber: 3,
    sliders: [
      {
        id: 'monthlyRent',
        label: 'Monthly Rent',
        getMin: (inputs) => inputs.monthlyRent * 0.8,
        getMax: (inputs) => inputs.monthlyRent * 1.2,
        step: 25,
        format: 'currency',
      },
      {
        id: 'otherIncome',
        label: 'Other Income',
        getMin: () => 0,
        getMax: () => 500,
        step: 25,
        format: 'currency',
      },
    ],
  },
  {
    id: 'expenses',
    title: 'Operating Expenses',
    icon: '📋',
    stepNumber: 4,
    sliders: [
      {
        id: 'vacancyRate',
        label: 'Vacancy Rate',
        getMin: () => 0,
        getMax: () => 20,
        step: 1,
        format: 'percentage',
      },
      {
        id: 'maintenanceRate',
        label: 'Maintenance',
        getMin: () => 0,
        getMax: () => 15,
        step: 1,
        format: 'percentage',
      },
      {
        id: 'managementRate',
        label: 'Property Management',
        getMin: () => 0,
        getMax: () => 15,
        step: 1,
        format: 'percentage',
      },
    ],
  },
];

// ============================================
// Single Slider Component
// ============================================

interface SingleSliderProps {
  config: SliderConfig;
  value: number;
  baseValue: number;
  inputs: AnalyticsInputs;
  baseInputs: AnalyticsInputs;
  onChange: (value: number) => void;
}

const SingleSlider: React.FC<SingleSliderProps> = ({
  config,
  value,
  baseValue,
  inputs,
  baseInputs,
  onChange,
}) => {
  const { isDark, colors: themeColors } = useTheme();
  const haptics = useHaptics();
  const { currentImpact, isPositive, isNegative } = useSliderImpact(baseInputs, inputs, config.id);

  const min = config.getMin(baseInputs);
  const max = config.getMax(baseInputs);

  const formatValue = (val: number): string => {
    switch (config.format) {
      case 'currency':
        return formatCurrency(val, { compact: val >= 10000 });
      case 'percentage':
        return formatPercent(val);
      case 'years':
        return `${val} yrs`;
      default:
        return String(val);
    }
  };

  const handleChange = (newValue: number) => {
    haptics.selection();
    onChange(newValue);
  };

  const impactColor = isPositive
    ? colors.success
    : isNegative
    ? colors.error
    : themeColors.textMuted;

  return (
    <View style={styles.sliderContainer}>
      {/* Label Row */}
      <View style={styles.sliderHeader}>
        <View>
          <Text style={[styles.sliderLabel, { color: themeColors.text }]}>
            {config.label}
          </Text>
          {baseValue !== value && (
            <Text style={[styles.sliderBase, { color: themeColors.textMuted }]}>
              Base: {formatValue(baseValue)}
            </Text>
          )}
        </View>
        <View style={styles.sliderValueWrap}>
          <Text style={[styles.sliderValue, { color: colors.primary }]}>
            {formatValue(value)}
          </Text>
          {currentImpact !== 0 && (
            <Text style={[styles.sliderImpact, { color: impactColor }]}>
              {formatImpact(currentImpact)}
            </Text>
          )}
        </View>
      </View>

      {/* Slider Track */}
      <View style={styles.sliderTrackContainer}>
        <Slider
          style={styles.slider}
          value={value}
          minimumValue={min}
          maximumValue={max}
          step={config.step}
          onValueChange={handleChange}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(7,23,46,0.1)'}
          thumbTintColor={colors.primary}
        />
      </View>

      {/* Min/Max Labels */}
      <View style={styles.sliderLabels}>
        <Text style={[styles.sliderMinMax, { color: themeColors.textMuted }]}>
          {formatValue(min)}
        </Text>
        <Text style={[styles.sliderMinMax, { color: themeColors.textMuted }]}>
          {formatValue(max)}
        </Text>
      </View>
    </View>
  );
};

// ============================================
// Slider Group Component
// ============================================

interface SliderGroupProps {
  group: SliderGroupConfig;
  inputs: AnalyticsInputs;
  baseInputs: AnalyticsInputs;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (updates: Partial<AnalyticsInputs>) => void;
}

const SliderGroup: React.FC<SliderGroupProps> = ({
  group,
  inputs,
  baseInputs,
  isExpanded,
  onToggle,
  onChange,
}) => {
  const { isDark, colors: themeColors } = useTheme();
  const haptics = useHaptics();

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    haptics.light();
    onToggle();
  };

  return (
    <View
      style={[
        styles.groupContainer,
        {
          backgroundColor: isDark
            ? colors.dark.surface
            : colors.light.surface,
          borderColor: isDark ? colors.dark.border : colors.light.border,
        },
      ]}
    >
      {/* Header */}
      <TouchableOpacity
        style={styles.groupHeader}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <View style={styles.groupTitleWrap}>
          <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
            <Text style={styles.stepNumberText}>{group.stepNumber}</Text>
          </View>
          <Text style={[styles.groupTitle, { color: themeColors.text }]}>
            {group.title}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: themeColors.textMuted }]}>
          {isExpanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* Content */}
      {isExpanded && (
        <View style={styles.groupContent}>
          {group.sliders.map((sliderConfig) => (
            <SingleSlider
              key={sliderConfig.id}
              config={sliderConfig}
              value={inputs[sliderConfig.id] as number}
              baseValue={baseInputs[sliderConfig.id] as number}
              inputs={inputs}
              baseInputs={baseInputs}
              onChange={(value) => onChange({ [sliderConfig.id]: value })}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// ============================================
// Main TuneSliders Component
// ============================================

interface TuneSlidersProps {
  inputs: AnalyticsInputs;
  baseInputs: AnalyticsInputs;
  onChange: (updates: Partial<AnalyticsInputs>) => void;
  onReset: () => void;
  initialExpandedGroup?: string;
}

export const TuneSliders: React.FC<TuneSlidersProps> = ({
  inputs,
  baseInputs,
  onChange,
  onReset,
  initialExpandedGroup = 'purchase',
}) => {
  const { isDark, colors: themeColors } = useTheme();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([initialExpandedGroup]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  }, []);

  // Check if any values have changed from base
  const hasChanges = SLIDER_GROUPS.some((group) =>
    group.sliders.some(
      (slider) => inputs[slider.id] !== baseInputs[slider.id]
    )
  );

  return (
    <View style={styles.container}>
      {/* Reset Button */}
      {hasChanges && (
        <TouchableOpacity
          style={styles.resetButton}
          onPress={onReset}
          activeOpacity={0.7}
        >
          <Text style={[styles.resetText, { color: colors.primary }]}>
            ↺ Reset to Base
          </Text>
        </TouchableOpacity>
      )}

      {/* Slider Groups */}
      {SLIDER_GROUPS.map((group) => (
        <SliderGroup
          key={group.id}
          group={group}
          inputs={inputs}
          baseInputs={baseInputs}
          isExpanded={expandedGroups.includes(group.id)}
          onToggle={() => toggleGroup(group.id)}
          onChange={onChange}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  resetButton: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  resetText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  // Group styles
  groupContainer: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  groupTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: colors.dark.textInverse,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  groupTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  chevron: {
    fontSize: typography.sizes.caption,
  },
  groupContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  // Slider styles
  sliderContainer: {
    gap: spacing.xs,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sliderLabel: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
  },
  sliderBase: {
    fontSize: typography.sizes.micro,
    marginTop: spacing.xxs,
  },
  sliderValueWrap: {
    alignItems: 'flex-end',
  },
  sliderValue: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  sliderImpact: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xxs,
  },
  sliderTrackContainer: {
    marginVertical: spacing.xs,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderMinMax: {
    fontSize: typography.sizes.micro,
  },
});

export default TuneSliders;
