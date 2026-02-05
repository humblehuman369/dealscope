/**
 * GrowthTabContent - Growth Assumptions and Projections
 * Allows tuning rent increases and appreciation rates
 * 
 * This component is now controlled - growth assumptions are passed in as props
 * and changes trigger an API refresh via the onGrowthAssumptionChange callback.
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { TargetAssumptions, GrowthAssumptions, ProjectionsData } from './types';

interface GrowthTabContentProps {
  assumptions: TargetAssumptions;
  isDark?: boolean;
  // NEW: Controlled growth assumptions from parent (connected to API)
  growthAssumptions: GrowthAssumptions;
  onGrowthAssumptionChange: (key: keyof GrowthAssumptions, value: number) => void;
  // NEW: API-provided projections data for enhanced display
  apiProjections?: ProjectionsData | null;
  isLoading?: boolean;
  // NEW: Target price from API (instead of listPrice * 0.8)
  targetPrice?: number;
}

export function GrowthTabContent({
  assumptions,
  isDark = true,
  growthAssumptions,
  onGrowthAssumptionChange,
  apiProjections,
  isLoading = false,
  targetPrice: apiTargetPrice,
}: GrowthTabContentProps) {
  // Use controlled values from props (connected to API refresh)
  const annualRentIncrease = growthAssumptions.rentGrowthRate;
  const propertyAppreciation = growthAssumptions.appreciationRate;
  const expenseInflation = growthAssumptions.expenseGrowthRate;
  
  // Handlers that trigger API refresh via parent callback
  const handleRentIncreaseChange = useCallback((value: number) => {
    onGrowthAssumptionChange('rentGrowthRate', value);
  }, [onGrowthAssumptionChange]);
  
  const handleAppreciationChange = useCallback((value: number) => {
    onGrowthAssumptionChange('appreciationRate', value);
  }, [onGrowthAssumptionChange]);
  
  const handleExpenseInflationChange = useCallback((value: number) => {
    onGrowthAssumptionChange('expenseGrowthRate', value);
  }, [onGrowthAssumptionChange]);
  
  // Calculate projections - use API data if available, otherwise calculate locally
  const projections = useMemo(() => {
    // Use API target price if available, otherwise fallback to estimate
    const purchasePrice = apiTargetPrice || Math.round(assumptions.listPrice * 0.8);
    const currentRent = assumptions.monthlyRent;
    
    // If we have API projections with sufficient yearly data, use it for 5 and 10 year values
    if (apiProjections?.yearlyData && apiProjections.yearlyData.length >= 10) {
      const year5Data = apiProjections.yearlyData[4]; // 0-indexed, so year 5 is index 4
      const year10Data = apiProjections.yearlyData[9]; // year 10 is index 9
      
      // Calculate rent progression from API data if available
      const year5Value = year5Data?.propertyValue || purchasePrice * Math.pow(1 + propertyAppreciation, 5);
      const year10Value = year10Data?.propertyValue || purchasePrice * Math.pow(1 + propertyAppreciation, 10);
      
      // Estimate rent values based on growth rate
      const year5Rent = currentRent * Math.pow(1 + annualRentIncrease, 5);
      const year10Rent = currentRent * Math.pow(1 + annualRentIncrease, 10);
      
      return {
        currentRent,
        purchasePrice,
        year5: {
          rent: year5Rent,
          rentIncrease: year5Rent - currentRent,
          rentIncreasePercent: ((year5Rent - currentRent) / currentRent) * 100,
          value: year5Value,
          appreciation: year5Value - purchasePrice,
          appreciationPercent: ((year5Value - purchasePrice) / purchasePrice) * 100,
        },
        year10: {
          rent: year10Rent,
          rentIncrease: year10Rent - currentRent,
          rentIncreasePercent: ((year10Rent - currentRent) / currentRent) * 100,
          value: year10Value,
          appreciation: year10Value - purchasePrice,
          appreciationPercent: ((year10Value - purchasePrice) / purchasePrice) * 100,
        },
        isFromApi: true,
      };
    }
    
    // FALLBACK: Local calculation when API data is not available
    // 5-year projections
    const year5Rent = currentRent * Math.pow(1 + annualRentIncrease, 5);
    const year5Value = purchasePrice * Math.pow(1 + propertyAppreciation, 5);
    const year5Appreciation = year5Value - purchasePrice;
    
    // 10-year projections
    const year10Rent = currentRent * Math.pow(1 + annualRentIncrease, 10);
    const year10Value = purchasePrice * Math.pow(1 + propertyAppreciation, 10);
    const year10Appreciation = year10Value - purchasePrice;
    
    return {
      currentRent,
      purchasePrice,
      year5: {
        rent: year5Rent,
        rentIncrease: year5Rent - currentRent,
        rentIncreasePercent: ((year5Rent - currentRent) / currentRent) * 100,
        value: year5Value,
        appreciation: year5Appreciation,
        appreciationPercent: (year5Appreciation / purchasePrice) * 100,
      },
      year10: {
        rent: year10Rent,
        rentIncrease: year10Rent - currentRent,
        rentIncreasePercent: ((year10Rent - currentRent) / currentRent) * 100,
        value: year10Value,
        appreciation: year10Appreciation,
        appreciationPercent: (year10Appreciation / purchasePrice) * 100,
      },
      isFromApi: false,
    };
  }, [assumptions, annualRentIncrease, propertyAppreciation, apiProjections, apiTargetPrice]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return `$${Math.round(value).toLocaleString()}`;
  };

  const formatPercent = (value: number, decimals = 1) => {
    return `${(value * 100).toFixed(decimals)}%`;
  };

  return (
    <View style={styles.container}>
      {/* Growth Assumptions Sliders */}
      <View style={[
        styles.tuneCard,
        { 
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
        }
      ]}>
        <Text style={[styles.tuneTitle, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
          Growth Assumptions
        </Text>
        
        {/* Annual Rent Increase */}
        <View style={styles.sliderRow}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderLabel, { color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(7,23,46,0.8)' }]}>
              Annual Rent Increase
            </Text>
            <View style={styles.sliderValueContainer}>
              {isLoading && <ActivityIndicator size="small" color={isDark ? '#4dd0e1' : '#007ea7'} style={styles.sliderLoading} />}
              <Text style={[styles.sliderValue, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
                {formatPercent(annualRentIncrease)}
              </Text>
            </View>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={0.08}
            step={0.005}
            value={annualRentIncrease}
            onSlidingComplete={handleRentIncreaseChange}
            minimumTrackTintColor={isDark ? '#4dd0e1' : '#007ea7'}
            maximumTrackTintColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(7,23,46,0.1)'}
            thumbTintColor={isDark ? '#fff' : '#007ea7'}
          />
          <View style={styles.sliderRange}>
            <Text style={[styles.rangeText, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)' }]}>0%</Text>
            <Text style={[styles.rangeText, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)' }]}>8%</Text>
          </View>
        </View>

        {/* Property Appreciation */}
        <View style={styles.sliderRow}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderLabel, { color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(7,23,46,0.8)' }]}>
              Property Appreciation
            </Text>
            <View style={styles.sliderValueContainer}>
              {isLoading && <ActivityIndicator size="small" color={isDark ? '#4dd0e1' : '#007ea7'} style={styles.sliderLoading} />}
              <Text style={[styles.sliderValue, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
                {formatPercent(propertyAppreciation)}
              </Text>
            </View>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={0.10}
            step={0.005}
            value={propertyAppreciation}
            onSlidingComplete={handleAppreciationChange}
            minimumTrackTintColor={isDark ? '#4dd0e1' : '#007ea7'}
            maximumTrackTintColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(7,23,46,0.1)'}
            thumbTintColor={isDark ? '#fff' : '#007ea7'}
          />
          <View style={styles.sliderRange}>
            <Text style={[styles.rangeText, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)' }]}>0%</Text>
            <Text style={[styles.rangeText, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)' }]}>10%</Text>
          </View>
        </View>

        {/* Expense Inflation */}
        <View style={styles.sliderRow}>
          <View style={styles.sliderHeader}>
            <Text style={[styles.sliderLabel, { color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(7,23,46,0.8)' }]}>
              Expense Inflation
            </Text>
            <View style={styles.sliderValueContainer}>
              {isLoading && <ActivityIndicator size="small" color={isDark ? '#4dd0e1' : '#007ea7'} style={styles.sliderLoading} />}
              <Text style={[styles.sliderValue, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
                {formatPercent(expenseInflation)}
              </Text>
            </View>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={0.06}
            step={0.005}
            value={expenseInflation}
            onSlidingComplete={handleExpenseInflationChange}
            minimumTrackTintColor={isDark ? '#4dd0e1' : '#007ea7'}
            maximumTrackTintColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(7,23,46,0.1)'}
            thumbTintColor={isDark ? '#fff' : '#007ea7'}
          />
          <View style={styles.sliderRange}>
            <Text style={[styles.rangeText, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)' }]}>0%</Text>
            <Text style={[styles.rangeText, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)' }]}>6%</Text>
          </View>
        </View>
      </View>

      {/* 5-Year Projections */}
      <View style={[
        styles.projectionCard,
        { 
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
        }
      ]}>
        <Text style={[styles.projectionTitle, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
          5-Year Projections
        </Text>
        
        <ProjectionRow
          label="Monthly Rent"
          currentValue={formatCurrency(projections.currentRent)}
          futureValue={formatCurrency(projections.year5.rent)}
          change={`+${formatCurrency(projections.year5.rentIncrease)} (${projections.year5.rentIncreasePercent.toFixed(0)}%)`}
          isDark={isDark}
        />
        <ProjectionRow
          label="Property Value"
          currentValue={formatCurrency(projections.purchasePrice)}
          futureValue={formatCurrency(projections.year5.value)}
          change={`+${formatCurrency(projections.year5.appreciation)} (${projections.year5.appreciationPercent.toFixed(0)}%)`}
          isDark={isDark}
        />
      </View>

      {/* 10-Year Projections */}
      <LinearGradient
        colors={isDark 
          ? ['rgba(34,197,94,0.1)', 'rgba(77,208,225,0.08)']
          : ['rgba(34,197,94,0.06)', 'rgba(0,126,167,0.04)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.projectionCard, { borderColor: isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.15)' }]}
      >
        <View style={styles.projectionHeader}>
          <Text style={[styles.projectionTitle, { color: '#22c55e' }]}>
            10-Year Projections
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>LONG-TERM</Text>
          </View>
        </View>
        
        <ProjectionRow
          label="Monthly Rent"
          currentValue={formatCurrency(projections.currentRent)}
          futureValue={formatCurrency(projections.year10.rent)}
          change={`+${formatCurrency(projections.year10.rentIncrease)} (${projections.year10.rentIncreasePercent.toFixed(0)}%)`}
          isDark={isDark}
          highlight
        />
        <ProjectionRow
          label="Property Value"
          currentValue={formatCurrency(projections.purchasePrice)}
          futureValue={formatCurrency(projections.year10.value)}
          change={`+${formatCurrency(projections.year10.appreciation)} (${projections.year10.appreciationPercent.toFixed(0)}%)`}
          isDark={isDark}
          highlight
        />
      </LinearGradient>

      {/* Hero Metric - Total Appreciation */}
      <View style={[
        styles.heroMetric,
        { 
          backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.06)',
          borderColor: isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.15)',
        }
      ]}>
        <Text style={[styles.heroLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
          TOTAL APPRECIATION (10YR)
        </Text>
        <Text style={styles.heroValue}>
          +{formatCurrency(projections.year10.appreciation)}
        </Text>
        <Text style={[styles.heroSubtitle, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
          {projections.year10.appreciationPercent.toFixed(0)}% increase from purchase price
        </Text>
      </View>

      {/* Info Card */}
      <View style={[
        styles.infoCard,
        { 
          backgroundColor: isDark ? 'rgba(4,101,242,0.08)' : 'rgba(4,101,242,0.06)',
          borderColor: isDark ? 'rgba(4,101,242,0.15)' : 'rgba(4,101,242,0.1)',
        }
      ]}>
        <Text style={styles.infoIcon}>💡</Text>
        <Text style={[styles.infoText, { color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(7,23,46,0.8)' }]}>
          Historical average home appreciation is <Text style={{ color: isDark ? '#4dd0e1' : '#007ea7', fontWeight: '600' }}>3-4%</Text> annually. 
          Rent typically increases <Text style={{ color: isDark ? '#4dd0e1' : '#007ea7', fontWeight: '600' }}>2-5%</Text> per year depending on market.
        </Text>
      </View>
    </View>
  );
}

function ProjectionRow({
  label,
  currentValue,
  futureValue,
  change,
  isDark,
  highlight,
}: {
  label: string;
  currentValue: string;
  futureValue: string;
  change: string;
  isDark: boolean;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.projectionRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.06)' }]}>
      <View style={styles.projectionRowLeft}>
        <Text style={[styles.projectionLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(7,23,46,0.7)' }]}>
          {label}
        </Text>
        <Text style={[styles.projectionCurrent, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
          Today: {currentValue}
        </Text>
      </View>
      <View style={styles.projectionRowRight}>
        <Text style={[
          styles.projectionFuture, 
          { color: highlight ? '#22c55e' : (isDark ? '#fff' : '#07172e') }
        ]}>
          {futureValue}
        </Text>
        <Text style={styles.projectionChange}>
          {change}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  
  // Tune Card
  tuneCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  tuneTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
  },
  sliderRow: {
    marginBottom: 16,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  sliderValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sliderLoading: {
    marginRight: 4,
  },
  slider: {
    width: '100%',
    height: 32,
  },
  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeText: {
    fontSize: 10,
  },
  
  // Projection Card
  projectionCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  projectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  projectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#22c55e',
    letterSpacing: 0.5,
  },
  projectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  projectionRowLeft: {},
  projectionRowRight: {
    alignItems: 'flex-end',
  },
  projectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  projectionCurrent: {
    fontSize: 11,
  },
  projectionFuture: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  projectionChange: {
    fontSize: 10,
    fontWeight: '600',
    color: '#22c55e',
  },
  
  // Hero Metric
  heroMetric: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  heroValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#22c55e',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 11,
    marginTop: 4,
  },
  
  // Info Card
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
