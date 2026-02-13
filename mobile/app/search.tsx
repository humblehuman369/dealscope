import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [address, setAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!address.trim()) {
      setError('Please enter a property address');
      return;
    }

    setError(null);
    setIsSearching(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Use new IQ Verdict flow
      router.push(`/analyzing/${encodeURIComponent(address.trim())}` as any);
    } catch (err) {
      setError('Unable to search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [address, router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Example addresses for quick search
  const exampleAddresses = [
    '953 Banyan Dr, Delray Beach, FL 33483',
    '123 Main St, Miami, FL 33101',
    '456 Ocean Ave, Fort Lauderdale, FL 33301',
  ];

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: { backgroundColor: theme.background },
    header: { 
      backgroundColor: theme.headerBackground, 
      borderBottomColor: theme.headerBorder 
    },
    backIcon: theme.text,
    headerTitle: { color: theme.text },
    label: { color: isDark ? colors.gray[300] : colors.gray[700] },
    inputContainer: { 
      backgroundColor: isDark ? colors.navy[800] : colors.gray[50],
      borderColor: isDark ? colors.navy[600] : colors.gray[200],
    },
    input: { color: theme.text },
    inputIcon: isDark ? colors.gray[500] : colors.gray[400],
    examplesTitle: { color: theme.textMuted },
    exampleItem: { backgroundColor: isDark ? colors.navy[800] : colors.gray[50] },
    exampleText: { color: theme.textSecondary },
    tipsSection: { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] },
    tipsTitle: { color: isDark ? colors.primary[300] : colors.primary[700] },
    tipText: { color: theme.textSecondary },
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, dynamicStyles.container]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, dynamicStyles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={dynamicStyles.backIcon} />
        </TouchableOpacity>
        <Text accessibilityRole="header" style={[styles.headerTitle, dynamicStyles.headerTitle]}>Search Property</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search Input */}
        <View style={styles.searchSection}>
          <Text style={[styles.label, dynamicStyles.label]}>Property Address</Text>
          <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
            <Ionicons
              name="location-outline"
              size={20}
              color={dynamicStyles.inputIcon}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              placeholder="Enter full property address..."
              placeholderTextColor={dynamicStyles.inputIcon}
              value={address}
              onChangeText={setAddress}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              accessibilityLabel="Search for properties"
              accessibilityHint="Enter a full property address to analyze"
            />
            {address.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setAddress('')}
                accessibilityRole="button"
                accessibilityLabel="Clear search input"
              >
                <Ionicons name="close-circle" size={20} color={dynamicStyles.inputIcon} />
              </TouchableOpacity>
            )}
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={colors.loss.main} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Search Button */}
          <TouchableOpacity
            style={[
              styles.searchButton,
              (!address.trim() || isSearching) && styles.searchButtonDisabled,
            ]}
            onPress={handleSearch}
            disabled={!address.trim() || isSearching}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Search property"
            accessibilityState={{ disabled: !address.trim() || isSearching, busy: isSearching }}
          >
            {isSearching ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="search" size={20} color="#fff" />
                <Text style={styles.searchButtonText}>Search Property</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Example Addresses */}
        <View style={styles.examplesSection}>
          <Text style={[styles.examplesTitle, dynamicStyles.examplesTitle]}>Try an example address</Text>
          {exampleAddresses.map((example, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.exampleItem, dynamicStyles.exampleItem]}
              onPress={() => setAddress(example)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Use example: ${example}`}
            >
              <Ionicons name="home-outline" size={18} color={colors.primary[isDark ? 400 : 600]} />
              <Text style={[styles.exampleText, dynamicStyles.exampleText]} numberOfLines={1}>
                {example}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={dynamicStyles.inputIcon} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Tips */}
        <View style={[styles.tipsSection, dynamicStyles.tipsSection]}>
          <Text style={[styles.tipsTitle, dynamicStyles.tipsTitle]}>Search Tips</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={colors.profit.main} />
            <Text style={[styles.tipText, dynamicStyles.tipText]}>Include street number and name</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={colors.profit.main} />
            <Text style={[styles.tipText, dynamicStyles.tipText]}>Add city, state, and ZIP code</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={colors.profit.main} />
            <Text style={[styles.tipText, dynamicStyles.tipText]}>Use full address for best results</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontWeight: '600',
    fontSize: 17,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  searchSection: {
    marginBottom: 32,
  },
  label: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    fontWeight: '500',
    fontSize: 13,
    color: colors.loss.main,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary[600],
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  searchButtonDisabled: {
    backgroundColor: colors.gray[400],
    shadowOpacity: 0,
  },
  searchButtonText: {
    fontWeight: '700',
    fontSize: 16,
    color: '#fff',
  },
  examplesSection: {
    marginBottom: 32,
  },
  examplesTitle: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exampleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  exampleText: {
    flex: 1,
    fontWeight: '500',
    fontSize: 14,
  },
  tipsSection: {
    padding: 16,
    borderRadius: 12,
  },
  tipsTitle: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    fontWeight: '400',
    fontSize: 14,
  },
});
