import { useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { fetchPropertyAnalytics, formatCurrency, formatPercent, InvestmentAnalytics } from '../../services/analytics';
import { colors } from '../../theme/colors';
import PropertyWebView from '../../components/PropertyWebView';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ViewMode = 'native' | 'full';

export default function PropertyDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { address } = useLocalSearchParams<{ address: string }>();
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('native'); // Default to native view (works offline)
  
  const decodedAddress = decodeURIComponent(address || '');

  // If full view mode, render WebView with complete web app features
  if (viewMode === 'full') {
    return (
      <PropertyWebView
        address={decodedAddress}
        onClose={() => router.back()}
        onFallbackToNative={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setViewMode('native');
        }}
      />
    );
  }

  const toggleStrategy = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedStrategy(expandedStrategy === key ? null : key);
  };

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['property', decodedAddress],
    queryFn: () => fetchPropertyAnalytics(decodedAddress),
    enabled: !!decodedAddress,
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Analyzing property...</Text>
      </View>
    );
  }

  if (error || !analytics) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.loss.main} />
        <Text style={styles.errorTitle}>Unable to Load Property</Text>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'Failed to fetch property data'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const strategies = [
    { key: 'longTermRental', name: 'Long-Term Rental', icon: 'home-outline' },
    { key: 'shortTermRental', name: 'Short-Term Rental', icon: 'bed-outline' },
    { key: 'brrrr', name: 'BRRRR', icon: 'repeat-outline' },
    { key: 'fixAndFlip', name: 'Fix & Flip', icon: 'hammer-outline' },
    { key: 'houseHack', name: 'House Hacking', icon: 'people-outline' },
    { key: 'wholesale', name: 'Wholesale', icon: 'swap-horizontal-outline' },
  ] as const;

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Property Analysis',
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Property Header */}
        <View style={styles.header}>
          <Text style={styles.address}>{analytics.property.address}</Text>
          <Text style={styles.cityState}>
            {analytics.property.city}, {analytics.property.state} {analytics.property.zip}
          </Text>
          
          <View style={styles.priceRow}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>List Price</Text>
              <Text style={styles.priceValue}>
                {formatCurrency(analytics.pricing.listPrice)}
              </Text>
            </View>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Est. Value</Text>
              <Text style={styles.priceValue}>
                {formatCurrency(analytics.pricing.estimatedValue)}
              </Text>
            </View>
          </View>
        </View>

        {/* Property Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Property Details</Text>
          <View style={styles.detailsGrid}>
            <DetailItem icon="bed-outline" label="Beds" value={analytics.property.bedrooms} />
            <DetailItem icon="water-outline" label="Baths" value={analytics.property.bathrooms} />
            <DetailItem icon="resize-outline" label="Sq Ft" value={analytics.property.sqft.toLocaleString()} />
            <DetailItem icon="calendar-outline" label="Year" value={analytics.property.yearBuilt} />
          </View>
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsCard}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            <MetricItem 
              label="Cap Rate" 
              value={formatPercent(analytics.metrics.capRate)} 
              isGood={analytics.metrics.capRate >= 0.06}
            />
            <MetricItem 
              label="Cash-on-Cash" 
              value={formatPercent(analytics.metrics.cashOnCash)} 
              isGood={analytics.metrics.cashOnCash >= 0.08}
            />
            <MetricItem 
              label="GRM" 
              value={analytics.metrics.grossRentMultiplier.toFixed(1)} 
              isGood={analytics.metrics.grossRentMultiplier <= 12}
            />
            <MetricItem 
              label="DSCR" 
              value={analytics.metrics.dscr.toFixed(2)} 
              isGood={analytics.metrics.dscr >= 1.25}
            />
          </View>
        </View>

        {/* Strategy Cards */}
        <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 8 }]}>
          Investment Strategies
        </Text>
        {strategies.map(({ key, name, icon }) => {
          const strategy = analytics.strategies[key];
          const isExpanded = expandedStrategy === key;
          return (
            <TouchableOpacity 
              key={key} 
              style={[styles.strategyCard, isExpanded && styles.strategyCardExpanded]}
              onPress={() => toggleStrategy(key)}
              activeOpacity={0.7}
            >
              <View style={styles.strategyHeader}>
                <Ionicons name={icon as any} size={20} color={colors.primary[600]} />
                <Text style={styles.strategyName}>{name}</Text>
                <View style={[
                  styles.profitBadge,
                  { backgroundColor: strategy.isProfit ? colors.profit.light : colors.loss.light }
                ]}>
                  <Text style={[
                    styles.profitBadgeText,
                    { color: strategy.isProfit ? colors.profit.main : colors.loss.main }
                  ]}>
                    {strategy.isProfit ? 'Profitable' : 'Loss'}
                  </Text>
                </View>
                <Ionicons 
                  name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                  size={18} 
                  color={colors.gray[400]} 
                />
              </View>
              <View style={styles.strategyMetrics}>
                <View style={styles.strategyMetric}>
                  <Text style={styles.strategyMetricLabel}>{strategy.primaryLabel}</Text>
                  <Text style={[
                    styles.strategyMetricValue,
                    { color: strategy.isProfit ? colors.profit.main : colors.loss.main }
                  ]}>
                    {formatCurrency(strategy.primaryValue)}
                  </Text>
                </View>
                <View style={styles.strategyMetric}>
                  <Text style={styles.strategyMetricLabel}>{strategy.secondaryLabel}</Text>
                  <Text style={styles.strategyMetricSecondary}>
                    {strategy.secondaryLabel === 'Cash-on-Cash' || strategy.secondaryLabel === 'Margin %' || strategy.secondaryLabel === 'ROI'
                      ? formatPercent(strategy.secondaryValue)
                      : formatCurrency(strategy.secondaryValue)}
                  </Text>
                </View>
              </View>
              
              {/* 70% Rule Badge for Fix & Flip */}
              {key === 'fixAndFlip' && strategy.passes70Rule !== undefined && (
                <View style={[
                  styles.ruleCheckBadge,
                  { backgroundColor: strategy.passes70Rule ? colors.profit.light : colors.loss.light }
                ]}>
                  <Ionicons 
                    name={strategy.passes70Rule ? 'checkmark-circle' : 'alert-circle'} 
                    size={14} 
                    color={strategy.passes70Rule ? colors.profit.main : colors.loss.main} 
                  />
                  <Text style={[
                    styles.ruleCheckText,
                    { color: strategy.passes70Rule ? colors.profit.main : colors.loss.main }
                  ]}>
                    70% Rule: {strategy.passes70Rule ? 'PASS' : 'OVER'}
                  </Text>
                </View>
              )}
              
              {/* Expanded Details */}
              {isExpanded && (
                <StrategyDetails 
                  strategyKey={key} 
                  analytics={analytics}
                />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Rent Estimates */}
        <View style={styles.rentCard}>
          <Text style={styles.sectionTitle}>Rental Estimates</Text>
          <View style={styles.rentRow}>
            <View style={styles.rentItem}>
              <Ionicons name="home-outline" size={24} color={colors.primary[600]} />
              <Text style={styles.rentLabel}>Long-Term</Text>
              <Text style={styles.rentValue}>
                {formatCurrency(analytics.pricing.rentEstimate)}/mo
              </Text>
            </View>
            <View style={styles.rentDivider} />
            <View style={styles.rentItem}>
              <Ionicons name="bed-outline" size={24} color={colors.strategies.shortTermRental.primary} />
              <Text style={styles.rentLabel}>Short-Term</Text>
              <Text style={styles.rentValue}>
                {formatCurrency(analytics.pricing.strEstimate)}/night
              </Text>
            </View>
          </View>
        </View>

        {/* Switch to Full View CTA */}
        <TouchableOpacity
          style={styles.fullViewCard}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setViewMode('full');
          }}
        >
          <View style={styles.fullViewContent}>
            <View style={styles.fullViewIcon}>
              <Ionicons name="expand-outline" size={24} color={colors.white} />
            </View>
            <View style={styles.fullViewText}>
              <Text style={styles.fullViewTitle}>Open Full Analysis</Text>
              <Text style={styles.fullViewSubtitle}>
                Access charts, projections, rehab estimator & more
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.primary[600]} />
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Floating Action Button for Full View */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setViewMode('full');
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="analytics" size={22} color={colors.white} />
        <Text style={styles.fabText}>Full Analysis</Text>
      </TouchableOpacity>
    </>
  );
}

