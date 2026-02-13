/**
 * BackStrip — "Back to Verdict" navigation + address summary
 * Per StrategyIQ 3.3 design
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { verdictDark } from '../../theme/colors';
import { rf, rs } from '../verdict-iq/responsive';

interface BackStripProps {
  address: string;
  onBack: () => void;
}

export function BackStrip({ address, onBack }: BackStripProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backLink} 
        onPress={onBack} 
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        accessibilityHint="Returns to the VerdictIQ screen"
      >
        <Ionicons name="chevron-back" size={rf(16)} color={verdictDark.teal} />
        <Text style={styles.backText}>Back to Verdict</Text>
      </TouchableOpacity>
      <Text style={styles.address} numberOfLines={1}>{address}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: rs(12),
    paddingHorizontal: rs(20),
    backgroundColor: verdictDark.bg,
    borderBottomWidth: 1,
    borderBottomColor: verdictDark.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
  },
  backText: {
    fontSize: rf(14),
    fontWeight: '600',
    color: verdictDark.teal,
  },
  address: {
    fontSize: rf(14),
    fontWeight: '500',
    color: verdictDark.textSecondary,
    maxWidth: '50%',
  },
});
