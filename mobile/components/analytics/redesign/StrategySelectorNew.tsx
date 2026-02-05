/**
 * StrategySelectorNew - Enhanced strategy selector with simplified selected state
 * Features: 
 * - Shows all 6 strategies when no selection
 * - Shows only selected strategy with "Back To Strategy Options" button when selected
 * - Numbered sub-tabs with line indicator above
 * Design matches: Strategy tabs redesign spec
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StrategyId, STRATEGY_CONFIG } from './types';

import { useAnalysis } from './AnalysisContext';

interface StrategySelectorNewProps {
  // activeStrategy and strategyGrades are now optional as they come from context
  activeStrategy?: StrategyId | null;
  strategyGrades?: Partial<Record<StrategyId, { grade: string; score: number }>>;
  
  // Callback for side effects (like resetting tabs)
  onStrategyChange?: (strategy: StrategyId | null) => void;
  
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
  activeStrategy: propActiveStrategy,
  onStrategyChange,
  strategyGrades: propStrategyGrades,
  isDark = true,
  showCTABanner = true,
}: StrategySelectorNewProps) {
  // Consume context
  const { 
    activeStrategy: contextActiveStrategy, 
    setActiveStrategy, 
    analysis 
  } = useAnalysis();

  // Use props if provided (for flexibility), otherwise context
  const activeStrategy = propActiveStrategy !== undefined ? propActiveStrategy : contextActiveStrategy;
  const strategyGrades = propStrategyGrades !== undefined ? propStrategyGrades : analysis.strategyGrades;

  const handlePress = (strategyId: StrategyId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Update context if we're using it
    if (propActiveStrategy === undefined) {
      setActiveStrategy(strategyId);
    }
    
    // Notify parent
    onStrategyChange?.(strategyId);
  };

  const handleBackToStrategies = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Update context if we're using it
    if (propActiveStrategy === undefined) {
      setActiveStrategy(null);
    }
    
    // Notify parent
    onStrategyChange?.(null);
  };

  // When a strategy is selected, show single strategy header with back button
  if (activeStrategy) {
    const config = STRATEGY_CONFIG[activeStrategy];
    const gradeData = strategyGrades?.[activeStrategy];
    const gradeStyle = gradeData ? getGradeStyle(gradeData.grade) : null;

    return (
      <View style={styles.selectedContainer}>
        {/* Top line indicator */}
        <View style={[styles.topLine, { backgroundColor: isDark ? '#4dd0e1' : '#007ea7' }]} />
        
        <View style={styles.selectedContent}>
          {/* Strategy name with grade */}
          <View style={styles.selectedLeft}>
            <Text style={[styles.selectedStrategyName, { color: isDark ? '#fff' : '#07172e' }]}>
              {config.name}
            </Text>
            {gradeData && gradeStyle && (
              <View style={[styles.selectedGradeBadge, { backgroundColor: gradeStyle.bg }]}>
                <Text style={[styles.selectedGradeText, { color: gradeStyle.text }]}>
                  {gradeData.grade}
                </Text>
              </View>
            )}
          </View>

          {/* Back to Strategy Options button */}
          <TouchableOpacity
            style={[
              styles.backButton,
              { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.04)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(7,23,46,0.1)',
              }
            ]}
            onPress={handleBackToStrategies}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="arrow-back" 
              size={14} 
              color={isDark ? 'rgba(255,255,255,0.7)' : 'rgba(7,23,46,0.7)'} 
            />
            <Text style={[
              styles.backButtonText, 
              { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(7,23,46,0.7)' }
            ]}>
              Strategy Options
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // No strategy selected - show all strategy options
  return (
    <View style={styles.container}>
      {/* CTA Banner when no strategy selected */}
      {showCTABanner && (
        <LinearGradient
          colors={['rgba(77, 208, 225, 0.12)', 'rgba(4, 101, 242, 0.12)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaBanner}
        >
          <Text style={styles.ctaText}>👆 Pick a Strategy to Unlock Insights</Text>
          <Text style={[styles.ctaSubtext, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
            Select a strategy below to see your personalized analysis
          </Text>
          <Text style={styles.ctaArrow}>↓</Text>
        </LinearGradient>
      )}

      {/* Strategy Pills - Show all when none selected */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {STRATEGY_ORDER.map((strategyId) => {
          const config = STRATEGY_CONFIG[strategyId];
          const gradeData = strategyGrades?.[strategyId];
          const gradeStyle = gradeData ? getGradeStyle(gradeData.grade) : null;

          return (
            <TouchableOpacity
              key={strategyId}
              style={[
                styles.pill,
                { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(7,23,46,0.03)',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)',
                },
              ]}
              onPress={() => handlePress(strategyId)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.pillLabel, 
                { color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(7,23,46,0.8)' }
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
    </View>
  );
}

// Sub-tab navigation component with numbered indicators
interface SubTabNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { id: string; label: string }[];
  isDark?: boolean;
}

export function SubTabNav({ activeTab, onTabChange, tabs, isDark = true }: SubTabNavProps) {
  const activeIndex = tabs.findIndex(t => t.id === activeTab);
  
  return (
    <View style={styles.subTabWrapper}>
      {/* Top line with active indicator */}
      <View style={[styles.subTabTopLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)' }]}>
        {/* Active indicator positioned above selected tab */}
        <View 
          style={[
            styles.subTabActiveIndicator,
            { 
              backgroundColor: isDark ? '#4dd0e1' : '#007ea7',
              left: `${(activeIndex / tabs.length) * 100}%`,
              width: `${100 / tabs.length}%`,
            }
          ]} 
        />
      </View>

      {/* Tab buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.subTabContainer}
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const tabNumber = index + 1;
          
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.subTab,
                isActive && styles.subTabActiveBox,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onTabChange(tab.id);
              }}
              activeOpacity={0.7}
            >
              {/* Numbered indicator */}
              <View style={[
                styles.tabNumberBadge,
                isActive 
                  ? { backgroundColor: isDark ? '#4dd0e1' : '#007ea7' }
                  : { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.06)' }
              ]}>
                <Text style={[
                  styles.tabNumberText,
                  isActive 
                    ? { color: isDark ? '#07172e' : '#fff' }
                    : { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)' }
                ]}>
                  {tabNumber}
                </Text>
              </View>
              
              {/* Tab label */}
              <Text
                style={[
                  styles.subTabText,
                  { color: isActive 
                    ? (isDark ? '#4dd0e1' : '#007ea7') 
                    : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)') 
                  },
                  isActive && styles.subTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // === Container styles ===
  container: {
    marginBottom: 14,
  },
  
  // === CTA Banner styles ===
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
    marginBottom: 8,
  },
  ctaArrow: {
    fontSize: 22,
    color: '#4dd0e1',
  },
  
  // === All strategies view ===
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
  
  // === Selected strategy view ===
  selectedContainer: {
    marginBottom: 14,
  },
  topLine: {
    height: 3,
    borderRadius: 2,
    marginBottom: 12,
  },
  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  selectedStrategyName: {
    fontSize: 18,
    fontWeight: '700',
  },
  selectedGradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  selectedGradeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // === Sub-tab styles ===
  subTabWrapper: {
    marginBottom: 10,
  },
  subTabTopLine: {
    height: 2,
    position: 'relative',
    marginBottom: 12,
  },
  subTabActiveIndicator: {
    position: 'absolute',
    top: 0,
    height: 2,
  },
  subTabContainer: {
    gap: 6,
    paddingVertical: 4,
  },
  subTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  subTabActiveBox: {
    // Active styles applied via inline
  },
  tabNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabNumberText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '500',
  },
  subTabTextActive: {
    fontWeight: '600',
  },
});
