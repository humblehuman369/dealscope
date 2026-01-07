/**
 * TimelineCard Component
 * Displays project timeline with phases
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { colors } from '@/theme/colors';

interface TimelinePhase {
  label: string;
  duration: string;
  icon: string;
  color: string;
  description?: string;
}

interface TimelineCardProps {
  title: string;
  phases: TimelinePhase[];
  totalDuration: string;
}

export const TimelineCard: React.FC<TimelineCardProps> = ({
  title,
  phases,
  totalDuration,
}) => {
  const { isDark } = useTheme();
  const theme = isDark ? colors.dark : colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <View style={[styles.totalBadge, { backgroundColor: `${colors.primary}15` }]}>
          <Text style={[styles.totalText, { color: colors.primary }]}>{totalDuration}</Text>
        </View>
      </View>

      <View style={styles.timeline}>
        {phases.map((phase, index) => (
          <View key={index} style={styles.phaseRow}>
            {/* Timeline line */}
            <View style={styles.timelineTrack}>
              <View style={[styles.phaseIcon, { backgroundColor: phase.color }]}>
                <Text style={styles.phaseIconText}>{phase.icon}</Text>
              </View>
              {index < phases.length - 1 && (
                <View style={[styles.connector, { backgroundColor: theme.border }]} />
              )}
            </View>

            {/* Phase content */}
            <View style={styles.phaseContent}>
              <View style={styles.phaseHeader}>
                <Text style={[styles.phaseLabel, { color: theme.text }]}>{phase.label}</Text>
                <Text style={[styles.phaseDuration, { color: phase.color }]}>{phase.duration}</Text>
              </View>
              {phase.description && (
                <Text style={[styles.phaseDescription, { color: theme.textSecondary }]}>
                  {phase.description}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  totalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  totalText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeline: {
    gap: 0,
  },
  phaseRow: {
    flexDirection: 'row',
    minHeight: 50,
  },
  timelineTrack: {
    width: 40,
    alignItems: 'center',
  },
  phaseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseIconText: {
    fontSize: 14,
  },
  connector: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  phaseContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phaseLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  phaseDuration: {
    fontSize: 12,
    fontWeight: '700',
  },
  phaseDescription: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
});

export default TimelineCard;

