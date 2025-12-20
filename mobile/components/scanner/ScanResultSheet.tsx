import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScanResult } from '../../hooks/usePropertyScan';
import { 
  formatCurrency, 
  formatPercent,
  getStrategyDisplayName,
} from '../../services/analytics';
import { colors } from '../../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MIN_HEIGHT = 320;
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.85;

interface ScanResultSheetProps {
  result: ScanResult;
  onClose: () => void;
  onViewDetails: () => void;
}

/**
 * Bottom sheet displaying scan results with strategy summaries.
 */
export function ScanResultSheet({ 
  result, 
  onClose, 
  onViewDetails 
}: ScanResultSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((e) => {
      translateY.value = Math.max(
        -SHEET_MAX_HEIGHT + SHEET_MIN_HEIGHT,
        Math.min(0, context.value.y + e.translationY)
      );
    })
    .onEnd((e) => {
      if (e.translationY > 100) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const { property, analytics, confidence, scanTime } = result;

  // Get top 3 strategies sorted by primary value
  const strategies = Object.entries(analytics.strategies)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.primaryValue - a.primaryValue)
    .slice(0, 3);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View 
        style={[
          styles.sheet, 
          sheetStyle,
          { paddingBottom: insets.bottom + 16 }
        ]}
      >
        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.addressContainer}>
            <Text style={styles.address} numberOfLines={1}>
              {property.address}
            </Text>
            <Text style={styles.propertyDetails}>
              {property.bedrooms || '?'} bed · {property.bathrooms || '?'} bath
              {property.sqft && ` · ${property.sqft.toLocaleString()} sqft`}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={20} color={colors.gray[500]} />
          </TouchableOpacity>
        </View>

        {/* Confidence & Scan Info */}
        <View style={styles.scanInfo}>
          <View style={styles.infoBadge}>
            <Ionicons name="checkmark-circle" size={14} color={colors.profit.main} />
            <Text style={styles.infoText}>{confidence}% match</Text>
          </View>
          <View style={styles.infoBadge}>
            <Ionicons name="timer-outline" size={14} color={colors.gray[500]} />
            <Text style={styles.infoText}>{(scanTime / 1000).toFixed(1)}s</Text>
          </View>
          <View style={styles.infoBadge}>
            <Ionicons name="pricetag-outline" size={14} color={colors.gray[500]} />
            <Text style={styles.infoText}>
              {formatCurrency(analytics.pricing?.listPrice || 0)}
            </Text>
          </View>
        </View>

        {/* Top Strategies */}
        <ScrollView 
          style={styles.strategiesList}
          showsVerticalScrollIndicator={false}
        >
          {strategies.map((strategy, index) => (
            <StrategyCard
              key={strategy.key}
              name={getStrategyDisplayName(strategy.key)}
              primaryValue={strategy.primaryValue}
              primaryLabel={strategy.primaryLabel}
              secondaryValue={strategy.secondaryValue}
              secondaryLabel={strategy.secondaryLabel}
              isProfit={strategy.isProfit}
              isTop={index === 0}
            />
          ))}

          {/* View All Button */}
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={onViewDetails}
          >
            <Text style={styles.viewAllText}>View Full Analysis</Text>
            <Ionicons 
              name="arrow-forward" 
              size={18} 
              color={colors.primary[600]} 
            />
          </TouchableOpacity>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable style={styles.actionButton}>
            <Ionicons name="heart-outline" size={20} color={colors.gray[600]} />
            <Text style={styles.actionText}>Save</Text>
          </Pressable>
          <Pressable style={styles.actionButton}>
            <Ionicons name="share-outline" size={20} color={colors.gray[600]} />
            <Text style={styles.actionText}>Share</Text>
          </Pressable>
          <Pressable style={styles.actionButton}>
            <Ionicons name="create-outline" size={20} color={colors.gray[600]} />
            <Text style={styles.actionText}>Notes</Text>
          </Pressable>
          <Pressable style={styles.actionButton}>
            <Ionicons name="navigate-outline" size={20} color={colors.gray[600]} />
            <Text style={styles.actionText}>Directions</Text>
          </Pressable>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

interface StrategyCardProps {
  name: string;
  primaryValue: number;
  primaryLabel: string;
  secondaryValue: number;
  secondaryLabel: string;
  isProfit: boolean;
  isTop?: boolean;
}

function StrategyCard({
  name,
  primaryValue,
  primaryLabel,
  secondaryValue,
  secondaryLabel,
  isProfit,
  isTop = false,
}: StrategyCardProps) {
  return (
    <View style={[styles.strategyCard, isTop && styles.strategyCardTop]}>
      <View style={styles.strategyHeader}>
        <Text style={styles.strategyName}>{name}</Text>
        {isTop && (
          <View style={styles.topBadge}>
            <Text style={styles.topBadgeText}>TOP</Text>
          </View>
        )}
      </View>
      
      <View style={styles.strategyMetrics}>
        <View style={styles.metricColumn}>
          <Text style={[
            styles.metricValue,
            isProfit ? styles.profitText : styles.lossText
          ]}>
            {formatCurrency(primaryValue)}
          </Text>
          <Text style={styles.metricLabel}>{primaryLabel}</Text>
        </View>
        
        <View style={styles.metricDivider} />
        
        <View style={styles.metricColumn}>
          <Text style={[
            styles.metricValue,
            secondaryValue > 0 ? styles.profitText : styles.lossText
          ]}>
            {formatPercent(secondaryValue)}
          </Text>
          <Text style={styles.metricLabel}>{secondaryLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: SHEET_MIN_HEIGHT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray[300],
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  addressContainer: {
    flex: 1,
  },
  address: {
    fontWeight: '600',
    fontSize: 17,
    color: colors.gray[900],
    marginBottom: 2,
  },
  propertyDetails: {
    fontWeight: '400',
    fontSize: 13,
    color: colors.gray[500],
  },
  closeButton: {
    padding: 8,
    marginTop: -4,
    marginRight: -8,
  },
  scanInfo: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.gray[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  infoText: {
    fontWeight: '500',
    fontSize: 12,
    color: colors.gray[700],
  },
  strategiesList: {
    paddingHorizontal: 20,
    maxHeight: 280,
  },
  strategyCard: {
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  strategyCardTop: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[200],
  },
  strategyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  strategyName: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.gray[800],
  },
  topBadge: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  topBadgeText: {
    fontWeight: '700',
    fontSize: 10,
    color: '#fff',
    letterSpacing: 0.5,
  },
  strategyMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricColumn: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.gray[200],
    marginHorizontal: 16,
  },
  metricValue: {
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 2,
  },
  metricLabel: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.gray[500],
  },
  profitText: {
    color: colors.profit.dark,
  },
  lossText: {
    color: colors.loss.dark,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary[50],
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  viewAllText: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.primary[600],
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontWeight: '500',
    fontSize: 11,
    color: colors.gray[600],
  },
});

