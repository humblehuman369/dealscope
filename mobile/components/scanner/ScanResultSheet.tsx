import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Pressable,
  Dimensions,
  Alert,
  useColorScheme,
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
import * as Haptics from 'expo-haptics';

import { ScanResult } from '../../hooks/usePropertyScan';
import { formatCurrency, InvestmentAnalytics } from '../../services/analytics';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { AuthRequiredModal } from '../AuthRequiredModal';
import { APIRequestError } from '../../services/apiClient';
import { savedPropertiesService } from '../../services/savedPropertiesService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MIN_HEIGHT = 280;
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.5;

/**
 * M17 parity note: useIQVerdictFlow and onWrongProperty are intentional
 * mobile-only enhancements. The frontend ScanResultSheet has only the base
 * props (result, onClose, onViewDetails) because the web scanner UX doesn't
 * need disambiguation or verdict flow gating. The core props match.
 */
interface ScanResultSheetProps {
  result: ScanResult;
  onClose: () => void;
  onViewDetails: () => void;
  /** Mobile-only: enable the IQ Verdict flow (Analyze → Verdict → Worksheet) */
  useIQVerdictFlow?: boolean;
  /** Mobile-only: re-open disambiguation when the scanned property is wrong */
  onWrongProperty?: () => void;
}

/**
 * Simplified bottom sheet displaying property confirmation after scan.
 * Shows: address, beds, baths, sqft, estimated value, and Analyze/View Analysis CTA.
 * Includes a Save button that requires authentication.
 * 
 * When useIQVerdictFlow is true, the CTA navigates to the IQ Analyzing screen
 * which then transitions to the IQ Verdict screen with ranked strategies.
 */
