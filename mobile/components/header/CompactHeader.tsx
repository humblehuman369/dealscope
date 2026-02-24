/**
 * CompactHeader Component
 * 
 * A space-efficient header for DealGapIQ analysis pages with:
 * - App bar with logo and actions
 * - Address with accordion dropdown for property details
 * - Page title + Strategy selector in one compact row
 * - Icon navigation bar
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';

// Types
export interface PropertyData {
  address: string;
  city: string;
  state: string;
  zip: string;
  beds: number;
  baths: number;
  sqft: number;
  price: number;
  rent?: number;
  status?: string;
  image?: string;
}

export interface Strategy {
  short: string;
  full: string;
}

export type NavItemId = 'search' | 'home' | 'trends' | 'analysis' | 'compare' | 'reports' | 'deals';

export interface NavItem {
  id: NavItemId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface CompactHeaderProps {
  property?: PropertyData;
  pageTitle?: string;
  pageTitleAccent?: string;
  currentStrategy?: string;
  onStrategyChange?: (strategy: string) => void;
  onBack?: () => void;
  activeNav?: NavItemId;
  onNavChange?: (navId: NavItemId) => void;
  onPropertyClick?: (isOpen: boolean) => void;
  onThemeToggle?: () => void;
  onNotifications?: () => void;
  onMenu?: () => void;
}

const STRATEGIES: Strategy[] = [
  { short: 'Long-term', full: 'Long-term Rental' },
  { short: 'Short-term', full: 'Short-term Rental' },
  { short: 'BRRRR', full: 'BRRRR' },
  { short: 'Fix & Flip', full: 'Fix & Flip' },
  { short: 'House Hack', full: 'House Hack' },
  { short: 'Wholesale', full: 'Wholesale' },
];

const NAV_ITEMS: NavItem[] = [
  { id: 'search', label: 'Search', icon: 'search-outline' },
  { id: 'home', label: 'Home', icon: 'home-outline' },
  { id: 'trends', label: 'Trends', icon: 'trending-up-outline' },
  { id: 'analysis', label: 'Analysis', icon: 'bar-chart-outline' },
  { id: 'compare', label: 'Compare', icon: 'git-compare-outline' },
  { id: 'reports', label: 'Reports', icon: 'document-text-outline' },
  { id: 'deals', label: 'Deals', icon: 'cash-outline' },
];

const DEFAULT_PROPERTY: PropertyData = {
  address: '1451 Sw 10th St',
  city: 'Boca Raton',
  state: 'FL',
  zip: '33486',
  beds: 4,
  baths: 2,
  sqft: 1722,
  price: 821000,
  rent: 3200,
  status: 'OFF-MARKET',
};

export function CompactHeader({
  property = DEFAULT_PROPERTY,
  pageTitle = 'ANALYSIS',
  pageTitleAccent = 'IQ',
  currentStrategy = 'Long-term',
  onStrategyChange,
  onBack,
  activeNav = 'analysis',
  onNavChange,
  onPropertyClick,
  onThemeToggle,
  onNotifications,
  onMenu,
}: CompactHeaderProps) {
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useTheme();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPropertyOpen, setIsPropertyOpen] = useState(false);
  const accordionHeight = useRef(new Animated.Value(0)).current;

  const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zip}`;

  // Format helpers
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Animate accordion
  useEffect(() => {
    Animated.timing(accordionHeight, {
      toValue: isPropertyOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isPropertyOpen]);

  const handleStrategySelect = (strategy: string) => {
    setIsDropdownOpen(false);
    onStrategyChange?.(strategy);
  };

  const handlePropertyToggle = () => {
    const newState = !isPropertyOpen;
    setIsPropertyOpen(newState);
    onPropertyClick?.(newState);
  };

  const handleThemeToggle = () => {
    if (onThemeToggle) {
      onThemeToggle();
    } else {
      toggleTheme();
    }
  };

  return (
    <View style={styles.container}>
      {/* App Header - White bar with logo */}
      <View style={[styles.appHeader, { paddingTop: insets.top }]}>
        <View style={styles.logo}>
          <Text style={styles.logoDealGap}>DealGap</Text>
          <Text style={styles.logoIQ}>IQ</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleThemeToggle} style={styles.headerIconBtn}>
            <Ionicons 
              name={isDark ? 'sunny-outline' : 'moon-outline'} 
              size={20} 
              color="#94A3B8" 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onNotifications} style={styles.headerIconBtn}>
            <Ionicons name="notifications-outline" size={20} color="#94A3B8" />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>H</Text>
          </View>
          <TouchableOpacity onPress={onMenu} style={styles.headerIconBtn}>
            <Ionicons name="menu-outline" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dark Header */}
      <View style={styles.darkHeader}>
        {/* Title Row */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.titleRow}>
              <View style={styles.pageTitle}>
                <Text style={styles.titleWhite}>{pageTitle} </Text>
                <Text style={styles.titleCyan}>{pageTitleAccent}</Text>
              </View>
              <TouchableOpacity
                style={[styles.strategyPill, isDropdownOpen && styles.strategyPillOpen]}
                onPress={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <Text style={styles.strategyPillText}>{currentStrategy}</Text>
                <Ionicons 
                  name="chevron-down" 
                  size={12} 
                  color="white" 
                  style={[
                    styles.strategyChevron,
                    isDropdownOpen && styles.strategyChevronOpen
                  ]}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.spacer} />
        </View>

        {/* Address Selector */}
        <TouchableOpacity
          style={[styles.addressSelector, isPropertyOpen && styles.addressSelectorOpen]}
          onPress={handlePropertyToggle}
        >
          <Text style={styles.addressText}>{fullAddress}</Text>
          <Ionicons 
            name="chevron-down" 
            size={14} 
            color="#0891B2" 
            style={[
              styles.addressChevron,
              isPropertyOpen && styles.addressChevronOpen
            ]}
          />
        </TouchableOpacity>

        {/* Property Accordion */}
        <Animated.View
          style={[
            styles.propertyAccordion,
            {
              maxHeight: accordionHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 140],
              }),
              paddingVertical: accordionHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 12],
              }),
              marginTop: accordionHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 12],
              }),
              opacity: accordionHeight,
            },
          ]}
        >
          <View style={styles.propertyCard}>
            {property.image ? (
              <Image source={{ uri: property.image }} style={styles.propertyImage} />
            ) : (
              <View style={[styles.propertyImage, styles.propertyImagePlaceholder]}>
                <Ionicons name="home-outline" size={24} color="#64748B" />
              </View>
            )}
            <View style={styles.propertyDetailsGrid}>
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
                <Text style={[styles.statValue, styles.statValueCyan]}>{property.rent != null ? formatPrice(property.rent) : '—'}</Text>
                <Text style={styles.statLabel}>{property.rent != null ? 'Est. Rent' : 'Rent'}</Text>
              </View>
              <View style={styles.propertyStat}>
                <Text style={styles.propertyStatus}>
                  {property.status === 'OFF-MARKET' ? 'Off-Market' : property.status || 'Active'}
                </Text>
                <Text style={styles.statLabel}>Status</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Strategy Dropdown Modal */}
      <Modal
        visible={isDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDropdownOpen(false)}
      >
        <Pressable style={styles.dropdownOverlay} onPress={() => setIsDropdownOpen(false)}>
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdown}>
              <Text style={styles.dropdownHeader}>Strategy</Text>
              <ScrollView>
                {STRATEGIES.map((strategy) => (
                  <TouchableOpacity
                    key={strategy.short}
                    style={[
                      styles.dropdownOption,
                      strategy.short === currentStrategy && styles.dropdownOptionSelected,
                    ]}
                    onPress={() => handleStrategySelect(strategy.short)}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        strategy.short === currentStrategy && styles.dropdownOptionTextSelected,
                      ]}
                    >
                      {strategy.full}
                    </Text>
                    {strategy.short === currentStrategy && (
                      <Ionicons name="checkmark" size={16} color="#0891B2" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Icon Navigation */}
      <View style={styles.iconNav}>
        {NAV_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.navBtn, activeNav === item.id && styles.navBtnActive]}
            onPress={() => onNavChange?.(item.id)}
          >
            <Ionicons
              name={activeNav === item.id ? item.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap : item.icon}
              size={18}
              color={activeNav === item.id ? '#0891B2' : '#94A3B8'}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
  },

  // App Header
  appHeader: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  logo: {
    flexDirection: 'row',
  },
  logoDealGap: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0A1628',
  },
  logoIQ: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0891B2',
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
    backgroundColor: '#0891B2',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },

  // Dark Header
  darkHeader: {
    backgroundColor: '#0A1628',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    flexDirection: 'row',
  },
  titleWhite: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: 'white',
  },
  titleCyan: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: '#00D4FF',
  },
  strategyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0891B2',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  strategyPillOpen: {
    backgroundColor: '#0e7490',
  },
  strategyPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  strategyChevron: {
    transform: [{ rotate: '0deg' }],
  },
  strategyChevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  spacer: {
    width: 20,
  },

  // Address Selector
  addressSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'center',
  },
  addressSelectorOpen: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  addressText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  addressChevron: {
    transform: [{ rotate: '0deg' }],
  },
  addressChevronOpen: {
    transform: [{ rotate: '180deg' }],
  },

  // Property Accordion
  propertyAccordion: {
    backgroundColor: '#0F1D32',
    borderRadius: 12,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  propertyCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  propertyImage: {
    width: 90,
    height: 68,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  propertyImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyDetailsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  propertyStat: {
    width: '30%',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
  },
  statValueCyan: {
    color: '#00D4FF',
  },
  statLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 1,
  },
  propertyStatus: {
    fontSize: 13,
    fontWeight: '700',
    color: 'white',
  },

  // Dropdown
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    paddingTop: 140,
  },
  dropdownContainer: {
    paddingHorizontal: 16,
  },
  dropdown: {
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    maxHeight: 300,
  },
  dropdownHeader: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  dropdownOptionSelected: {
    backgroundColor: '#F8FAFC',
  },
  dropdownOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0A1628',
  },
  dropdownOptionTextSelected: {
    color: '#0891B2',
    fontWeight: '600',
  },

  // Icon Nav
  iconNav: {
    backgroundColor: 'white',
    paddingVertical: 6,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
});

export default CompactHeader;
