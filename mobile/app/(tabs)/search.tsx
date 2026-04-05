import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui';
import {
  AddressAutocomplete,
  type AddressComponents,
} from '@/components/AddressAutocomplete';
import { usePropertyData } from '@/hooks/usePropertyData';
import { errorToUserMessage } from '@/utils/errorMessages';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing, layout } from '@/constants/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STRATEGY_PILLS = [
  { id: 'ltr', label: 'Long-Term Rental', icon: '🏠' },
  { id: 'str', label: 'Short-Term Rental', icon: '🏨' },
  { id: 'brrrr', label: 'BRRRR', icon: '🔄' },
  { id: 'flip', label: 'Fix & Flip', icon: '🔨' },
  { id: 'houseHack', label: 'House Hack', icon: '🏡' },
  { id: 'wholesale', label: 'Wholesale', icon: '📋' },
] as const;

export default function SearchScreen() {
  const router = useRouter();
  const { fetchProperty } = usePropertyData();
  const [address, setAddress] = useState('');
  const [addressComponents, setAddressComponents] =
    useState<AddressComponents | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = useCallback(async () => {
    const trimmed = address.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      await fetchProperty(trimmed, {
        city: addressComponents?.city || undefined,
        state: addressComponents?.state || undefined,
        zip_code: addressComponents?.zipCode || undefined,
      });
      router.push({
        pathname: '/analyzing',
        params: { address: trimmed },
      });
    } catch (err: any) {
      setError(errorToUserMessage(err, 'Property not found. Please check the address and try again.'));
    } finally {
      setLoading(false);
    }
  }, [address, addressComponents, fetchProperty, router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroImageWrapper}>
          <Image
            source={require('@/assets/hero-house.png')}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', colors.base]}
            locations={[0.3, 1]}
            style={styles.heroImageFade}
          />
        </View>

        <View style={styles.hero}>
          <Text style={styles.brandTag}>DEALGAPIQ</Text>
          <Text style={styles.heroTitle}>
            See Every Property{'\n'}Through an{' '}
            <Text style={styles.heroAccent}>Investor Lens</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Every listing is designed to sell you.{' '}
            <Text style={styles.heroEmphasis}>
              DealGapIQ answers the only question that matters: is this a good deal?
            </Text>
          </Text>
        </View>

        <View style={styles.searchCardWrapper}>
          <Card glow="lg" style={styles.searchCard}>
            <Text style={styles.searchLabel}>PROPERTY ADDRESS</Text>
            <AddressAutocomplete
              value={address}
              onChangeText={(t) => {
                setAddress(t);
                setAddressComponents(null);
                setError('');
              }}
              onSelect={(formatted, components) => {
                setAddress(formatted);
                setAddressComponents(components);
                setError('');
              }}
              placeholder="Enter an address to analyze..."
              editable={!loading}
              onSubmitEditing={handleSearch}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              onPress={handleSearch}
              disabled={loading || !address.trim()}
              style={({ pressed }) => [
                styles.searchBtn,
                pressed && styles.searchBtnPressed,
                (loading || !address.trim()) && styles.searchBtnDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.searchBtnText}>Analyze Property</Text>
              )}
            </Pressable>
          </Card>
        </View>

        <View style={styles.strategySection}>
          <Text style={styles.sectionLabel}>6 STRATEGIES ANALYZED</Text>
          <View style={styles.pillGrid}>
            {STRATEGY_PILLS.map((s) => (
              <View key={s.id} style={styles.pill}>
                <Text style={styles.pillIcon}>{s.icon}</Text>
                <Text style={styles.pillLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.metrics}>
          <Text style={styles.sectionLabel}>YOUR THREE NUMBERS</Text>
          <Text style={styles.metricsTitle}>
            Every Property Has Three{'\n'}Price Thresholds
          </Text>
          <Text style={styles.metricsSubtitle}>
            Numbers listing sites will never show you.
          </Text>
          <View style={styles.metricGrid}>
            {[
              { title: 'Income Value', color: colors.incomeValue, desc: 'The maximum price where cash flow = $0. Your breakeven.' },
              { title: 'Target Buy', color: colors.success, desc: 'Income Value minus a 5% safety margin. This is what you should offer.' },
              { title: 'Deal Gap', color: colors.primary, desc: 'The gap between asking price and your Target Buy. The bigger, the better.' },
            ].map((m) => (
              <View key={m.title} style={styles.thresholdRow}>
                <View style={[styles.thresholdDot, { backgroundColor: m.color }]} />
                <View style={styles.thresholdContent}>
                  <Text style={[styles.metricTitle, { color: m.color }]}>{m.title}</Text>
                  <Text style={styles.metricDesc}>{m.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  heroImageWrapper: {
    width: '100%',
    height: SCREEN_WIDTH * 0.55,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImageFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  brandTag: {
    ...typography.label,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontFamily: fontFamilies.heading,
    fontSize: 28,
    fontWeight: '700',
    color: colors.textHeading,
    textAlign: 'center',
    lineHeight: 36,
  },
  heroAccent: {
    color: colors.primary,
  },
  heroSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 320,
    lineHeight: 22,
  },
  heroEmphasis: {
    color: colors.textBody,
    fontFamily: fontFamilies.bodyMedium,
    fontWeight: '600',
  },
  searchCardWrapper: {
    zIndex: 10,
  },
  searchCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  searchLabel: {
    ...typography.label,
    color: colors.textLabel,
    marginBottom: spacing.sm,
  },
  error: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.error,
    marginTop: spacing.xs,
  },
  searchBtn: {
    height: layout.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: layout.buttonRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  searchBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  searchBtnDisabled: { opacity: 0.5 },
  searchBtnText: {
    fontFamily: fontFamilies.heading,
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  strategySection: {
    marginTop: spacing['2xl'],
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textLabel,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.panel,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillIcon: { fontSize: 14 },
  pillLabel: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 13,
    color: colors.textBody,
    fontWeight: '600',
  },
  metrics: {
    marginTop: spacing['2xl'],
    paddingHorizontal: spacing.xs,
  },
  metricsTitle: {
    fontFamily: fontFamilies.heading,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textHeading,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: spacing.sm,
  },
  metricsSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  metricGrid: {
    gap: spacing.lg,
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  thresholdDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  thresholdContent: {
    flex: 1,
  },
  metricTitle: {
    fontFamily: fontFamilies.heading,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  metricDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
