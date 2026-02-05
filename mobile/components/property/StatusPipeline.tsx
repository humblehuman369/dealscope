import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import type { PropertyStatus } from '../../types';
import { PROPERTY_STATUS_OPTIONS, PROPERTY_STATUS_LABELS } from '../../types';

interface StatusPipelineProps {
  currentStatus: PropertyStatus;
  onStatusChange: (status: PropertyStatus) => void;
  disabled?: boolean;
}

const STATUS_ICONS: Record<PropertyStatus, string> = {
  watching: 'eye-outline',
  analyzing: 'analytics-outline',
  contacted: 'call-outline',
  under_contract: 'document-text-outline',
  owned: 'home-outline',
  passed: 'close-circle-outline',
  archived: 'archive-outline',
};

const STATUS_COLORS: Record<PropertyStatus, string> = {
  watching: colors.info.main,
  analyzing: colors.warning.main,
  contacted: '#7c3aed', // purple
  under_contract: '#2563eb', // blue
  owned: colors.profit.main,
  passed: colors.gray[500],
  archived: colors.gray[400],
};

export default function StatusPipeline({
  currentStatus,
  onStatusChange,
  disabled = false,
}: StatusPipelineProps) {
  const { theme, isDark } = useTheme();

  const handleStatusSelect = (status: PropertyStatus) => {
    if (!disabled && status !== currentStatus) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onStatusChange(status);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>Status Pipeline</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pipelineContent}
      >
        {PROPERTY_STATUS_OPTIONS.map((status, index) => {
          const isActive = status === currentStatus;
          const isPast = PROPERTY_STATUS_OPTIONS.indexOf(currentStatus) > index;
          const statusColor = STATUS_COLORS[status];

          return (
            <View key={status} style={styles.stageWrapper}>
              <TouchableOpacity
                style={[
                  styles.stage,
                  {
                    backgroundColor: isActive
                      ? statusColor
                      : isPast
                      ? isDark
                        ? colors.navy[700]
                        : colors.gray[100]
                      : 'transparent',
                    borderColor: isActive || isPast ? statusColor : theme.border,
                  },
                ]}
                onPress={() => handleStatusSelect(status)}
                disabled={disabled}
              >
                <Ionicons
                  name={STATUS_ICONS[status] as any}
                  size={20}
                  color={isActive ? '#fff' : isPast ? statusColor : theme.textMuted}
                />
              </TouchableOpacity>
              <Text
                style={[
                  styles.stageLabel,
                  {
                    color: isActive ? statusColor : theme.textMuted,
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}
              >
                {PROPERTY_STATUS_LABELS[status]}
              </Text>

              {/* Connector line */}
              {index < PROPERTY_STATUS_OPTIONS.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    {
                      backgroundColor: isPast ? statusColor : theme.border,
                    },
                  ]}
                />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
  },
  pipelineContent: {
    paddingRight: 16,
  },
  stageWrapper: {
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  stage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageLabel: {
    fontSize: 10,
    marginTop: 6,
    maxWidth: 60,
    textAlign: 'center',
  },
  connector: {
    position: 'absolute',
    top: 22,
    left: 44,
    width: 12,
    height: 2,
  },
});
