import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui';
import { usePropertyData } from '@/hooks/usePropertyData';
import { colors } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing, layout } from '@/constants/spacing';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = useCallback(async () => {
    const trimmed = address.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      await fetchProperty(trimmed);
      router.push({
        pathname: '/analyzing',
        params: { address: trimmed },
      });
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Property not found');
    } finally {
      setLoading(false);
    }
  }, [address, fetchProperty, router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.brandTag}>DEALGAPIQ</Text>
          <Text style={styles.heroTitle}>
            Know Before You Buy
          </Text>
          <Text style={styles.heroSubtitle}>
            Analyze any property across 6 investment strategies in seconds
          </Text>
        </View>

        <Card glow="lg" style={styles.searchCard}>
          <Text style={styles.searchLabel}>PROPERTY ADDRESS</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={address}
              onChangeText={(t) => {
                setAddress(t);
                setError('');
              }}
              placeholder="Enter an address to analyze..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              editable={!loading}
            />
          </View>
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
          <Text style={styles.sectionLabel}>PROPRIETARY METRICS</Text>
          <View style={styles.metricGrid}>
            {[
              { title: 'Income Value', desc: 'Max price where cash flow = $0' },
              { title: 'Target Buy', desc: 'Recommended purchase price' },
              { title: 'Deal Gap', desc: 'Discount from list to target' },
              { title: 'Verdict Score', desc: '0-100 composite deal quality' },
            ].map((m) => (
              <Card key={m.title} glow="sm" style={styles.metricCard}>
                <Text style={styles.metricTitle}>{m.title}</Text>
                <Text style={styles.metricDesc}>{m.desc}</Text>
              </Card>
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
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  brandTag: {
    ...typography.label,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    fontFamily: fontFamilies.heading,
    fontSize: 32,
    fontWeight: '700',
    color: colors.textHeading,
    textAlign: 'center',
    lineHeight: 38,
  },
  heroSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 300,
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: layout.inputHeight,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: layout.inputRadius,
    paddingHorizontal: 14,
    fontFamily: fontFamilies.body,
    fontSize: 16,
    color: colors.textHeading,
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
  },
  metricGrid: {
    gap: spacing.sm,
  },
  metricCard: {
    padding: spacing.md,
  },
  metricTitle: {
    ...typography.h4,
    color: colors.textHeading,
    marginBottom: 4,
  },
  metricDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
