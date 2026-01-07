/**
 * DealScoreCard - Animated Deal Score gauge component
 * Shows score 0-100 with grade, label, and animated number
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { DealScore } from './types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface DealScoreCardProps {
  score: DealScore;
  onInfoPress?: () => void;
  isDark?: boolean;
}

export function DealScoreCard({ score, onInfoPress, isDark = true }: DealScoreCardProps) {
  // Animated value for score
  const animatedScore = useSharedValue(0);
  const displayScore = useSharedValue(0);
  
  // Animate score on mount and when it changes
  useEffect(() => {
    animatedScore.value = withTiming(score.score, {
      duration: 1200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    
    // Animate display number
    const startScore = displayScore.value;
    const endScore = score.score;
    const duration = 1200;
    const startTime = Date.now();
    
    const updateScore = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      displayScore.value = Math.round(startScore + (endScore - startScore) * eased);
      
      if (progress < 1) {
        requestAnimationFrame(updateScore);
      }
    };
    requestAnimationFrame(updateScore);
  }, [score.score]);

  // Circle dimensions
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Animated stroke dashoffset
  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (circumference * animatedScore.value) / 100;
    return {
      strokeDashoffset,
    };
  });

  // Dynamic colors
  const bgColor = isDark ? 'rgba(255,255,255,0.03)' : '#ffffff';
  const borderColor = `${score.color}40`;
  const bgGradient = score.score >= 60 
    ? isDark 
      ? 'rgba(34,197,94,0.08)' 
      : 'rgba(34,197,94,0.05)'
    : isDark 
      ? 'rgba(249,115,22,0.08)' 
      : 'rgba(249,115,22,0.05)';

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: bgGradient,
        borderColor: borderColor,
      }
    ]}>
      {/* Info button */}
      {onInfoPress && (
        <TouchableOpacity style={styles.infoButton} onPress={onInfoPress}>
          <Ionicons 
            name="information-circle-outline" 
            size={20} 
            color={isDark ? '#6b7280' : '#9ca3af'} 
          />
        </TouchableOpacity>
      )}

      {/* Score Label */}
      <Text style={[styles.label, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
        Deal Score
      </Text>

      {/* Gauge */}
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size} style={styles.gauge}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            {/* Background circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)'}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Animated progress circle */}
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={score.color}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animatedProps={animatedProps}
            />
          </G>
        </Svg>
        
        {/* Center content */}
        <View style={styles.gaugeCenter}>
          <AnimatedScoreNumber 
            score={score.score} 
            color={score.color} 
          />
          <View style={[styles.gradeBadge, { backgroundColor: `${score.color}20` }]}>
            <Text style={[styles.gradeText, { color: score.color }]}>
              {score.grade}
            </Text>
          </View>
        </View>
      </View>

      {/* Verdict */}
      <Text style={[styles.verdict, { color: score.color }]}>
        {score.label}
      </Text>
      
      {/* Hint */}
      <Text style={[styles.hint, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
        Adjust terms below to improve
      </Text>
    </View>
  );
}

// Animated score number component
function AnimatedScoreNumber({ score, color }: { score: number; color: string }) {
  const [displayValue, setDisplayValue] = React.useState(0);
  
  useEffect(() => {
    const startValue = displayValue;
    const endValue = score;
    const duration = 1200;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * eased);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [score]);

  return (
    <Text style={[styles.scoreNumber, { color }]}>
      {displayValue}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
  },
  infoButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  gaugeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gauge: {
    transform: [{ rotate: '0deg' }],
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 52,
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  gradeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  verdict: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
});

