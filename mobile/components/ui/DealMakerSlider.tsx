import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { runOnJS } from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
} from '@/constants/tokens';

export type SliderFormat =
  | 'currency'
  | 'currencyPerMonth'
  | 'currencyPerYear'
  | 'percentage'
  | 'years';

export interface SliderConfig {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  format: SliderFormat;
  sourceLabel?: string;
}

interface DealMakerSliderProps {
  config: SliderConfig;
  value: number;
  onChange: (value: number) => void;
  accentColor?: string;
}

export function formatSliderValue(value: number, format: SliderFormat): string {
  switch (format) {
    case 'currency':
      return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      });
    case 'currencyPerMonth':
      return `${value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}/mo`;
    case 'currencyPerYear':
      return `${value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}/yr`;
    case 'percentage':
      return `${(value * 100).toFixed(value < 0.1 ? 2 : 1)}%`;
    case 'years':
      return `${value} yr`;
    default:
      return String(value);
  }
}

const TRACK_H = 6;
const THUMB_SIZE = 24;
const TRACK_PADDING = THUMB_SIZE / 2;

export function DealMakerSlider({
  config,
  value,
  onChange,
  accentColor = colors.accent,
}: DealMakerSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const lastStepRef = useRef(value);

  const { min, max, step, format, label } = config;
  const range = max - min;
  const fillPct = range > 0 ? ((value - min) / range) * 100 : 0;

  function snapAndNotify(rawVal: number) {
    const clamped = Math.max(min, Math.min(max, rawVal));
    const snapped = Math.round(clamped / step) * step;
    const rounded = Number(snapped.toFixed(6));

    if (rounded !== lastStepRef.current) {
      lastStepRef.current = rounded;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onChange(rounded);
  }

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (trackWidth <= 0) return;
      const pct = Math.max(0, Math.min(1, e.x / trackWidth));
      const rawVal = min + pct * range;
      runOnJS(snapAndNotify)(rawVal);
    })
    .minDistance(0);

  const tap = Gesture.Tap().onEnd((e) => {
    if (trackWidth <= 0) return;
    const pct = Math.max(0, Math.min(1, e.x / trackWidth));
    const rawVal = min + pct * range;
    runOnJS(snapAndNotify)(rawVal);
  });

  const gesture = Gesture.Race(pan, tap);

  function startEditing() {
    let initial: string;
    if (format === 'percentage') {
      initial = (value * 100).toFixed(value < 0.1 ? 2 : 1);
    } else if (format === 'years') {
      initial = String(value);
    } else {
      initial = String(Math.round(value));
    }
    setInputText(initial);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function submitEdit() {
    const cleaned = inputText
      .replace(/[$,]/g, '')
      .replace(/\/mo$/i, '')
      .replace(/\/yr$/i, '')
      .replace(/\s*yr$/i, '')
      .replace(/%$/g, '')
      .trim();
    let num = parseFloat(cleaned);
    if (!isNaN(num)) {
      if (format === 'percentage') num /= 100;
      const clamped = Math.max(min, Math.min(max, num));
      const snapped = Math.round(clamped / step) * step;
      onChange(Number(snapped.toFixed(6)));
    }
    setIsEditing(false);
  }

  const formattedValue = formatSliderValue(value, format);
  const formattedMin = formatSliderValue(min, format);
  const formattedMax = formatSliderValue(max, format);

  return (
    <View style={styles.container}>
      {/* Label + value */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {isEditing ? (
          <View style={styles.editBox}>
            <TextInput
              ref={inputRef}
              style={styles.editInput}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={submitEdit}
              onBlur={submitEdit}
              keyboardType="decimal-pad"
              returnKeyType="done"
              selectionColor={accentColor}
            />
          </View>
        ) : (
          <Pressable onPress={startEditing}>
            <Text style={[styles.value, { color: accentColor }]}>
              {formattedValue}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Track */}
      <GestureDetector gesture={gesture}>
        <View
          style={styles.trackOuter}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        >
          <View style={styles.trackBg}>
            <View
              style={[
                styles.trackFill,
                { width: `${fillPct}%`, backgroundColor: accentColor },
              ]}
            />
          </View>
          {/* Thumb */}
          <View
            style={[
              styles.thumb,
              {
                left: `${fillPct}%`,
                backgroundColor: accentColor,
              },
            ]}
          />
        </View>
      </GestureDetector>

      {/* Min / Max */}
      <View style={styles.rangeRow}>
        <Text style={styles.rangeText}>{formattedMin}</Text>
        <Text style={styles.rangeText}>{formattedMax}</Text>
      </View>

      {/* Source */}
      {config.sourceLabel && (
        <Text style={styles.source}>{config.sourceLabel}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.heading,
  },
  value: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    fontVariant: ['tabular-nums'],
  },
  editBox: {
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  editInput: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: colors.accent,
    minWidth: 80,
    textAlign: 'right',
    padding: 0,
    fontVariant: ['tabular-nums'],
  },
  trackOuter: {
    height: THUMB_SIZE + 8,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBg: {
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  trackFill: {
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.white,
    top: (THUMB_SIZE + 8 - THUMB_SIZE) / 2,
    marginLeft: -THUMB_SIZE / 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
    }),
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rangeText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  source: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.muted,
    marginTop: 4,
  },
});
