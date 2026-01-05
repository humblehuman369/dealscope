/**
 * Assumptions Adjustment Sliders for real-time recalculation.
 * Allows users to adjust key investment assumptions.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { colors } from '../theme/colors';
import { formatCurrency, formatPercent } from '../services/analytics';

export interface Assumptions {
  downPayment: number;      // 0-1 (percentage)
  interestRate: number;     // 0-1 (percentage)
  loanTerm: number;         // years
  rehabCost: number;        // dollars
  vacancyRate: number;      // 0-1 (percentage)
  managementFee: number;    // 0-1 (percentage)
  maintenance: number;      // 0-1 (percentage)
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  downPayment: 0.20,
  interestRate: 0.07,
  loanTerm: 30,
  rehabCost: 25000,
  vacancyRate: 0.05,
  managementFee: 0.08,
  maintenance: 0.05,
};

interface AssumptionsSlidersProps {
  assumptions: Assumptions;
  purchasePrice: number;
  onAssumptionsChange: (assumptions: Assumptions) => void;
  onRecalculate?: () => void;
}

interface SliderConfig {
  key: keyof Assumptions;
  label: string;
  icon: string;
  min: number;
  max: number;
  step: number;
  isPercentage?: boolean;
  isCurrency?: boolean;
  suffix?: string;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  {
    key: 'downPayment',
    label: 'Down Payment',
    icon: 'wallet-outline',
    min: 0.05,
    max: 0.50,
    step: 0.05,
    isPercentage: true,
  },
  {
    key: 'interestRate',
    label: 'Interest Rate',
    icon: 'trending-up-outline',
    min: 0.04,
    max: 0.12,
    step: 0.0025,
    isPercentage: true,
  },
  {
    key: 'loanTerm',
    label: 'Loan Term',
    icon: 'calendar-outline',
    min: 15,
    max: 30,
    step: 5,
    suffix: ' years',
  },
  {
    key: 'rehabCost',
    label: 'Rehab Budget',
    icon: 'hammer-outline',
    min: 0,
    max: 100000,
    step: 5000,
    isCurrency: true,
  },
  {
    key: 'vacancyRate',
    label: 'Vacancy Rate',
    icon: 'home-outline',
    min: 0,
    max: 0.15,
    step: 0.01,
    isPercentage: true,
  },
  {
    key: 'managementFee',
    label: 'Management Fee',
    icon: 'people-outline',
    min: 0,
    max: 0.15,
    step: 0.01,
    isPercentage: true,
  },
  {
    key: 'maintenance',
    label: 'Maintenance Reserve',
    icon: 'build-outline',
    min: 0,
    max: 0.15,
    step: 0.01,
    isPercentage: true,
  },
];

/**
 * Inline assumptions summary for property detail screen.
 */
