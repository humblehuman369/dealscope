// ============================================
// DealScoreCard Component
// ============================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, useAnimatedScore, useScoreChange } from '../hooks/usePropertyAnalytics';
import { colors, typography, spacing, radius, componentStyles } from '../constants/theme';
import { DealScore } from '../types/analytics';

interface DealScoreCardProps {
  score: DealScore;
  onInfoPress?: () => void;
  onViewBreakdown?: () => void;
  compact?: boolean;
}

export const DealScoreCard: React.FC<DealScoreCardProps> = ({
  score,
  onInfoPress,
  onViewBreakdown,
  compact = false,
}) => {
  const { isDark, colors: themeColors } = useTheme();
  const displayScore = useAnimatedScore(score.score, 1000);
  const { improved, declined } = useScoreChange(score.score);
  
  // Pulse animation when score improves
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (improved) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
      ]).start();
    }
  }, [improved, pulseAnim]);

  // Get gradient colors based on score
  const getGradientColors = (): [string, string] => {
    if (score.score >= 70) {
      return ['rgba(34,197,94,0.15)', 'rgba(77,208,225,0.1)'];
    }
    if (score.score >= 50) {
      return ['rgba(249,115,22,0.15)', 'rgba(77,208,225,0.1)'];
    }
    return ['rgba(239,68,68,0.15)', 'rgba(77,208,225,0.1)'];
  };

  const getBorderColor = (): string => {
    if (score.score >= 70) return 'rgba(34,197,94,0.3)';
    if (score.score >= 50) return 'rgba(249,115,22,0.3)';
    return 'rgba(239,68,68,0.3)';
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, { borderColor: getBorderColor() }]}
        onPress={onViewBreakdown}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.compactGradient}
        >
          <View style={styles.compactContent}>
            <Text style={[styles.compactScore, { color: score.color }]}>
              {displayScore}
            </Text>
            <Text style={[styles.compactGrade, { color: score.color }]}>
              {score.grade}
            </Text>
          </View>
          <Text style={[styles.compactLabel, { color: themeColors.textMuted }]}>
            Deal Score
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
      <TouchableOpacity
        style={[styles.touchable, { borderColor: getBorderColor() }]}
        onPress={onViewBreakdown}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Info Button */}
          {onInfoPress && (
            <TouchableOpacity
              style={styles.infoButton}
              onPress={onInfoPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.infoIcon}>ⓘ</Text>
            </TouchableOpacity>
          )}

          {/* Label */}
          <Text style={[styles.label, { color: themeColors.textMuted }]}>
            Deal Score
          </Text>

          {/* Score Number */}
          <Text style={[styles.scoreNumber, { color: score.color }]}>
            {displayScore}
          </Text>

          {/* Grade Badge */}
          <View style={[styles.gradeBadge, { backgroundColor: `${score.color}20` }]}>
            <Text style={[styles.gradeText, { color: score.color }]}>
              {score.grade}
            </Text>
          </View>

          {/* Verdict */}
          <Text style={[styles.verdict, { color: score.color }]}>
            {score.verdict}
          </Text>

          {/* Hint */}
          <Text style={[styles.hint, { color: themeColors.textMuted }]}>
            Adjust terms below to improve
          </Text>

          {/* Score Change Indicator */}
          {improved && (
            <View style={styles.changeIndicator}>
              <Text style={styles.changeText}>↑ Score improved!</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  touchable: {
    borderRadius: componentStyles.dealScoreCard.borderRadius,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gradient: {
    padding: componentStyles.dealScoreCard.padding,
    minHeight: componentStyles.dealScoreCard.minHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: {
    fontSize: 16,
    color: colors.dark.textMuted,
  },
  label: {
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  scoreNumber: {
    fontSize: typography.sizes.hero,
    fontWeight: typography.weights.extrabold,
    lineHeight: typography.sizes.hero * 1.1,
  },
  gradeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  gradeText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  verdict: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    marginTop: spacing.xs,
  },
  hint: {
    fontSize: typography.sizes.caption,
    marginTop: spacing.xs,
  },
  changeIndicator: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  changeText: {
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.semibold,
    color: colors.success,
  },
  // Compact styles
  compactContainer: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  compactGradient: {
    padding: spacing.md,
    alignItems: 'center',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  compactScore: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.extrabold,
  },
  compactGrade: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
  },
  compactLabel: {
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.medium,
    marginTop: spacing.xxs,
  },
});

export default DealScoreCard;
