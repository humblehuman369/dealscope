/**
 * Performance Benchmarks Components - Decision-Grade UI (Polished)
 * At-a-Glance with composite score pill + National Average comparison
 */

import React from 'react';
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

const getCompositePillBg = (score: number): string => {
  if (score >= 60) return 'rgba(8,145,178,0.10)';
  if (score >= 40) return 'rgba(217,119,6,0.10)';
  return 'rgba(220,38,38,0.10)';
};

const getCompositeColor = (score: number): string => {
  if (score >= 60) return decisionGrade.pacificTeal;
  if (score >= 40) return decisionGrade.caution;
  return decisionGrade.negative;
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
        <View style={glanceStyles.headerLeft}>
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
        </View>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={decisionGrade.textSecondary}
        />
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
                <Text style={[glanceStyles.value, { color: metricColor }]}>
                  {metric.value}%
                </Text>
              </View>
            );
          })}

          {/* Composite - Pill Style */}
          <View style={glanceStyles.composite}>
            <View style={glanceStyles.compositeRow}>
              <Text style={glanceStyles.compositeLabel}>Composite Score</Text>
              <View style={[
                glanceStyles.compositePill,
                { backgroundColor: getCompositePillBg(compositeScore) },
              ]}>
                <Text style={[
                  glanceStyles.compositePillText,
                  { color: getCompositeColor(compositeScore) },
                ]}>
                  {compositeScore}%
                </Text>
              </View>
            </View>
            <Text style={glanceStyles.compositeDesc}>
              Across returns and risk protection
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rs(16),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  iconContainer: {
    width: rs(36),
    height: rs(36),
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
    height: rs(8),
    backgroundColor: 'rgba(229,229,229,0.5)',
    borderRadius: rs(4),
    overflow: 'hidden',
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
  },
  composite: {
    marginTop: rs(14),
    padding: rs(14),
    backgroundColor: 'rgba(8,145,178,0.04)',
    borderRadius: rs(10),
    borderWidth: 1,
    borderColor: 'rgba(8,145,178,0.12)',
  },
  compositeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rs(4),
  },
  compositeLabel: {
    fontSize: rf(12),
    fontWeight: '700',
    color: decisionGrade.textPrimary,
  },
  compositePill: {
    paddingHorizontal: rs(12),
    paddingVertical: rs(4),
    borderRadius: rs(12),
  },
  compositePillText: {
    fontSize: rf(14),
    fontWeight: '800',
  },
  compositeDesc: {
    fontSize: rf(11),
    fontWeight: '500',
    color: decisionGrade.textSecondary,
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
            <Ionicons name="bar-chart" size={16} color="white" />
          </View>
          <View style={benchmarkStyles.titleGroup}>
            <Text style={benchmarkStyles.title}>Performance Benchmarks</Text>
            <Text style={benchmarkStyles.subtitle}>How this deal compares</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onHowToRead}>
          <Text style={benchmarkStyles.howToRead}>How to read</Text>
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
          <View style={benchmarkStyles.groupTitleRow}>
            <View style={benchmarkStyles.groupAccent} />
            <Text style={benchmarkStyles.groupTitle}>{group.title}</Text>
          </View>
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
                <Text style={[benchmarkStyles.metricValue, { color: markerColor }]}>
                  {metric.value}
                </Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rs(16),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  iconContainer: {
    width: rs(36),
    height: rs(36),
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
    color: decisionGrade.textTertiary,
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
    backgroundColor: 'rgba(229,229,229,0.5)',
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
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rs(8),
    borderBottomWidth: 2,
    borderBottomColor: decisionGrade.pacificTeal,
    marginBottom: rs(12),
  },
  groupAccent: {
    width: rs(4),
    height: rs(14),
    backgroundColor: decisionGrade.pacificTeal,
    borderRadius: rs(2),
    marginRight: rs(8),
  },
  groupTitle: {
    fontSize: rf(10),
    fontWeight: '700',
    letterSpacing: 0.5,
    color: decisionGrade.pacificTeal,
    textTransform: 'uppercase',
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
    height: rs(8),
    backgroundColor: 'rgba(229,229,229,0.5)',
    borderRadius: rs(4),
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
  },
});

export default PerformanceBenchmarks;
