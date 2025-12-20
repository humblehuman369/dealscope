import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import { formatCurrency, formatPercent } from '../../services/analytics';

interface ScannedProperty {
  id: string;
  address: string;
  city: string;
  state: string;
  scannedAt: Date;
  topStrategy: string;
  monthlyProfit: number;
  cashOnCash: number;
  isFavorite: boolean;
}

// Mock data - will be replaced with actual database
const mockHistory: ScannedProperty[] = [
  {
    id: '1',
    address: '3788 Moon Bay Cir',
    city: 'Wellington',
    state: 'FL',
    scannedAt: new Date(),
    topStrategy: 'Short-Term Rental',
    monthlyProfit: 6872,
    cashOnCash: 0.545,
    isFavorite: true,
  },
  {
    id: '2',
    address: '1234 Palm Beach Dr',
    city: 'Palm Beach',
    state: 'FL',
    scannedAt: new Date(Date.now() - 86400000),
    topStrategy: 'Long-Term Rental',
    monthlyProfit: 2150,
    cashOnCash: 0.189,
    isFavorite: false,
  },
];

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');

  const filteredHistory = filter === 'favorites'
    ? mockHistory.filter(p => p.isFavorite)
    : mockHistory;

  const handlePropertyPress = (property: ScannedProperty) => {
    router.push(`/property/${encodeURIComponent(`${property.address}, ${property.city}, ${property.state}`)}`);
  };

  const renderProperty = ({ item }: { item: ScannedProperty }) => (
    <TouchableOpacity 
      style={styles.propertyCard}
      onPress={() => handlePropertyPress(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.addressContainer}>
          <Text style={styles.address}>{item.address}</Text>
          <Text style={styles.location}>{item.city}, {item.state}</Text>
        </View>
        <TouchableOpacity style={styles.favoriteButton}>
          <Ionicons 
            name={item.isFavorite ? "heart" : "heart-outline"} 
            size={22} 
            color={item.isFavorite ? colors.loss.main : colors.gray[400]} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.cardMetrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Top Strategy</Text>
          <Text style={styles.metricValue}>{item.topStrategy}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Monthly Profit</Text>
          <Text style={[
            styles.metricValue,
            item.monthlyProfit > 0 ? styles.profitText : styles.lossText
          ]}>
            {formatCurrency(item.monthlyProfit)}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Cash-on-Cash</Text>
          <Text style={[
            styles.metricValue,
            item.cashOnCash > 0 ? styles.profitText : styles.lossText
          ]}>
            {formatPercent(item.cashOnCash)}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.timestamp}>
          {formatRelativeTime(item.scannedAt)}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={colors.gray[400]} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Scan History</Text>
        <View style={styles.filterTabs}>
          <TouchableOpacity 
            style={[styles.tab, filter === 'all' && styles.tabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[
              styles.tabText,
              filter === 'all' && styles.tabTextActive
            ]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, filter === 'favorites' && styles.tabActive]}
            onPress={() => setFilter('favorites')}
          >
            <Ionicons 
              name="heart" 
              size={14} 
              color={filter === 'favorites' ? '#fff' : colors.gray[500]} 
            />
            <Text style={[
              styles.tabText,
              filter === 'favorites' && styles.tabTextActive
            ]}>Favorites</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Property List */}
      <FlatList
        data={filteredHistory}
        renderItem={renderProperty}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color={colors.gray[300]} />
            <Text style={styles.emptyTitle}>No scans yet</Text>
            <Text style={styles.emptyText}>
              Properties you scan will appear here
            </Text>
          </View>
        }
      />
    </View>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
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
    marginBottom: 16,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
  },
  tabActive: {
    backgroundColor: colors.primary[600],
  },
  tabText: {
    fontWeight: '500',
    fontSize: 13,
    color: colors.gray[600],
  },
  tabTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  propertyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  addressContainer: {
    flex: 1,
  },
  address: {
    fontWeight: '600',
    fontSize: 16,
    color: colors.gray[900],
    marginBottom: 2,
  },
  location: {
    fontWeight: '400',
    fontSize: 13,
    color: colors.gray[500],
  },
  favoriteButton: {
    padding: 4,
  },
  cardMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.gray[100],
  },
  metric: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.gray[200],
    marginHorizontal: 12,
  },
  metricLabel: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.gray[500],
    marginBottom: 2,
  },
  metricValue: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.gray[800],
  },
  profitText: {
    color: colors.profit.main,
  },
  lossText: {
    color: colors.loss.main,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  timestamp: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.gray[400],
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontWeight: '600',
    fontSize: 18,
    color: colors.gray[700],
    marginTop: 16,
  },
  emptyText: {
    fontWeight: '400',
    fontSize: 14,
    color: colors.gray[500],
    marginTop: 4,
  },
});

