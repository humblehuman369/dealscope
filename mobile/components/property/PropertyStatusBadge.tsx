import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors } from '../../theme/colors';
import type { PropertyStatus } from '../../types';
import { PROPERTY_STATUS_LABELS } from '../../types';

interface PropertyStatusBadgeProps {
  status: PropertyStatus;
  size?: 'small' | 'medium';
}

const STATUS_COLORS: Record<PropertyStatus, { bg: string; text: string }> = {
  watching: { bg: colors.info.light, text: colors.info.main },
  analyzing: { bg: colors.warning.light, text: colors.warning.main },
  contacted: { bg: '#ddd6fe', text: '#7c3aed' }, // purple
  under_contract: { bg: '#bfdbfe', text: '#2563eb' }, // blue
  owned: { bg: colors.profit.light, text: colors.profit.main },
  passed: { bg: colors.gray[200], text: colors.gray[600] },
  archived: { bg: colors.gray[200], text: colors.gray[500] },
};

export default function PropertyStatusBadge({
  status,
  size = 'small',
}: PropertyStatusBadgeProps) {
  const statusColors = STATUS_COLORS[status] || STATUS_COLORS.watching;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: statusColors.bg },
        size === 'medium' && styles.containerMedium,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: statusColors.text },
          size === 'medium' && styles.textMedium,
        ]}
      >
        {PROPERTY_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  containerMedium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  textMedium: {
    fontSize: 12,
  },
});
