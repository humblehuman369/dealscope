/**
 * MetricsAccordion Component
 * 
 * A reusable collapsible accordion for displaying metrics with grades.
 * Used for Return Metrics, Cash Flow & Risk, and At-a-Glance sections.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Types
export type MetricGrade = 'A' | 'B' | 'C' | 'D';
export type MetricGradeLabel = 'STRONG' | 'MODERATE' | 'POTENTIAL' | 'WEAK';

export interface MetricItem {
  label: string;
  sublabel?: string;
  value: string;
  grade: MetricGrade;
  gradeLabel: MetricGradeLabel;
}

export interface MetricsAccordionProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  metrics: MetricItem[];
  defaultExpanded?: boolean;
  isDark?: boolean;
  subtitle?: string;
}

// Grade badge colors
const GRADE_COLORS: Record<MetricGrade, { bg: string; text: string }> = {
  A: { bg: '#dcfce7', text: '#16a34a' }, // Green
  B: { bg: '#dbeafe', text: '#2563eb' }, // Blue
  C: { bg: '#fef3c7', text: '#d97706' }, // Amber
  D: { bg: '#fee2e2', text: '#dc2626' }, // Red
};

const GRADE_COLORS_DARK: Record<MetricGrade, { bg: string; text: string }> = {
  A: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22c55e' }, // Green
  B: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6' }, // Blue
  C: { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b' }, // Amber
  D: { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' }, // Red
};

export function MetricsAccordion({
  title,
  icon,
  metrics,
  defaultExpanded = true,
  isDark = false,
  subtitle,
}: MetricsAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isExpanded]);

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const getGradeColors = (grade: MetricGrade) => {
    return isDark ? GRADE_COLORS_DARK[grade] : GRADE_COLORS[grade];
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F1D32' : 'white' }]}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={handleToggle} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(8, 145, 178, 0.15)' : 'rgba(8, 145, 178, 0.1)' }]}>
            <Ionicons name={icon} size={18} color="#0891B2" />
          </View>
          <View>
            <Text style={[styles.title, { color: isDark ? 'white' : '#0A1628' }]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: isDark ? 'rgba(255,255,255,0.5)' : '#94A3B8' }]}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons 
            name="chevron-up" 
            size={20} 
            color={isDark ? 'rgba(255,255,255,0.5)' : '#94A3B8'} 
          />
        </Animated.View>
      </TouchableOpacity>

      {/* Content */}
      {isExpanded && (
        <View style={styles.content}>
          {metrics.map((metric, index) => (
            <View 
              key={index} 
              style={[
                styles.metricRow,
                index !== metrics.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                }
              ]}
            >
              <View style={styles.metricInfo}>
                <Text style={[styles.metricLabel, { color: isDark ? 'white' : '#0A1628' }]}>
                  {metric.label}
                </Text>
                {metric.sublabel && (
                  <Text style={[styles.metricSublabel, { color: isDark ? 'rgba(255,255,255,0.5)' : '#94A3B8' }]}>
                    {metric.sublabel}
                  </Text>
                )}
              </View>
              <View style={styles.metricValueContainer}>
                <Text style={[styles.metricValue, { color: isDark ? 'white' : '#0A1628' }]}>
                  {metric.value}
                </Text>
                <View style={[styles.gradeBadge, { backgroundColor: getGradeColors(metric.grade).bg }]}>
                  <Text style={[styles.gradeText, { color: getGradeColors(metric.grade).text }]}>
                    {metric.gradeLabel} {metric.grade}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  metricInfo: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  metricSublabel: {
    fontSize: 11,
    marginTop: 2,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  gradeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default MetricsAccordion;
