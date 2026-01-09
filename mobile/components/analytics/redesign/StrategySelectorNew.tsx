/**
 * StrategySelectorNew - Enhanced strategy pills with grades
 * Features: Horizontal scroll, grade badges, CTA banner
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { StrategyId, StrategyInfo, STRATEGY_CONFIG } from './types';

interface StrategySelectorNewProps {
  activeStrategy: StrategyId | null;
  onStrategyChange: (strategy: StrategyId) => void;
  strategyGrades?: Partial<Record<StrategyId, { grade: string; score: number }>>;
  isDark?: boolean;
  showCTABanner?: boolean;
}

const STRATEGY_ORDER: StrategyId[] = ['ltr', 'str', 'brrrr', 'flip', 'house_hack', 'wholesale'];

export function StrategySelectorNew({
  activeStrategy,
  onStrategyChange,
  strategyGrades,
  isDark = true,
  showCTABanner = true,
}: StrategySelectorNewProps) {
  const handlePress = (strategyId: StrategyId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onStrategyChange(strategyId);
  };

  return (
    <View style={styles.container}>
      {/* CTA Banner when no strategy selected */}
      {showCTABanner && !activeStrategy && (
        <View style={[
          styles.ctaBanner,
          { backgroundColor: isDark ? 'rgba(77, 208, 225, 0.1)' : 'rgba(0, 126, 167, 0.1)' }
        ]}>
          <Text style={[styles.ctaIcon]}>👆</Text>
          <Text style={[styles.ctaText, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
            Pick a Strategy to Unlock Insights
          </Text>
        </View>
      )}

      {/* Strategy Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {STRATEGY_ORDER.map((strategyId) => {
          const config = STRATEGY_CONFIG[strategyId];
          const isActive = activeStrategy === strategyId;
          const gradeData = strategyGrades?.[strategyId];

          return (
            <TouchableOpacity
              key={strategyId}
              style={styles.pill}
              onPress={() => handlePress(strategyId)}
              activeOpacity={0.7}
            >
              {isActive ? (
                <LinearGradient
                  colors={[config.color, adjustColorBrightness(config.color, 30)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.pillActive}
                >
                  <Text style={styles.pillIcon}>{config.icon}</Text>
                  <Text style={styles.pillLabelActive}>{config.shortName}</Text>
                  {gradeData && (
                    <View style={styles.gradeBadgeActive}>
                      <Text style={styles.gradeBadgeTextActive}>{gradeData.grade}</Text>
                    </View>
                  )}
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.pillInactive,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.03)',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)',
                    },
                  ]}
                >
                  <Text style={styles.pillIcon}>{config.icon}</Text>
                  <Text style={[styles.pillLabel, { color: isDark ? '#aab2bd' : '#6b7280' }]}>
                    {config.shortName}
                  </Text>
                  {gradeData && (
                    <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(gradeData.grade) }]}>
                      <Text style={styles.gradeBadgeText}>{gradeData.grade}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Sub-tab navigation component
interface SubTabNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { id: string; label: string }[];
  isDark?: boolean;
}

export function SubTabNav({ activeTab, onTabChange, tabs, isDark = true }: SubTabNavProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.subTabContainer}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.subTab,
              isActive && styles.subTabActive,
              {
                backgroundColor: isActive
                  ? (isDark ? '#4dd0e1' : '#007ea7')
                  : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.03)'),
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onTabChange(tab.id);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.subTabText,
                { color: isActive ? '#fff' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(7,23,46,0.6)') },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// Helper functions
function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return '#22c55e';
    case 'A-':
    case 'B+':
    case 'B':
      return '#84cc16';
    case 'B-':
    case 'C+':
    case 'C':
      return '#f59e0b';
    case 'C-':
    case 'D+':
    case 'D':
      return '#f97316';
    default:
      return '#ef4444';
  }
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  ctaIcon: {
    fontSize: 14,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  pill: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  pillActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  pillInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillIcon: {
    fontSize: 14,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  pillLabelActive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  gradeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 2,
  },
  gradeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  gradeBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 2,
  },
  gradeBadgeTextActive: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  // Sub-tab styles
  subTabContainer: {
    gap: 8,
    paddingVertical: 4,
  },
  subTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  subTabActive: {},
  subTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
