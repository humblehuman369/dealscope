/**
 * FullBreakdownScreen - Tabbed breakdown with Cash Flow, 10-Year, Score, What-If, Loan
 * Route: /analytics/breakdown/[address]
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../../context/ThemeContext';

// Analytics components
import {
  AnalyticsInputs,
  DEFAULT_INPUTS,
  calculateMetrics,
  calculateDealScore,
  generateInsights,
  projectTenYears,
} from '../../../components/analytics';

import { PropertyMiniCard } from '../../../components/analytics/PropertyMiniCard';
import { CashFlowTab } from '../../../components/analytics/tabs/CashFlowTab';
import { TenYearTab } from '../../../components/analytics/tabs/TenYearTab';
import { ScoreTab } from '../../../components/analytics/tabs/ScoreTab';
import { WhatIfTab } from '../../../components/analytics/tabs/WhatIfTab';
import { LoanTab } from '../../../components/analytics/tabs/LoanTab';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Tab {
  id: string;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'cashflow', label: 'Cash Flow', icon: '💵' },
  { id: 'tenyear', label: '10-Year', icon: '📈' },
  { id: 'score', label: 'Score', icon: '🎯' },
  { id: 'whatif', label: 'What-If', icon: '🔮' },
  { id: 'loan', label: 'Loan', icon: '🏦' },
];

export default function FullBreakdownScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { address } = useLocalSearchParams<{ address: string }>();
  
  const decodedAddress = decodeURIComponent(address || '');
  const [activeTab, setActiveTab] = useState('cashflow');

  // Mock property data
  const property = useMemo(() => ({
    address: decodedAddress || '3742 Old Lighthouse Cir',
    city: 'Jupiter',
    state: 'FL',
    price: 617670,
  }), [decodedAddress]);

  // Analytics inputs
  const [inputs] = useState<AnalyticsInputs>({
    ...DEFAULT_INPUTS,
    purchasePrice: property.price,
    monthlyRent: Math.round(property.price * 0.006),
  });

  // Calculate metrics
  const metrics = useMemo(() => calculateMetrics(inputs), [inputs]);
  const dealScore = useMemo(() => calculateDealScore(metrics), [metrics]);
  const insights = useMemo(() => generateInsights(metrics, inputs), [metrics, inputs]);
  const projections = useMemo(() => projectTenYears(inputs, metrics), [inputs, metrics]);

  // Handle tab change
  const handleTabChange = useCallback((tabId: string) => {
    Haptics.selectionAsync();
    setActiveTab(tabId);
  }, []);

  // Theme colors
  const bgColor = isDark ? '#07172e' : '#f8fafc';
  const textColor = isDark ? '#fff' : '#07172e';

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'cashflow':
        return <CashFlowTab inputs={inputs} metrics={metrics} isDark={isDark} />;
      case 'tenyear':
        return (
          <TenYearTab 
            projections={projections} 
            initialInvestment={metrics.totalCashRequired} 
            isDark={isDark} 
          />
        );
      case 'score':
        return <ScoreTab score={dealScore} insights={insights} isDark={isDark} />;
      case 'whatif':
        return <WhatIfTab baseInputs={inputs} baseMetrics={metrics} isDark={isDark} />;
      case 'loan':
        return <LoanTab inputs={inputs} metrics={metrics} isDark={isDark} />;
      default:
        return <CashFlowTab inputs={inputs} metrics={metrics} isDark={isDark} />;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity 
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.05)' }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={textColor} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: textColor }]}>Full Breakdown</Text>
          
          <View style={{ width: 36 }} />
        </View>

        {/* Property Mini Card */}
        <View style={styles.propertySection}>
          <PropertyMiniCard property={property} isDark={isDark} />
        </View>

        {/* Tab Navigation */}
        <View style={[styles.tabNav, { 
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.04)',
        }]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScroll}
          >
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tab,
                    isActive && styles.tabActive,
                  ]}
                  onPress={() => handleTabChange(tab.id)}
                  activeOpacity={0.7}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={isDark ? ['#0097a7', '#4dd0e1'] : ['#007ea7', '#0097a7']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.tabActiveGradient}
                    >
                      <Text style={styles.tabIcon}>{tab.icon}</Text>
                      <Text style={[styles.tabLabel, styles.tabLabelActive]}>
                        {tab.label}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.tabInner}>
                      <Text style={styles.tabIcon}>{tab.icon}</Text>
                      <Text style={[styles.tabLabel, { color: '#6b7280' }]}>
                        {tab.label}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={{ 
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {renderTabContent()}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  propertySection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tabNav: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabScroll: {
    gap: 4,
  },
  tab: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  tabActive: {},
  tabActiveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tabIcon: {
    fontSize: 12,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
});

