/**
 * PropertyDetailsScreen Component (Mobile)
 * 
 * React Native implementation of the property details page featuring:
 * - CompactHeader with strategy selector
 * - Image gallery with thumbnails
 * - Property facts with key specs hero cards
 * - Features & amenities tabs
 * - Location section
 * - Bottom action bar
 */

import * as Location from 'expo-location';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Types
export interface PropertyDetailsData {
  address: string;
  city: string;
  state: string;
  zip: string;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt?: number;
  price: number;
  rent?: number;
  status?: string;
  images?: string[];
  pricePerSqft?: number;
  lotSize?: string;
  lotAcres?: string;
  propertyType?: string;
  stories?: string;
  hoaFee?: string;
  annualTax?: number;
  parking?: string;
  heating?: string;
  cooling?: string;
  mlsNumber?: string;
  latitude?: number;
  longitude?: number;
}

interface PropertyDetailsScreenProps {
  property?: PropertyDetailsData;
  onBack?: () => void;
  onAnalyze?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onStrategyChange?: (strategy: string) => void;
  onNavChange?: (navId: string) => void;
  isDark?: boolean;
}

// Colors
const COLORS = {
  navy: '#0A1628',
  teal: '#0891B2',
  cyan: '#00D4FF',
  surface50: '#F8FAFC',
  surface100: '#F1F5F9',
  surface200: '#E2E8F0',
  surface400: '#94A3B8',
  surface500: '#64748B',
  white: '#FFFFFF',
};

// Default property data
const DEFAULT_PROPERTY: PropertyDetailsData = {
  address: '1451 Sw 10th St',
  city: 'Boca Raton',
  state: 'FL',
  zip: '33486',
  beds: 4,
  baths: 2,
  sqft: 1722,
  yearBuilt: 1969,
  price: 821000,
  rent: 5555,
  status: 'FOR SALE',
  images: Array(12).fill('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=400&fit=crop&q=80'),
};

// Strategies
const STRATEGIES = [
  { short: 'Long-term', full: 'Long-term Rental' },
  { short: 'Short-term', full: 'Short-term Rental' },
  { short: 'BRRRR', full: 'BRRRR' },
  { short: 'Fix & Flip', full: 'Fix & Flip' },
  { short: 'House Hack', full: 'House Hack' },
  { short: 'Wholesale', full: 'Wholesale' },
];

// Nav items
const NAV_ITEMS: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'search', label: 'Search', icon: 'search-outline' },
  { id: 'home', label: 'Home', icon: 'home-outline' },
  { id: 'trends', label: 'Trends', icon: 'trending-up-outline' },
  { id: 'analysis', label: 'Analysis', icon: 'bar-chart-outline' },
  { id: 'compare', label: 'Compare', icon: 'git-compare-outline' },
  { id: 'reports', label: 'Reports', icon: 'document-text-outline' },
  { id: 'deals', label: 'Deals', icon: 'cash-outline' },
];

