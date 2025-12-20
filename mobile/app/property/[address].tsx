import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { fetchPropertyAnalytics, formatCurrency, formatPercent } from '../../services/analytics';
import { colors } from '../../theme/colors';

export default function PropertyDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { address } = useLocalSearchParams<{ address: string }>();
  
  const decodedAddress = decodeURIComponent(address || '');

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
          return (
            <View key={key} style={styles.strategyCard}>
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
                    {formatCurrency(strategy.secondaryValue)}
                  </Text>
                </View>
              </View>
            </View>
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
      </ScrollView>
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
    color: colors.gray[500],
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
});

