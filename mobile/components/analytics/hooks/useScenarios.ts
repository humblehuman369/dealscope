/**
 * useScenarios Hook
 * Manages scenario comparison and what-if analysis
 */

import { useState, useCallback, useMemo } from 'react';
import { AnalyticsInputs, CalculatedMetrics, Scenario } from '../types';
import { calculateMetrics, calculateDealScore } from '../calculations';

interface UseScenariosResult {
  scenarios: Scenario[];
  currentScenario: Scenario | null;
  baseScenario: Scenario | null;
  addScenario: (name: string, inputs: AnalyticsInputs) => Scenario;
  updateScenario: (id: string, inputs: Partial<AnalyticsInputs>) => void;
  deleteScenario: (id: string) => void;
  selectScenario: (id: string) => void;
  resetToBase: () => void;
  getBestScenario: () => Scenario | null;
  compareToBase: (scenario: Scenario) => ComparisonResult;
}

interface ComparisonResult {
  cashFlowDelta: number;
  cashFlowPercent: number;
  cashOnCashDelta: number;
  scoreDelta: number;
  isImprovement: boolean;
}

export function useScenarios(initialInputs: AnalyticsInputs): UseScenariosResult {
  // Initialize with base scenario
  const [scenarios, setScenarios] = useState<Scenario[]>(() => {
    const baseMetrics = calculateMetrics(initialInputs);
    const baseScore = calculateDealScore(baseMetrics);
    return [
      {
        id: 'base',
        name: 'Base Case',
        inputs: initialInputs,
        metrics: baseMetrics,
        score: baseScore.score,
        createdAt: new Date(),
      },
    ];
  });

  const [currentId, setCurrentId] = useState<string>('base');

  // Get current and base scenarios
  const currentScenario = useMemo(
    () => scenarios.find((s) => s.id === currentId) || null,
    [scenarios, currentId]
  );

  const baseScenario = useMemo(
    () => scenarios.find((s) => s.id === 'base') || null,
    [scenarios]
  );

  // Add new scenario
  const addScenario = useCallback(
    (name: string, inputs: AnalyticsInputs): Scenario => {
      const metrics = calculateMetrics(inputs);
      const score = calculateDealScore(metrics);
      const newScenario: Scenario = {
        id: `scenario-${Date.now()}`,
        name,
        inputs,
        metrics,
        score: score.score,
        createdAt: new Date(),
      };

      setScenarios((prev) => [...prev, newScenario]);
      setCurrentId(newScenario.id);
      return newScenario;
    },
    []
  );

  // Update existing scenario
  const updateScenario = useCallback(
    (id: string, inputUpdates: Partial<AnalyticsInputs>) => {
      setScenarios((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          
          const newInputs = { ...s.inputs, ...inputUpdates };
          const metrics = calculateMetrics(newInputs);
          const score = calculateDealScore(metrics);
          
          return {
            ...s,
            inputs: newInputs,
            metrics,
            score: score.score,
          };
        })
      );
    },
    []
  );

  // Delete scenario
  const deleteScenario = useCallback(
    (id: string) => {
      if (id === 'base') return; // Can't delete base
      
      setScenarios((prev) => prev.filter((s) => s.id !== id));
      if (currentId === id) {
        setCurrentId('base');
      }
    },
    [currentId]
  );

  // Select scenario
  const selectScenario = useCallback((id: string) => {
    setCurrentId(id);
  }, []);

  // Reset to base
  const resetToBase = useCallback(() => {
    setCurrentId('base');
  }, []);

  // Get best scenario
  const getBestScenario = useCallback(() => {
    if (scenarios.length === 0) return null;
    return scenarios.reduce((best, current) =>
      current.score > best.score ? current : best
    );
  }, [scenarios]);

  // Compare scenario to base
  const compareToBase = useCallback(
    (scenario: Scenario): ComparisonResult => {
      if (!baseScenario) {
        return {
          cashFlowDelta: 0,
          cashFlowPercent: 0,
          cashOnCashDelta: 0,
          scoreDelta: 0,
          isImprovement: false,
        };
      }

      const cashFlowDelta =
        scenario.metrics.monthlyCashFlow - baseScenario.metrics.monthlyCashFlow;
      const cashFlowPercent =
        baseScenario.metrics.monthlyCashFlow !== 0
          ? (cashFlowDelta / Math.abs(baseScenario.metrics.monthlyCashFlow)) * 100
          : 0;
      const cashOnCashDelta =
        scenario.metrics.cashOnCash - baseScenario.metrics.cashOnCash;
      const scoreDelta = scenario.score - baseScenario.score;

      return {
        cashFlowDelta,
        cashFlowPercent,
        cashOnCashDelta,
        scoreDelta,
        isImprovement: scoreDelta > 0,
      };
    },
    [baseScenario]
  );

  return {
    scenarios,
    currentScenario,
    baseScenario,
    addScenario,
    updateScenario,
    deleteScenario,
    selectScenario,
    resetToBase,
    getBestScenario,
    compareToBase,
  };
}

export default useScenarios;

