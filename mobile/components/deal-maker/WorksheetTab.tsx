/**
 * WorksheetTab - Deal Maker Pro accordion card component
 * Features: SVG icons, chevron rotation, teal accent colors, modern styling
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
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { WorksheetTabProps, DEAL_MAKER_PRO_COLORS } from './types';
import { ChevronDownIcon, ArrowRightIcon } from './icons';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// =============================================================================
// COMPONENT
// =============================================================================

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
      styles.container,
      isExpanded && styles.containerActive,
    ]}>
      {/* Accordion Header */}
      <TouchableOpacity 
        style={styles.header} 
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View style={styles.iconWrapper}>
          <IconComponent size={24} color={DEAL_MAKER_PRO_COLORS.iconTeal} />
        </View>
        
        {/* Title */}
        <Text style={styles.title}>{title}</Text>
        
        {/* Chevron - rotates when expanded */}
        <View style={[
          styles.chevronWrapper,
          isExpanded && styles.chevronRotated,
        ]}>
          <ChevronDownIcon size={20} color={DEAL_MAKER_PRO_COLORS.chevron} />
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.content}>
          {/* Slider inputs */}
          <View style={styles.slidersContainer}>
            {children}
          </View>

          {/* Summary/Derived Output Box */}
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
            <Text style={styles.ctaText}>
              {isLastTab ? 'Finish & Save Deal' : 'Continue to Next'}
            </Text>
            {!isLastTab && (
              <ArrowRightIcon size={20} color={DEAL_MAKER_PRO_COLORS.ctaText} />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// STYLES - Exact match to design specification
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: DEAL_MAKER_PRO_COLORS.cardBg,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: DEAL_MAKER_PRO_COLORS.cardBorder,
    overflow: 'hidden',
  },
  containerActive: {
    shadowColor: '#0891B2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 2,
    borderColor: DEAL_MAKER_PRO_COLORS.activeRing,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: DEAL_MAKER_PRO_COLORS.inputLabel,
  },
  chevronWrapper: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: DEAL_MAKER_PRO_COLORS.cardBorder,
  },
  slidersContainer: {
    marginTop: 16,
  },
  summaryBox: {
    backgroundColor: DEAL_MAKER_PRO_COLORS.summaryBg,
    borderWidth: 1,
    borderColor: DEAL_MAKER_PRO_COLORS.summaryBorder,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: DEAL_MAKER_PRO_COLORS.summaryLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.05 * 10,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: DEAL_MAKER_PRO_COLORS.summaryValue,
    fontVariant: ['tabular-nums'],
  },
  ctaButton: {
    backgroundColor: DEAL_MAKER_PRO_COLORS.ctaButton,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: DEAL_MAKER_PRO_COLORS.ctaText,
  },
});

export default WorksheetTab;
