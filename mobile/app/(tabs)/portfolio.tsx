import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import { formatCurrency, formatCompact } from '../../services/analytics';

export default function PortfolioScreen() {
  const insets = useSafeAreaInsets();

  // Mock portfolio data
  const portfolioSummary = {
    totalProperties: 0,
    totalValue: 0,
    totalEquity: 0,
    monthlyIncome: 0,
    annualReturn: 0,
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Portfolio</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Portfolio Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Ionicons name="home" size={24} color={colors.primary[600]} />
            <Text style={styles.summaryValue}>
              {portfolioSummary.totalProperties}
            </Text>
            <Text style={styles.summaryLabel}>Properties</Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="trending-up" size={24} color={colors.profit.main} />
            <Text style={styles.summaryValue}>
              {formatCompact(portfolioSummary.totalValue)}
            </Text>
            <Text style={styles.summaryLabel}>Total Value</Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="cash" size={24} color={colors.info.main} />
            <Text style={styles.summaryValue}>
              {formatCurrency(portfolioSummary.monthlyIncome)}
            </Text>
            <Text style={styles.summaryLabel}>Monthly Income</Text>
          </View>
        </View>

        {/* Empty State */}
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="briefcase-outline" size={64} color={colors.gray[300]} />
          </View>
          <Text style={styles.emptyTitle}>Build Your Portfolio</Text>
          <Text style={styles.emptyText}>
            Add properties you've purchased to track your investment performance over time.
          </Text>
          
          <TouchableOpacity style={styles.emptyButton}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary[600]} />
            <Text style={styles.emptyButtonText}>Add Your First Property</Text>
          </TouchableOpacity>

          <View style={styles.featureList}>
            <FeatureItem 
              icon="analytics" 
              text="Track property performance" 
            />
            <FeatureItem 
              icon="pie-chart" 
              text="View portfolio allocation" 
            />
            <FeatureItem 
              icon="calendar" 
              text="Monitor monthly cash flow" 
            />
            <FeatureItem 
              icon="trending-up" 
              text="Measure equity growth" 
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon as any} size={18} color={colors.primary[600]} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  title: {
    fontWeight: '700',
    fontSize: 24,
    color: colors.gray[900],
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  summaryCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryValue: {
    fontWeight: '700',
    fontSize: 20,
    color: colors.gray[900],
    marginTop: 8,
    marginBottom: 2,
  },
  summaryLabel: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.gray[500],
    textAlign: 'center',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontWeight: '700',
    fontSize: 20,
    color: colors.gray[900],
    marginBottom: 8,
  },
  emptyText: {
    fontWeight: '400',
    fontSize: 14,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary[600],
    marginBottom: 32,
  },
  emptyButtonText: {
    fontWeight: '600',
    fontSize: 15,
    color: colors.primary[600],
  },
  featureList: {
    width: '100%',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontWeight: '500',
    fontSize: 14,
    color: colors.gray[700],
  },
});

