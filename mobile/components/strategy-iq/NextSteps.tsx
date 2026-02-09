/**
 * NextSteps — 3-column action cards grid
 * Per StrategyIQ 3.3 design
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { verdictDark } from '../../theme/colors';
import { rf, rs } from '../verdict-iq/responsive';

export interface StepCardData {
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  description: string;
  onPress?: () => void;
}

interface NextStepsProps {
  steps: StepCardData[];
}

export function NextSteps({ steps }: NextStepsProps) {
  return (
    <View style={styles.container}>
      {steps.map((step, i) => (
        <TouchableOpacity
          key={i}
          style={styles.card}
          onPress={step.onPress}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={step.icon} size={rf(20)} color={verdictDark.teal} />
          </View>
          <Text style={styles.name}>{step.name}</Text>
          <Text style={styles.desc}>{step.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: rs(10),
  },
  card: {
    flex: 1,
    backgroundColor: verdictDark.card,
    borderWidth: 1,
    borderColor: verdictDark.border,
    borderRadius: rs(12),
    paddingVertical: rs(20),
    paddingHorizontal: rs(12),
    alignItems: 'center',
  },
  iconWrap: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(12),
    backgroundColor: verdictDark.tealBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs(12),
  },
  name: {
    fontSize: rf(14),
    fontWeight: '600',
    color: verdictDark.textHeading,
    textAlign: 'center',
    marginBottom: rs(4),
  },
  desc: {
    fontSize: rf(12),
    fontWeight: '400',
    lineHeight: rf(12) * 1.4,
    color: verdictDark.textBody,
    textAlign: 'center',
  },
});
