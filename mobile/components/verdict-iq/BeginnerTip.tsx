/**
 * BeginnerTip — Educational card for new investors
 * Per VerdictIQ 3.3 design
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { verdictDark } from '../../theme/colors';
import { verdictTypography } from '../../theme/textStyles';
import { rf, rs } from './responsive';

interface BeginnerTipProps {
  title?: string;
  body: string;
}

export function BeginnerTip({
  title = 'New to investing?',
  body,
}: BeginnerTipProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="book-outline" size={rf(18)} color={verdictDark.teal} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: rs(20),
    marginBottom: rs(24),
    backgroundColor: verdictDark.card,
    borderWidth: 1,
    borderColor: verdictDark.border,
    borderRadius: rs(14),
    padding: rs(20),
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(14),
  },
  iconWrap: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(10),
    backgroundColor: verdictDark.tealBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    ...verdictTypography.subheading,
    fontSize: rf(14),
    color: verdictDark.textHeading,
    marginBottom: rs(4),
  },
  body: {
    ...verdictTypography.bodySmall,
    fontSize: rf(14),
    lineHeight: rf(14) * 1.55,
    color: verdictDark.textBody,
  },
});
