/**
 * DealMakerScreen - Deal Maker IQ main container
 * EXACT implementation from design files - no modifications
 * 
 * Design specs:
 * - Content background: #F1F5F9
 * - Content padding: 16px
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { 
  View, 
  Text,
  ScrollView, 
  StyleSheet, 
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useDealMakerBackendCalc } from '../../hooks/useDealMakerBackendCalc';

import { MetricsHeader } from './MetricsHeader';
import { WorksheetTab } from './WorksheetTab';
import { DealMakerSlider, formatSliderValue } from './DealMakerSlider';
import {
  DealMakerState,
  DealMakerMetrics,
  DealMakerScreenProps,
  TabId,
  TabConfig,
  TAB_CONFIGS,
  DEFAULT_DEAL_MAKER_STATE,
  BUY_PRICE_SLIDERS,
  FINANCING_SLIDERS,
  REHAB_VALUATION_SLIDERS,
  INCOME_SLIDERS,
  EXPENSES_SLIDERS,
  LoanType,
} from './types';

// Persistence key prefix for deal-maker state
const DM_STORAGE_PREFIX = 'dealgapiq-dm-state::';

export function DealMakerScreen({
  propertyAddress,
  listPrice,
  initialState,
  propertyTax,
  insurance,
  rentEstimate,
  onBackPress,
}: DealMakerScreenProps) {
  const insets = useSafeAreaInsets();
  const storageKey = `${DM_STORAGE_PREFIX}${encodeURIComponent(propertyAddress)}`;

  // State — initialised from props; persisted entry loaded via effect below
  const [state, setState] = useState<DealMakerState>(() => ({
    ...DEFAULT_DEAL_MAKER_STATE,
    buyPrice: listPrice ?? DEFAULT_DEAL_MAKER_STATE.buyPrice,
    annualPropertyTax: propertyTax ?? DEFAULT_DEAL_MAKER_STATE.annualPropertyTax,
    annualInsurance: insurance ?? DEFAULT_DEAL_MAKER_STATE.annualInsurance,
    monthlyRent: rentEstimate ?? DEFAULT_DEAL_MAKER_STATE.monthlyRent,
    arv: (listPrice ?? DEFAULT_DEAL_MAKER_STATE.buyPrice) * 1.2,
    ...initialState,
  }));

  const [activeTab, setActiveTab] = useState<TabId>('buyPrice');
  const [completedTabs, setCompletedTabs] = useState<Set<TabId>>(new Set());

  // ── Restore persisted state on mount ───────────────────────────────────
  const didRestore = useRef(false);
  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<DealMakerState>;
          setState(prev => ({ ...prev, ...saved }));
        }
      } catch {
        // Silent — fall through to prop defaults
      }
    })();
  }, [storageKey]);

  // ── Persist state changes (debounced) ──────────────────────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      AsyncStorage.setItem(storageKey, JSON.stringify(state)).catch(() => {});
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state, storageKey]);

  // Calculations — delegated to backend via debounced API call
  const { metrics, isCalculating, error: calcError } = useDealMakerBackendCalc(state, listPrice);

  // Handlers
  const updateState = useCallback(<K extends keyof DealMakerState>(
    key: K,
    value: DealMakerState[K]
  ) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleTabToggle = useCallback((tabId: TabId) => {
    setActiveTab(prev => prev === tabId ? tabId : tabId);
  }, []);

  const handleContinue = useCallback((currentTabId: TabId) => {
    setCompletedTabs(prev => new Set(prev).add(currentTabId));

    const tabOrder: TabId[] = ['buyPrice', 'financing', 'rehabValuation', 'income', 'expenses'];
    const currentIndex = tabOrder.indexOf(currentTabId);
    
    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    } else {
      handleFinish();
    }
  }, []);

  const handleFinish = useCallback(() => {
    if (__DEV__) console.log('Deal saved:', { state, metrics });
  }, [state, metrics]);

  // Tab configs with status
  const tabConfigs = useMemo<TabConfig[]>(() => {
    return TAB_CONFIGS.map(config => ({
      ...config,
      status: completedTabs.has(config.id) 
        ? 'completed' 
        : config.id === activeTab 
          ? 'active' 
          : 'pending',
    }));
  }, [activeTab, completedTabs]);

  // Loan type
  const loanTypeOptions = ['15-Year Fixed', '30-Year Fixed', 'ARM'];
  const loanTypeIndex = state.loanType === '15-year' ? 0 : state.loanType === '30-year' ? 1 : 2;

  const handleLoanTypeChange = useCallback((index: number) => {
    const loanTypes: LoanType[] = ['15-year', '30-year', 'arm'];
    const newType = loanTypes[index];
    updateState('loanType', newType);
    
    if (newType === '15-year') {
      updateState('loanTermYears', 15);
    } else if (newType === '30-year') {
      updateState('loanTermYears', 30);
    }
  }, [updateState]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* DealGapIQ Header */}
      <View style={[styles.dealGapIQHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity 
          style={styles.dealGapIQBackBtn} 
          onPress={onBackPress}
          activeOpacity={0.7}
        >
          <Svg width={18} height={18} fill="none" stroke="#0891B2" strokeWidth={2} viewBox="0 0 24 24">
            <Path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </Svg>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        
        <View style={styles.dealGapIQLogo}>
          <Text style={styles.logoInvest}>DealGap</Text>
          <Text style={styles.logoIQ}>IQ</Text>
        </View>
        
        <View style={styles.headerSpacer} />
      </View>

      {/* Deal Maker IQ Header */}
      <View style={{ backgroundColor: '#0A1628' }}>
        <MetricsHeader 
          state={state} 
          metrics={metrics} 
          listPrice={listPrice}
          propertyAddress={propertyAddress}
        />
      </View>

      {/* Scrollable Content */}
      <KeyboardAvoidingView 
        style={styles.scrollContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Tab 1: Buy Price */}
          <WorksheetTab
            config={tabConfigs[0]}
            isExpanded={activeTab === 'buyPrice'}
            onToggle={() => handleTabToggle('buyPrice')}
            onContinue={() => handleContinue('buyPrice')}
            derivedOutput={{
              label: 'CASH NEEDED',
              value: formatSliderValue(metrics.cashNeeded, 'currency'),
            }}
          >
            {BUY_PRICE_SLIDERS.map(slider => (
              <DealMakerSlider
                key={slider.id}
                config={slider}
                value={state[slider.id] as number}
                onChange={(value) => updateState(slider.id, value)}
              />
            ))}
          </WorksheetTab>

          {/* Tab 2: Financing */}
          <WorksheetTab
            config={tabConfigs[1]}
            isExpanded={activeTab === 'financing'}
            onToggle={() => handleTabToggle('financing')}
            onContinue={() => handleContinue('financing')}
            derivedOutput={{
              label: 'MONTHLY PAYMENT',
              value: formatSliderValue(metrics.monthlyPayment, 'currency'),
            }}
          >
            {/* Loan Amount */}
            <View style={styles.calculatedRow}>
              <Text style={styles.calculatedLabel}>Loan Amount</Text>
              <Text style={styles.calculatedValue}>
                {formatSliderValue(metrics.loanAmount, 'currency')}
              </Text>
            </View>

            {/* Loan Type */}
            <View style={styles.segmentedContainer}>
              <Text style={styles.segmentedLabel}>Loan Type</Text>
              <SegmentedControl
                values={loanTypeOptions}
                selectedIndex={loanTypeIndex}
                onChange={(event) => handleLoanTypeChange(event.nativeEvent.selectedSegmentIndex)}
                style={styles.segmentedControl}
                tintColor="#0891B2"
                fontStyle={{ fontSize: 13 }}
                activeFontStyle={{ fontSize: 13, fontWeight: '600' }}
              />
            </View>

            {FINANCING_SLIDERS.map(slider => (
              <DealMakerSlider
                key={slider.id}
                config={slider}
                value={state[slider.id] as number}
                onChange={(value) => updateState(slider.id, value)}
              />
            ))}
          </WorksheetTab>

          {/* Tab 3: Rehab & Valuation */}
          <WorksheetTab
            config={tabConfigs[2]}
            isExpanded={activeTab === 'rehabValuation'}
            onToggle={() => handleTabToggle('rehabValuation')}
            onContinue={() => handleContinue('rehabValuation')}
            derivedOutput={{
              label: 'EQUITY CREATED',
              value: formatSliderValue(metrics.equityCreated, 'currency'),
            }}
          >
            {REHAB_VALUATION_SLIDERS.map(slider => (
              <DealMakerSlider
                key={slider.id}
                config={{
                  ...slider,
                  ...(slider.id === 'arv' && {
                    min: state.buyPrice,
                    max: state.buyPrice * 2,
                  }),
                }}
                value={state[slider.id] as number}
                onChange={(value) => updateState(slider.id, value)}
              />
            ))}
          </WorksheetTab>

          {/* Tab 4: Income */}
          <WorksheetTab
            config={tabConfigs[3]}
            isExpanded={activeTab === 'income'}
            onToggle={() => handleTabToggle('income')}
            onContinue={() => handleContinue('income')}
            derivedOutput={{
              label: 'GROSS MONTHLY INCOME',
              value: formatSliderValue(metrics.grossMonthlyIncome, 'currencyPerMonth'),
            }}
          >
            {INCOME_SLIDERS.map(slider => (
              <DealMakerSlider
                key={slider.id}
                config={slider}
                value={state[slider.id] as number}
                onChange={(value) => updateState(slider.id, value)}
              />
            ))}
          </WorksheetTab>

          {/* Tab 5: Expenses */}
          <WorksheetTab
            config={tabConfigs[4]}
            isExpanded={activeTab === 'expenses'}
            onToggle={() => handleTabToggle('expenses')}
            onContinue={() => handleContinue('expenses')}
            derivedOutput={{
              label: 'TOTAL MONTHLY EXPENSES',
              value: formatSliderValue(metrics.totalMonthlyExpenses, 'currencyPerMonth'),
            }}
            isLastTab
          >
            {EXPENSES_SLIDERS.map(slider => (
              <DealMakerSlider
                key={slider.id}
                config={slider}
                value={state[slider.id] as number}
                onChange={(value) => updateState(slider.id, value)}
              />
            ))}
          </WorksheetTab>

          {/* Bottom padding */}
          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Local calculations removed — all metrics now computed by backend via
// useDealMakerBackendCalc hook (POST /api/v1/worksheet/ltr/calculate).

// Styles - EXACT from design files
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  dealGapIQHeader: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dealGapIQBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0891B2',
  },
  dealGapIQLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoInvest: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0A1628',
  },
  logoIQ: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0891B2',
  },
  headerSpacer: {
    width: 60,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  calculatedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  calculatedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A1628',
  },
  calculatedValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0891B2',
  },
  segmentedContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  segmentedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A1628',
    marginBottom: 8,
  },
  segmentedControl: {
    height: 36,
  },
});

export default DealMakerScreen;
