/**
 * NavTabs Component - Decision-Grade UI
 * Horizontally scrollable navigation tabs with responsive fonts
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { decisionGrade } from '../../theme/colors';
import { rf, rs } from './responsive';

export type NavTabId = 'analyze' | 'details' | 'saleComps' | 'rentComps' | 'dashboard';

interface NavTab {
  id: NavTabId;
  label: string;
}

const NAV_TABS: NavTab[] = [
  { id: 'analyze', label: 'VerdictIQ' },
  { id: 'details', label: 'Details' },
  { id: 'saleComps', label: 'Sale Comps' },
  { id: 'rentComps', label: 'Rent Comps' },
  { id: 'dashboard', label: 'DealHubIQ' },  // Tab bar label matches _layout.tsx
];

interface NavTabsProps {
  activeTab: NavTabId;
  onTabChange: (tabId: NavTabId) => void;
}

export function NavTabs({ activeTab, onTabChange }: NavTabsProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  const handleTabPress = (tabId: NavTabId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabChange(tabId);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {NAV_TABS.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const isLast = index === NAV_TABS.length - 1;

          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                isActive && styles.tabActive,
                !isLast && styles.tabBorder,
              ]}
              onPress={() => handleTabPress(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: decisionGrade.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: decisionGrade.borderMedium,
    borderBottomWidth: 1,
    borderBottomColor: decisionGrade.borderMedium,
  },
  scrollContent: {
    flexGrow: 1,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs(10),
    paddingHorizontal: rs(16),
    backgroundColor: decisionGrade.bgPrimary,
    minWidth: rs(70),
  },
  tabActive: {
    backgroundColor: decisionGrade.pacificTeal,
  },
  tabBorder: {
    borderRightWidth: 1,
    borderRightColor: decisionGrade.borderMedium,
  },
  tabText: {
    fontSize: rf(12),
    fontWeight: '600',
    color: decisionGrade.textPrimary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
});

export default NavTabs;
