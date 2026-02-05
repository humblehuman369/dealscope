import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  PropertyData,
  TargetAssumptions,
  StrategyId,
  GrowthAssumptions,
  PropertyAnalysisResult
} from './types';
import { usePropertyAnalysis } from '../../../hooks/usePropertyAnalysis';
import { useDebounce } from '../../../hooks/useDebounce';

interface AnalysisContextType {
  // State
  activeStrategy: StrategyId | null;
  assumptions: TargetAssumptions;
  growthAssumptions: GrowthAssumptions;
  
  // Setters
  setActiveStrategy: (strategy: StrategyId | null) => void;
  updateAssumption: (key: keyof TargetAssumptions, value: number) => void;
  updateGrowthAssumption: (key: keyof GrowthAssumptions, value: number) => void;
  setAssumptions: (assumptions: TargetAssumptions) => void;
  
  // Analysis Results
  analysis: PropertyAnalysisResult;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const AnalysisContext = createContext<AnalysisContextType | null>(null);

interface AnalysisProviderProps {
  children: React.ReactNode;
  property: PropertyData;
  initialStrategyId?: StrategyId | null;
}

export function AnalysisProvider({ 
  children, 
  property, 
  initialStrategyId = null 
}: AnalysisProviderProps) {
  // State
  const [activeStrategy, setActiveStrategy] = useState<StrategyId | null>(initialStrategyId);
  
  // Initial assumptions based on property
  const [assumptions, setAssumptions] = useState<TargetAssumptions>({
    listPrice: property.listPrice,
    downPaymentPct: 0.20,
    interestRate: 0.073,
    loanTermYears: 30,
    closingCostsPct: 0.03,
    monthlyRent: property.monthlyRent,
    averageDailyRate: property.averageDailyRate || 195,
    occupancyRate: property.occupancyRate || 0.72,
    vacancyRate: 0.05,
    propertyTaxes: property.propertyTaxes,
    insurance: property.insurance,
    managementPct: 0.08,
    maintenancePct: 0.05,
    rehabCost: 25000,
    arv: property.arv || property.listPrice * 1.2,
    holdingPeriodMonths: 6,
    sellingCostsPct: 0.08,
    roomsRented: 2,
    totalBedrooms: property.bedrooms,
    wholesaleFeePct: 0.10,
  });

  const [growthAssumptions, setGrowthAssumptions] = useState<GrowthAssumptions>({
    appreciationRate: 0.035, // 3.5% default
    rentGrowthRate: 0.03,    // 3% default
    expenseGrowthRate: 0.025, // 2.5% default
  });

  // Updates
  const updateAssumption = useCallback((key: keyof TargetAssumptions, value: number) => {
    setAssumptions(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateGrowthAssumption = useCallback((key: keyof GrowthAssumptions, value: number) => {
    setGrowthAssumptions(prev => ({ ...prev, [key]: value }));
  }, []);

  // Debounce assumptions for API calls
  const debouncedAssumptions = useDebounce(assumptions, 500);
  const debouncedGrowthAssumptions = useDebounce(growthAssumptions, 500);

  // API Hook
  const analysisResult = usePropertyAnalysis(
    property, 
    debouncedAssumptions, 
    debouncedGrowthAssumptions
  );

  const value = useMemo(() => ({
    activeStrategy,
    assumptions,
    growthAssumptions,
    setActiveStrategy,
    updateAssumption,
    updateGrowthAssumption,
    setAssumptions,
    analysis: analysisResult,
    isLoading: analysisResult.isLoading,
    error: analysisResult.error,
    refetch: analysisResult.refetch,
  }), [
    activeStrategy,
    assumptions,
    growthAssumptions,
    analysisResult
  ]);

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
}
