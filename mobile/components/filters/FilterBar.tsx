import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import type { PropertyStatus } from '../../types';
import { PROPERTY_STATUS_OPTIONS, PROPERTY_STATUS_LABELS } from '../../types';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStatus: PropertyStatus | null;
  onStatusChange: (status: PropertyStatus | null) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  sortDirection: 'asc' | 'desc';
  onSortDirectionChange: (direction: 'asc' | 'desc') => void;
}

const SORT_OPTIONS = [
  { label: 'Date Saved', value: 'saved_at' },
  { label: 'Last Updated', value: 'updated_at' },
  { label: 'Priority', value: 'priority' },
  { label: 'Address', value: 'address_street' },
  { label: 'Cash Flow', value: 'best_cash_flow' },
  { label: 'CoC Return', value: 'best_coc_return' },
];

export default function FilterBar({
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  sortBy,
  onSortChange,
  sortDirection,
  onSortDirectionChange,
}: FilterBarProps) {
  const { theme, isDark } = useTheme();
  const [showSortModal, setShowSortModal] = useState(false);

  const handleStatusPress = (status: PropertyStatus | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onStatusChange(selectedStatus === status ? null : status);
  };

  const handleSortSelect = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (sortBy === value) {
      onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(value);
      onSortDirectionChange('desc');
    }
    setShowSortModal(false);
  };

  const getCurrentSortLabel = () => {
    const option = SORT_OPTIONS.find((o) => o.value === sortBy);
    return option?.label || 'Sort';
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.backgroundTertiary,
            borderColor: theme.border,
          },
        ]}
      >
        <Ionicons name="search" size={18} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search properties..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')}>
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Row */}
      <View style={styles.filterRow}>
        {/* Status Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusScroll}
          contentContainerStyle={styles.statusContent}
        >
          <TouchableOpacity
            style={[
              styles.statusChip,
              {
                backgroundColor: selectedStatus === null
                  ? colors.primary[isDark ? 800 : 100]
                  : 'transparent',
                borderColor: selectedStatus === null
                  ? colors.primary[500]
                  : theme.border,
              },
            ]}
            onPress={() => handleStatusPress(null)}
          >
            <Text
              style={[
                styles.statusChipText,
                {
                  color: selectedStatus === null
                    ? colors.primary[isDark ? 300 : 600]
                    : theme.textSecondary,
                },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {PROPERTY_STATUS_OPTIONS.filter((s) => !['passed', 'archived'].includes(s)).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusChip,
                {
                  backgroundColor: selectedStatus === status
                    ? colors.primary[isDark ? 800 : 100]
                    : 'transparent',
                  borderColor: selectedStatus === status
                    ? colors.primary[500]
                    : theme.border,
                },
              ]}
              onPress={() => handleStatusPress(status)}
            >
              <Text
                style={[
                  styles.statusChipText,
                  {
                    color: selectedStatus === status
                      ? colors.primary[isDark ? 300 : 600]
                      : theme.textSecondary,
                  },
                ]}
              >
                {PROPERTY_STATUS_LABELS[status]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort Button */}
        <TouchableOpacity
          style={[styles.sortButton, { borderColor: theme.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowSortModal(true);
          }}
        >
          <Ionicons
            name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
            size={14}
            color={colors.primary[isDark ? 300 : 600]}
          />
          <Text style={[styles.sortButtonText, { color: theme.textSecondary }]}>
            {getCurrentSortLabel()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View
            style={[
              styles.sortModal,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.sortModalTitle, { color: theme.text }]}>Sort By</Text>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortOption,
                  sortBy === option.value && {
                    backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
                  },
                ]}
                onPress={() => handleSortSelect(option.value)}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    {
                      color: sortBy === option.value
                        ? colors.primary[isDark ? 300 : 600]
                        : theme.text,
                      fontWeight: sortBy === option.value ? '600' : '400',
                    },
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <Ionicons
                    name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
                    size={16}
                    color={colors.primary[isDark ? 300 : 600]}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusScroll: {
    flex: 1,
  },
  statusContent: {
    paddingRight: 8,
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
    gap: 4,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  sortModal: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sortModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sortOptionText: {
    fontSize: 15,
  },
});
