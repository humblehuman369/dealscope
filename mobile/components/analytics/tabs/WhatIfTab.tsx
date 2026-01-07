/**
 * WhatIfTab - Interactive scenario builder for what-if analysis
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { AnalyticsInputs, CalculatedMetrics } from '../types';
import { calculateMetrics, calculateDealScore, formatCurrency, formatPercent } from '../calculations';

interface WhatIfTabProps {
  baseInputs: AnalyticsInputs;
  baseMetrics: CalculatedMetrics;
  isDark?: boolean;
}

interface ScenarioPreset {
  id: string;
  name: string;
  desc: string;
  changes: Partial<AnalyticsInputs>;
}

const PRESETS: ScenarioPreset[] = [
  { id: 'base', name: 'Base', desc: 'As listed', changes: {} },
  { id: 'negotiate', name: 'Negotiate', desc: '-10% price', changes: {} },
  { id: 'best', name: 'Best Case', desc: 'Max profit', changes: {} },
];

export function WhatIfTab({ baseInputs, baseMetrics, isDark = true }: WhatIfTabProps) {
  const [activePreset, setActivePreset] = useState('base');
  const [scenarioInputs, setScenarioInputs] = useState({
    purchasePrice: baseInputs.purchasePrice,
    interestRate: baseInputs.interestRate,
    monthlyRent: baseInputs.monthlyRent,
    downPaymentPercent: baseInputs.downPaymentPercent,
  });

  // Calculate scenario metrics
  const scenarioFullInputs = useMemo(() => ({
    ...baseInputs,
    ...scenarioInputs,
  }), [baseInputs, scenarioInputs]);

  const scenarioMetrics = useMemo(() => 
    calculateMetrics(scenarioFullInputs), 
    [scenarioFullInputs]
  );

  const scenarioScore = useMemo(() => 
    calculateDealScore(scenarioMetrics), 
    [scenarioMetrics]
  );

  const baseScore = useMemo(() => 
    calculateDealScore(baseMetrics), 
    [baseMetrics]
  );

  // Calculate impact (difference from base)
  const cashFlowDiff = scenarioMetrics.monthlyCashFlow - baseMetrics.monthlyCashFlow;
  const unlockedPotential = cashFlowDiff > 0 ? cashFlowDiff : 0;

  // Impact for each slider
  const getImpact = (key: keyof typeof scenarioInputs, value: number) => {
    const testInputs = { ...scenarioFullInputs, [key]: value };
    const testMetrics = calculateMetrics(testInputs);
    return testMetrics.monthlyCashFlow - baseMetrics.monthlyCashFlow;
  };

  const handlePresetPress = (presetId: string) => {
    Haptics.selectionAsync();
    setActivePreset(presetId);
    
    switch (presetId) {
      case 'negotiate':
        setScenarioInputs({
          purchasePrice: baseInputs.purchasePrice * 0.9,
          interestRate: baseInputs.interestRate - 0.005,
          monthlyRent: baseInputs.monthlyRent * 1.1,
          downPaymentPercent: baseInputs.downPaymentPercent,
        });
        break;
      case 'best':
        setScenarioInputs({
          purchasePrice: baseInputs.purchasePrice * 0.85,
          interestRate: baseInputs.interestRate - 0.01,
          monthlyRent: baseInputs.monthlyRent * 1.15,
          downPaymentPercent: baseInputs.downPaymentPercent,
        });
        break;
      default:
        setScenarioInputs({
          purchasePrice: baseInputs.purchasePrice,
          interestRate: baseInputs.interestRate,
          monthlyRent: baseInputs.monthlyRent,
          downPaymentPercent: baseInputs.downPaymentPercent,
        });
    }
  };

  const updateSlider = (key: keyof typeof scenarioInputs, value: number) => {
    Haptics.selectionAsync();
    setActivePreset('custom');
    setScenarioInputs(prev => ({ ...prev, [key]: value }));
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Unlocked Potential Hero */}
      <View style={[styles.heroCard, { 
        backgroundColor: isDark 
          ? 'rgba(77,208,225,0.12)' 
          : 'rgba(0,126,167,0.08)',
        borderColor: isDark 
          ? 'rgba(77,208,225,0.25)' 
          : 'rgba(0,126,167,0.2)',
      }]}>
        <Text style={[styles.heroLabel, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
          🔓 Unlocked Potential
        </Text>
        <Text style={[styles.heroValue, { color: '#22c55e' }]}>
          +{formatCurrency(unlockedPotential)}/mo
        </Text>
        <Text style={[styles.heroSub, { color: isDark ? '#aab2bd' : '#6b7280' }]}>
          Additional Cash Flow
        </Text>
        <Text style={[styles.heroCompare, { color: isDark ? '#aab2bd' : '#6b7280' }]}>
          Base: {formatCurrency(baseMetrics.monthlyCashFlow)}/mo → Optimized: {formatCurrency(scenarioMetrics.monthlyCashFlow)}/mo
        </Text>
      </View>

      {/* Preset Pills */}
      <View style={styles.presetRow}>
        {PRESETS.map(preset => (
          <TouchableOpacity
            key={preset.id}
            style={[
              styles.presetPill,
              { 
                backgroundColor: activePreset === preset.id 
                  ? isDark ? 'rgba(77,208,225,0.15)' : 'rgba(0,126,167,0.1)'
                  : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.03)',
                borderColor: activePreset === preset.id 
                  ? isDark ? '#4dd0e1' : '#007ea7'
                  : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)',
              }
            ]}
            onPress={() => handlePresetPress(preset.id)}
          >
            <Text style={[styles.presetName, { color: isDark ? '#fff' : '#07172e' }]}>
              {preset.name}
            </Text>
            <Text style={[styles.presetDesc, { color: '#6b7280' }]}>
              {preset.desc}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Scenario Builder */}
      <View style={[styles.card, { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#07172e' }]}>
            🎛️ Scenario Builder
          </Text>
          <TouchableOpacity onPress={() => handlePresetPress('base')}>
            <Text style={[styles.resetBtn, { color: '#6b7280' }]}>Reset</Text>
          </TouchableOpacity>
        </View>
        
        {/* Purchase Price Slider */}
        <WhatIfSlider
          label="Purchase Price"
          baseValue={baseInputs.purchasePrice}
          value={scenarioInputs.purchasePrice}
          min={baseInputs.purchasePrice * 0.8}
          max={baseInputs.purchasePrice * 1.1}
          step={5000}
          format="currency"
          impact={getImpact('purchasePrice', scenarioInputs.purchasePrice)}
          onChange={(v) => updateSlider('purchasePrice', v)}
          isDark={isDark}
        />

        {/* Interest Rate Slider */}
        <WhatIfSlider
          label="Interest Rate"
          baseValue={baseInputs.interestRate}
          value={scenarioInputs.interestRate}
          min={0.04}
          max={0.08}
          step={0.00125}
          format="percentage"
          impact={getImpact('interestRate', scenarioInputs.interestRate)}
          onChange={(v) => updateSlider('interestRate', v)}
          isDark={isDark}
        />

        {/* Monthly Rent Slider */}
        <WhatIfSlider
          label="Monthly Rent"
          baseValue={baseInputs.monthlyRent}
          value={scenarioInputs.monthlyRent}
          min={baseInputs.monthlyRent * 0.8}
          max={baseInputs.monthlyRent * 1.2}
          step={50}
          format="currency"
          impact={getImpact('monthlyRent', scenarioInputs.monthlyRent)}
          onChange={(v) => updateSlider('monthlyRent', v)}
          isDark={isDark}
        />

        {/* Down Payment Slider */}
        <WhatIfSlider
          label="Down Payment"
          baseValue={baseInputs.downPaymentPercent}
          value={scenarioInputs.downPaymentPercent}
          min={0.1}
          max={0.4}
          step={0.05}
          format="percentage"
          impact={getImpact('downPaymentPercent', scenarioInputs.downPaymentPercent)}
          onChange={(v) => updateSlider('downPaymentPercent', v)}
          isDark={isDark}
        />
      </View>

      {/* Scenario Impact */}
      <View style={[styles.impactCard, { 
        backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.08)',
        borderColor: 'rgba(34,197,94,0.2)',
      }]}>
        <Text style={[styles.impactTitle, { color: '#22c55e' }]}>
          📊 Scenario Impact
        </Text>
        
        <View style={styles.impactGrid}>
          <ImpactBox 
            label="Monthly CF" 
            value={formatCurrency(scenarioMetrics.monthlyCashFlow)} 
            isDark={isDark} 
          />
          <ImpactBox 
            label="CoC Return" 
            value={formatPercent(scenarioMetrics.cashOnCash)} 
            isDark={isDark} 
          />
          <ImpactBox 
            label="DSCR" 
            value={scenarioMetrics.dscr.toFixed(2)} 
            isDark={isDark} 
          />
          <ImpactBox 
            label="Deal Score" 
            value={String(scenarioScore.score)} 
            isDark={isDark} 
          />
        </View>
      </View>

      {/* Key Insights */}
      <View style={[styles.card, { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }]}>
        <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#07172e' }]}>
          💡 Key Insights
        </Text>
        <Text style={[styles.insightText, { color: isDark ? '#aab2bd' : '#6b7280' }]}>
          • 10% price reduction = +{formatCurrency(Math.abs(getImpact('purchasePrice', baseInputs.purchasePrice * 0.9)))}/mo
        </Text>
        <Text style={[styles.insightText, { color: isDark ? '#aab2bd' : '#6b7280' }]}>
          • Each $100 rent increase ≈ ~$92/mo net
        </Text>
        <Text style={[styles.insightText, { color: isDark ? '#aab2bd' : '#6b7280' }]}>
          • 1% rate increase = ~{formatCurrency(Math.abs(getImpact('interestRate', baseInputs.interestRate + 0.01)))}/mo
        </Text>
      </View>
    </ScrollView>
  );
}

function WhatIfSlider({
  label,
  baseValue,
  value,
  min,
  max,
  step,
  format,
  impact,
  onChange,
  isDark,
}: {
  label: string;
  baseValue: number;
  value: number;
  min: number;
  max: number;
  step: number;
  format: 'currency' | 'percentage';
  impact: number;
  onChange: (value: number) => void;
  isDark: boolean;
}) {
  const formatValue = (v: number) => {
    if (format === 'currency') return formatCurrency(v);
    return formatPercent(v * 100);
  };

  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderHeader}>
        <View>
          <Text style={[styles.sliderLabel, { color: isDark ? '#aab2bd' : '#6b7280' }]}>
            {label}
          </Text>
          <Text style={[styles.sliderBase, { color: isDark ? '#6b7280' : '#9ca3af' }]}>
            Base: {formatValue(baseValue)}
          </Text>
        </View>
        <View style={styles.sliderValueRow}>
          <Text style={[styles.sliderValue, { color: isDark ? '#fff' : '#07172e' }]}>
            {formatValue(value)}
          </Text>
          {impact !== 0 && (
            <Text style={[styles.sliderImpact, { color: impact > 0 ? '#22c55e' : '#ef4444' }]}>
              {impact > 0 ? '+' : ''}{formatCurrency(impact)}
            </Text>
          )}
        </View>
      </View>
      
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={isDark ? '#4dd0e1' : '#007ea7'}
        maximumTrackTintColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(7,23,46,0.1)'}
        thumbTintColor="#fff"
      />
    </View>
  );
}

function ImpactBox({ label, value, isDark }: { label: string; value: string; isDark: boolean }) {
  return (
    <View style={[styles.impactBox, { 
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.03)',
    }]}>
      <Text style={[styles.impactValue, { color: '#22c55e' }]}>{value}</Text>
      <Text style={[styles.impactLabel, { color: '#6b7280' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  heroSub: {
    fontSize: 12,
    marginTop: 2,
  },
  heroCompare: {
    fontSize: 11,
    marginTop: 8,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  presetPill: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  presetName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  presetDesc: {
    fontSize: 9,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  resetBtn: {
    fontSize: 12,
  },
  sliderRow: {
    marginBottom: 16,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  sliderBase: {
    fontSize: 10,
    marginTop: 2,
  },
  sliderValueRow: {
    alignItems: 'flex-end',
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  sliderImpact: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  impactCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  impactTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  impactBox: {
    width: '48%',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  impactValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  impactLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  insightText: {
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 4,
  },
});

