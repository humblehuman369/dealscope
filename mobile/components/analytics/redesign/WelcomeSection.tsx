/**
 * WelcomeSection - Expandable/collapsible welcome message for mobile
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface WelcomeSectionProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isDark?: boolean;
}

export function WelcomeSection({ isCollapsed, onToggle, isDark = true }: WelcomeSectionProps) {
  const accentColor = isDark ? '#4dd0e1' : '#007ea7';
  const textColor = isDark ? '#fff' : '#07172e';
  const mutedColor = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(7,23,46,0.85)';
  const subtleColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(7,23,46,0.6)';

  if (isCollapsed) {
    return (
      <TouchableOpacity 
        style={[
          styles.containerCollapsed,
          { 
            backgroundColor: 'transparent',
            borderColor: isDark ? 'rgba(77,208,225,0.1)' : 'rgba(0,126,167,0.1)',
          }
        ]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.collapsedText, { color: subtleColor }]}>
          Most investors see list price.{' '}
          <Text style={[styles.collapsedHighlight, { color: accentColor }]}>
            IQ investors see 6 profit paths.
          </Text>
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.9}>
      <LinearGradient
        colors={isDark 
          ? ['rgba(77,208,225,0.08)', 'rgba(4,101,242,0.04)']
          : ['rgba(0,126,167,0.08)', 'rgba(4,101,242,0.04)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.containerExpanded,
          { borderColor: isDark ? 'rgba(77,208,225,0.2)' : 'rgba(0,126,167,0.2)' }
        ]}
      >
        <Text style={[styles.title, { color: accentColor }]}>
          Welcome to InvestIQ
        </Text>
        <Text style={[styles.greeting, { color: mutedColor }]}>
          Hey, I'm IQ - your real estate analyst.
        </Text>
        <Text style={[styles.message, { color: mutedColor }]}>
          I've already crunched the numbers on your property, factored in local market conditions, and built out{' '}
          <Text style={{ fontWeight: '700' }}>6 investment strategies</Text> tailored just for you.
        </Text>
        <Text style={[styles.message, { color: mutedColor }]}>
          Each one shows a different path to profit. Explore them all, compare the returns, and when you're ready to dig deeper — just ask. I'm here to help.
        </Text>
        <Text style={[styles.cta, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
          Let's find your best move.
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  containerExpanded: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  containerCollapsed: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
    textAlign: 'center',
  },
  greeting: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 14,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 14,
    textAlign: 'center',
  },
  cta: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  collapsedText: {
    fontSize: 13,
    textAlign: 'center',
  },
  collapsedHighlight: {
    fontWeight: '600',
  },
});
