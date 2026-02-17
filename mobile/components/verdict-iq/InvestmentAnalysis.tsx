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
import { verdictDark } from '../../theme/colors';
import { verdictTypography } from '../../theme/textStyles';
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
    case 'breakeven': return 'INCOME VALUE';
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
      <View style={styles.gradientCard}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconCircle}>
              <Ionicons name="analytics" size={18} color={verdictDark.blue} />
            </View>
            <View style={styles.headerTextGroup}>
              <Text style={styles.title}>YOUR INVESTMENT ANALYSIS</Text>
              <Text style={styles.subtitle}>Based on your terms ({financingTerms})</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={onChangeTerms} style={styles.termsBtn}>
              <Ionicons name="settings-outline" size={14} color={verdictDark.textBody} />
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
                  <Text style={[
                    styles.iqOptionLabelText,
                    isSelected && styles.iqOptionLabelSelected,
                  ]}>
                    {option.label}
                  </Text>

                  <Text
                    style={[
                      styles.iqOptionValue,
                      isSelected && styles.iqOptionValueSelected,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
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
              <Text style={styles.metricLabel} numberOfLines={1}>{metric.label}</Text>
              <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{metric.value}</Text>
            </View>
          ))}
        </View>

        {/* Dynamic Context Label */}
        <View style={styles.contextLabelRow}>
          <Ionicons name="information-circle-outline" size={14} color={verdictDark.textLabel} />
          <Text style={styles.contextLabel}>
            Based on{' '}
            <Text style={styles.contextLabelHighlight}>
              {getPriceLabel(selectedIQPrice)}
            </Text>
            {' '}price
          </Text>
        </View>
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
  outerContainer: {
    paddingBottom: rs(8),
    backgroundColor: verdictDark.black,
  },
  gradientCard: {
    borderRadius: rs(14),
    borderWidth: 1,
    borderColor: verdictDark.border,
    padding: rs(16),
    backgroundColor: verdictDark.card,
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
    backgroundColor: verdictDark.blueBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextGroup: {
    flex: 1,
  },
  title: {
    fontSize: rf(12),
    fontWeight: '700',
    color: verdictDark.textHeading,
    letterSpacing: 0.5,
    marginBottom: rs(2),
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: rf(10),
    fontWeight: '500',
    color: verdictDark.textSecondary,
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
    borderRadius: rs(100),
    borderWidth: 1,
    borderColor: verdictDark.textLabel,
  },
  termsBtnText: {
    fontSize: rf(10),
    fontWeight: '500',
    color: verdictDark.textBody,
  },
  strategyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    paddingVertical: rs(6),
    paddingHorizontal: rs(12),
    backgroundColor: verdictDark.blueDeep,
    borderRadius: rs(100),
  },
  strategyBtnText: {
    fontSize: rf(11),
    fontWeight: '600',
    color: verdictDark.white,
  },
  selectorContainer: {
    marginBottom: rs(10),
  },
  iqSelector: {
    flexDirection: 'row',
    backgroundColor: verdictDark.bg,
    borderRadius: rs(12),
    padding: rs(4),
    gap: rs(4),
    borderWidth: 1,
    borderColor: verdictDark.border,
  },
  iqOption: {
    flex: 1,
    paddingVertical: rs(12),
    paddingHorizontal: rs(6),
    alignItems: 'center',
    borderRadius: rs(10),
    backgroundColor: 'transparent',
  },
  iqOptionSelected: {
    backgroundColor: verdictDark.cardUp,
    borderWidth: 1.5,
    borderColor: verdictDark.borderActive,
    shadowColor: verdictDark.blue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  recommendedBadge: {
    position: 'absolute',
    top: rs(2),
    alignSelf: 'center',
    backgroundColor: verdictDark.blueBg,
    paddingHorizontal: rs(6),
    paddingVertical: rs(1),
    borderRadius: rs(4),
  },
  recommendedText: {
    fontSize: rf(6),
    fontWeight: '700',
    letterSpacing: 0.5,
    color: verdictDark.blue,
  },
  iqOptionLabelText: {
    fontSize: rf(9),
    fontWeight: '600',
    letterSpacing: 0.3,
    color: verdictDark.textLabel,
    marginTop: rs(6),
    marginBottom: rs(4),
    textTransform: 'uppercase',
  },
  iqOptionLabelSelected: {
    color: verdictDark.textHeading,
    fontWeight: '700',
  },
  iqOptionValue: {
    fontSize: rf(15),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: verdictDark.textSecondary,
    marginBottom: rs(2),
  },
  iqOptionValueSelected: {
    fontSize: rf(17),
    fontWeight: '700',
    color: verdictDark.blue,
  },
  iqOptionSub: {
    fontSize: rf(8),
    fontWeight: '500',
    color: verdictDark.textLabel,
    textAlign: 'center',
  },
  iqOptionSubSelected: {
    color: verdictDark.textBody,
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
    borderColor: verdictDark.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: {
    fontSize: rf(9),
    fontWeight: '700',
    color: verdictDark.blue,
  },
  howCalculatedText: {
    fontSize: rf(10),
    fontWeight: '600',
    color: verdictDark.blue,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: rs(8),
    marginBottom: rs(10),
  },
  metricCard: {
    flex: 1,
    backgroundColor: verdictDark.card,
    borderRadius: rs(10),
    paddingTop: rs(14),
    paddingBottom: rs(12),
    paddingHorizontal: rs(8),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: verdictDark.border,
    overflow: 'hidden',
  },
  metricAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: rs(3),
    backgroundColor: verdictDark.blue,
    borderTopLeftRadius: rs(10),
    borderTopRightRadius: rs(10),
  },
  metricLabel: {
    fontSize: rf(9),
    fontWeight: '600',
    letterSpacing: 0.3,
    color: verdictDark.textSecondary,
    marginBottom: rs(4),
    textTransform: 'uppercase',
  },
  metricValue: {
    ...verdictTypography.financial,
    fontSize: rf(15),
    fontWeight: '700',
    color: verdictDark.blue,
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
    color: verdictDark.textLabel,
  },
  contextLabelHighlight: {
    fontWeight: '700',
    color: verdictDark.blue,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: rs(150),
    paddingRight: rs(16),
  },
  strategyMenu: {
    backgroundColor: verdictDark.card,
    borderRadius: rs(12),
    borderWidth: 1,
    borderColor: verdictDark.border,
    minWidth: rs(160),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  strategyMenuItem: {
    paddingVertical: rs(10),
    paddingHorizontal: rs(14),
  },
  strategyMenuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: verdictDark.border,
  },
  strategyMenuItemText: {
    fontSize: rf(12),
    fontWeight: '500',
    color: verdictDark.textBody,
  },
  strategyMenuItemTextActive: {
    color: verdictDark.blue,
    fontWeight: '600',
  },
});

export default InvestmentAnalysis;
