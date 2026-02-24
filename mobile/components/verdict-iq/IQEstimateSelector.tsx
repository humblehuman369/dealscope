/**
 * IQEstimateSelector — multi-source data source selector for mobile.
 *
 * Mirrors frontend/src/components/iq-verdict/IQEstimateSelector.tsx.
 * Lets users choose between IQ Estimate, Zillow, RentCast, and Redfin
 * for both property value and monthly rent. Selection persists in
 * AsyncStorage (mobile equivalent of sessionStorage).
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';

export type DataSourceId = 'iq' | 'zillow' | 'rentcast' | 'redfin';

export interface IQEstimateSources {
  value: {
    iq: number | null;
    zillow: number | null;
    rentcast: number | null;
    redfin: number | null;
  };
  rent: {
    iq: number | null;
    zillow: number | null;
    rentcast: number | null;
    redfin: number | null;
  };
}

export interface IQEstimateSelectorProps {
  sources: IQEstimateSources;
  onSourceChange?: (
    type: 'value' | 'rent',
    sourceId: DataSourceId,
    value: number | null,
  ) => void;
  storageKey?: string;
}

const SOURCE_META: Record<DataSourceId, { label: string; color: string }> = {
  iq: { label: 'IQ Estimate', color: colors.accent[500] },
  zillow: { label: 'Zillow', color: '#4A90D9' },
  rentcast: { label: 'RentCast', color: '#F59E0B' },
  redfin: { label: 'Redfin', color: '#A02B2D' },
};

const ALL_SOURCES: DataSourceId[] = ['iq', 'zillow', 'rentcast', 'redfin'];

const fmt = (v: number | null): string | null => {
  if (v == null) return null;
  return `$${Math.round(v).toLocaleString()}`;
};

function resolveDefaults(
  sources: IQEstimateSources,
  stored: { value: DataSourceId; rent: DataSourceId },
): { value: DataSourceId; rent: DataSourceId } {
  const resolve = (
    group: Record<DataSourceId, number | null>,
    sel: DataSourceId,
  ): DataSourceId => {
    if (group.iq != null) return 'iq';
    if (group[sel] != null) return sel;
    if (group.zillow != null) return 'zillow';
    if (group.rentcast != null) return 'rentcast';
    if (group.redfin != null) return 'redfin';
    return 'iq';
  };
  return {
    value: resolve(sources.value, stored.value),
    rent: resolve(sources.rent, stored.rent),
  };
}

async function getStoredSelections(
  key: string,
): Promise<{ value: DataSourceId; rent: DataSourceId }> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { value: parsed.value || 'iq', rent: parsed.rent || 'iq' };
    }
  } catch { /* ignore */ }
  return { value: 'iq', rent: 'iq' };
}

function persistSelections(
  key: string,
  value: DataSourceId,
  rent: DataSourceId,
) {
  AsyncStorage.setItem(key, JSON.stringify({ value, rent })).catch(() => {});
}

function SourceRow({
  sourceId,
  sourceValue,
  isSelected,
  onSelect,
  isDark,
}: {
  sourceId: DataSourceId;
  sourceValue: number | null;
  isSelected: boolean;
  onSelect: () => void;
  isDark: boolean;
}) {
  const meta = SOURCE_META[sourceId];
  const available = sourceValue != null;
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#64748b' : '#94a3b8';

  return (
    <TouchableOpacity
      style={[
        styles.row,
        isSelected && { backgroundColor: 'rgba(6,182,212,0.06)', borderColor: 'rgba(6,182,212,0.2)' },
      ]}
      onPress={available ? onSelect : undefined}
      activeOpacity={available ? 0.7 : 1}
      disabled={!available}
    >
      {/* Radio indicator */}
      <View
        style={[
          styles.radio,
          {
            borderColor: isSelected
              ? meta.color
              : isDark ? '#334155' : '#cbd5e1',
          },
        ]}
      >
        {isSelected && (
          <View
            style={[styles.radioDot, { backgroundColor: meta.color }]}
          />
        )}
      </View>

      <Text
        style={[
          styles.sourceLabel,
          {
            color: isSelected ? textColor : mutedColor,
            opacity: available ? 1 : 0.45,
          },
        ]}
      >
        {meta.label}
      </Text>

      <Text
        style={[
          styles.sourceValue,
          {
            color: available
              ? isSelected ? meta.color : (isDark ? '#cbd5e1' : '#475569')
              : mutedColor,
            opacity: available ? 1 : 0.45,
          },
        ]}
      >
        {available ? fmt(sourceValue) : 'Unavailable'}
      </Text>
    </TouchableOpacity>
  );
}

