/**
 * CompareToggle - Toggle between "At IQ Target" and "At List Price"
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CompareView } from './types';

interface CompareToggleProps {
  view: CompareView;
  onViewChange: (view: CompareView) => void;
  isDark?: boolean;
}

export function CompareToggle({ view, onViewChange, isDark = true }: CompareToggleProps) {
  const handlePress = (newView: CompareView) => {
    if (newView !== view) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onViewChange(newView);
    }
  };

  return (
    <View style={[
      styles.container,
      { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.04)' }
    ]}>
      <TouchableOpacity
        style={[
          styles.option,
          view === 'target' && styles.optionActive,
          view === 'target' && { backgroundColor: isDark ? '#4dd0e1' : '#007ea7' },
        ]}
        onPress={() => handlePress('target')}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.optionText,
          { color: view === 'target' ? '#fff' : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)') }
        ]}>
          At IQ Target
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.option,
          view === 'list' && styles.optionActive,
          view === 'list' && { backgroundColor: isDark ? '#6b7280' : '#9ca3af' },
        ]}
        onPress={() => handlePress('list')}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.optionText,
          { color: view === 'list' ? '#fff' : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)') }
        ]}>
          At List Price
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
  },
  option: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  optionActive: {},
  optionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
