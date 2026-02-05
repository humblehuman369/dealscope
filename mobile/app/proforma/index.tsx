import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';

import { colors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { proformaService, formatProformaCurrency, formatProformaPercent } from '../../services/proformaService';
import type { FinancialProforma, StrategyType } from '../../types';
import { STRATEGY_LABELS } from '../../types';

export default function ProformaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ propertyId?: string; address?: string }>();
  const { theme, isDark } = useTheme();

  // State
  const [proforma, setProforma] = useState<FinancialProforma | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'summary' | 'projections' | 'sensitivity'>('summary');
  const [isExporting, setIsExporting] = useState(false);

  // Load proforma
  useEffect(() => {
    loadProforma();
  }, [params.propertyId]);

  const loadProforma = async () => {
    if (!params.propertyId) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await proformaService.getSavedProforma(params.propertyId);
      setProforma(data);
    } catch (error: any) {
      // Try to generate a quick proforma if none exists
      try {
        const data = await proformaService.generateQuickProforma(params.propertyId);
        setProforma(data);
      } catch (genError: any) {
        Alert.alert('Error', genError.message || 'Failed to load proforma');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!params.propertyId) return;

    try {
      setIsExporting(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await proformaService.downloadSavedProforma(params.propertyId, 'pdf');

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable && result) {
        Alert.alert('Export Ready', 'Your proforma PDF has been generated and is ready to share.');
      }
    } catch (error: any) {
      Alert.alert('Export Failed', error.message || 'Failed to export proforma');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = async () => {
    if (!params.propertyId) return;

    try {
      setIsLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const data = await proformaService.generateQuickProforma(params.propertyId);
      setProforma(data);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to refresh proforma');
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic styles
  const dynamicStyles = {
    container: { backgroundColor: theme.background },
    header: { backgroundColor: theme.headerBackground, borderBottomColor: theme.headerBorder },
    title: { color: theme.text },
    section: { backgroundColor: theme.card, borderColor: isDark ? colors.primary[700] : colors.primary[200] },
    sectionTitle: { color: theme.sectionTitle },
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, dynamicStyles.container]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>Generating Proforma...</Text>
      </View>
    );
  }

  if (!proforma) {
    return (
      <View style={[styles.container, styles.centerContent, dynamicStyles.container]}>
        <Ionicons name="document-text-outline" size={64} color={theme.textMuted} />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>No Proforma Available</Text>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>
          Select a property to view its financial proforma.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, dynamicStyles.title]} numberOfLines={1}>
            Financial Proforma
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
            {params.address || proforma.property_summary?.address || 'Property Analysis'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleExport} disabled={isExporting}>
          {isExporting ? (
            <ActivityIndicator size="small" color={colors.primary[500]} />
          ) : (
            <Ionicons name="download-outline" size={24} color={colors.primary[500]} />
          )}
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: theme.headerBorder }]}>
        {(['summary', 'projections', 'sensitivity'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.tabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTab(tab);
            }}
          >
            <Text
              style={[
                styles.tabText,
                { color: selectedTab === tab ? colors.primary[500] : theme.textMuted },
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {selectedTab === tab && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Summary Tab */}
        {selectedTab === 'summary' && (
          <>
            {/* Deal Score */}
            {proforma.deal_score && (
              <View style={[styles.section, dynamicStyles.section]}>
                <View style={styles.dealScoreHeader}>
                  <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>DEAL SCORE</Text>
                  <View
                    style={[
                      styles.scoreBadge,
                      {
                        backgroundColor:
                          proforma.deal_score.grade === 'A'
                            ? colors.profit.main
                            : proforma.deal_score.grade === 'B'
                            ? colors.info.main
                            : proforma.deal_score.grade === 'C'
                            ? colors.warning.main
                            : colors.loss.main,
                      },
                    ]}
                  >
                    <Text style={styles.scoreGrade}>{proforma.deal_score.grade}</Text>
                  </View>
                </View>
                <View style={styles.scoreRow}>
                  <Text style={[styles.scoreValue, { color: theme.text }]}>
                    {proforma.deal_score.score}/100
                  </Text>
                  <Text style={[styles.scoreLabel, { color: theme.textMuted }]}>
                    {proforma.deal_score.summary}
                  </Text>
                </View>
              </View>
            )}

            {/* Key Metrics */}
            {proforma.key_metrics && (
              <View style={[styles.section, dynamicStyles.section]}>
                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>KEY METRICS</Text>
                <View style={styles.metricsGrid}>
                  <MetricCard
                    label="Cap Rate"
                    value={formatProformaPercent(proforma.key_metrics.cap_rate)}
                    theme={theme}
                    isDark={isDark}
                  />
                  <MetricCard
                    label="Cash-on-Cash"
                    value={formatProformaPercent(proforma.key_metrics.cash_on_cash)}
                    theme={theme}
                    isDark={isDark}
                  />
                  <MetricCard
                    label="DSCR"
                    value={proforma.key_metrics.dscr?.toFixed(2) || '--'}
                    theme={theme}
                    isDark={isDark}
                  />
                  <MetricCard
                    label="Monthly Cash Flow"
                    value={formatProformaCurrency(proforma.key_metrics.monthly_cash_flow)}
                    theme={theme}
                    isDark={isDark}
                    isPositive={proforma.key_metrics.monthly_cash_flow > 0}
                  />
                </View>
              </View>
            )}

            {/* Income Details */}
            {proforma.income_details && (
              <View style={[styles.section, dynamicStyles.section]}>
                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>INCOME</Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Gross Rent</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {formatProformaCurrency(proforma.income_details.gross_rent)}/yr
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Vacancy Loss</Text>
                  <Text style={[styles.detailValue, { color: colors.loss.main }]}>
                    -{formatProformaCurrency(proforma.income_details.vacancy_loss)}
                  </Text>
                </View>
                <View style={[styles.detailRow, styles.detailRowTotal]}>
                  <Text style={[styles.detailLabel, { color: theme.text, fontWeight: '600' }]}>
                    Net Operating Income
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.profit.main, fontWeight: '600' }]}>
                    {formatProformaCurrency(proforma.income_details.net_operating_income)}
                  </Text>
                </View>
              </View>
            )}

            {/* Expense Details */}
            {proforma.expense_details && (
              <View style={[styles.section, dynamicStyles.section]}>
                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>EXPENSES</Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Property Taxes</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {formatProformaCurrency(proforma.expense_details.property_taxes)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Insurance</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {formatProformaCurrency(proforma.expense_details.insurance)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Maintenance</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {formatProformaCurrency(proforma.expense_details.maintenance)}
                  </Text>
                </View>
                <View style={[styles.detailRow, styles.detailRowTotal]}>
                  <Text style={[styles.detailLabel, { color: theme.text, fontWeight: '600' }]}>
                    Total Expenses
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.loss.main, fontWeight: '600' }]}>
                    {formatProformaCurrency(proforma.expense_details.total_expenses)}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* Projections Tab */}
        {selectedTab === 'projections' && proforma.projections && (
          <View style={[styles.section, dynamicStyles.section]}>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>ANNUAL PROJECTIONS</Text>
            <View style={styles.projectionsTable}>
              <View style={styles.projectionsHeader}>
                <Text style={[styles.projHeaderCell, { color: theme.textMuted }]}>Year</Text>
                <Text style={[styles.projHeaderCell, { color: theme.textMuted }]}>NOI</Text>
                <Text style={[styles.projHeaderCell, { color: theme.textMuted }]}>Cash Flow</Text>
              </View>
              {proforma.projections.annual_noi?.slice(0, 5).map((noi, index) => (
                <View key={index} style={styles.projectionsRow}>
                  <Text style={[styles.projCell, { color: theme.text }]}>{index + 1}</Text>
                  <Text style={[styles.projCell, { color: theme.text }]}>
                    {formatProformaCurrency(noi)}
                  </Text>
                  <Text
                    style={[
                      styles.projCell,
                      {
                        color:
                          proforma.projections?.annual_cash_flow?.[index] > 0
                            ? colors.profit.main
                            : colors.loss.main,
                      },
                    ]}
                  >
                    {formatProformaCurrency(proforma.projections?.annual_cash_flow?.[index] || 0)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Sensitivity Tab */}
        {selectedTab === 'sensitivity' && proforma.sensitivity_analysis && (
          <View style={[styles.section, dynamicStyles.section]}>
            <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>SENSITIVITY ANALYSIS</Text>
            {proforma.sensitivity_analysis.scenarios?.map((scenario, index) => (
              <View key={index} style={styles.scenarioCard}>
                <Text style={[styles.scenarioName, { color: theme.text }]}>{scenario.name}</Text>
                <Text style={[styles.scenarioDesc, { color: theme.textMuted }]}>
                  {scenario.description}
                </Text>
                <View style={styles.scenarioMetrics}>
                  <View style={styles.scenarioMetric}>
                    <Text style={[styles.scenarioLabel, { color: theme.textMuted }]}>CoC Return</Text>
                    <Text
                      style={[
                        styles.scenarioValue,
                        { color: scenario.cash_on_cash > 0 ? colors.profit.main : colors.loss.main },
                      ]}
                    >
                      {formatProformaPercent(scenario.cash_on_cash)}
                    </Text>
                  </View>
                  <View style={styles.scenarioMetric}>
                    <Text style={[styles.scenarioLabel, { color: theme.textMuted }]}>Monthly CF</Text>
                    <Text
                      style={[
                        styles.scenarioValue,
                        { color: scenario.monthly_cash_flow > 0 ? colors.profit.main : colors.loss.main },
                      ]}
                    >
                      {formatProformaCurrency(scenario.monthly_cash_flow)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Refresh Button */}
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={18} color={colors.primary[600]} />
          <Text style={styles.refreshButtonText}>Regenerate Proforma</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// Metric Card Component
function MetricCard({
  label,
  value,
  theme,
  isDark,
  isPositive,
}: {
  label: string;
  value: string;
  theme: any;
  isDark: boolean;
  isPositive?: boolean;
}) {
  return (
    <View
      style={[
        styles.metricCard,
        { backgroundColor: isDark ? colors.navy[800] : colors.gray[50] },
      ]}
    >
      <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          {
            color:
              isPositive !== undefined
                ? isPositive
                  ? colors.profit.main
                  : colors.loss.main
                : theme.text,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, marginTop: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 8, marginHorizontal: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8, marginLeft: -8 },
  headerContent: { flex: 1, marginLeft: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabActive: {},
  tabText: { fontSize: 14, fontWeight: '500' },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: colors.primary[500],
    borderRadius: 1,
  },
  content: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  section: { borderRadius: 16, borderWidth: 1.5, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 12 },
  dealScoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  scoreGrade: { fontSize: 18, fontWeight: '700', color: '#fff' },
  scoreRow: { marginTop: 8 },
  scoreValue: { fontSize: 24, fontWeight: '700' },
  scoreLabel: { fontSize: 13, marginTop: 4 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricCard: { flex: 1, minWidth: '45%', padding: 12, borderRadius: 10 },
  metricLabel: { fontSize: 11, fontWeight: '500' },
  metricValue: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  detailRowTotal: { borderTopWidth: 1, borderTopColor: colors.gray[200], marginTop: 8, paddingTop: 12 },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: '500' },
  projectionsTable: {},
  projectionsHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.gray[200] },
  projHeaderCell: { flex: 1, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  projectionsRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  projCell: { flex: 1, fontSize: 13, textAlign: 'center' },
  scenarioCard: { padding: 12, borderRadius: 10, backgroundColor: colors.gray[50], marginBottom: 12 },
  scenarioName: { fontSize: 15, fontWeight: '600' },
  scenarioDesc: { fontSize: 12, marginTop: 4 },
  scenarioMetrics: { flexDirection: 'row', marginTop: 12, gap: 16 },
  scenarioMetric: {},
  scenarioLabel: { fontSize: 11 },
  scenarioValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  refreshButtonText: { fontSize: 14, fontWeight: '500', color: colors.primary[600] },
});
