import { ScreenErrorFallback as ErrorBoundary } from '../../components/ScreenErrorFallback';
export { ErrorBoundary };

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { userService } from '../../services/userService';
import type { OnboardingProgress } from '../../types';

// ===========================================
// Constants
// ===========================================

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Just Getting Started', desc: 'New to real estate investing', icon: 'leaf-outline' },
  { value: 'intermediate', label: 'Some Experience', desc: '1-5 deals completed', icon: 'trending-up-outline' },
  { value: 'advanced', label: 'Experienced Investor', desc: '5-20 deals under your belt', icon: 'flag-outline' },
  { value: 'expert', label: 'Expert / Full-Time', desc: '20+ deals, investing is your business', icon: 'trophy-outline' },
];

const STRATEGIES = [
  { id: 'ltr', label: 'Long-Term Rental', desc: 'Buy and hold for monthly cash flow', icon: 'home-outline', color: '#3b82f6' },
  { id: 'str', label: 'Short-Term Rental', desc: 'Airbnb/VRBO vacation rentals', icon: 'bed-outline', color: '#8b5cf6' },
  { id: 'brrrr', label: 'BRRRR', desc: 'Buy, Rehab, Rent, Refinance, Repeat', icon: 'refresh-outline', color: '#f97316' },
  { id: 'flip', label: 'Fix & Flip', desc: 'Renovate and sell for profit', icon: 'hammer-outline', color: '#ec4899' },
  { id: 'house_hack', label: 'House Hack', desc: 'Live in one unit, rent the others', icon: 'people-outline', color: '#22c55e' },
  { id: 'wholesale', label: 'Wholesale', desc: 'Assign contracts for assignment fees', icon: 'document-text-outline', color: '#06b6d4' },
];

const FINANCING_TYPES = [
  { id: 'conventional', label: 'Conventional', desc: 'Traditional 20% down', defaultDown: 0.20, icon: 'business-outline' },
  { id: 'fha', label: 'FHA', desc: 'Low down payment (3.5%)', defaultDown: 0.035, icon: 'home-outline' },
  { id: 'va', label: 'VA', desc: 'Zero down for veterans', defaultDown: 0, icon: 'shield-outline' },
  { id: 'cash', label: 'Cash', desc: 'All-cash, no financing', defaultDown: 1.0, icon: 'cash-outline' },
  { id: 'hard_money', label: 'Hard Money', desc: 'Short-term for flips/BRRRR', defaultDown: 0.10, icon: 'flash-outline' },
];

const DOWN_PAYMENT_OPTIONS = [
  { value: 0, label: '0%', desc: 'VA' },
  { value: 0.035, label: '3.5%', desc: 'FHA' },
  { value: 0.05, label: '5%', desc: 'Low' },
  { value: 0.10, label: '10%', desc: 'Hard' },
  { value: 0.20, label: '20%', desc: 'Conv' },
  { value: 0.25, label: '25%', desc: 'Inv' },
];

const BUDGET_RANGES = [
  { min: 0, max: 100000, label: 'Under $100K' },
  { min: 100000, max: 250000, label: '$100K - $250K' },
  { min: 250000, max: 500000, label: '$250K - $500K' },
  { min: 500000, max: 1000000, label: '$500K - $1M' },
  { min: 1000000, max: 5000000, label: '$1M - $5M' },
  { min: 5000000, max: 999999999, label: '$5M+' },
];

const RISK_LEVELS = [
  { value: 'conservative', label: 'Conservative', desc: 'Stable returns, lower risk', color: '#22c55e' },
  { value: 'moderate', label: 'Moderate', desc: 'Balanced approach', color: '#eab308' },
  { value: 'aggressive', label: 'Aggressive', desc: 'Higher risk, higher returns', color: '#ef4444' },
];

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const POPULAR_MARKETS = ['FL', 'TX', 'NC', 'AZ', 'GA', 'TN', 'OH', 'IN'];

