/**
 * Performance Benchmarks Components - Decision-Grade UI
 * At-a-Glance + National Average comparison
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { decisionGrade } from '../../theme/colors';

// =============================================================================
// AT-A-GLANCE COMPONENT
// =============================================================================

export interface GlanceMetric {
  label: string;
  value: number;
  color: 'teal' | 'amber' | 'negative';
}

interface AtAGlanceProps {
  metrics: GlanceMetric[];
  compositeScore: number;
  isOpen?: boolean;
  onToggle?: () => void;
}

const getGlanceColor = (color: 'teal' | 'amber' | 'negative'): string => {
  switch (color) {
    case 'teal': return decisionGrade.pacificTeal;
    case 'amber': return decisionGrade.caution;
    case 'negative': return decisionGrade.negative;
  }
};

export function AtAGlance({
  metrics,
  compositeScore,
  isOpen = true,
  onToggle,
}: AtAGlanceProps) {
  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle?.();
  };

  return (
    <View style={glanceStyles.container}>
      {/* Header */}
      <TouchableOpacity style={glanceStyles.header} onPress={handleToggle}>
        <View style={glanceStyles.iconContainer}>
          <View style={glanceStyles.iconGrid}>
            {[...Array(9)].map((_, i) => (
              <View key={i} style={glanceStyles.iconDot} />
            ))}
          </View>
        </View>
        <View style={glanceStyles.titleGroup}>
          <Text style={glanceStyles.title}>At-a-Glance</Text>
          <Text style={glanceStyles.subtitle}>Performance breakdown</Text>
        </View>
        <Text style={glanceStyles.toggle}>{isOpen ? '∧' : '∨'}</Text>
      </TouchableOpacity>

      {isOpen && (
        <>
          {/* Metrics */}
          {metrics.map((metric, index) => {
            const metricColor = getGlanceColor(metric.color);
            return (
              <View key={index} style={glanceStyles.row}>
                <Text style={glanceStyles.label}>{metric.label}</Text>
                <View style={glanceStyles.bar}>
                  <View
                    style={[
                      glanceStyles.fill,
                      { width: `${metric.value}%`, backgroundColor: metricColor },
                    ]}
                  />
                </View>
                <Text style={glanceStyles.value}>{metric.value}%</Text>
              </View>
            );
          })}

          {/* Composite */}
          <View style={glanceStyles.composite}>
            <Text style={glanceStyles.compositeText}>
              <Text style={glanceStyles.compositeLabel}>Composite: </Text>
              <Text style={glanceStyles.compositeValue}>{compositeScore}%</Text>
              <Text> score across returns and risk protection.</Text>
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const glanceStyles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: decisionGrade.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: decisionGrade.deepNavy,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 22,
    gap: 2,
  },
  iconDot: {
    width: 6,
    height: 6,
    backgroundColor: 'white',
    borderRadius: 1,
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: decisionGrade.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: decisionGrade.textSecondary,
  },
  toggle: {
    fontSize: 16,
    color: decisionGrade.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: decisionGrade.borderLight,
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: decisionGrade.textPrimary,
    width: 100,
  },
  bar: {
    flex: 1,
    height: 10,
    backgroundColor: decisionGrade.bgSecondary,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: decisionGrade.borderLight,
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    width: 42,
    textAlign: 'right',
    color: decisionGrade.textPrimary,
  },
  composite: {
    marginTop: 12,
    padding: 12,
    backgroundColor: decisionGrade.bgSecondary,
    borderRadius: 6,
  },
  compositeText: {
    fontSize: 13,
    fontWeight: '500',
    color: decisionGrade.textPrimary,
  },
  compositeLabel: {
    fontWeight: '700',
  },
  compositeValue: {
    fontWeight: '700',
    color: decisionGrade.pacificTeal,
  },
});

// =============================================================================
// PERFORMANCE BENCHMARKS COMPONENT
// =============================================================================

export interface BenchmarkMetric {
  label: string;
  value: string;
  position: number; // 0-100, where 50 is national average
  color: 'teal' | 'amber' | 'negative';
}

export interface BenchmarkGroup {
  title: string;
  metrics: BenchmarkMetric[];
}

interface PerformanceBenchmarksProps {
  groups: BenchmarkGroup[];
  onHowToRead?: () => void;
}

const getBenchmarkColor = (color: 'teal' | 'amber' | 'negative'): string => {
  switch (color) {
    case 'teal': return decisionGrade.pacificTeal;
    case 'amber': return decisionGrade.caution;
    case 'negative': return decisionGrade.negative;
  }
};