// Format helpers
function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function PropertyDetailsScreen({
  property: propOverride,
  onBack,
  onAnalyze,
  onSave,
  onShare,
  onStrategyChange,
  onNavChange,
  isDark = false,
}: PropertyDetailsScreenProps) {
  const insets = useSafeAreaInsets();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPropertyOpen, setIsPropertyOpen] = useState(false);
  const [isStrategyOpen, setIsStrategyOpen] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState('Long-term');
  const [activeNav, setActiveNav] = useState('home');
  const [expandedSections, setExpandedSections] = useState({
    facts: true,
    features: false,
    location: false,
  });
  const [activeFeatureTab, setActiveFeatureTab] = useState('interior');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(
    property?.latitude && property?.longitude
      ? { latitude: property.latitude, longitude: property.longitude }
      : null
  );

  // Effect to geocode address if coordinates are missing
  useEffect(() => {
    if (!coordinates && property?.address && property?.city && property?.state) {
      (async () => {
        try {
          const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zip}`;
          const result = await Location.geocodeAsync(fullAddress);
          if (result && result.length > 0) {
            setCoordinates({
              latitude: result[0].latitude,
              longitude: result[0].longitude,
            });
          }
        } catch (error) {
          if (__DEV__) console.log('Geocoding failed:', error);
        }
      })();
    }
  }, [property, coordinates]);

  const property = propOverride || DEFAULT_PROPERTY;
  const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zip}`;

  // Key specs
  const keySpecs = useMemo(() => [
    { label: 'Beds', value: String(property.beds), icon: 'bed-outline' as const },
    { label: 'Baths', value: String(property.baths), icon: 'water-outline' as const },
    { label: 'Sqft', value: formatNumber(property.sqft), icon: 'resize-outline' as const },
    { label: 'Built', value: String(property.yearBuilt || 'N/A'), icon: 'calendar-outline' as const },
  ], [property]);

  // Property facts
  const propertyFacts = useMemo(() => [
    { label: 'PRICE/SQFT', value: `$${Math.round(property.price / property.sqft)}`, icon: 'cash-outline' as const },
    { label: 'LOT SIZE', value: property.lotSize || '9,091 sqft', subValue: property.lotAcres || '0.21 acres', icon: 'grid-outline' as const },
    { label: 'PROPERTY TYPE', value: property.propertyType || 'Single Family', icon: 'home-outline' as const },
    { label: 'STORIES', value: property.stories || 'N/A', icon: 'layers-outline' as const },
    { label: 'ZESTIMATE®', value: formatPrice(property.price), icon: 'trending-up-outline' as const, highlight: true },
    { label: 'RENT ZESTIMATE®', value: `${formatPrice(property.rent || 0)}/mo`, icon: 'business-outline' as const, highlight: true },
    { label: 'HOA FEE', value: property.hoaFee || 'None', icon: 'shield-checkmark-outline' as const },
    { label: 'ANNUAL TAX', value: property.annualTax ? formatPrice(property.annualTax) : '$9,980', icon: 'receipt-outline' as const },
    { label: 'PARKING', value: property.parking || 'N/A', icon: 'car-outline' as const },
    { label: 'HEATING', value: property.heating || 'N/A', icon: 'flame-outline' as const },
    { label: 'COOLING', value: property.cooling || 'N/A', icon: 'snow-outline' as const },
    { label: 'MLS #', value: property.mlsNumber || 'N/A', icon: 'document-outline' as const },
  ], [property]);

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const handleStrategySelect = useCallback((strategy: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentStrategy(strategy);
    setIsStrategyOpen(false);
    onStrategyChange?.(strategy);
  }, [onStrategyChange]);

  const handleNavClick = useCallback((navId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveNav(navId);
    onNavChange?.(navId);
  }, [onNavChange]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBack?.();
  }, [onBack]);

  const handleAnalyze = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAnalyze?.();
  }, [onAnalyze]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* App Header */}
      <View style={styles.appHeader}>
        <Text style={styles.logo}>
          <Text style={styles.logoInvest}>Invest</Text>
          <Text style={styles.logoIQ}>IQ</Text>
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="moon-outline" size={20} color={COLORS.surface400} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.surface400} />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>H</Text>
          </View>
        </View>
      </View>

      {/* Dark Header */}
      <View style={styles.darkHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.titleRow}>
              <Text style={styles.pageTitle}>
                <Text style={styles.titleWhite}>PROPERTY </Text>
                <Text style={styles.titleCyan}>DETAILS</Text>
              </Text>
              <TouchableOpacity 
                style={[styles.strategyPill, isStrategyOpen && styles.strategyPillOpen]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsStrategyOpen(!isStrategyOpen);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Strategy: ${currentStrategy}. Tap to change`}
              >
                <Text style={styles.strategyPillText}>{currentStrategy}</Text>
                <Ionicons 
                  name={isStrategyOpen ? 'chevron-up' : 'chevron-down'} 
                  size={12} 
                  color={COLORS.cyan} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.spacer} />
        </View>

        {/* Address Selector */}
        <TouchableOpacity 
          style={[styles.addressSelector, isPropertyOpen && styles.addressSelectorOpen]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setIsPropertyOpen(!isPropertyOpen);
          }}
        >
          <Text style={styles.addressText}>{fullAddress}</Text>
          <Ionicons 
            name={isPropertyOpen ? 'chevron-up' : 'chevron-down'} 
            size={12} 
            color={COLORS.cyan} 
          />
        </TouchableOpacity>

        {/* Property Accordion */}
        {isPropertyOpen && (
          <View style={styles.propertyAccordion}>
            <View style={styles.propertyCard}>
              {property.images?.[0] && (
                <Image
                  style={styles.propertyImage}
                  source={{ uri: property.images[0] }}
                />
              )}
              <View style={styles.propertyGrid}>
                <View style={styles.propertyStat}>
                  <Text style={styles.statValue}>{property.beds}</Text>
                  <Text style={styles.statLabel}>Beds</Text>
                </View>
                <View style={styles.propertyStat}>
                  <Text style={styles.statValue}>{property.baths}</Text>
                  <Text style={styles.statLabel}>Baths</Text>
                </View>
                <View style={styles.propertyStat}>
                  <Text style={styles.statValue}>{formatNumber(property.sqft)}</Text>
                  <Text style={styles.statLabel}>Sqft</Text>
                </View>
                <View style={styles.propertyStat}>
                  <Text style={[styles.statValue, styles.statValueCyan]}>{formatPrice(property.price)}</Text>
                  <Text style={styles.statLabel}>Est. Value</Text>
                </View>
                <View style={styles.propertyStat}>
                  <Text style={[styles.statValue, styles.statValueCyan]}>{formatPrice(property.rent || 0)}</Text>
                  <Text style={styles.statLabel}>Est. Rent</Text>
                </View>
                <View style={styles.propertyStat}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>For Sale</Text>
                  </View>
                  <Text style={styles.statLabel}>Status</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Strategy Dropdown */}
        {isStrategyOpen && (
          <View style={styles.dropdown}>
            <Text style={styles.dropdownHeader}>Strategy</Text>
            {STRATEGIES.map((strategy) => (
              <TouchableOpacity
                key={strategy.short}
                style={[
                  styles.dropdownOption,
                  strategy.short === currentStrategy && styles.dropdownOptionSelected,
                ]}
                onPress={() => handleStrategySelect(strategy.short)}
              >
                <Text style={[
                  styles.dropdownOptionText,
                  strategy.short === currentStrategy && styles.dropdownOptionTextSelected,
                ]}>
                  {strategy.full}
                </Text>
                {strategy.short === currentStrategy && (
                  <Ionicons name="checkmark" size={16} color={COLORS.teal} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Icon Nav */}
      <View style={styles.iconNav}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.navBtn, activeNav === item.id && styles.navBtnActive]}
            onPress={() => handleNavClick(item.id)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: activeNav === item.id }}
          >
            <Ionicons 
              name={item.icon} 
              size={18} 
              color={activeNav === item.id ? COLORS.teal : COLORS.surface400} 
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Gallery */}
        <View style={styles.gallerySection}>
          <View style={styles.mainImageContainer}>
            <Image
              style={styles.mainImage}
              source={{ uri: property.images?.[currentImageIndex] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600' }}
            />
            <TouchableOpacity 
              style={[styles.imageNav, styles.imageNavPrev]}
              onPress={() => setCurrentImageIndex(i => Math.max(0, i - 1))}
              accessibilityRole="button"
              accessibilityLabel="Previous image"
            >
              <Ionicons name="chevron-back" size={16} color={COLORS.navy} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.imageNav, styles.imageNavNext]}
              onPress={() => setCurrentImageIndex(i => Math.min((property.images?.length || 1) - 1, i + 1))}
              accessibilityRole="button"
              accessibilityLabel="Next image"
            >
              <Ionicons name="chevron-forward" size={16} color={COLORS.navy} />
            </TouchableOpacity>
            <View style={styles.imageCounter}>
              <Ionicons name="images-outline" size={14} color={COLORS.white} />
              <Text style={styles.imageCounterText}>
                {currentImageIndex + 1}/{property.images?.length || 0}
              </Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailStrip}>
            {property.images?.slice(0, 12).map((img, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setCurrentImageIndex(idx)}
              >
                <Image
                  style={[
                    styles.thumbnail,
                    idx === currentImageIndex && styles.thumbnailActive,
                  ]}
                  source={{ uri: img }}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Property Facts Accordion */}
        <View style={styles.accordionCard}>
          <TouchableOpacity 
            style={styles.accordionHeader}
            onPress={() => toggleSection('facts')}
            accessibilityRole="button"
            accessibilityLabel={`Property Facts, ${expandedSections.facts ? 'expanded' : 'collapsed'}`}
            accessibilityState={{ expanded: expandedSections.facts }}
          >
            <Ionicons name="grid-outline" size={24} color={COLORS.teal} />
            <Text style={styles.accordionTitle}>Property Facts</Text>
            <Ionicons 
              name={expandedSections.facts ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={COLORS.surface400} 
            />
          </TouchableOpacity>
          {expandedSections.facts && (
            <View style={styles.accordionContent}>
              {/* Key Specs Row */}
              <View style={styles.keySpecsRow}>
                {keySpecs.map((spec, idx) => (
                  <View key={idx} style={styles.keySpecItem}>
                    <Text style={styles.keySpecValue}>{spec.value}</Text>
                    <Text style={styles.keySpecLabel}>{spec.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.factsDivider} />

              {/* Facts List */}
              {propertyFacts.map((fact, idx) => (
                <View 
                  key={idx} 
                  style={[
                    styles.factRow,
                    idx !== propertyFacts.length - 1 && styles.factRowBorder,
                  ]}
                >
                  <View style={styles.factRowLeft}>
                    <View style={styles.factRowIcon}>
                      <Ionicons name={fact.icon} size={14} color={COLORS.surface500} />
                    </View>
                    <Text style={styles.factRowLabel}>{fact.label}</Text>
                  </View>
                  <View style={styles.factRowRight}>
                    <Text style={[styles.factRowValue, fact.highlight && styles.factRowValueHighlight]}>
                      {fact.value}
                    </Text>
                    {fact.subValue && <Text style={styles.factRowSub}>{fact.subValue}</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Features & Amenities Accordion */}
        <View style={styles.accordionCard}>
          <TouchableOpacity 
            style={styles.accordionHeader}
            onPress={() => toggleSection('features')}
            accessibilityRole="button"
            accessibilityLabel={`Features and Amenities, ${expandedSections.features ? 'expanded' : 'collapsed'}`}
            accessibilityState={{ expanded: expandedSections.features }}
          >
            <Ionicons name="list-outline" size={24} color={COLORS.teal} />
            <Text style={styles.accordionTitle}>Features & Amenities</Text>
            <Ionicons 
              name={expandedSections.features ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={COLORS.surface400} 
            />
          </TouchableOpacity>
          {expandedSections.features && (
            <View style={styles.accordionContent}>
              <View style={styles.featureTabs}>
                {['interior', 'exterior', 'appliances'].map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.featureTab, activeFeatureTab === tab && styles.featureTabActive]}
                    onPress={() => setActiveFeatureTab(tab)}
                  >
                    <Text style={[
                      styles.featureTabText,
                      activeFeatureTab === tab && styles.featureTabTextActive,
                    ]}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.featuresContent}>
                <Text style={styles.featuresContentText}>No {activeFeatureTab} features listed</Text>
              </View>
            </View>
          )}
        </View>

        {/* Location Accordion - last card, no border */}
        <View style={[styles.accordionCard, styles.accordionCardLast]}>
          <TouchableOpacity 
            style={styles.accordionHeader}
            onPress={() => toggleSection('location')}
            accessibilityRole="button"
            accessibilityLabel={`Location, ${expandedSections.location ? 'expanded' : 'collapsed'}`}
            accessibilityState={{ expanded: expandedSections.location }}
          >
            <Ionicons name="location-outline" size={24} color={COLORS.teal} />
            <Text style={styles.accordionTitle}>Location</Text>
            <Ionicons 
              name={expandedSections.location ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={COLORS.surface400} 
            />
          </TouchableOpacity>
          {expandedSections.location && (
            <View style={styles.accordionContent}>
              <View style={styles.locationMap}>
                {coordinates ? (
                  <MapView
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    style={StyleSheet.absoluteFill}
                    initialRegion={{
                      latitude: coordinates.latitude,
                      longitude: coordinates.longitude,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    liteMode={true} // Use lite mode on Android for better performance in lists/scrollviews
                  >
                    <Marker
                      coordinate={{
                        latitude: coordinates.latitude,
                        longitude: coordinates.longitude,
                      }}
                    />
                  </MapView>
                ) : (
                  <>
                    <Ionicons name="location" size={32} color={COLORS.teal} />
                    <Text style={styles.locationAddress}>{fullAddress}</Text>
                  </>
                )}
              </View>
              {coordinates && (
                <Text style={[styles.locationAddress, { marginTop: 8 }]}>{fullAddress}</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleBack} accessibilityRole="button" accessibilityLabel="Search for another property">
          <Ionicons name="search-outline" size={20} color={COLORS.surface500} />
          <Text style={styles.actionBtnLabel}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onSave} accessibilityRole="button" accessibilityLabel="Save property">
          <Ionicons name="heart-outline" size={20} color={COLORS.surface500} />
          <Text style={styles.actionBtnLabel}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze} accessibilityRole="button" accessibilityLabel="Analyze property">
          <Ionicons name="bar-chart-outline" size={18} color={COLORS.white} />
          <Text style={styles.analyzeBtnText}>Analyze Property</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onShare} accessibilityRole="button" accessibilityLabel="Share property">
          <Ionicons name="share-social-outline" size={20} color={COLORS.surface500} />
          <Text style={styles.actionBtnLabel}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface100,
  },

  // App Header
  appHeader: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface200,
  },
  logo: {
    fontSize: 18,
    fontWeight: '800',
  },
  logoInvest: {
    color: COLORS.navy,
  },
  logoIQ: {
    color: COLORS.teal,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    padding: 4,
  },
  avatar: {
    width: 28,
    height: 28,
    backgroundColor: COLORS.teal,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
  },

  // Dark Header
  darkHeader: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  titleWhite: {
    color: COLORS.white,
  },
  titleCyan: {
    color: COLORS.cyan,
  },
  strategyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
  },
  strategyPillOpen: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  strategyPillText: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '600',
  },
  spacer: {
    width: 32,
  },

  // Address Selector
  addressSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  addressSelectorOpen: {
    opacity: 0.8,
  },
  addressText: {
    color: COLORS.white,
    fontSize: 11,
  },

  // Property Accordion
  propertyAccordion: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  propertyCard: {
    flexDirection: 'row',
    gap: 12,
  },
  propertyImage: {
    width: 80,
    height: 60,
    borderRadius: 6,
  },
  propertyGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  propertyStat: {
    width: '30%',
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  statValueCyan: {
    color: COLORS.cyan,
  },
  statLabel: {
    fontSize: 9,
    color: COLORS.surface500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    backgroundColor: COLORS.cyan,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.navy,
  },

  // Dropdown
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 16,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 200,
  },
  dropdownHeader: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.surface400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownOptionSelected: {},
  dropdownOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.navy,
  },
  dropdownOptionTextSelected: {
    color: COLORS.teal,
    fontWeight: '600',
  },

  // Icon Nav
  iconNav: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface200,
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  navBtnActive: {
    backgroundColor: 'rgba(8, 145, 178, 0.1)',
  },

  // Scroll Content
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 100,
  },

  // Gallery
  gallerySection: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  mainImageContainer: {
    position: 'relative',
    width: '100%',
    height: 240,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageNav: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  imageNavPrev: {
    left: 12,
  },
  imageNavNext: {
    right: 12,
  },
  imageCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(10, 22, 40, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imageCounterText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '500',
  },
  thumbnailStrip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  thumbnail: {
    width: 48,
    height: 36,
    borderRadius: 6,
    marginRight: 6,
    opacity: 0.6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    opacity: 1,
    borderColor: COLORS.teal,
  },

  // Accordion Card - flat edge-to-edge design
  accordionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 0,
    marginHorizontal: 0,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    overflow: 'hidden',
  },
  accordionCardLast: {
    borderBottomWidth: 0,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  accordionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Key Specs - dark gradient cards
  keySpecsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  keySpecItem: {
    flex: 1,
    backgroundColor: COLORS.navy,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  keySpecValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  keySpecLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.cyan,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Facts
  factsDivider: {
    height: 1,
    backgroundColor: COLORS.surface200,
    marginBottom: 12,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  factRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface100,
  },
  factRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  factRowIcon: {
    width: 28,
    height: 28,
    backgroundColor: COLORS.surface100,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  factRowLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.surface500,
  },
  factRowRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  factRowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
  },
  factRowValueHighlight: {
    color: COLORS.teal,
  },
  factRowSub: {
    fontSize: 11,
    color: COLORS.surface400,
  },

  // Features
  featureTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  featureTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface100,
  },
  featureTabActive: {
    backgroundColor: COLORS.teal,
  },
  featureTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.surface500,
  },
  featureTabTextActive: {
    color: COLORS.white,
  },
  featuresContent: {
    padding: 16,
    backgroundColor: COLORS.surface50,
    borderRadius: 8,
    alignItems: 'center',
  },
  featuresContentText: {
    fontSize: 13,
    color: COLORS.surface400,
  },

  // Location
  locationMap: {
    height: 180,
    backgroundColor: COLORS.surface200,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  locationAddress: {
    fontSize: 12,
    color: COLORS.surface500,
    textAlign: 'center',
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionBtnLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.surface500,
  },
  analyzeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: COLORS.teal,
    borderRadius: 12,
  },
  analyzeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default PropertyDetailsScreen;
