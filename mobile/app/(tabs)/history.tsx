import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { colors } from '../../theme/colors';
import { formatCurrency, formatPercent } from '../../services/analytics';
import { 
  useScannedProperties, 
  useToggleFavorite, 
  useDeleteScannedProperty,
  useDatabaseInit,
  parseAnalyticsData,
} from '../../hooks/useDatabase';
import { ScannedProperty, AnalyticsData } from '../../database';
import { useAuth } from '../../context/AuthContext';
import { AuthRequiredModal } from '../../components/AuthRequiredModal';

// Display interface for the list
interface DisplayProperty {
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

/**
 * Transform database record to display format.
 */
function transformToDisplayProperty(dbProperty: ScannedProperty): DisplayProperty {
  const analytics = parseAnalyticsData(dbProperty.analytics_data);
  
  // Find the best strategy (highest cash flow)
  let topStrategy = 'Long-Term Rental';
  let monthlyProfit = 0;
  let cashOnCash = 0;
  
  if (analytics?.strategies) {
    const strategies = Object.entries(analytics.strategies);
    let bestValue = -Infinity;
    
    for (const [key, data] of strategies) {
      if (data && data.primaryValue > bestValue) {
        bestValue = data.primaryValue;
        topStrategy = data.primaryLabel === 'Monthly Cash Flow' 
          ? getStrategyName(key) 
          : getStrategyName(key);
        monthlyProfit = data.primaryValue;
        cashOnCash = data.secondaryValue;
      }
    }
  }
  
  return {
    id: dbProperty.id,
    address: dbProperty.address,
    city: dbProperty.city || '',
    state: dbProperty.state || '',
    scannedAt: new Date(dbProperty.scanned_at * 1000),
    topStrategy,
    monthlyProfit,
    cashOnCash,
    isFavorite: dbProperty.is_favorite === 1,
  };
}

function getStrategyName(key: string): string {
  const names: Record<string, string> = {
    longTermRental: 'Long-Term Rental',
    shortTermRental: 'Short-Term Rental',
    brrrr: 'BRRRR',
    fixAndFlip: 'Fix & Flip',
    houseHack: 'House Hacking',
    wholesale: 'Wholesale',
  };
  return names[key] || key;
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingFavoriteId, setPendingFavoriteId] = useState<string | null>(null);
  
  // Auth state
  const { isAuthenticated } = useAuth();
  
  // Database initialization
  const { isReady: dbReady } = useDatabaseInit();
  
  // Fetch properties from database
  const { 
    data: properties, 
    isLoading, 
    refetch,
    isRefetching,
  } = useScannedProperties({ 
    favoritesOnly: filter === 'favorites' 
  });
  
  // Mutations
  const toggleFavorite = useToggleFavorite();
  const deleteProperty = useDeleteScannedProperty();
  
  // Transform database properties to display format
  const displayProperties: DisplayProperty[] = (properties || []).map(transformToDisplayProperty);
  
  const handlePropertyPress = useCallback((property: DisplayProperty) => {
    const fullAddress = `${property.address}, ${property.city}, ${property.state}`;
    router.push(`/property/${encodeURIComponent(fullAddress)}`);
  }, [router]);
  
  const handleToggleFavorite = useCallback(async (id: string) => {
    // Check if user is authenticated before allowing favorites
    if (!isAuthenticated) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setPendingFavoriteId(id);
      setShowAuthModal(true);
      return;
    }
    
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFavorite.mutate(id);
  }, [toggleFavorite, isAuthenticated]);
  
  const handleDelete = useCallback((id: string, address: string) => {
    Alert.alert(
      'Delete Scan',
      `Remove "${address}" from history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            deleteProperty.mutate(id);
          }
        },
      ]
    );
  }, [deleteProperty]);
  
  const renderRightActions = useCallback((
    progress: SharedValue<number>,
    dragX: SharedValue<number>,
    id: string,
    address: string
  ) => {
    return (
      <TouchableOpacity 
        style={styles.deleteAction}
        onPress={() => handleDelete(id, address)}
      >
        <Ionicons name="trash-outline" size={24} color="#fff" />
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>
    );
  }, [handleDelete]);

  const renderProperty = useCallback(({ item }: { item: DisplayProperty }) => (
    <Swipeable
      friction={2}
      rightThreshold={40}
      renderRightActions={(progress, dragX) => 
        renderRightActions(progress, dragX, item.id, item.address)
      }
    >
      <TouchableOpacity 
        style={styles.propertyCard}
        onPress={() => handlePropertyPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.addressContainer}>
            <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
            <Text style={styles.location}>{item.city}, {item.state}</Text>
          </View>
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={() => handleToggleFavorite(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
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
            <Text style={styles.metricValue} numberOfLines={1}>{item.topStrategy}</Text>
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
    </Swipeable>
  ), [handlePropertyPress, handleToggleFavorite, renderRightActions]);

  // Show loading state while database initializes
  if (!dbReady || isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Auth Required Modal */}
      <AuthRequiredModal
        visible={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingFavoriteId(null);
        }}
        feature="save and organize properties"
      />

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
        data={displayProperties}
        renderItem={renderProperty}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          displayProperties.length === 0 && styles.listContentEmpty
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary[600]}
            colors={[colors.primary[600]]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons 
              name={filter === 'favorites' ? "heart-outline" : "time-outline"} 
              size={48} 
              color={colors.gray[300]} 
            />
            <Text style={styles.emptyTitle}>
              {filter === 'favorites' ? 'No favorites yet' : 'No scans yet'}
            </Text>
            <Text style={styles.emptyText}>
              {filter === 'favorites' 
                ? 'Tap the heart icon to save favorites'
                : 'Properties you scan will appear here'
              }
            </Text>
            {filter === 'favorites' && (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => setFilter('all')}
              >
                <Text style={styles.viewAllButtonText}>View All Scans</Text>
              </TouchableOpacity>
            )}
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
    backgroundColor: colors.background.tertiary, // Match property analytics page background
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.gray[600],
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: colors.background.tertiary,
  },
  title: {
    fontWeight: '700',
    fontSize: 22,
    color: colors.gray[900],
    marginBottom: 12,
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
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
  listContentEmpty: {
    flex: 1,
  },
  propertyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primary[500], // Blue border like property analytics
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  addressContainer: {
    flex: 1,
    marginRight: 8,
  },
  address: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.gray[900],
    marginBottom: 1,
  },
  location: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.gray[500],
  },
  favoriteButton: {
    padding: 4,
  },
  cardMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.gray[100],
  },
  metric: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.gray[200],
    marginHorizontal: 8,
  },
  metricLabel: {
    fontWeight: '400',
    fontSize: 10,
    color: colors.gray[500],
    marginBottom: 1,
  },
  metricValue: {
    fontWeight: '700',
    fontSize: 13,
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
    marginTop: 8,
  },
  timestamp: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.gray[400],
  },
  deleteAction: {
    backgroundColor: colors.loss.main,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  viewAllButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.primary[100],
    borderRadius: 20,
  },
  viewAllButtonText: {
    color: colors.primary[700],
    fontWeight: '600',
    fontSize: 14,
  },
});