export function IQEstimateSelector({
  sources,
  onSourceChange,
  storageKey = 'iq_source_selection',
}: IQEstimateSelectorProps) {
  const { isDark } = useTheme();
  const [selections, setSelections] = useState<{
    value: DataSourceId;
    rent: DataSourceId;
  }>({ value: 'iq', rent: 'iq' });

  // Initialize from AsyncStorage on mount
  useEffect(() => {
    getStoredSelections(storageKey).then((stored) => {
      const resolved = resolveDefaults(sources, stored);
      setSelections(resolved);
      persistSelections(storageKey, resolved.value, resolved.rent);
    });
  }, [sources, storageKey]);

  const handleSelect = useCallback(
    (type: 'value' | 'rent', sourceId: DataSourceId) => {
      const sourceGroup = sources[type] as Record<string, number | null>;
      const newValue = sourceGroup[sourceId] ?? null;
      setSelections((prev) => {
        const next = { ...prev, [type]: sourceId };
        persistSelections(storageKey, next.value, next.rent);
        return next;
      });
      onSourceChange?.(type, sourceId, newValue);
    },
    [sources, storageKey, onSourceChange],
  );

  const cardBg = isDark ? 'rgba(30,41,59,0.5)' : 'rgba(248,250,252,0.8)';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const headerColor = colors.accent[500];
  const labelColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <View
      style={[styles.container, { backgroundColor: cardBg, borderColor }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="bar-chart-outline" size={14} color={headerColor} />
        <Text style={[styles.headerText, { color: headerColor }]}>
          DATA SOURCES
        </Text>
      </View>

      <View style={styles.columnsRow}>
        {/* Property Value */}
        <View style={styles.column}>
          <Text style={[styles.columnLabel, { color: labelColor }]}>
            PROPERTY VALUE
          </Text>
          {ALL_SOURCES.map((id) => (
            <SourceRow
              key={`value-${id}`}
              sourceId={id}
              sourceValue={sources.value[id]}
              isSelected={selections.value === id}
              onSelect={() => handleSelect('value', id)}
              isDark={isDark}
            />
          ))}
        </View>

        {/* Monthly Rent */}
        <View style={styles.column}>
          <Text style={[styles.columnLabel, { color: labelColor }]}>
            MONTHLY RENT
          </Text>
          {ALL_SOURCES.map((id) => (
            <SourceRow
              key={`rent-${id}`}
              sourceId={id}
              sourceValue={sources.rent[id]}
              isSelected={selections.rent === id}
              onSelect={() => handleSelect('rent', id)}
              isDark={isDark}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * Hook to read the current IQ source selection.
 * Returns the selected source IDs and resolved values.
 */
export function useIQSourceSelection(
  sources: IQEstimateSources,
  storageKey = 'iq_source_selection',
): {
  valueSource: DataSourceId;
  rentSource: DataSourceId;
  selectedValue: number | null;
  selectedRent: number | null;
} {
  const [stored, setStored] = useState<{
    value: DataSourceId;
    rent: DataSourceId;
  }>({ value: 'iq', rent: 'iq' });

  useEffect(() => {
    getStoredSelections(storageKey).then(setStored);
  }, [storageKey]);

  return {
    valueSource: stored.value,
    rentSource: stored.rent,
    selectedValue: sources.value[stored.value],
    selectedRent: sources.rent[stored.rent],
  };
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  columnsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  column: { flex: 1 },
  columnLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 2,
  },
  radio: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sourceLabel: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  sourceValue: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
