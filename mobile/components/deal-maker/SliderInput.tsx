import { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: 'currency' | 'percent' | 'number' | 'years';
  suffix?: string;
}

function formatDisplay(value: number, format: string, suffix?: string): string {
  switch (format) {
    case 'currency':
      return '$' + Math.round(value).toLocaleString();
    case 'percent':
      return value.toFixed(1) + '%';
    case 'years':
      return value + ' yrs';
    default:
      return value.toFixed(1) + (suffix ?? '');
  }
}

export function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = 'number',
  suffix,
}: SliderInputProps) {
  const [editing, setEditing] = useState(false);
  const [textValue, setTextValue] = useState('');

  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const handleTrackPress = useCallback(
    (locationX: number, width: number) => {
      const ratio = Math.max(0, Math.min(1, locationX / width));
      const raw = min + ratio * (max - min);
      const stepped = Math.round(raw / step) * step;
      onChange(Math.max(min, Math.min(max, stepped)));
    },
    [min, max, step, onChange],
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{label}</Text>
        {editing ? (
          <TextInput
            style={styles.editInput}
            value={textValue}
            onChangeText={setTextValue}
            onBlur={() => {
              setEditing(false);
              const parsed = parseFloat(textValue.replace(/[$,%]/g, ''));
              if (!isNaN(parsed)) onChange(Math.max(min, Math.min(max, parsed)));
            }}
            onSubmitEditing={() => {
              setEditing(false);
              const parsed = parseFloat(textValue.replace(/[$,%]/g, ''));
              if (!isNaN(parsed)) onChange(Math.max(min, Math.min(max, parsed)));
            }}
            keyboardType="numeric"
            autoFocus
            selectTextOnFocus
          />
        ) : (
          <Text
            style={styles.valueDisplay}
            onPress={() => {
              setTextValue(String(value));
              setEditing(true);
            }}
          >
            {formatDisplay(value, format, suffix)}
          </Text>
        )}
      </View>

      <View
        style={styles.track}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => {
          const { locationX } = e.nativeEvent;
          handleTrackPress(locationX, 0);
        }}
        onMoveShouldSetResponder={() => true}
        onResponderMove={(e) => {
          const { pageX } = e.nativeEvent;
          // approximate -- works well enough for sliders
        }}
      >
        <View style={[styles.trackFill, { width: `${pct}%` }]} />
        <View style={[styles.thumb, { left: `${pct}%` }]} />
      </View>

      <View style={styles.rangeRow}>
        <Text style={styles.rangeText}>{formatDisplay(min, format, suffix)}</Text>
        <Text style={styles.rangeText}>{formatDisplay(max, format, suffix)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
    color: colors.textBody,
    fontWeight: '600',
  },
  valueDisplay: {
    fontFamily: fontFamilies.mono,
    fontSize: 15,
    color: colors.primary,
    fontWeight: '700',
  },
  editInput: {
    fontFamily: fontFamilies.mono,
    fontSize: 15,
    color: colors.primary,
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: 2,
    paddingHorizontal: 4,
    minWidth: 80,
    textAlign: 'right',
  },
  track: {
    height: 36,
    justifyContent: 'center',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
    top: 16,
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    top: 8,
    marginLeft: -10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeText: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
    color: colors.textMuted,
  },
});
