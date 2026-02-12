/**
 * Progressive Profiling Prompt
 *
 * Bottom-sheet overlay for collecting user profile during analysis flow.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../context/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 420;

type QuestionType = 'experience' | 'strategies' | 'budget';

interface ProgressiveProfilingPromptProps {
  visible: boolean;
  question: QuestionType | null;
  onAnswer: (answer: unknown) => void;
  onSkip: () => void;
  onClose: () => void;
}

const EXPERIENCE_OPTIONS = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'expert', label: 'Expert' },
];

const STRATEGY_OPTIONS = [
  { id: 'ltr', label: 'LTR' },
  { id: 'str', label: 'STR' },
  { id: 'brrrr', label: 'BRRRR' },
  { id: 'flip', label: 'Flip' },
  { id: 'house_hack', label: 'House Hack' },
  { id: 'wholesale', label: 'Wholesale' },
];

const BUDGET_OPTIONS = [
  { id: 'under_100k', label: 'Under $100K' },
  { id: '100k_250k', label: '$100K-$250K' },
  { id: '250k_500k', label: '$250K-$500K' },
  { id: '500k_1m', label: '$500K-$1M' },
  { id: '1m_plus', label: '$1M+' },
];

export default function ProgressiveProfilingPrompt({
  visible,
  question,
  onAnswer,
  onSkip,
  onClose,
}: ProgressiveProfilingPromptProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SHEET_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  useEffect(() => {
    if (!visible) {
      setSelectedExperience(null);
      setSelectedStrategies([]);
      setSelectedBudget(null);
    }
  }, [visible]);

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#0d9488';

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip();
  };

  const handleConfirm = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (question === 'experience' && selectedExperience) {
      onAnswer(selectedExperience);
    }
    if (question === 'strategies' && selectedStrategies.length > 0) {
      onAnswer(selectedStrategies);
    }
    if (question === 'budget' && selectedBudget) {
      onAnswer(selectedBudget);
    }
  };

  const canConfirm =
    (question === 'experience' && selectedExperience) ||
    (question === 'strategies' && selectedStrategies.length > 0) ||
    (question === 'budget' && selectedBudget);

  const toggleStrategy = (id: string) => {
    setSelectedStrategies((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const getTitle = () => {
    if (question === 'experience') return "What's your investing experience?";
    if (question === 'strategies') return 'What strategies interest you?';
    if (question === 'budget') return "What's your investment budget?";
    return '';
  };

  if (!visible) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: backdropAnim,
          }}
        />
      </TouchableWithoutFeedback>

      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: cardBg,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 12,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: 20,
          transform: [{ translateY: slideAnim }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 20,
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <View
            style={{
              width: 40,
              height: 4,
              backgroundColor: borderColor,
              borderRadius: 2,
            }}
          />
        </View>

        <Text style={{ fontSize: 20, fontWeight: '700', color: textColor, marginBottom: 6 }}>
          {getTitle()}
        </Text>
        <Text style={{ fontSize: 14, color: mutedColor, marginBottom: 20 }}>
          This helps us personalize your experience
        </Text>

        {question === 'experience' && (
          <View style={{ gap: 10 }}>
            {EXPERIENCE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedExperience(opt.id);
                }}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  backgroundColor: selectedExperience === opt.id ? accentColor : bg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: selectedExperience === opt.id ? accentColor : borderColor,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: selectedExperience === opt.id ? '#fff' : textColor,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {question === 'strategies' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {STRATEGY_OPTIONS.map((opt) => {
              const isSelected = selectedStrategies.includes(opt.id);
              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    toggleStrategy(opt.id);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: isSelected ? accentColor : bg,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isSelected ? accentColor : borderColor,
                  }}
                >
                  {isSelected && <Ionicons name="checkmark" size={18} color="#fff" />}
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: isSelected ? '#fff' : textColor,
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {question === 'budget' && (
          <View style={{ gap: 10 }}>
            {BUDGET_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedBudget(opt.id);
                }}
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  backgroundColor: selectedBudget === opt.id ? accentColor : bg,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: selectedBudget === opt.id ? accentColor : borderColor,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: selectedBudget === opt.id ? '#fff' : textColor,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {canConfirm && (
          <TouchableOpacity
            onPress={handleConfirm}
            style={{
              marginTop: 24,
              paddingVertical: 14,
              backgroundColor: accentColor,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Confirm</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleSkip}
          style={{ marginTop: 16, paddingVertical: 8, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 14, color: mutedColor, textDecorationLine: 'underline' }}>
            Skip
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