export function ScanResultSheet({ 
  result, 
  onClose, 
  onViewDetails,
  useIQVerdictFlow = true, // Default to new flow
  onWrongProperty,
}: ScanResultSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  // Auth state
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedPropertyId, setSavedPropertyId] = useState<string | null>(null);

  const { property, analytics } = result;

  // Cast analytics to full type (API returns complete data)
  const fullAnalytics = analytics as unknown as InvestmentAnalytics & { 
    isEstimated?: boolean; 
    estimateReason?: string;
  };
  
  // Use property details from analytics (API data) which has full property info
  const propertyDetails = fullAnalytics.property || property;

  // Check if this is estimated data (fallback when API fails)
  const isEstimatedData = (fullAnalytics as any).isEstimated === true;

  // Handle save property action
  const resolveSavedPropertyId = useCallback(async () => {
    const searchAddress = propertyDetails.address || property.address;
    if (!searchAddress) return null;

    const properties = await savedPropertiesService.getSavedProperties({
      search: searchAddress,
      limit: 10,
    });

    const targetStreet = searchAddress.toLowerCase();
    const targetCity = (propertyDetails.city || property.city || '').toLowerCase();

    const match = properties.find((p) => {
      const pStreet = (p.address_street || '').toLowerCase();
      const pCity = (p.address_city || '').toLowerCase();
      const streetMatch = pStreet === targetStreet;
      const cityMatch = !targetCity || !pCity || pCity === targetCity;
      return streetMatch && cityMatch;
    });

    return match?.id || null;
  }, [property.address, property.city, propertyDetails.address, propertyDetails.city]);

  const handleSaveProperty = useCallback(async () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowAuthModal(true);
      return;
    }

    try {
      setIsSaving(true);

      if (isSaved) {
        const existingId = savedPropertyId || (await resolveSavedPropertyId());
        if (!existingId) {
          Alert.alert('Unable to Unsave', 'Saved property ID not found.');
          return;
        }
        await savedPropertiesService.deleteSavedProperty(existingId);
        setIsSaved(false);
        setSavedPropertyId(null);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      const addressStreet = propertyDetails.address || property.address;
      const addressCity = propertyDetails.city || property.city || null;
      const addressState = propertyDetails.state || property.state || null;
      const addressZip = propertyDetails.zip || property.zip || null;

      const saved = await savedPropertiesService.saveProperty({
        address_street: addressStreet,
        address_city: addressCity,
        address_state: addressState,
        address_zip: addressZip,
        full_address: [addressStreet, addressCity, addressState, addressZip]
          .filter(Boolean)
          .join(', '),
        status: 'watching',
        property_data_snapshot: {
          bedrooms: propertyDetails.bedrooms,
          bathrooms: propertyDetails.bathrooms,
          sqft: propertyDetails.sqft,
          yearBuilt: propertyDetails.yearBuilt,
          lotSize: propertyDetails.lotSize,
          estimatedValue: fullAnalytics.pricing?.estimatedValue,
          listPrice: fullAnalytics.pricing?.listPrice,
        },
      });

      setIsSaved(true);
      setSavedPropertyId(saved.id || null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Property Saved! 🏠',
        'This property has been added to your saved properties.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      if (error instanceof APIRequestError && error.statusCode === 409) {
        const existingId = await resolveSavedPropertyId();
        setIsSaved(true);
        setSavedPropertyId(existingId);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Already Saved', 'This property is already saved.');
      } else {
        console.error('Failed to save property:', error);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Failed to save property. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    isAuthenticated,
    isSaved,
    property.address,
    property.city,
    property.state,
    property.zip,
    propertyDetails.address,
    propertyDetails.bathrooms,
    propertyDetails.bedrooms,
    propertyDetails.city,
    propertyDetails.lotSize,
    propertyDetails.sqft,
    propertyDetails.state,
    propertyDetails.yearBuilt,
    propertyDetails.zip,
    fullAnalytics.pricing,
    resolveSavedPropertyId,
    savedPropertyId,
  ]);

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

  // Get estimated value (Zestimate / AVM)
  const estimatedValue = fullAnalytics.pricing?.estimatedValue ?? fullAnalytics.pricing?.listPrice ?? 0;

  // Dark mode theme colors
  const theme = {
    background: isDarkMode ? '#0f1f36' : '#fff',
    text: isDarkMode ? '#fff' : colors.gray[900],
    textSecondary: isDarkMode ? colors.gray[400] : colors.gray[500],
    statsBackground: isDarkMode ? 'rgba(255,255,255,0.08)' : colors.gray[50],
    statsDivider: isDarkMode ? 'rgba(255,255,255,0.15)' : colors.gray[200],
    handle: isDarkMode ? 'rgba(255,255,255,0.3)' : colors.gray[300],
    closeIcon: isDarkMode ? colors.gray[400] : colors.gray[500],
    saveButtonBg: isDarkMode ? 'rgba(255,255,255,0.1)' : colors.gray[100],
    saveButtonBorder: isDarkMode ? 'rgba(255,255,255,0.2)' : colors.gray[200],
    valueAmount: isDarkMode ? colors.primary[400] : colors.primary[700],
    iconColor: isDarkMode ? colors.gray[400] : colors.gray[600],
  };

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View 
        style={[
          styles.sheet, 
          sheetStyle,
          { paddingBottom: insets.bottom + 20, backgroundColor: theme.background }
        ]}
        accessibilityViewIsModal
        accessibilityRole="dialog"
        accessibilityLabel="Property scan result"
      >
        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: theme.handle }]} />
        </View>

        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close scan result">
          <Ionicons name="close" size={22} color={theme.closeIcon} />
        </TouchableOpacity>

        {/* Property Confirmation Header */}
        <View style={styles.content}>
          {/* Checkmark Icon */}
          <View style={styles.checkmarkContainer}>
            <Ionicons 
              name={isEstimatedData ? "alert-circle" : "checkmark-circle"} 
              size={48} 
              color={isEstimatedData ? colors.warning?.main || '#F59E0B' : colors.profit.main} 
            />
          </View>

          {/* Address */}
          <Text style={[styles.addressTitle, isDarkMode && { color: colors.profit.light }]}>
            {isEstimatedData ? 'Property Located' : 'Property Found'}
          </Text>
          
          {/* Estimated Data Banner */}
          {isEstimatedData && (
            <View style={styles.estimatedBanner}>
              <Ionicons name="information-circle" size={16} color="#92400E" />
              <Text style={styles.estimatedBannerText}>
                Showing estimated data - tap for full analysis
              </Text>
            </View>
          )}
          <Text style={[styles.address, { color: theme.text }]} numberOfLines={2}>
            {propertyDetails.address || property.address}
          </Text>

          {/* Property Stats */}
          <View style={[styles.statsContainer, { backgroundColor: theme.statsBackground }]}>
            <View style={styles.statItem}>
              <Ionicons name="bed-outline" size={20} color={theme.iconColor} />
              <Text style={[styles.statValue, { color: theme.text }]}>{propertyDetails.bedrooms || '—'}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Beds</Text>
            </View>
            
            <View style={[styles.statDivider, { backgroundColor: theme.statsDivider }]} />
            
            <View style={styles.statItem}>
              <Ionicons name="water-outline" size={20} color={theme.iconColor} />
              <Text style={[styles.statValue, { color: theme.text }]}>{propertyDetails.bathrooms || '—'}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Baths</Text>
            </View>
            
            <View style={[styles.statDivider, { backgroundColor: theme.statsDivider }]} />
            
            <View style={styles.statItem}>
              <Ionicons name="resize-outline" size={20} color={theme.iconColor} />
              <Text style={[styles.statValue, { color: theme.text }]}>
                {propertyDetails.sqft ? propertyDetails.sqft.toLocaleString() : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Sq Ft</Text>
            </View>
          </View>

          {/* Estimated Value */}
          <View style={styles.valueContainer}>
            <Text style={[styles.valueLabel, { color: theme.textSecondary }]}>Zestimate</Text>
            <Text style={[styles.valueAmount, { color: theme.valueAmount }]}>
              {estimatedValue > 0 ? formatCurrency(estimatedValue) : '—'}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: theme.saveButtonBg, borderColor: theme.saveButtonBorder },
                isSaved && styles.saveButtonSaved,
              ]}
              onPress={handleSaveProperty}
              disabled={isSaving || isSaved}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isSaved ? 'Property saved' : 'Save property'}
              accessibilityState={{ disabled: isSaving || isSaved }}
            >
              <Ionicons 
                name={isSaved ? "heart" : "heart-outline"} 
                size={22} 
                color={isSaved ? colors.loss.main : theme.iconColor} 
              />
            </TouchableOpacity>

            {/* Primary CTA Button */}
            <Pressable 
              style={({ pressed }) => [
                styles.ctaButton,
                pressed && styles.ctaButtonPressed
              ]}
              onPress={onViewDetails}
              accessibilityRole="button"
              accessibilityLabel={useIQVerdictFlow ? 'Analyze this property' : 'View full analysis'}
            >
              <Text style={styles.ctaButtonText}>
                {useIQVerdictFlow ? 'Analyze This Property' : 'View Full Analysis'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </Pressable>

            {/* Recovery link to re-open disambiguation */}
            {onWrongProperty && (
              <Pressable onPress={onWrongProperty} style={{ paddingVertical: 12, alignItems: 'center' }} accessibilityRole="button" accessibilityLabel="Not the right property? Tap to choose another">
                <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '500' }}>
                  Not the right property?
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Auth Required Modal */}
        <AuthRequiredModal
          visible={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          feature="save properties"
          onContinueWithoutAuth={onViewDetails}
        />
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
  estimatedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  estimatedBannerText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#92400E',
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
    fontWeight: '500',
    fontSize: 13,
    color: colors.gray[700],
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  saveButton: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  saveButtonSaved: {
    backgroundColor: colors.loss.light,
    borderColor: colors.loss.main,
  },
  ctaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary[600],
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
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
