/**
 * StrategySelectorNew - Enhanced strategy pills with grades
 * Features: Horizontal scroll, grade badges, CTA banner
 * Design matches: investiq-property-analytics-complete-redesign (final).html
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { StrategyId, STRATEGY_CONFIG } from './types';

interface StrategySelectorNewProps {
  activeStrategy: StrategyId | null;
  onStrategyChange: (strategy: StrategyId) => void;
  strategyGrades?: Partial<Record<StrategyId, { grade: string; score: number }>>;
  isDark?: boolean;
  showCTABanner?: boolean;
}

const STRATEGY_ORDER: StrategyId[] = ['ltr', 'str', 'brrrr', 'flip', 'house_hack', 'wholesale'];

// Grade color mapping
function getGradeStyle(grade: string): { bg: string; text: string } {
  const letter = grade.charAt(0);
  switch (letter) {
    case 'A':
      return { bg: 'rgba(77, 208, 225, 0.2)', text: '#4dd0e1' };
    case 'B':
      return { bg: 'rgba(77, 208, 225, 0.15)', text: '#4dd0e1' };
    case 'C':
      return { bg: 'rgba(234, 179, 8, 0.2)', text: '#eab308' };
    case 'D':
      return { bg: 'rgba(249, 115, 22, 0.2)', text: '#f97316' };
    default:
      return { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' };
  }
}

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
        <LinearGradient
          colors={['rgba(77, 208, 225, 0.12)', 'rgba(4, 101, 242, 0.12)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaBanner}
        >
          <Text style={styles.ctaText}>👆 Pick a Strategy to Unlock Insights</Text>
          <Text style={styles.ctaSubtext}>Select a strategy below to see your personalized analysis</Text>
          <Text style={styles.ctaArrow}>↓</Text>
        </LinearGradient>
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
          const gradeStyle = gradeData ? getGradeStyle(gradeData.grade) : null;

          return (
            <TouchableOpacity
              key={strategyId}
              style={[
                styles.pill,
                isActive && styles.pillActiveContainer,
                isActive && { borderColor: '#4dd0e1', backgroundColor: 'rgba(77, 208, 225, 0.12)' },
                !isActive && { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(7,23,46,0.03)',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)',
                },
              ]}
              onPress={() => handlePress(strategyId)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.pillLabel, 
                { color: isActive ? '#4dd0e1' : (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(7,23,46,0.6)') }
              ]}>
                {config.shortName}
              </Text>
              {gradeData && gradeStyle && (
                <View style={[styles.gradeBadge, { backgroundColor: gradeStyle.bg }]}>
                  <Text style={[styles.gradeBadgeText, { color: gradeStyle.text }]}>
                    {gradeData.grade}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
      {/* Interactive Strategy Selector label */}
      <Text style={[styles.interactiveLabel, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
        Interactive Strategy Selector
      </Text>
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

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  ctaBanner: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(77, 208, 225, 0.3)',
    marginBottom: 10,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4dd0e1',
    marginBottom: 2,
  },
  ctaSubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  ctaArrow: {
    fontSize: 22,
    color: '#4dd0e1',
  },
  scrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  pillActiveContainer: {
    borderWidth: 1,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  gradeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gradeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  interactiveLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
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
