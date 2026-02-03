/**
 * InvestmentAnalysis Component - Decision-Grade UI
 * IQ Price selector + Metrics row
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { decisionGrade } from '../../theme/colors';

export type IQPriceId = 'breakeven' | 'target' | 'wholesale';

export interface IQPriceOption {
  id: IQPriceId;
  label: string;
  value: number;
  subtitle: string;
}

export interface MetricData {
  label: string;
  value: string;
}

interface InvestmentAnalysisProps {
  financingTerms: string;
  currentStrategy: string;
  strategies: string[];
  iqPrices: IQPriceOption[];
  selectedIQPrice: IQPriceId;
  onIQPriceChange: (id: IQPriceId) => void;
  metrics: MetricData[];
  onChangeTerms?: () => void;
  onStrategyChange?: (strategy: string) => void;
  onHowCalculated?: () => void;
}

const formatPrice = (price: number): string => {
  return '$' + price.toLocaleString();
};

export function InvestmentAnalysis({
  financingTerms,
  currentStrategy,
  strategies,
  iqPrices,
  selectedIQPrice,
  onIQPriceChange,
  metrics,
  onChangeTerms,
  onStrategyChange,
  onHowCalculated,
}: InvestmentAnalysisProps) {
  const [strategyMenuOpen, setStrategyMenuOpen] = useState(false);

  const handleIQSelect = (id: IQPriceId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onIQPriceChange(id);
  };

  const handleStrategySelect = (strategy: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStrategyMenuOpen(false);
    onStrategyChange?.(strategy);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>YOUR INVESTMENT ANALYSIS</Text>
          <Text style={styles.subtitle}>Based on YOUR financing terms ({financingTerms})</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={onChangeTerms}>
            <Text style={styles.changeTermsLink}>Change terms</Text>
          </TouchableOpacity>
          
          {/* Strategy Dropdown */}
          <TouchableOpacity
            style={styles.strategyBtn}
            onPress={() => setStrategyMenuOpen(true)}
          >
            <Text style={styles.strategyBtnText}>
              {currentStrategy.replace(' Rental', '')}
            </Text>
            <Ionicons name="chevron-down" size={12} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* How Calculated Link */}
      <TouchableOpacity style={styles.howCalculated} onPress={onHowCalculated}>
        <View style={styles.infoIcon}>
          <Text style={styles.infoIconText}>i</Text>
        </View>
        <Text style={styles.howCalculatedText}>How BREAKEVEN is calculated</Text>
      </TouchableOpacity>

      {/* IQ Price Selector */}
      <View style={styles.iqSelector}>
        {iqPrices.map((option, index) => {
          const isSelected = selectedIQPrice === option.id;
          const isLast = index === iqPrices.length - 1;

          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.iqOption,
                isSelected && styles.iqOptionSelected,
                !isLast && styles.iqOptionBorder,
              ]}
              onPress={() => handleIQSelect(option.id)}
              activeOpacity={0.7}
            >
              <View style={styles.iqOptionLabel}>
                <Text style={styles.iqOptionLabelText}>{option.label}</Text>
                <View style={styles.iqInfoIcon}>
                  <Text style={styles.iqInfoIconText}>i</Text>
                </View>
              </View>
              <Text style={[
                styles.iqOptionValue,
                isSelected && styles.iqOptionValueSelected,
              ]}>
                {formatPrice(option.value)}
              </Text>
              <Text style={styles.iqOptionSub}>{option.subtitle}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        {metrics.map((metric, index) => {
          const isLast = index === metrics.length - 1;
          return (
            <View
              key={index}
              style={[styles.metricsBox, !isLast && styles.metricsBoxBorder]}
            >
              <Text style={styles.metricsBoxLabel}>{metric.label}</Text>
              <Text style={styles.metricsBoxValue}>{metric.value}</Text>
            </View>
          );
        })}
      </View>

      {/* Strategy Menu Modal */}
      <Modal
        visible={strategyMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStrategyMenuOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setStrategyMenuOpen(false)}
        >
          <View style={styles.strategyMenu}>
            {strategies.map((strategy, index) => {
              const isActive = strategy === currentStrategy;
              const isLast = index === strategies.length - 1;
              return (
                <TouchableOpacity
                  key={strategy}
                  style={[
                    styles.strategyMenuItem,
                    !isLast && styles.strategyMenuItemBorder,
                  ]}
                  onPress={() => handleStrategySelect(strategy)}
                >
                  <Text style={[
                    styles.strategyMenuItemText,
                    isActive && styles.strategyMenuItemTextActive,
                  ]}>
                    {strategy}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: decisionGrade.bgPrimary,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  headerLeft: {},
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: decisionGrade.textPrimary,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: decisionGrade.textPrimary,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  changeTermsLink: {
    fontSize: 11,
    fontWeight: '600',
    color: decisionGrade.pacificTeal,
  },
  strategyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: decisionGrade.pacificTeal,
    borderRadius: 4,
  },
  strategyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  howCalculated: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 12,
  },
  infoIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: decisionGrade.pacificTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: {
    fontSize: 10,
    fontWeight: '700',
    color: decisionGrade.pacificTeal,
  },
  howCalculatedText: {
    fontSize: 11,
    fontWeight: '600',
    color: decisionGrade.pacificTeal,
  },
  iqSelector: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: decisionGrade.borderStrong,
    overflow: 'hidden',
  },
  iqOption: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: decisionGrade.bgSecondary,
  },
  iqOptionSelected: {
    backgroundColor: decisionGrade.bgPrimary,
  },
  iqOptionBorder: {
    borderRightWidth: 1,
    borderRightColor: decisionGrade.borderMedium,
  },
  iqOptionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  iqOptionLabelText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: decisionGrade.textPrimary,
  },
  iqInfoIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: decisionGrade.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iqInfoIconText: {
    fontSize: 8,
    fontWeight: '700',
    color: decisionGrade.textPrimary,
  },
  iqOptionValue: {
    fontSize: 20,
    fontWeight: '800',
    color: decisionGrade.textPrimary,
    marginBottom: 2,
  },
  iqOptionValueSelected: {
    color: decisionGrade.pacificTeal,
  },
  iqOptionSub: {
    fontSize: 10,
    fontWeight: '500',
    color: decisionGrade.textPrimary,
    textAlign: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: decisionGrade.borderStrong,
  },
  metricsBox: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: decisionGrade.bgPrimary,
  },
  metricsBoxBorder: {
    borderRightWidth: 1,
    borderRightColor: decisionGrade.borderMedium,
  },
  metricsBoxLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: decisionGrade.textPrimary,
    marginBottom: 4,
  },
  metricsBoxValue: {
    fontSize: 18,
    fontWeight: '800',
    color: decisionGrade.pacificTeal,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 150,
    paddingRight: 16,
  },
  strategyMenu: {
    backgroundColor: 'white',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: decisionGrade.borderMedium,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  strategyMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  strategyMenuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: decisionGrade.borderLight,
  },
  strategyMenuItemText: {
    fontSize: 12,
    fontWeight: '500',
    color: decisionGrade.textPrimary,
  },
  strategyMenuItemTextActive: {
    color: decisionGrade.pacificTeal,
    fontWeight: '600',
  },
});

export default InvestmentAnalysis;
