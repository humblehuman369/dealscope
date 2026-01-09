/**
 * GrowthTabContent - Growth Assumptions and Projections
 * Allows tuning rent increases and appreciation rates
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { TargetAssumptions } from './types';

interface GrowthTabContentProps {
  assumptions: TargetAssumptions;
  isDark?: boolean;
}

export function GrowthTabContent({
  assumptions,
  isDark = true,
}: GrowthTabContentProps) {
  // Local state for growth assumptions
  const [annualRentIncrease, setAnnualRentIncrease] = useState(0.03); // 3%
  const [propertyAppreciation, setPropertyAppreciation] = useState(0.035); // 3.5%
  const [expenseInflation, setExpenseInflation] = useState(0.025); // 2.5%
  
  // Calculate projections
  const projections = useMemo(() => {
    const purchasePrice = assumptions.listPrice * 0.8;
    const currentRent = assumptions.monthlyRent;
    
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
    };
  }, [assumptions, annualRentIncrease, propertyAppreciation]);

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
            <Text style={[styles.sliderValue, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
              {formatPercent(annualRentIncrease)}
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={0.08}
            step={0.005}
            value={annualRentIncrease}
            onValueChange={setAnnualRentIncrease}
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
            <Text style={[styles.sliderValue, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
              {formatPercent(propertyAppreciation)}
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={0.10}
            step={0.005}
            value={propertyAppreciation}
            onValueChange={setPropertyAppreciation}
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
            <Text style={[styles.sliderValue, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
              {formatPercent(expenseInflation)}
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={0.06}
            step={0.005}
            value={expenseInflation}
            onValueChange={setExpenseInflation}
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
