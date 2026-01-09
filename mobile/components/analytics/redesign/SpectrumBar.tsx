/**
 * SpectrumBar - Benchmark visualization with gradient zones
 * Shows Low → Average → High with animated marker
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BenchmarkConfig, BenchmarkStatus } from './types';

interface SpectrumBarProps {
  config: BenchmarkConfig;
  isDark?: boolean;
}

const STATUS_COLORS: Record<BenchmarkStatus, string> = {
  high: '#22c55e',
  average: '#f59e0b',
  low: '#ef4444',
};

const STATUS_LABELS: Record<BenchmarkStatus, string> = {
  high: 'HIGH',
  average: 'AVG',
  low: 'LOW',
};

export function SpectrumBar({ config, isDark = true }: SpectrumBarProps) {
  const { label, formattedValue, status, markerPosition, zones, inverted } = config;

  // Gradient colors based on whether the metric is inverted
  const gradientColors = inverted
    ? ['#22c55e', '#f59e0b', '#ef4444'] // Green to Red (inverted - low is good)
    : ['#ef4444', '#f59e0b', '#22c55e']; // Red to Green (normal - high is good)

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(7,23,46,0.02)',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.label, { color: isDark ? '#fff' : '#07172e' }]}>
          {label}
        </Text>
        <View style={styles.valueContainer}>
          <Text style={[styles.value, { color: STATUS_COLORS[status] }]}>
            {formattedValue}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[status] }]}>
            <Text style={styles.statusText}>{STATUS_LABELS[status]}</Text>
          </View>
        </View>
      </View>

      {/* Spectrum */}
      <View style={styles.spectrumContainer}>
        <LinearGradient
          colors={gradientColors as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.spectrum}
        />
        
        {/* Marker */}
        <View style={[styles.marker, { left: `${Math.min(Math.max(markerPosition, 2), 98)}%` }]}>
          <View style={[styles.markerDot, { backgroundColor: STATUS_COLORS[status] }]} />
          <View style={[styles.markerLine, { backgroundColor: STATUS_COLORS[status] }]} />
        </View>
      </View>

      {/* Zone Labels */}
      <View style={styles.zonesContainer}>
        <View style={styles.zone}>
          <Text style={[styles.zoneLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
            {zones.low.label}
          </Text>
          <Text style={[styles.zoneRange, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(7,23,46,0.3)' }]}>
            {zones.low.range}
          </Text>
        </View>
        <View style={styles.zone}>
          <Text style={[styles.zoneLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
            {zones.average.label}
          </Text>
          <Text style={[styles.zoneRange, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(7,23,46,0.3)' }]}>
            {zones.average.range}
          </Text>
        </View>
        <View style={styles.zone}>
          <Text style={[styles.zoneLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
            {zones.high.label}
          </Text>
          <Text style={[styles.zoneRange, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(7,23,46,0.3)' }]}>
            {zones.high.range}
          </Text>
        </View>
      </View>
    </View>
  );
}

// Performance Benchmarks container
interface PerformanceBenchmarksProps {
  benchmarks: BenchmarkConfig[];
  isDark?: boolean;
}

export function PerformanceBenchmarks({ benchmarks, isDark = true }: PerformanceBenchmarksProps) {
  return (
    <View style={styles.benchmarksContainer}>
      <Text style={[styles.sectionTitle, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
        PERFORMANCE BENCHMARKS
      </Text>
      {benchmarks.map((benchmark) => (
        <SpectrumBar key={benchmark.id} config={benchmark} isDark={isDark} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  spectrumContainer: {
    position: 'relative',
    height: 8,
    marginBottom: 8,
  },
  spectrum: {
    height: 8,
    borderRadius: 4,
  },
  marker: {
    position: 'absolute',
    top: -4,
    alignItems: 'center',
    transform: [{ translateX: -8 }],
  },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  markerLine: {
    width: 2,
    height: 0,
    marginTop: -4,
  },
  zonesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  zone: {
    alignItems: 'center',
  },
  zoneLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  zoneRange: {
    fontSize: 9,
    marginTop: 1,
  },
  benchmarksContainer: {
    gap: 0,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
});
