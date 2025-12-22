import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Pressable,
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
import { formatCurrency, InvestmentAnalytics } from '../../services/analytics';
import { colors } from '../../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MIN_HEIGHT = 280;
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.5;

interface ScanResultSheetProps {
  result: ScanResult;
  onClose: () => void;
  onViewDetails: () => void;
}

/**
 * Simplified bottom sheet displaying property confirmation after scan.
 * Shows: address, beds, baths, sqft, estimated value, and View Full Analysis CTA.
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

  const { property, analytics } = result;

  // Cast analytics to full type (API returns complete data)
  const fullAnalytics = analytics as unknown as InvestmentAnalytics;
  
  // Use property details from analytics (API data) which has full property info
  const propertyDetails = fullAnalytics.property || property;
  
  // Get estimated value (Zestimate / AVM)
  const estimatedValue = fullAnalytics.pricing?.estimatedValue || fullAnalytics.pricing?.listPrice || 0;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View 
        style={[
          styles.sheet, 
          sheetStyle,
          { paddingBottom: insets.bottom + 20 }
        ]}
      >
        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={22} color={colors.gray[500]} />
        </TouchableOpacity>

        {/* Property Confirmation Header */}
        <View style={styles.content}>
          {/* Checkmark Icon */}
          <View style={styles.checkmarkContainer}>
            <Ionicons name="checkmark-circle" size={48} color={colors.profit.main} />
          </View>

          {/* Address */}
          <Text style={styles.addressTitle}>Property Found</Text>
          <Text style={styles.address} numberOfLines={2}>
            {propertyDetails.address || property.address}
          </Text>

          {/* Property Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="bed-outline" size={20} color={colors.gray[600]} />
              <Text style={styles.statValue}>{propertyDetails.bedrooms || '—'}</Text>
              <Text style={styles.statLabel}>Beds</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Ionicons name="water-outline" size={20} color={colors.gray[600]} />
              <Text style={styles.statValue}>{propertyDetails.bathrooms || '—'}</Text>
              <Text style={styles.statLabel}>Baths</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Ionicons name="resize-outline" size={20} color={colors.gray[600]} />
              <Text style={styles.statValue}>
                {propertyDetails.sqft ? propertyDetails.sqft.toLocaleString() : '—'}
              </Text>
              <Text style={styles.statLabel}>Sq Ft</Text>
            </View>
          </View>

          {/* Estimated Value */}
          <View style={styles.valueContainer}>
            <Text style={styles.valueLabel}>Estimated Market Value</Text>
            <Text style={styles.valueAmount}>
              {estimatedValue > 0 ? formatCurrency(estimatedValue) : '—'}
            </Text>
          </View>

          {/* View Full Analysis Button */}
          <Pressable 
            style={({ pressed }) => [
              styles.ctaButton,
              pressed && styles.ctaButtonPressed
            ]}
            onPress={onViewDetails}
          >
            <Text style={styles.ctaButtonText}>View Full Analysis</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </Pressable>
        </View>
      </Animated.View>
    </GestureDetector>
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
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  checkmarkContainer: {
    marginBottom: 8,
  },
  addressTitle: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.profit.dark,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  address: {
    fontWeight: '600',
    fontSize: 18,
    color: colors.gray[900],
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontWeight: '700',
    fontSize: 20,
    color: colors.gray[900],
    marginTop: 4,
  },
  statLabel: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.gray[500],
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.gray[200],
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  valueLabel: {
    fontWeight: '500',
    fontSize: 13,
    color: colors.gray[500],
    marginBottom: 4,
  },
  valueAmount: {
    fontWeight: '700',
    fontSize: 28,
    color: colors.primary[700],
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary[600],
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ctaButtonPressed: {
    backgroundColor: colors.primary[700],
    transform: [{ scale: 0.98 }],
  },
  ctaButtonText: {
    fontWeight: '700',
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.3,
  },
});
