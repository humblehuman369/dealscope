import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';

export default function SearchScreen() {
  const router = useRouter();
  const [address, setAddress] = useState('');

  function handleSearch() {
    const trimmed = address.trim();
    if (!trimmed) {
      Alert.alert('Enter Address', 'Please enter a property address to analyze.');
      return;
    }
    router.push({
      pathname: '/verdict',
      params: { address: trimmed },
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.brand}>
            DealGap<Text style={styles.brandAccent}>IQ</Text>
          </Text>
          <Text style={styles.tagline}>
            Instant Investment Analysis
          </Text>
        </View>

        <View style={styles.searchCard}>
          <Text style={styles.cardTitle}>Analyze a Property</Text>
          <Text style={styles.cardSubtitle}>
            Enter any property address to get a full investment verdict.
          </Text>

          <Input
            label="Property Address"
            placeholder="123 Main St, City, State ZIP"
            value={address}
            onChangeText={setAddress}
            autoCapitalize="words"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />

          <Button
            title="Analyze Property"
            onPress={handleSearch}
            disabled={!address.trim()}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
  brand: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textHeading,
  },
  brandAccent: {
    color: colors.primary,
  },
  tagline: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
  },
  searchCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textHeading,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
});