export function AssumptionsSummary({
  assumptions,
  purchasePrice,
  onEditPress,
}: {
  assumptions: Assumptions;
  purchasePrice: number;
  onEditPress: () => void;
}) {
  const downPaymentAmount = purchasePrice * assumptions.downPayment;
  const loanAmount = purchasePrice - downPaymentAmount;
  
  return (
    <TouchableOpacity style={styles.summaryCard} onPress={onEditPress} activeOpacity={0.7}>
      <View style={styles.summaryHeader}>
        <View style={styles.summaryTitleRow}>
          <Ionicons name="settings-outline" size={18} color={colors.primary[600]} />
          <Text style={styles.summaryTitle}>Assumptions</Text>
        </View>
        <View style={styles.editBadge}>
          <Text style={styles.editBadgeText}>Edit</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary[600]} />
        </View>
      </View>
      
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryItemLabel}>Down</Text>
          <Text style={styles.summaryItemValue}>{formatPercent(assumptions.downPayment)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryItemLabel}>Rate</Text>
          <Text style={styles.summaryItemValue}>{formatPercent(assumptions.interestRate)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryItemLabel}>Term</Text>
          <Text style={styles.summaryItemValue}>{assumptions.loanTerm}yr</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryItemLabel}>Rehab</Text>
          <Text style={styles.summaryItemValue}>{formatCurrency(assumptions.rehabCost)}</Text>
        </View>
      </View>
      
      <View style={styles.loanInfo}>
        <Text style={styles.loanInfoText}>
          Down: {formatCurrency(downPaymentAmount)} • Loan: {formatCurrency(loanAmount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Full-screen assumptions editor modal.
 */
export function AssumptionsModal({
  visible,
  assumptions,
  purchasePrice,
  onClose,
  onSave,
}: {
  visible: boolean;
  assumptions: Assumptions;
  purchasePrice: number;
  onClose: () => void;
  onSave: (assumptions: Assumptions) => void;
}) {
  const insets = useSafeAreaInsets();
  const [localAssumptions, setLocalAssumptions] = useState<Assumptions>(assumptions);
  
  const handleSliderChange = useCallback((key: keyof Assumptions, value: number) => {
    setLocalAssumptions(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const handleSliderComplete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);
  
  const handleReset = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setLocalAssumptions(DEFAULT_ASSUMPTIONS);
  }, []);
  
  const handleSave = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(localAssumptions);
    onClose();
  }, [localAssumptions, onSave, onClose]);
  
  // Calculate derived values
  const downPaymentAmount = purchasePrice * localAssumptions.downPayment;
  const loanAmount = purchasePrice - downPaymentAmount;
  const monthlyPayment = calculateMonthlyPayment(
    loanAmount,
    localAssumptions.interestRate,
    localAssumptions.loanTerm
  );
  
  const formatValue = (config: SliderConfig, value: number): string => {
    if (config.isPercentage) return formatPercent(value);
    if (config.isCurrency) return formatCurrency(value);
    return `${value}${config.suffix || ''}`;
  };
  
  // Track which slider is being touched to disable scroll
  const [activeSlider, setActiveSlider] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Create a native gesture that blocks parent gestures when touching slider area
  const createSliderGesture = (key: string) => {
    return Gesture.Native()
      .onBegin(() => {
        setActiveSlider(key);
      })
      .onFinalize(() => {
        setActiveSlider(null);
      });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Investment Assumptions</Text>
          <TouchableOpacity onPress={handleSave} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.saveText}>Apply</Text>
          </TouchableOpacity>
        </View>
        
        {/* Loan Summary Card */}
        <View style={styles.loanSummaryCard}>
          <View style={styles.loanSummaryRow}>
            <View style={styles.loanSummaryItem}>
              <Text style={styles.loanSummaryLabel}>Down Payment</Text>
              <Text style={styles.loanSummaryValue}>{formatCurrency(downPaymentAmount)}</Text>
            </View>
            <View style={styles.loanSummaryItem}>
              <Text style={styles.loanSummaryLabel}>Loan Amount</Text>
              <Text style={styles.loanSummaryValue}>{formatCurrency(loanAmount)}</Text>
            </View>
            <View style={styles.loanSummaryItem}>
              <Text style={styles.loanSummaryLabel}>Monthly P&I</Text>
              <Text style={styles.loanSummaryValue}>{formatCurrency(monthlyPayment)}</Text>
            </View>
          </View>
        </View>
        
        {/* Sliders - Scroll disabled when touching sliders */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollContent}
          contentContainerStyle={[styles.scrollContentContainer, { paddingBottom: insets.bottom + 80 }]}
          scrollEnabled={activeSlider === null}
          showsVerticalScrollIndicator={true}
          bounces={activeSlider === null}
        >
          {/* Tip for users */}
          <View style={styles.sliderTip}>
            <Ionicons name="finger-print-outline" size={16} color={colors.primary[600]} />
            <Text style={styles.sliderTipText}>
              Tap and drag on the slider track to adjust values
            </Text>
          </View>
          
          {SLIDER_CONFIGS.map((config) => (
            <View key={config.key} style={styles.sliderContainer}>
              <View style={styles.sliderHeader}>
                <View style={styles.sliderLabelRow}>
                  <Ionicons name={config.icon as any} size={18} color={colors.gray[500]} />
                  <Text style={styles.sliderLabel}>{config.label}</Text>
                </View>
                <Text style={styles.sliderValue}>
                  {formatValue(config, localAssumptions[config.key] as number)}
                </Text>
              </View>
              
              {/* Wrap slider in gesture detector to prioritize slider touch over scroll */}
              <GestureDetector gesture={createSliderGesture(config.key)}>
                <View 
                  style={styles.sliderTrackWrapper}
                  onStartShouldSetResponder={() => true}
                  onStartShouldSetResponderCapture={() => true}
                >
                  <Slider
                    style={styles.slider}
                    minimumValue={config.min}
                    maximumValue={config.max}
                    step={config.step}
                    value={localAssumptions[config.key] as number}
                    onValueChange={(value) => handleSliderChange(config.key, value)}
                    onSlidingComplete={handleSliderComplete}
                    minimumTrackTintColor={colors.primary[500]}
                    maximumTrackTintColor={colors.gray[200]}
                    thumbTintColor={Platform.OS === 'ios' ? undefined : colors.primary[600]}
                    tapToSeek={true}
                  />
                </View>
              </GestureDetector>
              
              <View style={styles.sliderMinMax}>
                <Text style={styles.sliderMinMaxText}>
                  {formatValue(config, config.min)}
                </Text>
                <Text style={styles.sliderMinMaxText}>
                  {formatValue(config, config.max)}
                </Text>
              </View>
            </View>
          ))}
          
          {/* Reset Button */}
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Ionicons name="refresh-outline" size={18} color={colors.gray[600]} />
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </ScrollView>
        
        {/* Apply Button */}
        <View style={[styles.applyButtonContainer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.applyButton} onPress={handleSave}>
            <Ionicons name="calculator-outline" size={20} color="#fff" />
            <Text style={styles.applyButtonText}>Recalculate Analysis</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Combined component for use in property detail screen.
 */
export function AssumptionsSection({
  assumptions,
  purchasePrice,
  onAssumptionsChange,
}: AssumptionsSlidersProps) {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <AssumptionsSummary
        assumptions={assumptions}
        purchasePrice={purchasePrice}
        onEditPress={() => setShowModal(true)}
      />
      
      <AssumptionsModal
        visible={showModal}
        assumptions={assumptions}
        purchasePrice={purchasePrice}
        onClose={() => setShowModal(false)}
        onSave={onAssumptionsChange}
      />
    </>
  );
}

// Helper function to calculate monthly mortgage payment
function calculateMonthlyPayment(principal: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 12;
  const numPayments = years * 12;
  if (monthlyRate === 0) return principal / numPayments;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
         (Math.pow(1 + monthlyRate, numPayments) - 1);
}

const styles = StyleSheet.create({
  // Summary Card Styles
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    fontSize: 19,  // Increased to match slider titles
    fontWeight: '600',
    color: colors.gray[900],
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.primary[50],
    borderRadius: 6,
  },
  editBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[600],
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryItemLabel: {
    fontSize: 14,  // Increased to match slider min/max text
    color: colors.gray[500],
    marginBottom: 2,
  },
  summaryItemValue: {
    fontSize: 18,  // Increased to match slider values
    fontWeight: '700',
    color: colors.gray[900],
  },
  loanInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  loanInfoText: {
    fontSize: 15,  // Increased to match slider text
    color: colors.gray[500],
    textAlign: 'center',
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.gray[900],
  },
  cancelText: {
    fontSize: 16,
    color: colors.gray[600],
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[600],
  },
  loanSummaryCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary[200],
    backgroundColor: colors.primary[50],
  },
  loanSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  loanSummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  loanSummaryLabel: {
    fontSize: 14,  // Increased to match slider labels
    color: colors.gray[600],
    marginBottom: 4,
  },
  loanSummaryValue: {
    fontSize: 20,  // Increased to match slider values
    fontWeight: '700',
    color: colors.gray[900],
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sliderContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderLabel: {
    fontSize: 19,  // Increased 25% from 15
    fontWeight: '500',
    color: colors.gray[800],
  },
  sliderValue: {
    fontSize: 20,  // Increased 25% from 16
    fontWeight: '700',
    color: colors.primary[600],
  },
  sliderTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary[50],
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  sliderTipText: {
    flex: 1,
    fontSize: 13,
    color: colors.primary[700],
  },
  sliderTrackWrapper: {
    paddingVertical: 16,
    marginVertical: -8,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
  slider: {
    width: '100%',
    height: 44,
  },
  sliderMinMax: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sliderMinMaxText: {
    fontSize: 14,  // Increased 25% from 11
    color: colors.gray[400],
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
  },
  resetButtonText: {
    fontSize: 15,
    color: colors.gray[600],
  },
  applyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary[600],
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default AssumptionsSection;

