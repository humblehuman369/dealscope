/**
 * WorksheetTab - Accordion tab component for Deal Maker worksheet
 * Features: Expand/collapse, status indicators, derived output box, continue button
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  LayoutAnimation, 
  Platform, 
  UIManager 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors } from '../../theme/colors';
import { WorksheetTabProps, TabStatus } from './types';

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
  const { title, icon, status, order } = config;

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
    <View style={styles.container}>
      {/* Tab Header */}
      <TouchableOpacity 
        style={[
          styles.header,
          isExpanded && styles.headerExpanded,
          status === 'completed' && styles.headerCompleted,
        ]} 
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          {/* Status Indicator */}
          <StatusIndicator status={status} order={order} />
          
          {/* Icon and Title */}
          <Text style={styles.icon}>{icon}</Text>
          <Text style={[
            styles.title,
            status === 'pending' && styles.titlePending,
          ]}>
            {title}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Ionicons 
            name={isExpanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={status === 'pending' ? colors.gray[400] : colors.gray[600]} 
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.content}>
          {/* Slider inputs */}
          <View style={styles.slidersContainer}>
            {children}
          </View>

          {/* Derived Output Box */}
          {derivedOutput && (
            <View style={styles.derivedBox}>
              <Text style={styles.derivedLabel}>{derivedOutput.label}</Text>
              <Text style={styles.derivedValue}>{derivedOutput.value}</Text>
            </View>
          )}

          {/* Continue Button */}
          <TouchableOpacity 
            style={styles.continueButton} 
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueText}>
              {isLastTab ? 'Finish & Save Deal' : `Continue to Next →`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// STATUS INDICATOR
// =============================================================================

interface StatusIndicatorProps {
  status: TabStatus;
  order: number;
}

function StatusIndicator({ status, order }: StatusIndicatorProps) {
  if (status === 'completed') {
    return (
      <View style={[styles.statusCircle, styles.statusCompleted]}>
        <Ionicons name="checkmark" size={14} color={colors.white} />
      </View>
    );
  }

  return (
    <View style={[
      styles.statusCircle,
      status === 'active' && styles.statusActive,
      status === 'pending' && styles.statusPending,
    ]}>
      <Text style={[
        styles.statusNumber,
        status === 'active' && styles.statusNumberActive,
      ]}>
        {order}
      </Text>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0,
  },
  headerExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerCompleted: {
    backgroundColor: colors.gray[50],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  statusActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  statusCompleted: {
    borderColor: colors.profit.main,
    backgroundColor: colors.profit.main,
    borderWidth: 0,
  },
  statusPending: {
    borderColor: colors.gray[300],
    backgroundColor: colors.gray[50],
  },
  statusNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gray[500],
  },
  statusNumberActive: {
    color: colors.primary[600],
  },
  icon: {
    fontSize: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
  },
  titlePending: {
    color: colors.gray[400],
  },
  content: {
    padding: 16,
    paddingTop: 20,
  },
  slidersContainer: {
    marginBottom: 16,
  },
  derivedBox: {
    backgroundColor: colors.gray[50],
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  derivedLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  derivedValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.gray[900],
  },
  continueButton: {
    backgroundColor: colors.primary[600],
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});

export default WorksheetTab;
