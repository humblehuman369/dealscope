/**
 * IQAnalyzingScreen - Loading screen shown while IQ analyzes all 6 strategies
 * Displays animated progress with sequential checkmarks for each strategy
 * Includes micro-tips, time estimate, and slow connection fallback
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { IQ_COLORS, STRATEGY_INFO, IQStrategyId, IQProperty } from './types';

// Strategy list for progress display (in analysis order)
const STRATEGIES: { id: IQStrategyId; name: string }[] = [
  { id: 'long-term-rental', name: 'Long-Term Rental' },
  { id: 'short-term-rental', name: 'Short-Term Rental' },
  { id: 'brrrr', name: 'BRRRR' },
  { id: 'fix-and-flip', name: 'Fix & Flip' },
  { id: 'house-hack', name: 'House Hack' },
  { id: 'wholesale', name: 'Wholesale' },
];

// Irregular intervals for progress bar psychology (fast start, slight pause, fast finish)
const PROGRESS_INTERVALS = [300, 500, 350, 600, 400, 450];

// Rotating micro-tips to show during analysis
const MICRO_TIPS = [
  'IQ checks 47 data points per strategy...',
  'Comparing against 12 recent sales nearby...',
  'Calculating cash-on-cash for 3 financing scenarios...',
  'Analyzing rental comps within 0.5 miles...',
  'Evaluating exit strategy options...',
  'Computing breakeven occupancy rates...',
];

interface IQAnalyzingScreenProps {
  property: IQProperty;
  onAnalysisComplete: () => void;
  minimumDisplayTime?: number; // ms to show screen before transitioning
}

export function IQAnalyzingScreen({
  property,
  onAnalysisComplete,
  minimumDisplayTime = 2800,
}: IQAnalyzingScreenProps) {
  const [completedStrategies, setCompletedStrategies] = useState<number>(0);
  const [currentTipIndex, setCurrentTipIndex] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const progressIndexRef = useRef(0);

  // Pulse animation for IQ icon
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // infinite
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Staggered progress animation with irregular intervals
  useEffect(() => {
    const runProgress = () => {
      if (progressIndexRef.current < STRATEGIES.length) {
        const delay = PROGRESS_INTERVALS[progressIndexRef.current];
        setTimeout(() => {
          setCompletedStrategies(prev => prev + 1);
          progressIndexRef.current += 1;
          runProgress();
        }, delay);
      }
    };
    runProgress();
  }, []);

  // Rotating micro-tips every 2.5 seconds
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % MICRO_TIPS.length);
    }, 2500);

    return () => clearInterval(tipInterval);
  }, []);

  // Track elapsed time for slow connection fallback
  useEffect(() => {
    const elapsedInterval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(elapsedInterval);
  }, []);

  // Auto-transition after minimum display time
  useEffect(() => {
    const timer = setTimeout(() => {
      onAnalysisComplete();
    }, minimumDisplayTime);

    return () => clearTimeout(timer);
  }, [minimumDisplayTime, onAnalysisComplete]);

  // Show slow connection message after 15 seconds
  const showSlowMessage = elapsedSeconds >= 15;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor={IQ_COLORS.deepNavy} />

      <View style={styles.content}>
        {/* Animated IQ Icon */}
        <Animated.View style={[styles.iconContainer, pulseStyle]}>
          <View style={styles.iqIconInner}>
            <Text style={styles.iqText}>IQ</Text>
          </View>
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>IQ is Analyzing...</Text>
        <Text style={styles.subtitle}>Evaluating 6 investment strategies</Text>

        {/* Time Estimate */}
        <Text style={styles.timeEstimate}>Usually takes 8-12 seconds</Text>

        {/* Progress List */}
        <View style={styles.progressList}>
          {STRATEGIES.map((strategy, index) => {
            const isComplete = index < completedStrategies;
            const isCurrent = index === completedStrategies;

            return (
              <View
                key={strategy.id}
                style={[
                  styles.progressItem,
                  { opacity: isComplete ? 1 : isCurrent ? 0.7 : 0.4 },
                ]}
              >
                <View
                  style={[
                    styles.checkCircle,
                    {
                      backgroundColor: isComplete
                        ? IQ_COLORS.success
                        : '#1E293B',
                    },
                  ]}
                >
                  {isComplete && (
                    <Animated.View entering={FadeIn.duration(300)}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </Animated.View>
                  )}
                </View>
                <Text
                  style={[
                    styles.strategyName,
                    {
                      color: isComplete ? '#FFFFFF' : IQ_COLORS.slateLight,
                    },
                  ]}
                >
                  {strategy.name}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Micro-tips */}
        <View style={styles.microTipContainer}>
          <Animated.Text 
            key={currentTipIndex}
            entering={FadeIn.duration(300)}
            style={styles.microTip}
          >
            {MICRO_TIPS[currentTipIndex]}
          </Animated.Text>
        </View>

        {/* Slow Connection Fallback */}
        {showSlowMessage && (
          <Animated.View 
            entering={FadeIn.duration(400)}
            style={styles.slowMessageContainer}
          >
            <Text style={styles.slowMessage}>
              Taking longer than usual — complex property. Almost done...
            </Text>
          </Animated.View>
        )}

        {/* Property Reference */}
        <View style={styles.propertyRef}>
          <Text style={styles.propertyAddress} numberOfLines={1}>
            {property.address}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: IQ_COLORS.deepNavy,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  // IQ Icon Animation
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: IQ_COLORS.electricCyan + '25',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  iqIconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: IQ_COLORS.electricCyan + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iqText: {
    fontSize: 32,
    fontWeight: '800',
    color: IQ_COLORS.electricCyan,
  },

  // Text
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: IQ_COLORS.slateLight,
    marginBottom: 8,
  },
  timeEstimate: {
    fontSize: 11,
    color: IQ_COLORS.slate,
    marginBottom: 32,
  },

  // Progress List
  progressList: {
    width: '100%',
    maxWidth: 260,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  strategyName: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Micro-tips
  microTipContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: IQ_COLORS.electricCyan + '10',
    borderRadius: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  microTip: {
    fontSize: 12,
    color: IQ_COLORS.electricCyan,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Slow Connection Message
  slowMessageContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: IQ_COLORS.warning + '15',
    borderRadius: 8,
  },
  slowMessage: {
    fontSize: 11,
    color: IQ_COLORS.warning,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Property Reference
  propertyRef: {
    position: 'absolute',
    bottom: 40,
    left: 32,
    right: 32,
    alignItems: 'center',
  },
  propertyAddress: {
    fontSize: 13,
    color: IQ_COLORS.slate,
  },
});

export default IQAnalyzingScreen;
