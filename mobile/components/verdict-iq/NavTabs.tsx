/**
 * NavTabs Component - Decision-Grade UI
 * Edge-to-edge navigation tabs
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { decisionGrade } from '../../theme/colors';

export type NavTabId = 'analyze' | 'details' | 'saleComps' | 'rentComps' | 'dashboard';

interface NavTab {
  id: NavTabId;
  label: string;
}

const NAV_TABS: NavTab[] = [
  { id: 'analyze', label: 'Analyze' },
  { id: 'details', label: 'Details' },
  { id: 'saleComps', label: 'Sale Comps' },
  { id: 'rentComps', label: 'Rent Comps' },
  { id: 'dashboard', label: 'Dashboard' },
];

interface NavTabsProps {
  activeTab: NavTabId;
  onTabChange: (tabId: NavTabId) => void;
}

export function NavTabs({ activeTab, onTabChange }: NavTabsProps) {
  const handleTabPress = (tabId: NavTabId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTabChange(tabId);
  };

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: decisionGrade.bgPrimary,
    borderTopWidth: 1,
    borderTopColor: decisionGrade.borderMedium,
    borderBottomWidth: 1,
    borderBottomColor: decisionGrade.borderMedium,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    backgroundColor: decisionGrade.bgPrimary,
  },
  tabActive: {
    backgroundColor: decisionGrade.pacificTeal,
  },
  tabBorder: {
    borderRightWidth: 1,
    borderRightColor: decisionGrade.borderMedium,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: decisionGrade.textPrimary,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
});

export default NavTabs;
