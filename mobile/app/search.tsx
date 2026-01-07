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

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      // Navigate to the property page with the address
      router.push(`/analytics/${encodeURIComponent(address.trim())}`);
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={colors.gray[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Property</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search Input */}
        <View style={styles.searchSection}>
          <Text style={styles.label}>Property Address</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="location-outline"
              size={20}
              color={colors.gray[400]}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter full property address..."
              placeholderTextColor={colors.gray[400]}
              value={address}
              onChangeText={setAddress}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {address.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setAddress('')}
              >
                <Ionicons name="close-circle" size={20} color={colors.gray[400]} />
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
          <Text style={styles.examplesTitle}>Try an example address</Text>
          {exampleAddresses.map((example, index) => (
            <TouchableOpacity
              key={index}
              style={styles.exampleItem}
              onPress={() => setAddress(example)}
              activeOpacity={0.7}
            >
              <Ionicons name="home-outline" size={18} color={colors.primary[600]} />
              <Text style={styles.exampleText} numberOfLines={1}>
                {example}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={colors.gray[400]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Search Tips</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={colors.profit.main} />
            <Text style={styles.tipText}>Include street number and name</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={colors.profit.main} />
            <Text style={styles.tipText}>Add city, state, and ZIP code</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color={colors.profit.main} />
            <Text style={styles.tipText}>Use full address for best results</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontWeight: '600',
    fontSize: 17,
    color: colors.gray[900],
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
    color: colors.gray[700],
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[200],
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.gray[900],
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
    backgroundColor: colors.gray[300],
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
    color: colors.gray[500],
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exampleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.gray[50],
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  exampleText: {
    flex: 1,
    fontWeight: '500',
    fontSize: 14,
    color: colors.gray[700],
  },
  tipsSection: {
    backgroundColor: colors.primary[50],
    padding: 16,
    borderRadius: 12,
  },
  tipsTitle: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.primary[700],
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
    color: colors.gray[600],
  },
});