function DetailItem({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <View style={styles.detailItem}>
      <Ionicons name={icon as any} size={18} color={colors.gray[500]} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function MetricItem({ label, value, isGood }: { label: string; value: string; isGood: boolean }) {
  return (
    <View style={styles.metricItem}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: isGood ? colors.profit.main : colors.gray[700] }]}>
        {value}
      </Text>
    </View>
  );
}

interface StrategyDetailsProps {
  strategyKey: string;
  analytics: InvestmentAnalytics;
}

function StrategyDetails({ strategyKey, analytics }: StrategyDetailsProps) {
  const { assumptions, pricing, metrics } = analytics;
  
  // Strategy-specific details
  const getStrategyBreakdown = () => {
    const purchasePrice = pricing.listPrice;
    const downPaymentAmount = purchasePrice * assumptions.downPayment;
    const loanAmount = purchasePrice - downPaymentAmount;
    const monthlyMortgage = calculateMonthlyPayment(loanAmount, assumptions.interestRate, assumptions.loanTerm);
    
    switch (strategyKey) {
      case 'longTermRental':
        const ltrRent = pricing.rentEstimate;
        const ltrExpenses = ltrRent * (assumptions.vacancyRate + assumptions.managementFee + assumptions.maintenance);
        const ltrNOI = (ltrRent * 12) - (ltrExpenses * 12);
        return [
          { label: 'Monthly Rent', value: formatCurrency(ltrRent) },
          { label: 'Monthly Mortgage', value: formatCurrency(monthlyMortgage) },
          { label: 'Monthly Expenses', value: formatCurrency(ltrExpenses) },
          { label: 'Annual NOI', value: formatCurrency(ltrNOI) },
          { label: 'Cap Rate', value: formatPercent(metrics.capRate) },
          { label: 'Cash-on-Cash', value: formatPercent(metrics.cashOnCash) },
          { label: 'DSCR', value: metrics.dscr.toFixed(2) },
        ];
        
      case 'shortTermRental':
        const strNightly = pricing.strEstimate;
        const occupancy = 1 - assumptions.vacancyRate;
        const strAnnual = strNightly * 365 * occupancy;
        return [
          { label: 'Avg Nightly Rate', value: formatCurrency(strNightly) },
          { label: 'Est. Occupancy', value: formatPercent(occupancy) },
          { label: 'Annual Revenue', value: formatCurrency(strAnnual) },
          { label: 'Monthly Mortgage', value: formatCurrency(monthlyMortgage) },
          { label: 'Management Fee', value: formatPercent(assumptions.managementFee) },
          { label: 'Break-even Occupancy', value: formatPercent(metrics.breakeven) },
        ];
        
      case 'brrrr':
        const afterRepairValue = assumptions.arv || purchasePrice * 1.25;
        const equity = afterRepairValue - purchasePrice - assumptions.rehabCost;
        return [
          { label: 'Purchase Price', value: formatCurrency(purchasePrice) },
          { label: 'Rehab Cost', value: formatCurrency(assumptions.rehabCost) },
          { label: 'After Repair Value', value: formatCurrency(afterRepairValue) },
          { label: 'Total Investment', value: formatCurrency(purchasePrice + assumptions.rehabCost) },
          { label: 'Equity Created', value: formatCurrency(equity) },
          { label: '75% LTV Refinance', value: formatCurrency(afterRepairValue * 0.75) },
        ];
        
      case 'fixAndFlip':
        const flipAfterRepairValue = assumptions.arv || purchasePrice * 1.25;
        const flipMargin = flipAfterRepairValue - purchasePrice - assumptions.rehabCost;
        const flipMarginPct = purchasePrice > 0 ? flipMargin / purchasePrice : 0;
        const maxPurchase70 = (flipAfterRepairValue * 0.70) - assumptions.rehabCost;
        const closingCosts = purchasePrice * 0.03;
        const holdingCosts = purchasePrice * 0.02;
        const sellingCosts = flipAfterRepairValue * 0.06;
        const totalCosts = closingCosts + holdingCosts + sellingCosts;
        const estNetProfit = flipMargin - totalCosts;
        return [
          { label: 'After Repair Value (ARV)', value: formatCurrency(flipAfterRepairValue) },
          { label: 'Purchase Price', value: `-${formatCurrency(purchasePrice)}` },
          { label: 'Rehab Budget', value: `-${formatCurrency(assumptions.rehabCost)}` },
          { label: 'FLIP MARGIN', value: formatCurrency(flipMargin), highlight: true },
          { label: 'Flip Margin %', value: formatPercent(flipMarginPct) },
          { label: '70% Rule Max Purchase', value: formatCurrency(maxPurchase70) },
          { label: 'Est. Costs (Close+Hold+Sell)', value: `-${formatCurrency(totalCosts)}` },
          { label: 'Est. Net Profit', value: formatCurrency(estNetProfit), highlight: true },
        ];
        
      case 'houseHack':
        const rentableUnits = Math.max(1, (analytics.property.bedrooms || 3) - 1);
        const roomRent = pricing.rentEstimate * 0.35;
        const hackedIncome = roomRent * rentableUnits;
        return [
          { label: 'Est. Room Rent', value: formatCurrency(roomRent) },
          { label: 'Rentable Rooms', value: String(rentableUnits) },
          { label: 'Monthly Income', value: formatCurrency(hackedIncome) },
          { label: 'Your Mortgage', value: formatCurrency(monthlyMortgage) },
          { label: 'Net Housing Cost', value: formatCurrency(monthlyMortgage - hackedIncome) },
          { label: 'vs. Renting Alone', value: formatCurrency(pricing.rentEstimate) },
        ];
        
      case 'wholesale':
        const mao = purchasePrice * 0.7 - assumptions.rehabCost;
        const assignmentFee = purchasePrice * 0.08;
        return [
          { label: 'After Repair Value (Est.)', value: formatCurrency(assumptions.arv || purchasePrice * 1.25) },
          { label: '70% Rule MAO', value: formatCurrency(mao) },
          { label: 'Rehab Estimate', value: formatCurrency(assumptions.rehabCost) },
          { label: 'Assignment Fee', value: formatCurrency(assignmentFee) },
          { label: 'Marketing Cost', value: formatCurrency(500) },
          { label: 'Net Profit', value: formatCurrency(assignmentFee - 500) },
        ];
        
      default:
        return [];
    }
  };
  
  const breakdown = getStrategyBreakdown();
  
  return (
    <View style={styles.expandedDetails}>
      <View style={styles.divider} />
      <Text style={styles.breakdownTitle}>Strategy Breakdown</Text>
      {breakdown.map((item, index) => (
        <View key={index} style={[
          styles.breakdownRow,
          (item as any).highlight && styles.breakdownRowHighlight
        ]}>
          <Text style={[
            styles.breakdownLabel,
            (item as any).highlight && styles.breakdownLabelHighlight
          ]}>{item.label}</Text>
          <Text style={[
            styles.breakdownValue,
            (item as any).highlight && styles.breakdownValueHighlight
          ]}>{item.value}</Text>
        </View>
      ))}
      
      {/* Flip Margin Guide for Fix & Flip */}
      {strategyKey === 'fixAndFlip' && (
        <View style={styles.flipMarginGuide}>
          <Text style={styles.guideTitle}>FLIP MARGIN GUIDE</Text>
          <View style={styles.guideRow}>
            <View style={[styles.guideDot, { backgroundColor: colors.profit.main }]} />
            <Text style={styles.guideText}><Text style={styles.guideBold}>$50K+</Text> — Strong deal with buffer</Text>
          </View>
          <View style={styles.guideRow}>
            <View style={[styles.guideDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.guideText}><Text style={styles.guideBold}>$20-50K</Text> — Workable, watch costs</Text>
          </View>
          <View style={styles.guideRow}>
            <View style={[styles.guideDot, { backgroundColor: colors.loss.main }]} />
            <Text style={styles.guideText}><Text style={styles.guideBold}>&lt;$20K</Text> — Thin margin, risky</Text>
          </View>
        </View>
      )}
      
      {/* Assumptions */}
      <View style={styles.assumptionsSection}>
        <Text style={styles.assumptionsTitle}>Assumptions Used</Text>
        <View style={styles.assumptionsRow}>
          <Text style={styles.assumptionItem}>
            Down: {formatPercent(assumptions.downPayment)}
          </Text>
          <Text style={styles.assumptionItem}>
            Rate: {formatPercent(assumptions.interestRate)}
          </Text>
          <Text style={styles.assumptionItem}>
            Term: {assumptions.loanTerm}yr
          </Text>
        </View>
      </View>
    </View>
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
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.gray[600],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: colors.gray[50],
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: colors.gray[600],
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: colors.primary[600],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  address: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  cityState: {
    fontSize: 14,
    color: colors.gray[600],
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 24,
  },
  priceItem: {},
  priceLabel: {
    fontSize: 12,
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 12,
  },
  detailsCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.gray[500],
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
  },
  metricsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricItem: {
    width: '47%',
    backgroundColor: colors.gray[50],
    padding: 12,
    borderRadius: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.gray[500],
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  strategyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  strategyCardExpanded: {
    borderWidth: 2,
    borderColor: colors.primary[200],
    backgroundColor: colors.primary[50],
  },
  strategyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  strategyName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray[900],
  },
  profitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  profitBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  strategyMetrics: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 24,
  },
  strategyMetric: {},
  strategyMetricLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray[600],
  },
  strategyMetricValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  strategyMetricSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[700],
    marginTop: 2,
  },
  ruleCheckBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  ruleCheckText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rentCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  rentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rentItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  rentLabel: {
    fontSize: 12,
    color: colors.gray[500],
  },
  rentValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
  },
  rentDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.gray[200],
  },
  expandedDetails: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  breakdownRowHighlight: {
    backgroundColor: colors.primary[50],
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderBottomWidth: 0,
  },
  breakdownLabel: {
    fontSize: 14,
    color: colors.gray[600],
  },
  breakdownLabelHighlight: {
    fontWeight: '600',
    color: colors.primary[700],
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[900],
  },
  breakdownValueHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary[600],
  },
  flipMarginGuide: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  guideTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gray[500],
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  guideDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  guideText: {
    fontSize: 12,
    color: colors.gray[600],
  },
  guideBold: {
    fontWeight: '700',
    color: colors.gray[800],
  },
  assumptionsSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.gray[100],
    borderRadius: 8,
  },
  assumptionsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gray[500],
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  assumptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  assumptionItem: {
    fontSize: 12,
    color: colors.gray[600],
  },
  // Full View Card
  fullViewCard: {
    marginHorizontal: 16,
    marginVertical: 16,
    backgroundColor: colors.primary[50],
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary[200],
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  fullViewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  fullViewIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullViewText: {
    flex: 1,
  },
  fullViewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[900],
  },
  fullViewSubtitle: {
    fontSize: 12,
    color: colors.gray[600],
    marginTop: 2,
  },
  // Floating Action Button
  fab: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary[600],
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});

