// ============================================
// InvestIQ Property Analytics - Custom Hooks
// ============================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  Property,
  AnalyticsInputs,
  CalculatedMetrics,
  DealScore,
  YearProjection,
  ProjectionSummary,
  Scenario,
  SensitivityAnalysis,
  DEFAULT_INPUTS,
} from '../types/analytics';

import {
  calculateMetrics,
  calculateDealScore,
  calculateProjections,
  getProjectionSummary,
  calculateSensitivity,
  calculateImpactPerUnit,
} from '../utils/calculations';

// ============================================
// usePropertyCalculations
// ============================================

interface UsePropertyCalculationsReturn {
  inputs: AnalyticsInputs;
  setInputs: (updates: Partial<AnalyticsInputs>) => void;
  resetInputs: () => void;
  metrics: CalculatedMetrics;
  score: DealScore;
  projections: YearProjection[];
  projectionSummary: ProjectionSummary;
  isCalculating: boolean;
}

export const usePropertyCalculations = (
  property: Property,
  initialInputs?: Partial<AnalyticsInputs>
): UsePropertyCalculationsReturn => {
  // Initialize inputs with property data
  const defaultInputs: AnalyticsInputs = useMemo(() => ({
    ...DEFAULT_INPUTS,
    purchasePrice: property.listPrice,
    monthlyRent: property.estimatedRent || Math.round(property.listPrice * 0.007),
    annualPropertyTax: property.estimatedPropertyTax || Math.round(property.listPrice * 0.012),
    annualInsurance: property.estimatedInsurance || Math.round(property.listPrice * 0.004),
    monthlyHoa: property.hoaFees || 0,
    ...initialInputs,
  }), [property, initialInputs]);

  const [inputs, setInputsState] = useState<AnalyticsInputs>(defaultInputs);
  const [isCalculating, setIsCalculating] = useState(false);

  // Update inputs
  const setInputs = useCallback((updates: Partial<AnalyticsInputs>) => {
    setInputsState(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset to defaults
  const resetInputs = useCallback(() => {
    setInputsState(defaultInputs);
  }, [defaultInputs]);

  // Calculate all metrics
  const metrics = useMemo(() => calculateMetrics(inputs), [inputs]);

  // Calculate deal score
  const score = useMemo(() => calculateDealScore(metrics, inputs), [metrics, inputs]);

  // Calculate projections
  const projections = useMemo(() => calculateProjections(inputs, metrics), [inputs, metrics]);

  // Get projection summary
  const projectionSummary = useMemo(
    () => getProjectionSummary(projections, metrics.totalCashRequired),
    [projections, metrics.totalCashRequired]
  );

  return {
    inputs,
    setInputs,
    resetInputs,
    metrics,
    score,
    projections,
    projectionSummary,
    isCalculating,
  };
};

// ============================================
// useAnimatedScore
// ============================================

export const useAnimatedScore = (targetScore: number, duration: number = 1000) => {
  const [displayScore, setDisplayScore] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startScoreRef = useRef(0);

  useEffect(() => {
    startScoreRef.current = displayScore;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const newScore = Math.round(
        startScoreRef.current + (targetScore - startScoreRef.current) * eased
      );
      
      setDisplayScore(newScore);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetScore, duration]);

  return displayScore;
};

// ============================================
// useAnimatedValue
// ============================================

export const useAnimatedValue = (initialValue: number = 0) => {
  const animatedValue = useRef(new Animated.Value(initialValue)).current;

  const animate = useCallback((
    toValue: number,
    config?: {
      duration?: number;
      easing?: (value: number) => number;
      useNativeDriver?: boolean;
    }
  ) => {
    const { duration = 300, easing = Easing.out(Easing.cubic), useNativeDriver = true } = config || {};

    return Animated.timing(animatedValue, {
      toValue,
      duration,
      easing,
      useNativeDriver,
    });
  }, [animatedValue]);

  const spring = useCallback((
    toValue: number,
    config?: {
      tension?: number;
      friction?: number;
      useNativeDriver?: boolean;
    }
  ) => {
    const { tension = 100, friction = 10, useNativeDriver = true } = config || {};

    return Animated.spring(animatedValue, {
      toValue,
      tension,
      friction,
      useNativeDriver,
    });
  }, [animatedValue]);

  return { value: animatedValue, animate, spring };
};

// ============================================
// useSliderImpact
// ============================================

interface UseSliderImpactReturn {
  currentImpact: number;
  impactPerUnit: number;
  isPositive: boolean;
  isNegative: boolean;
  isNeutral: boolean;
}

export const useSliderImpact = (
  baseInputs: AnalyticsInputs,
  currentInputs: AnalyticsInputs,
  variable: keyof AnalyticsInputs
): UseSliderImpactReturn => {
  const impactPerUnit = useMemo(
    () => calculateImpactPerUnit(baseInputs, variable),
    [baseInputs, variable]
  );

  const currentImpact = useMemo(() => {
    const baseMetrics = calculateMetrics(baseInputs);
    const currentMetrics = calculateMetrics(currentInputs);
    return currentMetrics.monthlyCashFlow - baseMetrics.monthlyCashFlow;
  }, [baseInputs, currentInputs]);

  return {
    currentImpact,
    impactPerUnit,
    isPositive: currentImpact > 0,
    isNegative: currentImpact < 0,
    isNeutral: currentImpact === 0,
  };
};

// ============================================
// useScenarios
// ============================================

const SCENARIOS_STORAGE_KEY = '@investiq_scenarios';

interface UseScenariosReturn {
  scenarios: Scenario[];
  activeScenario: Scenario | null;
  isLoading: boolean;
  saveScenario: (name: string, inputs: AnalyticsInputs, metrics: CalculatedMetrics, score: DealScore) => Promise<void>;
  loadScenario: (id: string) => void;
  deleteScenario: (id: string) => Promise<void>;
  setBaseScenario: (id: string) => void;
  compareScenarios: (ids: string[]) => Scenario[];
}

export const useScenarios = (propertyId: string): UseScenariosReturn => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load scenarios from storage
  useEffect(() => {
    const loadScenarios = async () => {
      try {
        const stored = await AsyncStorage.getItem(`${SCENARIOS_STORAGE_KEY}_${propertyId}`);
        if (stored) {
          setScenarios(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load scenarios:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadScenarios();
  }, [propertyId]);

  // Save scenarios to storage
  const persistScenarios = useCallback(async (updatedScenarios: Scenario[]) => {
    try {
      await AsyncStorage.setItem(
        `${SCENARIOS_STORAGE_KEY}_${propertyId}`,
        JSON.stringify(updatedScenarios)
      );
    } catch (error) {
      console.error('Failed to save scenarios:', error);
    }
  }, [propertyId]);

  // Save new scenario
  const saveScenario = useCallback(async (
    name: string,
    inputs: AnalyticsInputs,
    metrics: CalculatedMetrics,
    score: DealScore
  ) => {
    const newScenario: Scenario = {
      id: `scenario_${Date.now()}`,
      name,
      inputs,
      metrics,
      score,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isBase: scenarios.length === 0,
    };

    const updatedScenarios = [...scenarios, newScenario];
    setScenarios(updatedScenarios);
    await persistScenarios(updatedScenarios);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [scenarios, persistScenarios]);

  // Load scenario
  const loadScenario = useCallback((id: string) => {
    setActiveScenarioId(id);
    Haptics.selectionAsync();
  }, []);

  // Delete scenario
  const deleteScenario = useCallback(async (id: string) => {
    const updatedScenarios = scenarios.filter(s => s.id !== id);
    setScenarios(updatedScenarios);
    await persistScenarios(updatedScenarios);
    
    if (activeScenarioId === id) {
      setActiveScenarioId(null);
    }
  }, [scenarios, activeScenarioId, persistScenarios]);

  // Set base scenario
  const setBaseScenario = useCallback((id: string) => {
    const updatedScenarios = scenarios.map(s => ({
      ...s,
      isBase: s.id === id,
    }));
    setScenarios(updatedScenarios);
    persistScenarios(updatedScenarios);
  }, [scenarios, persistScenarios]);

  // Compare scenarios
  const compareScenarios = useCallback((ids: string[]) => {
    return scenarios.filter(s => ids.includes(s.id));
  }, [scenarios]);

  const activeScenario = scenarios.find(s => s.id === activeScenarioId) || null;

  return {
    scenarios,
    activeScenario,
    isLoading,
    saveScenario,
    loadScenario,
    deleteScenario,
    setBaseScenario,
    compareScenarios,
  };
};

// ============================================
// useSensitivityAnalysis
// ============================================

export const useSensitivityAnalysis = (
  inputs: AnalyticsInputs
): SensitivityAnalysis[] => {
  return useMemo(() => {
    const variables: Array<{
      id: keyof AnalyticsInputs;
      label: string;
      min: number;
      max: number;
      format: 'currency' | 'percentage' | 'decimal';
    }> = [
      {
        id: 'purchasePrice',
        label: 'Purchase Price',
        min: inputs.purchasePrice * 0.8,
        max: inputs.purchasePrice * 1.1,
        format: 'currency',
      },
      {
        id: 'interestRate',
        label: 'Interest Rate',
        min: 4,
        max: 9,
        format: 'percentage',
      },
      {
        id: 'monthlyRent',
        label: 'Monthly Rent',
        min: inputs.monthlyRent * 0.8,
        max: inputs.monthlyRent * 1.2,
        format: 'currency',
      },
      {
        id: 'vacancyRate',
        label: 'Vacancy Rate',
        min: 0,
        max: 15,
        format: 'percentage',
      },
      {
        id: 'downPaymentPercent',
        label: 'Down Payment',
        min: 10,
        max: 40,
        format: 'percentage',
      },
    ];

    return variables.map(variable => {
      const dataPoints = calculateSensitivity(
        inputs,
        variable.id,
        variable.min,
        variable.max,
        7
      ).map((point, index, arr) => ({
        ...point,
        isCurrent: Math.abs(point.value - (inputs[variable.id] as number)) < 
          (variable.max - variable.min) / 14,
      }));

      const cashFlows = dataPoints.map(d => d.cashFlow);
      const cashFlowRange = {
        min: Math.min(...cashFlows),
        max: Math.max(...cashFlows),
      };

      // Calculate impact level
      const range = cashFlowRange.max - cashFlowRange.min;
      const impact = range > 500 ? 'high' : range > 200 ? 'medium' : 'low';

      // Find break-even point
      let breakEvenValue: number | null = null;
      for (let i = 0; i < dataPoints.length - 1; i++) {
        if (
          (dataPoints[i].cashFlow >= 0 && dataPoints[i + 1].cashFlow < 0) ||
          (dataPoints[i].cashFlow < 0 && dataPoints[i + 1].cashFlow >= 0)
        ) {
          // Linear interpolation
          const ratio = Math.abs(dataPoints[i].cashFlow) / 
            (Math.abs(dataPoints[i].cashFlow) + Math.abs(dataPoints[i + 1].cashFlow));
          breakEvenValue = dataPoints[i].value + ratio * (dataPoints[i + 1].value - dataPoints[i].value);
          break;
        }
      }

      return {
        variable: {
          id: variable.id,
          label: variable.label,
          currentValue: inputs[variable.id] as number,
          minValue: variable.min,
          maxValue: variable.max,
          step: (variable.max - variable.min) / 100,
          format: variable.format,
        },
        impact,
        dataPoints,
        cashFlowRange,
        breakEvenValue,
      };
    });
  }, [inputs]);
};

// ============================================
// useHaptics
// ============================================

export const useHaptics = () => {
  const light = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const medium = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const heavy = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  const selection = useCallback(() => {
    Haptics.selectionAsync();
  }, []);

  const success = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const warning = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  const error = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, []);

  return { light, medium, heavy, selection, success, warning, error };
};

// ============================================
// useDebounce
// ============================================

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

// ============================================
// useTheme
// ============================================

import { useColorScheme } from 'react-native';
import { ThemeColors } from '../types/analytics';

const lightColors: ThemeColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceHover: '#f1f5f9',
  border: 'rgba(7,23,46,0.08)',
  borderLight: 'rgba(7,23,46,0.04)',
  text: '#07172e',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  primary: '#0097a7',
  primaryDark: '#007ea7',
  success: '#22c55e',
  successLight: '#4ade80',
  warning: '#f97316',
  warningLight: '#fb923c',
  error: '#ef4444',
  errorLight: '#f87171',
};

const darkColors: ThemeColors = {
  background: '#07172e',
  surface: 'rgba(255,255,255,0.03)',
  surfaceHover: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.06)',
  borderLight: 'rgba(255,255,255,0.04)',
  text: '#ffffff',
  textSecondary: '#aab2bd',
  textMuted: '#6b7280',
  primary: '#4dd0e1',
  primaryDark: '#0097a7',
  success: '#22c55e',
  successLight: '#4ade80',
  warning: '#f97316',
  warningLight: '#fb923c',
  error: '#ef4444',
  errorLight: '#f87171',
};

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return { isDark, colors };
};

// ============================================
// usePrevious
// ============================================

export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
};

// ============================================
// useScoreChange
// ============================================

export const useScoreChange = (score: number) => {
  const previousScore = usePrevious(score);
  const haptics = useHaptics();

  useEffect(() => {
    if (previousScore !== undefined && previousScore !== score) {
      const diff = score - previousScore;
      
      if (diff > 5) {
        haptics.success();
      } else if (diff < -5) {
        haptics.warning();
      } else {
        haptics.selection();
      }
    }
  }, [score, previousScore, haptics]);

  return {
    previousScore,
    change: previousScore !== undefined ? score - previousScore : 0,
    improved: previousScore !== undefined && score > previousScore,
    declined: previousScore !== undefined && score < previousScore,
  };
};
