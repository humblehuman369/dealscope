/**
 * WorksheetTab - Deal Maker Pro accordion card
 * EXACT implementation from design files - no modifications
 * 
 * Design specs:
 * - Card: white bg, border-radius 12px, border 1px solid #F1F5F9
 * - Active card: box-shadow 0 0 0 2px rgba(8, 145, 178, 0.2), border transparent
 * - Header: padding 14px 16px, gap 12px
 * - Icon: 24x24, color #0891B2
 * - Title: 15px, font-weight 600, color #0A1628
 * - Chevron: 20x20, color #94A3B8, rotates 180deg when active
 * - NO numbered indicators
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  LayoutAnimation, 
  Platform, 
  UIManager,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { WorksheetTabProps } from './types';
import { ChevronDownIcon, ArrowRightIcon } from './icons';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function WorksheetTab({
  config,
  isExpanded,
  onToggle,
  onContinue,
  children,
  derivedOutput,
  isLastTab = false,
}: WorksheetTabProps) {
  const { title, icon: IconComponent } = config;

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onContinue();
  };

  return (
    <View style={[
      styles.accordionCard,
      isExpanded && styles.accordionCardActive,
    ]}>
      {/* Accordion Header - just icon, title, chevron */}
      <TouchableOpacity 
        style={styles.accordionHeader} 
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        {/* Step Icon */}
        <View style={styles.stepIcon}>
          <IconComponent size={24} color="#0891B2" />
        </View>
        
        {/* Step Title */}
        <Text style={styles.stepTitle}>{title}</Text>
        
        {/* Chevron */}
        <View style={[
          styles.chevron,
          isExpanded && styles.chevronRotated,
        ]}>
          <ChevronDownIcon size={20} color="#94A3B8" />
        </View>
      </TouchableOpacity>

      {/* Accordion Content */}
      {isExpanded && (
        <View style={styles.accordionContent}>
          {/* Slider inputs */}
          {children}

          {/* Summary Box */}
          {derivedOutput && (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>{derivedOutput.label}</Text>
              <Text style={styles.summaryValue}>{derivedOutput.value}</Text>
            </View>
          )}

          {/* CTA Button */}
          <TouchableOpacity 
            style={styles.ctaButton} 
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>
              {isLastTab ? 'Finish & Save Deal' : 'Continue to Next'}
            </Text>
            {!isLastTab && (
              <ArrowRightIcon size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Styles - EXACT from design files
const styles = StyleSheet.create({
  accordionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  accordionCardActive: {
    borderWidth: 2,
    borderColor: 'rgba(8, 145, 178, 0.2)',
    shadowColor: 'rgba(8, 145, 178, 0.2)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  stepIcon: {
    width: 24,
    height: 24,
  },
  stepTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0A1628',
  },
  chevron: {
    width: 20,
    height: 20,
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    alignItems: 'flex-end',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5, // 0.05em * 10
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0A1628',
    fontVariant: ['tabular-nums'],
  },
  ctaButton: {
    backgroundColor: '#0891B2',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default WorksheetTab;
