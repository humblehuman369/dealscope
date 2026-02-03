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
import { rf, rs } from './responsive';

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
    padding: rs(16),
    backgroundColor: decisionGrade.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(12),
    marginBottom: rs(16),
  },
  iconContainer: {
    width: rs(40),
    height: rs(40),
    backgroundColor: decisionGrade.deepNavy,
    borderRadius: rs(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: rs(22),
    gap: rs(2),
  },
  iconDot: {
    width: rs(6),
    height: rs(6),
    backgroundColor: 'white',
    borderRadius: rs(1),
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    fontSize: rf(13),
    fontWeight: '700',
    color: decisionGrade.textPrimary,
  },
  subtitle: {
    fontSize: rf(10),
    fontWeight: '500',
    color: decisionGrade.textSecondary,
  },
  toggle: {
    fontSize: rf(14),
    color: decisionGrade.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rs(10),
    borderBottomWidth: 1,
    borderBottomColor: decisionGrade.borderLight,
    gap: rs(10),
  },
  label: {
    fontSize: rf(12),
    fontWeight: '500',
    color: decisionGrade.textPrimary,
    width: rs(90),
  },
  bar: {
    flex: 1,
    height: rs(10),
    backgroundColor: decisionGrade.bgSecondary,
    borderRadius: rs(5),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: decisionGrade.borderLight,
  },
  fill: {
    height: '100%',
    borderRadius: rs(4),
  },
  value: {
    fontSize: rf(13),
    fontWeight: '700',
    width: rs(38),
    textAlign: 'right',
    color: decisionGrade.textPrimary,
  },
  composite: {
    marginTop: rs(12),
    padding: rs(12),
    backgroundColor: decisionGrade.bgSecondary,
    borderRadius: rs(6),
  },
  compositeText: {
    fontSize: rf(12),
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
    padding: rs(16),
    backgroundColor: decisionGrade.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: rs(16),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(12),
  },
  iconContainer: {
    width: rs(40),
    height: rs(40),
    backgroundColor: decisionGrade.deepNavy,
    borderRadius: rs(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    fontSize: rf(13),
    fontWeight: '700',
    color: decisionGrade.textPrimary,
  },
  subtitle: {
    fontSize: rf(10),
    fontWeight: '500',
    color: decisionGrade.textSecondary,
  },
  howToRead: {
    fontSize: rf(10),
    fontWeight: '600',
    color: decisionGrade.pacificTeal,
  },
  intro: {
    marginBottom: rs(16),
  },
  introTitle: {
    fontSize: rf(12),
    fontWeight: '700',
    color: decisionGrade.textPrimary,
    marginBottom: rs(4),
  },
  introText: {
    fontSize: rf(10),
    fontWeight: '500',
    color: decisionGrade.textSecondary,
    lineHeight: rf(15),
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rs(8),
    paddingHorizontal: rs(4),
  },
  legendLabel: {
    fontSize: rf(9),
    fontWeight: '600',
    letterSpacing: 0.5,
    color: decisionGrade.textPrimary,
  },
  legendCenter: {
    fontSize: rf(9),
    fontWeight: '700',
    letterSpacing: 0.5,
    color: decisionGrade.deepNavy,
  },
  scale: {
    height: rs(8),
    borderRadius: rs(4),
    marginBottom: rs(16),
    position: 'relative',
    overflow: 'visible',
    backgroundColor: decisionGrade.bgSecondary,
  },
  scaleMarker: {
    position: 'absolute',
    left: '50%',
    top: rs(-4),
    width: rs(2),
    height: rs(16),
    backgroundColor: decisionGrade.deepNavy,
    marginLeft: -1,
  },
  group: {
    marginBottom: rs(20),
  },
  groupTitle: {
    fontSize: rf(10),
    fontWeight: '700',
    letterSpacing: 0.5,
    color: decisionGrade.pacificTeal,
    paddingVertical: rs(8),
    borderBottomWidth: 2,
    borderBottomColor: decisionGrade.pacificTeal,
    marginBottom: rs(12),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rs(12),
    borderBottomWidth: 1,
    borderBottomColor: decisionGrade.borderLight,
    gap: rs(10),
  },
  metricLabel: {
    fontSize: rf(11),
    fontWeight: '500',
    color: decisionGrade.textPrimary,
    width: rs(80),
    lineHeight: rf(13),
  },
  barContainer: {
    flex: 1,
  },
  bar: {
    height: rs(10),
    backgroundColor: decisionGrade.bgSecondary,
    borderRadius: rs(5),
    borderWidth: 1,
    borderColor: decisionGrade.borderLight,
    position: 'relative',
    overflow: 'visible',
  },
  barCenter: {
    position: 'absolute',
    left: '50%',
    top: rs(-2),
    bottom: rs(-2),
    width: 1,
    backgroundColor: decisionGrade.borderStrong,
    marginLeft: -0.5,
  },
  marker: {
    position: 'absolute',
    top: '50%',
    width: rs(12),
    height: rs(12),
    borderRadius: rs(6),
    borderWidth: 2,
    borderColor: 'white',
    marginTop: rs(-6),
    marginLeft: rs(-6),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  metricValue: {
    fontSize: rf(12),
    fontWeight: '700',
    width: rs(45),
    textAlign: 'right',
    color: decisionGrade.textPrimary,
  },
});

export default PerformanceBenchmarks;
