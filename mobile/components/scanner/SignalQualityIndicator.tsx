import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { SignalQuality } from '../../hooks/usePropertyScan';

interface SignalQualityIndicatorProps {
  quality: SignalQuality;
  compact?: boolean;
}

/**
 * Visual indicator showing GPS and compass signal quality.
 * Helps users understand when conditions are optimal for scanning.
 */
export function SignalQualityIndicator({ 
  quality, 
  compact = false 
}: SignalQualityIndicatorProps) {
  const getColor = () => {
    switch (quality.overall) {
      case 'ready': return colors.profit.main;
      case 'marginal': return '#f59e0b';
      case 'not-ready': return colors.loss.main;
    }
  };

  const getIcon = () => {
    switch (quality.overall) {
      case 'ready': return 'checkmark-circle';
      case 'marginal': return 'warning';
      case 'not-ready': return 'alert-circle';
    }
  };

  const getGpsIcon = () => {
    switch (quality.gps) {
      case 'excellent': return 'cellular';
      case 'good': return 'cellular-outline';
      case 'poor': return 'cellular-outline';
    }
  };

  const getGpsBars = () => {
    switch (quality.gps) {
      case 'excellent': return 3;
      case 'good': return 2;
      case 'poor': return 1;
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Ionicons 
          name={getIcon()} 
          size={14} 
          color={getColor()} 
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Signal Bars */}
      <View style={styles.signalBars}>
        {[1, 2, 3].map((bar) => (
          <View
            key={bar}
            style={[
              styles.bar,
              { height: 6 + bar * 4 },
              bar <= getGpsBars() 
                ? { backgroundColor: getColor() }
                : { backgroundColor: 'rgba(255,255,255,0.2)' }
            ]}
          />
        ))}
      </View>

      {/* Status Icon */}
      <Ionicons 
        name={getIcon()} 
        size={16} 
        color={getColor()} 
      />

      {/* Status Text */}
      <Text style={[styles.statusText, { color: getColor() }]}>
        {quality.overall === 'ready' ? 'Ready' : 
         quality.overall === 'marginal' ? 'OK' : 'Wait'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  compactContainer: {
    padding: 4,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    minHeight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
