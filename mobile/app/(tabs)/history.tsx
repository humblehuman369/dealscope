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
import { useTheme } from '../../context/ThemeContext';
import { AuthRequiredModal } from '../../components/AuthRequiredModal';
import { useRecentSearches } from '../../stores';

// Brand Colors - Use colors from theme for consistency
const BRAND = {
  navy: colors.navy[900],         // #07172e - primary dark
  blue: colors.primary[500],      // #0465f2 - primary accent
  cyan: colors.accent[500],       // #4dd0e1 - soft cyan (was #00e5ff)
  silver: colors.gray[100],       // #e1e8ed - Icy Silver
  gray: colors.gray[300],         // #aab2bd - Cool Gray
  white: colors.white,
  profit: colors.profit.main,     // #22c55e
  loss: colors.loss.main,         // #ef4444
};

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

/** Compact recent-search list from the property store */
function RecentSearchesSection({ router, isDark }: { router: ReturnType<typeof useRouter>; isDark: boolean }) {
  const recentSearches = useRecentSearches();
  if (recentSearches.length === 0) return null;

  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: mutedColor, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Recent Searches
      </Text>
      {recentSearches.slice(0, 5).map((search) => (
        <TouchableOpacity
          key={search.propertyId}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/analyzing/${search.propertyId}` as any);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 12,
            backgroundColor: cardBg,
            borderRadius: 10,
            marginBottom: 6,
            borderWidth: 1,
            borderColor,
          }}
        >
          <Ionicons name="search-outline" size={16} color={BRAND.blue} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: textColor }} numberOfLines={1}>
              {decodeURIComponent(search.address)}
            </Text>
            {search.price ? (
              <Text style={{ fontSize: 12, color: mutedColor, marginTop: 1 }}>
                ${search.price.toLocaleString()}
                {search.beds ? ` · ${search.beds}bd` : ''}
                {search.baths ? ` / ${search.baths}ba` : ''}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={16} color={mutedColor} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  
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
    // Use new IQ Verdict flow
    router.push(`/analyzing/${encodeURIComponent(fullAddress)}` as any);
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

  // Dynamic styles based on dark/light mode
  const dynamicStyles = {
    container: {
      backgroundColor: isDark ? BRAND.navy : BRAND.silver,
    },
    header: {
      backgroundColor: isDark ? BRAND.navy : BRAND.silver,
    },
    title: {
      color: isDark ? BRAND.white : BRAND.navy,
    },
    card: {
      backgroundColor: isDark ? '#0b2236' : BRAND.white,
      borderColor: BRAND.blue,
    },
    address: {
      color: isDark ? BRAND.white : BRAND.navy,
    },
    location: {
      color: isDark ? BRAND.gray : BRAND.gray,
    },
    metricLabel: {
      color: isDark ? BRAND.gray : BRAND.gray,
    },
    metricValue: {
      color: isDark ? BRAND.white : BRAND.navy,
    },
    metricDivider: {
      backgroundColor: isDark ? '#1a3a5c' : BRAND.silver,
    },
    metricBorder: {
      borderColor: isDark ? '#1a3a5c' : BRAND.silver,
    },
    timestamp: {
      color: BRAND.gray,
    },
    tabInactive: {
      backgroundColor: isDark ? '#0b2236' : BRAND.silver,
    },
    tabTextInactive: {
      color: isDark ? BRAND.gray : BRAND.gray,
    },
    emptyTitle: {
      color: isDark ? BRAND.white : BRAND.navy,
    },
    emptyText: {
      color: BRAND.gray,
    },
    loadingText: {
      color: BRAND.gray,
    },
  };

  const renderProperty = useCallback(({ item }: { item: DisplayProperty }) => (
    <Swipeable
      friction={2}
      rightThreshold={40}
      renderRightActions={(progress, dragX) => 
        renderRightActions(progress, dragX, item.id, item.address)
      }
    >
      <TouchableOpacity 
        style={[styles.propertyCard, dynamicStyles.card]}
        onPress={() => handlePropertyPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.addressContainer}>
            <Text style={[styles.address, dynamicStyles.address]} numberOfLines={1}>
              {item.address}
            </Text>
            <Text style={[styles.location, dynamicStyles.location]}>
              {item.city}, {item.state}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.favoriteButton}
            onPress={() => handleToggleFavorite(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name={item.isFavorite ? "heart" : "heart-outline"} 
              size={22} 
              color={item.isFavorite ? BRAND.loss : BRAND.gray} 
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.cardMetrics, dynamicStyles.metricBorder]}>
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, dynamicStyles.metricLabel]}>Top Strategy</Text>
            <Text style={[styles.metricValue, dynamicStyles.metricValue]} numberOfLines={1}>
              {item.topStrategy}
            </Text>
          </View>
          <View style={[styles.metricDivider, dynamicStyles.metricDivider]} />
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, dynamicStyles.metricLabel]}>Monthly Profit</Text>
            <Text style={[
              styles.metricValue,
              item.monthlyProfit > 0 ? styles.profitText : styles.lossText
            ]}>
              {formatCurrency(item.monthlyProfit)}
            </Text>
          </View>
          <View style={[styles.metricDivider, dynamicStyles.metricDivider]} />
          <View style={styles.metric}>
            <Text style={[styles.metricLabel, dynamicStyles.metricLabel]}>Cash-on-Cash</Text>
            <Text style={[
              styles.metricValue,
              item.cashOnCash > 0 ? styles.profitText : styles.lossText
            ]}>
              {formatPercent(item.cashOnCash)}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.timestamp, dynamicStyles.timestamp]}>
            {formatRelativeTime(item.scannedAt)}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={BRAND.gray} />
        </View>
      </TouchableOpacity>
    </Swipeable>
  ), [handlePropertyPress, handleToggleFavorite, renderRightActions, isDark]);

  // Show loading state while database initializes
  if (!dbReady || isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, dynamicStyles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={BRAND.blue} />
        <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, dynamicStyles.container, { paddingTop: insets.top }]}>
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
      <View style={[styles.header, dynamicStyles.header]}>
        <Text style={[styles.title, dynamicStyles.title]}>Scan History</Text>
        <View style={styles.filterTabs}>
          <TouchableOpacity 
            style={[
              styles.tab, 
              filter === 'all' ? styles.tabActive : dynamicStyles.tabInactive
            ]}
            onPress={() => setFilter('all')}
          >
            <Text style={[
              styles.tabText,
              filter === 'all' ? styles.tabTextActive : dynamicStyles.tabTextInactive
            ]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.tab, 
              filter === 'favorites' ? styles.tabActive : dynamicStyles.tabInactive
            ]}
            onPress={() => setFilter('favorites')}
          >
            <Ionicons 
              name="heart" 
              size={14} 
              color={filter === 'favorites' ? '#fff' : BRAND.gray} 
            />
            <Text style={[
              styles.tabText,
              filter === 'favorites' ? styles.tabTextActive : dynamicStyles.tabTextInactive
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
            tintColor={BRAND.blue}
            colors={[BRAND.blue]}
          />
        }
        ListHeaderComponent={<RecentSearchesSection router={router} isDark={isDark} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons 
              name={filter === 'favorites' ? "heart-outline" : "time-outline"} 
              size={48} 
              color={BRAND.gray} 
            />
            <Text style={[styles.emptyTitle, dynamicStyles.emptyTitle]}>
              {filter === 'favorites' ? 'No favorites yet' : 'No scans yet'}
            </Text>
            <Text style={[styles.emptyText, dynamicStyles.emptyText]}>
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
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontFamily: 'System',
    fontWeight: '400',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  title: {
    fontFamily: 'System',
    fontWeight: '700',
    fontSize: 28,
    marginBottom: 12,
    letterSpacing: -0.5,
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
  },
  tabActive: {
    backgroundColor: BRAND.blue,
  },
  tabText: {
    fontFamily: 'System',
    fontWeight: '600',
    fontSize: 13,
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
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressContainer: {
    flex: 1,
    marginRight: 8,
  },
  address: {
    fontFamily: 'System',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  location: {
    fontFamily: 'System',
    fontWeight: '400',
    fontSize: 13,
  },
  favoriteButton: {
    padding: 4,
  },
  cardMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  metric: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 8,
  },
  metricLabel: {
    fontFamily: 'System',
    fontWeight: '500',
    fontSize: 13,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricValue: {
    fontFamily: 'System',
    fontWeight: '700',
    fontSize: 14,
  },
  profitText: {
    color: BRAND.profit,
  },
  lossText: {
    color: BRAND.loss,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  timestamp: {
    fontFamily: 'System',
    fontWeight: '500',
    fontSize: 13,
  },
  deleteAction: {
    backgroundColor: BRAND.loss,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'System',
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
    fontFamily: 'System',
    fontWeight: '700',
    fontSize: 20,
    marginTop: 16,
  },
  emptyText: {
    fontFamily: 'System',
    fontWeight: '400',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  viewAllButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: BRAND.blue,
    borderRadius: 24,
  },
  viewAllButtonText: {
    color: '#fff',
    fontFamily: 'System',
    fontWeight: '600',
    fontSize: 14,
  },
});
