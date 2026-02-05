/**
 * InvestmentAnalysis Component - Decision-Grade UI (Redesigned)
 * 
 * Gradient floating card with pill-style price selector,
 * RECOMMENDED badge on Target Buy, white metric cards with shadows,
 * and dynamic context label.
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { decisionGrade } from '../../theme/colors';
import { rf, rs } from './responsive';

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

const getPriceLabel = (id: IQPriceId): string => {
  switch (id) {
    case 'breakeven': return 'BREAKEVEN';
    case 'target': return 'TARGET BUY';
    case 'wholesale': return 'WHOLESALE';
  }
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
    <View style={styles.outerContainer}>
      <LinearGradient
        colors={[
          decisionGrade.gradientTealStart,
          decisionGrade.gradientCyanMid,
          decisionGrade.gradientTealEnd,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientCard}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconCircle}>
              <Ionicons name="analytics" size={18} color={decisionGrade.pacificTeal} />
            </View>
            <View style={styles.headerTextGroup}>
              <Text style={styles.title}>YOUR INVESTMENT ANALYSIS</Text>
              <Text style={styles.subtitle}>Based on your terms ({financingTerms})</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={onChangeTerms} style={styles.termsBtn}>
              <Ionicons name="settings-outline" size={14} color={decisionGrade.textSecondary} />
              <Text style={styles.termsBtnText}>Terms</Text>
            </TouchableOpacity>
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

        {/* IQ Price Selector - Pill Style */}
        <View style={styles.selectorContainer}>
          <View style={styles.iqSelector}>
            {iqPrices.map((option) => {
              const isSelected = selectedIQPrice === option.id;
              const isTarget = option.id === 'target';

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.iqOption,
                    isSelected && styles.iqOptionSelected,
                  ]}
                  onPress={() => handleIQSelect(option.id)}
                  activeOpacity={0.7}
                >
                  {/* RECOMMENDED badge for Target Buy */}
                  {isTarget && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>RECOMMENDED</Text>
                    </View>
                  )}

                  <Text style={[
                    styles.iqOptionLabelText,
                    isSelected && styles.iqOptionLabelSelected,
                  ]}>
                    {option.label}
                  </Text>

                  <Text style={[
                    styles.iqOptionValue,
                    isSelected && styles.iqOptionValueSelected,
                  ]}>
                    {formatPrice(option.value)}
                  </Text>

                  <Text style={[
                    styles.iqOptionSub,
                    isSelected && styles.iqOptionSubSelected,
                  ]}>
                    {option.subtitle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* How Calculated Link */}
        <TouchableOpacity style={styles.howCalculated} onPress={onHowCalculated}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>i</Text>
          </View>
          <Text style={styles.howCalculatedText}>
            How {getPriceLabel(selectedIQPrice)} is calculated
          </Text>
        </TouchableOpacity>

        {/* Metrics Cards */}
        <View style={styles.metricsRow}>
          {metrics.map((metric, index) => (
            <View key={index} style={styles.metricCard}>
              <View style={styles.metricAccent} />
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricValue}>{metric.value}</Text>
            </View>
          ))}
        </View>

        {/* Dynamic Context Label */}
        <View style={styles.contextLabelRow}>
          <Ionicons name="information-circle-outline" size={14} color={decisionGrade.textTertiary} />
          <Text style={styles.contextLabel}>
            Based on{' '}
            <Text style={styles.contextLabelHighlight}>
              {getPriceLabel(selectedIQPrice)}
            </Text>
            {' '}price
          </Text>
        </View>
      </LinearGradient>

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
  outerContainer: {
    paddingHorizontal: rs(16),
    paddingVertical: rs(8),
    backgroundColor: decisionGrade.bgSecondary,
  },
  gradientCard: {
    borderRadius: rs(12),
    borderWidth: 1,
    borderColor: 'rgba(8,145,178,0.20)',
    padding: rs(16),
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: rs(14),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    flex: 1,
  },
  iconCircle: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(18),
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTextGroup: {
    flex: 1,
  },
  title: {
    fontSize: rf(12),
    fontWeight: '700',
    color: decisionGrade.textPrimary,
    letterSpacing: 0.5,
    marginBottom: rs(2),
  },
  subtitle: {
    fontSize: rf(10),
    fontWeight: '500',
    color: decisionGrade.textSecondary,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: rs(6),
  },
  termsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingVertical: rs(5),
    paddingHorizontal: rs(10),
    borderRadius: rs(6),
    borderWidth: 1,
    borderColor: decisionGrade.borderLight,
    backgroundColor: 'white',
  },
  termsBtnText: {
    fontSize: rf(10),
    fontWeight: '500',
    color: decisionGrade.textSecondary,
  },
  strategyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    paddingVertical: rs(6),
    paddingHorizontal: rs(12),
    backgroundColor: decisionGrade.pacificTeal,
    borderRadius: rs(6),
  },
  strategyBtnText: {
    fontSize: rf(11),
    fontWeight: '600',
    color: 'white',
  },
  selectorContainer: {
    marginBottom: rs(10),
  },
  iqSelector: {
    flexDirection: 'row',
    backgroundColor: decisionGrade.unselectedCardBg,
    borderRadius: rs(10),
    padding: rs(4),
    gap: rs(4),
  },
  iqOption: {
    flex: 1,
    paddingVertical: rs(12),
    paddingHorizontal: rs(6),
    alignItems: 'center',
    borderRadius: rs(8),
    backgroundColor: 'transparent',
  },
  iqOptionSelected: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendedBadge: {
    position: 'absolute',
    top: rs(2),
    alignSelf: 'center',
    backgroundColor: decisionGrade.recommendedBadgeBg,
    paddingHorizontal: rs(6),
    paddingVertical: rs(1),
    borderRadius: rs(4),
  },
  recommendedText: {
    fontSize: rf(6),
    fontWeight: '700',
    letterSpacing: 0.5,
    color: decisionGrade.pacificTeal,
  },
  iqOptionLabelText: {
    fontSize: rf(9),
    fontWeight: '600',
    letterSpacing: 0.3,
    color: decisionGrade.textTertiary,
    marginTop: rs(6),
    marginBottom: rs(4),
  },
  iqOptionLabelSelected: {
    color: decisionGrade.textPrimary,
    fontWeight: '700',
  },
  iqOptionValue: {
    fontSize: rf(15),
    fontWeight: '700',
    color: decisionGrade.textTertiary,
    marginBottom: rs(2),
  },
  iqOptionValueSelected: {
    fontSize: rf(20),
    fontWeight: '800',
    color: decisionGrade.pacificTeal,
  },
  iqOptionSub: {
    fontSize: rf(8),
    fontWeight: '500',
    color: decisionGrade.textMuted,
    textAlign: 'center',
  },
  iqOptionSubSelected: {
    color: decisionGrade.textSecondary,
  },
  howCalculated: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    marginBottom: rs(14),
  },
  infoIcon: {
    width: rs(14),
    height: rs(14),
    borderRadius: rs(7),
    borderWidth: 1.5,
    borderColor: decisionGrade.pacificTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: {
    fontSize: rf(9),
    fontWeight: '700',
    color: decisionGrade.pacificTeal,
  },
  howCalculatedText: {
    fontSize: rf(10),
    fontWeight: '600',
    color: decisionGrade.pacificTeal,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: rs(8),
    marginBottom: rs(10),
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: rs(10),
    paddingTop: rs(14),
    paddingBottom: rs(12),
    paddingHorizontal: rs(8),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(229,229,229,0.6)',
    overflow: 'hidden',
  },
  metricAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: rs(3),
    backgroundColor: decisionGrade.pacificTeal,
    borderTopLeftRadius: rs(10),
    borderTopRightRadius: rs(10),
  },
  metricLabel: {
    fontSize: rf(9),
    fontWeight: '600',
    letterSpacing: 0.3,
    color: decisionGrade.textSecondary,
    marginBottom: rs(4),
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: rf(17),
    fontWeight: '800',
    color: decisionGrade.pacificTeal,
  },
  contextLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(4),
  },
  contextLabel: {
    fontSize: rf(10),
    fontWeight: '500',
    color: decisionGrade.textTertiary,
  },
  contextLabelHighlight: {
    fontWeight: '700',
    color: decisionGrade.pacificTeal,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: rs(150),
    paddingRight: rs(16),
  },
  strategyMenu: {
    backgroundColor: 'white',
    borderRadius: rs(8),
    borderWidth: 1,
    borderColor: decisionGrade.borderMedium,
    minWidth: rs(160),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  strategyMenuItem: {
    paddingVertical: rs(10),
    paddingHorizontal: rs(14),
  },
  strategyMenuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: decisionGrade.borderLight,
  },
  strategyMenuItemText: {
    fontSize: rf(12),
    fontWeight: '500',
    color: decisionGrade.textPrimary,
  },
  strategyMenuItemTextActive: {
    color: decisionGrade.pacificTeal,
    fontWeight: '600',
  },
});

export default InvestmentAnalysis;