export function PerformanceBenchmarks({
  groups,
  onHowToRead,
}: PerformanceBenchmarksProps) {
  return (
    <View style={benchmarkStyles.container}>
      {/* Header */}
      <View style={benchmarkStyles.header}>
        <View style={benchmarkStyles.headerLeft}>
          <View style={benchmarkStyles.iconContainer}>
            <Ionicons name="bar-chart" size={20} color="white" />
          </View>
          <View style={benchmarkStyles.titleGroup}>
            <Text style={benchmarkStyles.title}>Performance Benchmarks</Text>
            <Text style={benchmarkStyles.subtitle}>How this deal compares</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onHowToRead}>
          <Text style={benchmarkStyles.howToRead}>∨ How to read</Text>
        </TouchableOpacity>
      </View>

      {/* Intro */}
      <View style={benchmarkStyles.intro}>
        <Text style={benchmarkStyles.introTitle}>
          How This Deal Compares to National Average
        </Text>
        <Text style={benchmarkStyles.introText}>
          The center represents the national average. Markers to the left are below average, markers to the right are above average.
        </Text>
      </View>

      {/* Legend */}
      <View style={benchmarkStyles.legend}>
        <Text style={benchmarkStyles.legendLabel}>BELOW</Text>
        <Text style={benchmarkStyles.legendCenter}>NATIONAL AVG</Text>
        <Text style={benchmarkStyles.legendLabel}>ABOVE</Text>
      </View>

      {/* Scale Bar */}
      <View style={benchmarkStyles.scale}>
        <View style={benchmarkStyles.scaleMarker} />
      </View>

      {/* Groups */}
      {groups.map((group, groupIndex) => (
        <View key={groupIndex} style={benchmarkStyles.group}>
          <Text style={benchmarkStyles.groupTitle}>{group.title}</Text>
          {group.metrics.map((metric, metricIndex) => {
            const markerColor = getBenchmarkColor(metric.color);
            return (
              <View key={metricIndex} style={benchmarkStyles.row}>
                <Text style={benchmarkStyles.metricLabel}>{metric.label}</Text>
                <View style={benchmarkStyles.barContainer}>
                  <View style={benchmarkStyles.bar}>
                    <View style={benchmarkStyles.barCenter} />
                    <View
                      style={[
                        benchmarkStyles.marker,
                        { left: `${metric.position}%`, backgroundColor: markerColor },
                      ]}
                    />
                  </View>
                </View>
                <Text style={benchmarkStyles.metricValue}>{metric.value}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const benchmarkStyles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: decisionGrade.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: decisionGrade.deepNavy,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: decisionGrade.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: decisionGrade.textSecondary,
  },
  howToRead: {
    fontSize: 11,
    fontWeight: '600',
    color: decisionGrade.pacificTeal,
  },
  intro: {
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: decisionGrade.textPrimary,
    marginBottom: 4,
  },
  introText: {
    fontSize: 11,
    fontWeight: '500',
    color: decisionGrade.textSecondary,
    lineHeight: 16,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: decisionGrade.textPrimary,
  },
  legendCenter: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: decisionGrade.deepNavy,
  },
  scale: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
    position: 'relative',
    overflow: 'visible',
    backgroundColor: decisionGrade.bgSecondary,
  },
  scaleMarker: {
    position: 'absolute',
    left: '50%',
    top: -4,
    width: 2,
    height: 16,
    backgroundColor: decisionGrade.deepNavy,
    marginLeft: -1,
  },
  group: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: decisionGrade.pacificTeal,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: decisionGrade.pacificTeal,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: decisionGrade.borderLight,
    gap: 12,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: decisionGrade.textPrimary,
    width: 90,
    lineHeight: 14,
  },
  barContainer: {
    flex: 1,
  },
  bar: {
    height: 10,
    backgroundColor: decisionGrade.bgSecondary,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: decisionGrade.borderLight,
    position: 'relative',
    overflow: 'visible',
  },
  barCenter: {
    position: 'absolute',
    left: '50%',
    top: -2,
    bottom: -2,
    width: 1,
    backgroundColor: decisionGrade.borderStrong,
    marginLeft: -0.5,
  },
  marker: {
    position: 'absolute',
    top: '50%',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
    marginTop: -6,
    marginLeft: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    width: 50,
    textAlign: 'right',
    color: decisionGrade.textPrimary,
  },
});

export default PerformanceBenchmarks;