const TOTAL_STEPS = 5;

// ===========================================
// Types
// ===========================================

interface FormData {
  investment_experience: string;
  preferred_strategies: string[];
  financing_type: string;
  down_payment_pct: number;
  investment_budget_min: number;
  investment_budget_max: number;
  risk_tolerance: string;
  target_markets: string[];
}

// ===========================================
// Onboarding Screen
// ===========================================

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  const { isDark } = useTheme();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    investment_experience: '',
    preferred_strategies: [],
    financing_type: 'conventional',
    down_payment_pct: 0.20,
    investment_budget_min: 0,
    investment_budget_max: 500000,
    risk_tolerance: 'moderate',
    target_markets: [],
  });

  const completionAnim = useRef(new Animated.Value(0)).current;

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#0d9488';

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const buildProfileData = useCallback((step: number): Record<string, unknown> => {
    const data: Record<string, unknown> = {};
    if (step >= 0) data.investment_experience = formData.investment_experience;
    if (step >= 1) data.preferred_strategies = formData.preferred_strategies;
    if (step >= 2) {
      data.default_assumptions = { financing: { down_payment_pct: formData.down_payment_pct } };
    }
    if (step >= 3) {
      data.investment_budget_min = formData.investment_budget_min;
      data.investment_budget_max = formData.investment_budget_max;
      data.risk_tolerance = formData.risk_tolerance;
      data.target_cash_on_cash = 0.08;
      data.target_cap_rate = 0.06;
    }
    if (step >= 4) data.target_markets = formData.target_markets;
    return data;
  }, [formData]);

  const saveProgress = useCallback(async (step: number, completed: boolean): Promise<boolean> => {
    setIsSaving(true);
    if (completed) setIsCompleting(true);
    setError(null);

    try {
      const profileData = buildProfileData(step);
      const payload: OnboardingProgress = {
        step: step + 1,
        completed,
        data: profileData,
      };
      await userService.updateOnboarding(payload);

      if (completed) {
        await userService.completeOnboarding();
        await refreshUser();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        completionAnim.setValue(0);
        Animated.timing(completionAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start(() => {
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 800);
        });
        return true;
      }
      return true;
    } catch (err: unknown) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err instanceof Error ? err.message : 'Failed to save');
      return false;
    } finally {
      setIsSaving(false);
      if (!completed) setIsCompleting(false);
    }
  }, [buildProfileData, refreshUser, router, completionAnim]);

  const handleNext = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep < TOTAL_STEPS - 1) {
      const success = await saveProgress(currentStep, false);
      if (success) setCurrentStep((prev) => prev + 1);
    } else {
      await saveProgress(currentStep, true);
    }
  }, [currentStep, saveProgress]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  }, [currentStep]);

  const handleSkip = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await saveProgress(TOTAL_STEPS - 1, true);
  }, [saveProgress]);

  const toggleStrategy = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormData((prev) => ({
      ...prev,
      preferred_strategies: prev.preferred_strategies.includes(id)
        ? prev.preferred_strategies.filter((s) => s !== id)
        : [...prev.preferred_strategies, id],
    }));
  }, []);

  const toggleMarket = useCallback((state: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormData((prev) => ({
      ...prev,
      target_markets: prev.target_markets.includes(state)
        ? prev.target_markets.filter((s) => s !== state)
        : [...prev.target_markets, state],
    }));
  }, []);

  const selectFinancing = useCallback((financing: (typeof FINANCING_TYPES)[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormData((prev) => ({
      ...prev,
      financing_type: financing.id,
      down_payment_pct: financing.defaultDown,
    }));
  }, []);

  const selectBudget = useCallback((range: (typeof BUDGET_RANGES)[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormData((prev) => ({
      ...prev,
      investment_budget_min: range.min,
      investment_budget_max: range.max,
    }));
  }, []);

  const canContinue =
    (currentStep === 0 && formData.investment_experience) ||
    (currentStep === 1 && formData.preferred_strategies.length > 0) ||
    currentStep >= 2;

  // Loading state
  if (authLoading || !isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  // Completion animation screen
  if (isCompleting) {
    const scale = completionAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
    const opacity = completionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

    return (
      <View style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <Animated.View style={{ alignItems: 'center', opacity, transform: [{ scale }] }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#22c55e33', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
            <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: textColor, marginBottom: 8 }}>Setup Complete!</Text>
          <Text style={{ fontSize: 15, color: mutedColor }}>Taking you to your dashboard...</Text>
          <ActivityIndicator size="small" color={accentColor} style={{ marginTop: 24 }} />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: accentColor + '22', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="sparkles" size={20} color={accentColor} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: textColor }}>DealGapIQ</Text>
        </View>
        <TouchableOpacity
          onPress={handleSkip}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          accessibilityHint="Skips setup and goes to dashboard"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}
        >
          <Ionicons name="arrow-forward" size={16} color={accentColor} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: accentColor }}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              accessibilityLabel={`Step ${i + 1} of ${TOTAL_STEPS}${i <= currentStep ? ', completed' : ''}`}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: i <= currentStep ? accentColor : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
              }}
            />
          ))}
        </View>
        <Text style={{ fontSize: 13, color: mutedColor, marginTop: 8 }}>Step {currentStep + 1} of {TOTAL_STEPS}</Text>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {error && (
          <View style={{ backgroundColor: isDark ? '#450a0a33' : '#fef2f2', padding: 12, borderRadius: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="alert-circle" size={16} color="#ef4444" />
            <Text style={{ color: '#ef4444', fontSize: 13, flex: 1 }}>{error}</Text>
          </View>
        )}

        {/* Step 1: Experience */}
        {currentStep === 0 && (
          <View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: textColor, textAlign: 'center', marginBottom: 8 }}>Welcome to DealGapIQ! 👋</Text>
            <Text style={{ fontSize: 15, color: mutedColor, textAlign: 'center', marginBottom: 24 }}>Let's personalize DealGapIQ for you. How much investing have you done?</Text>
            <View style={{ gap: 12 }}>
              {EXPERIENCE_LEVELS.map((level) => {
                const isSelected = formData.investment_experience === level.value;
                return (
                  <TouchableOpacity
                    key={level.value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFormData((prev) => ({ ...prev, investment_experience: level.value }));
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${level.label}: ${level.desc}`}
                    accessibilityState={{ selected: isSelected }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 16,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: isSelected ? accentColor : borderColor,
                      backgroundColor: isSelected ? accentColor + '15' : (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                    }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isSelected ? accentColor + '30' : (isDark ? '#334155' : '#e2e8f0'), justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                      <Ionicons name={level.icon as any} size={24} color={isSelected ? accentColor : mutedColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: textColor }}>{level.label}</Text>
                      <Text style={{ fontSize: 13, color: mutedColor, marginTop: 2 }}>{level.desc}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={accentColor} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Step 2: Strategies */}
        {currentStep === 1 && (
          <View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: textColor, textAlign: 'center', marginBottom: 8 }}>What strategies interest you?</Text>
            <Text style={{ fontSize: 15, color: mutedColor, textAlign: 'center', marginBottom: 24 }}>Select all that apply. We'll customize your analytics accordingly.</Text>
            <View style={{ gap: 12 }}>
              {STRATEGIES.map((strategy) => {
                const isSelected = formData.preferred_strategies.includes(strategy.id);
                return (
                  <TouchableOpacity
                    key={strategy.id}
                    onPress={() => toggleStrategy(strategy.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${strategy.label}: ${strategy.desc}`}
                    accessibilityState={{ selected: isSelected }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 16,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: isSelected ? accentColor : borderColor,
                      backgroundColor: isSelected ? accentColor + '15' : (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                    }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: strategy.color + '30', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                      <Ionicons name={strategy.icon as any} size={22} color={strategy.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: textColor }}>{strategy.label}</Text>
                      <Text style={{ fontSize: 13, color: mutedColor, marginTop: 2 }}>{strategy.desc}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={accentColor} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            {formData.preferred_strategies.length === 0 && (
              <Text style={{ fontSize: 13, color: mutedColor, textAlign: 'center', marginTop: 12 }}>Select at least one strategy to continue</Text>
            )}
          </View>
        )}

        {/* Step 3: Financing */}
        {currentStep === 2 && (
          <View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: textColor, textAlign: 'center', marginBottom: 8 }}>Your Financing Terms</Text>
            <Text style={{ fontSize: 15, color: mutedColor, textAlign: 'center', marginBottom: 24 }}>How do you typically finance deals? We'll use this for all analyses.</Text>

            <Text style={{ fontSize: 14, fontWeight: '600', color: mutedColor, marginBottom: 12 }}>Financing Type</Text>
            <View style={{ gap: 10, marginBottom: 24 }}>
              {FINANCING_TYPES.map((financing) => {
                const isSelected = formData.financing_type === financing.id;
                return (
                  <TouchableOpacity
                    key={financing.id}
                    onPress={() => selectFinancing(financing)}
                    accessibilityRole="button"
                    accessibilityLabel={`${financing.label}: ${financing.desc}`}
                    accessibilityState={{ selected: isSelected }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: isSelected ? accentColor : borderColor,
                      backgroundColor: isSelected ? accentColor + '15' : (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                    }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: isDark ? '#334155' : '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Ionicons name={financing.icon as any} size={20} color={isSelected ? accentColor : mutedColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: textColor }}>{financing.label}</Text>
                      <Text style={{ fontSize: 12, color: mutedColor, marginTop: 2 }}>{financing.desc}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={accentColor} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ fontSize: 14, fontWeight: '600', color: mutedColor, marginBottom: 12 }}>Default Down Payment</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DOWN_PAYMENT_OPTIONS.map((opt) => {
                const isSelected = Math.abs(formData.down_payment_pct - opt.value) < 0.001;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFormData((prev) => ({ ...prev, down_payment_pct: opt.value }));
                    }}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: isSelected ? accentColor : borderColor,
                      backgroundColor: isSelected ? accentColor + '20' : (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>{opt.label}</Text>
                    <Text style={{ fontSize: 11, color: mutedColor }}>{opt.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ marginTop: 20, padding: 14, borderRadius: 12, backgroundColor: accentColor + '15', borderWidth: 1, borderColor: accentColor + '40' }}>
              <Text style={{ fontSize: 12, color: accentColor, lineHeight: 18 }}>
                <Text style={{ fontWeight: '600' }}>How this is used:</Text> Your income value and target buy price are calculated using these terms. You can customize anytime in Settings.
              </Text>
            </View>
          </View>
        )}

        {/* Step 4: Goals */}
        {currentStep === 3 && (
          <View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: textColor, textAlign: 'center', marginBottom: 8 }}>Investment Goals</Text>
            <Text style={{ fontSize: 15, color: mutedColor, textAlign: 'center', marginBottom: 24 }}>Set your budget range and risk tolerance.</Text>

            <Text style={{ fontSize: 14, fontWeight: '600', color: mutedColor, marginBottom: 12 }}>Investment Budget per Deal</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {BUDGET_RANGES.map((range) => {
                const isSelected = formData.investment_budget_min === range.min && formData.investment_budget_max === range.max;
                return (
                  <TouchableOpacity
                    key={range.label}
                    onPress={() => selectBudget(range)}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: isSelected ? accentColor : borderColor,
                      backgroundColor: isSelected ? accentColor + '15' : (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: textColor }}>{range.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ fontSize: 14, fontWeight: '600', color: mutedColor, marginBottom: 12 }}>Risk Tolerance</Text>
            <View style={{ gap: 10 }}>
              {RISK_LEVELS.map((level) => {
                const isSelected = formData.risk_tolerance === level.value;
                return (
                  <TouchableOpacity
                    key={level.value}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setFormData((prev) => ({ ...prev, risk_tolerance: level.value }));
                    }}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: isSelected ? level.color : borderColor,
                      backgroundColor: isSelected ? level.color + '20' : (isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'),
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '600', color: textColor }}>{level.label}</Text>
                    <Text style={{ fontSize: 12, color: mutedColor, marginTop: 2 }}>{level.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Step 5: Markets */}
        {currentStep === 4 && (
          <View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: textColor, textAlign: 'center', marginBottom: 8 }}>Where do you want to invest?</Text>
            <Text style={{ fontSize: 15, color: mutedColor, textAlign: 'center', marginBottom: 24 }}>Select your target markets. You can always change this later.</Text>

            <Text style={{ fontSize: 14, fontWeight: '600', color: mutedColor, marginBottom: 10 }}>Popular markets</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {POPULAR_MARKETS.map((state) => {
                const isSelected = formData.target_markets.includes(state);
                return (
                  <TouchableOpacity
                    key={state}
                    onPress={() => toggleMarket(state)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      backgroundColor: isSelected ? accentColor : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'),
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: isSelected ? '#fff' : textColor }}>{state}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ fontSize: 14, fontWeight: '600', color: mutedColor, marginBottom: 10 }}>All states</Text>
            <View style={{ maxHeight: 200, padding: 12, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', borderWidth: 1, borderColor }}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true} style={{ maxHeight: 180 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {US_STATES.map((state) => {
                    const isSelected = formData.target_markets.includes(state);
                    return (
                      <TouchableOpacity
                        key={state}
                        onPress={() => toggleMarket(state)}
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderRadius: 6,
                          backgroundColor: isSelected ? accentColor : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '500', color: isSelected ? '#fff' : mutedColor }}>{state}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {formData.target_markets.length > 0 && (
              <Text style={{ fontSize: 13, color: accentColor, textAlign: 'center', marginTop: 16 }}>
                {formData.target_markets.length} state{formData.target_markets.length !== 1 ? 's' : ''} selected
              </Text>
            )}

            <View style={{ marginTop: 24, padding: 20, borderRadius: 12, backgroundColor: accentColor + '15', borderWidth: 1, borderColor: accentColor + '40', alignItems: 'center' }}>
              <Ionicons name="sparkles" size={32} color={accentColor} style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: textColor, marginBottom: 6 }}>You're all set!</Text>
              <Text style={{ fontSize: 13, color: mutedColor, textAlign: 'center' }}>Tap "Complete Setup" to start analyzing deals with your personalized settings.</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 16 + insets.bottom, borderTopWidth: 1, borderTopColor: borderColor }}>
        <TouchableOpacity
          onPress={handleBack}
          disabled={currentStep === 0}
          accessibilityRole="button"
          accessibilityLabel="Go to previous step"
          accessibilityState={{ disabled: currentStep === 0 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 16, opacity: currentStep === 0 ? 0.4 : 1 }}
        >
          <Ionicons name="chevron-back" size={20} color={currentStep === 0 ? mutedColor : textColor} />
          <Text style={{ fontSize: 15, fontWeight: '600', color: currentStep === 0 ? mutedColor : textColor }}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          disabled={!canContinue || isSaving}
          accessibilityRole="button"
          accessibilityLabel={currentStep === TOTAL_STEPS - 1 ? "Complete setup" : "Continue to next step"}
          accessibilityState={{ disabled: !canContinue || isSaving }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 14,
            paddingHorizontal: 24,
            borderRadius: 12,
            backgroundColor: accentColor,
            opacity: !canContinue || isSaving ? 0.5 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : currentStep === TOTAL_STEPS - 1 ? (
            <>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Complete Setup</Text>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
            </>
          ) : (
            <>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Continue</Text>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
