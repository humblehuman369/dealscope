/**
 * AtAGlanceSection - Collapsible performance breakdown bars
 * Ported from frontend AtAGlanceSection.tsx with dark/light theme support.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// =============================================================================
// TYPES
// =============================================================================

export interface AtAGlanceBar {
  label: string;
  value: number;
  tooltip?: string;
}

export interface AtAGlanceSectionProps {
  bars: AtAGlanceBar[];
  compositeScore?: number;
  defaultExpanded?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function getBarColor(value: number): string {
  if (value >= 70) return colors.accent[600]; // teal/cyan
  if (value >= 40) return colors.warning.main; // amber
  return colors.loss.main; // red
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AtAGlanceSection({
  bars,
  compositeScore,
  defaultExpanded = false,
}: AtAGlanceSectionProps) {
  const { theme, isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  };

  const barTrackBg = isDark ? 'rgba(255,255,255,0.08)' : colors.gray[100];
  const compositeBg = isDark ? 'rgba(255,255,255,0.06)' : colors.gray[50];

  return (
    <View style={[styles.container, { backgroundColor: theme.card }]}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: isDark ? 'rgba(8, 145, 178, 0.2)' : 'rgba(8, 145, 178, 0.1)' },
            ]}
          >
            <View style={styles.iconGrid}>
              {[...Array(9)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.iconDot,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.9)' : colors.navy[900] },
                  ]}
                />
              ))}
            </View>
          </View>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>At a Glance</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Performance breakdown
            </Text>
          </View>
        </View>
        <View style={styles.toggleWrapper}>
          {compositeScore !== undefined && (
            <Text style={[styles.compositePill, { color: theme.textSecondary }]}>
              {compositeScore}%
            </Text>
          )}
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {/* Content */}
      {isExpanded && (
        <View style={styles.content}>
          {bars.map((bar, idx) => {
            const clampedValue = Math.max(0, Math.min(100, bar.value));
            const barColor = getBarColor(bar.value);
            return (
              <View key={idx} style={styles.barRow}>
                <Text style={[styles.barLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                  {bar.label}
                </Text>
                <View style={[styles.barTrack, { backgroundColor: barTrackBg }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${clampedValue}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.barValue, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {Math.round(bar.value)}%
                </Text>
              </View>
            );
          })}

          {compositeScore !== undefined && (
            <View style={[styles.compositeBox, { backgroundColor: compositeBg }]}>
              <Text style={[styles.compositeText, { color: theme.text }]}>
                <Text style={styles.compositeLabel}>Composite: </Text>
                {compositeScore}% score across returns and risk protection.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 22,
    gap: 2,
  },
  iconDot: {
    width: 6,
    height: 6,
    borderRadius: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  toggleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compositePill: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  barLabel: {
    fontSize: 14,
    width: 90,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barValue: {
    fontSize: 14,
    fontWeight: '700',
    width: 42,
    textAlign: 'right',
  },
  compositeBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 6,
  },
  compositeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  compositeLabel: {
    fontWeight: '700',
    color: colors.accent[600],
  },
});

export default AtAGlanceSection;
