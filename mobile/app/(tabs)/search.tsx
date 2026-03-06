import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, cardGlow } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

const TRUST_SIGNALS = [
  '6 Investment Strategies',
  '3 Proprietary Metrics',
  '~60 Second Analysis',
];

export default function SearchScreen() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  function handleSearch() {
    const trimmed = address.trim();
    if (!trimmed) {
      Alert.alert('Enter Address', 'Please enter a property address to analyze.');
      return;
    }
    setIsSearching(true);
    router.push({
      pathname: '/analyzing' as any,
      params: { address: trimmed },
    });
    setTimeout(() => setIsSearching(false), 500);
  }

  async function handleScan() {
    setIsScanning(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Please enable location access to scan nearby properties.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const results = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (results.length > 0) {
        const r = results[0];
        const parts = [
          r.streetNumber,
          r.street,
          r.city,
          r.region,
          r.postalCode,
        ].filter(Boolean);
        const resolved = parts.join(' ');
        if (resolved) {
          setAddress(resolved);
          Alert.alert('Address Found', resolved, [
            { text: 'Edit', style: 'cancel' },
            { text: 'Analyze', onPress: () => {
              router.push({ pathname: '/analyzing' as any, params: { address: resolved } });
            }},
          ]);
        } else {
          Alert.alert('Could Not Resolve', 'Unable to determine the address at this location.');
        }
      }
    } catch (err) {
      Alert.alert('Scan Failed', 'Could not get your current location. Please enter the address manually.');
    } finally {
      setIsScanning(false);
    }
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
          <Text style={styles.heroText}>
            Is That Property a Good Deal?
          </Text>
          <Text style={styles.heroSubtext}>
            Know if it is worth your time before you spend hours on it.
          </Text>
        </View>

        {/* Search Methods */}
        <View style={styles.methodRow}>
          <Pressable
            onPress={handleScan}
            style={[styles.methodCard, cardGlow.sm]}
            disabled={isScanning}
          >
            <Text style={styles.methodIcon}>📍</Text>
            <Text style={styles.methodTitle}>Scan Property</Text>
            <Text style={styles.methodDesc}>Use GPS to find the address</Text>
          </Pressable>
          <View style={[styles.methodCard, styles.methodCardActive, cardGlow.active]}>
            <Text style={styles.methodIcon}>🔍</Text>
            <Text style={[styles.methodTitle, { color: colors.primary }]}>Enter Address</Text>
            <Text style={styles.methodDesc}>Type any US address</Text>
          </View>
        </View>

        {/* Search Card */}
        <View style={[styles.searchCard, cardGlow.sm]}>
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
            title={isScanning ? 'Finding address...' : 'Analyze Property'}
            onPress={handleSearch}
            loading={isSearching || isScanning}
            disabled={!address.trim() || isScanning}
          />
        </View>

        {/* Trust Signals */}
        <View style={styles.trustRow}>
          {TRUST_SIGNALS.map((signal) => (
            <View key={signal} style={styles.trustItem}>
              <View style={styles.trustDot} />
              <Text style={styles.trustText}>{signal}</Text>
            </View>
          ))}
        </View>

        {/* Strategies */}
        <View style={styles.strategiesSection}>
          <Text style={styles.sectionLabel}>STRATEGIES COVERED</Text>
          <View style={styles.pillRow}>
            {(['LTR', 'STR', 'BRRRR', 'Fix & Flip', 'House Hack', 'Wholesale'] as const).map((s) => (
              <View key={s} style={styles.pill}>
                <Text style={styles.pillText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  scroll: { flexGrow: 1, padding: spacing.lg, paddingTop: 60 },
  header: { marginBottom: spacing.lg },
  brand: { fontFamily: fontFamilies.heading, fontSize: 32, fontWeight: '700', color: colors.textHeading },
  brandAccent: { color: colors.primary },
  heroText: { fontFamily: fontFamilies.heading, fontSize: 22, fontWeight: '700', color: colors.textHeading, marginTop: spacing.md, lineHeight: 30 },
  heroSubtext: { fontFamily: fontFamilies.body, fontSize: 15, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 22 },

  methodRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  methodCard: {
    flex: 1, backgroundColor: colors.base, borderRadius: 14, padding: spacing.md,
    alignItems: 'center', gap: spacing.xs,
  },
  methodCardActive: { backgroundColor: colors.card },
  methodIcon: { fontSize: 28 },
  methodTitle: { fontFamily: fontFamilies.heading, fontSize: 13, fontWeight: '700', color: colors.textHeading },
  methodDesc: { fontFamily: fontFamilies.body, fontSize: 11, color: colors.textMuted, textAlign: 'center' },

  searchCard: { backgroundColor: colors.card, borderRadius: 14, padding: spacing.lg },
  cardTitle: { ...typography.h3, color: colors.textHeading, marginBottom: spacing.xs },

  trustRow: { marginTop: spacing.lg, gap: spacing.sm },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  trustDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  trustText: { fontFamily: fontFamilies.bodyMedium, fontSize: 13, color: colors.textSecondary },
  strategiesSection: { marginTop: spacing.xl },
  sectionLabel: { ...typography.label, color: colors.primary, marginBottom: spacing.sm },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: 'rgba(14,165,233,0.06)' },
  pillText: { fontFamily: fontFamilies.bodyMedium, fontSize: 12, color: colors.textBody },
});
