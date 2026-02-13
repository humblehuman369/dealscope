/**
 * ActionBar — Export, Change Terms, Strategy selector pill
 * Per StrategyIQ 3.3 design
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { verdictDark } from '../../theme/colors';
import { rf, rs } from '../verdict-iq/responsive';

interface ActionBarProps {
  currentStrategy: string;
  onExport: () => void;
  onChangeTerms: () => void;
  onStrategyPress: () => void;
}

export function ActionBar({ currentStrategy, onExport, onChangeTerms, onStrategyPress }: ActionBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftButtons}>
        <TouchableOpacity 
          style={styles.ctxBtn} 
          onPress={onExport} 
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Share analysis"
          accessibilityHint="Exports and shares the financial analysis"
        >
          <Ionicons name="download-outline" size={rf(13)} color={verdictDark.textBody} />
          <Text style={styles.ctxBtnText}>Export</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.ctxBtn} 
          onPress={onChangeTerms} 
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Change terms"
          accessibilityHint="Opens the worksheet to adjust financing terms"
        >
          <Ionicons name="options-outline" size={rf(13)} color={verdictDark.textBody} />
          <Text style={styles.ctxBtnText}>Change Terms</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity 
        style={styles.strategyPill} 
        onPress={onStrategyPress} 
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Strategy selector, current strategy: ${currentStrategy}`}
        accessibilityHint="Opens strategy selection menu"
      >
        <Text style={styles.strategyText}>{currentStrategy}</Text>
        <Ionicons name="chevron-down" size={rf(12)} color={verdictDark.blue} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: rs(20),
  },
  leftButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
  },
  ctxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingVertical: rs(6),
    paddingHorizontal: rs(10),
    borderWidth: 1,
    borderColor: verdictDark.textLabel,
    borderRadius: rs(100),
  },
  ctxBtnText: {
    fontSize: rf(12),
    fontWeight: '600',
    color: verdictDark.textBody,
  },
  strategyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    paddingVertical: rs(6),
    paddingHorizontal: rs(12),
    backgroundColor: verdictDark.blueBg,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.25)',
    borderRadius: rs(100),
    marginLeft: 'auto',
  },
  strategyText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: verdictDark.blue,
  },
});
