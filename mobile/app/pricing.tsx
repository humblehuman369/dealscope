import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Paywall } from '@/components/Paywall';
import { colors, cardGlow } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

const COMPARISON = [
  { name: 'Property analyses per month', free: '5', pro: 'Unlimited' },
  { name: 'Investment strategies', free: '6', pro: '6' },
  { name: 'VerdictIQ score', free: '✓', pro: '✓' },
  { name: 'AI deal narrative', free: '✓', pro: '✓' },
  { name: 'Excel proforma', free: '—', pro: '✓' },
  { name: 'PDF reports', free: '—', pro: '✓' },
  { name: 'Priority analysis speed', free: '—', pro: '✓' },
];

const FAQ = [
  { q: 'What happens after the free trial?', a: 'You\'ll be charged the annual or monthly rate unless you cancel at least 24 hours before the trial ends.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel through your App Store or Google Play subscription settings. Your Pro access continues until the end of the billing period.' },
  { q: 'What\'s in the Excel proforma?', a: 'A full financial breakdown with all inputs, calculations, projections, and amortization schedules — ready to share with partners or lenders.' },
  { q: 'Do unused analyses roll over?', a: 'On Starter, no — your 5 analyses reset monthly. On Pro, there\'s no limit so it doesn\'t matter.' },
];

export default function PricingScreen() {
  const router = useRouter();
  const [showPaywall, setShowPaywall] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Button
          title="← Back"
          variant="ghost"
          onPress={() => router.back()}
          style={{ alignSelf: 'flex-start', marginBottom: spacing.sm }}
        />

        <Text style={styles.title}>Simple, Transparent Pricing</Text>
        <Text style={styles.subtitle}>
          Start free. Upgrade when you need unlimited power.
        </Text>

        {/* Pricing Cards */}
        <View style={styles.pricingRow}>
          <View style={[styles.priceCard, cardGlow.sm]}>
            <Text style={styles.priceName}>Starter</Text>
            <Text style={styles.priceAmount}>
              $0<Text style={styles.pricePeriod}>/mo</Text>
            </Text>
            <Text style={styles.priceDesc}>Free forever</Text>
            <Text style={styles.priceNote}>5 analyses/month</Text>
          </View>

          <View style={[styles.priceCard, styles.priceCardPro, cardGlow.lg]}>
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>MOST POPULAR</Text>
            </View>
            <Text style={[styles.priceName, { color: colors.primary }]}>Pro</Text>
            <Text style={styles.priceAmount}>
              $29<Text style={styles.pricePeriod}>/mo</Text>
            </Text>
            <Text style={styles.priceDesc}>Billed annually</Text>
            <Text style={styles.priceNote}>$39/mo if billed monthly</Text>
            <Button
              title="Start Free Trial"
              onPress={() => setShowPaywall(true)}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </View>

        {/* Feature Comparison */}
        <View style={[styles.comparisonCard, cardGlow.sm]}>
          <Text style={styles.sectionLabel}>FEATURE COMPARISON</Text>
          <View style={styles.compHeader}>
            <Text style={[styles.compHeaderText, { flex: 2 }]}>Feature</Text>
            <Text style={styles.compHeaderText}>Free</Text>
            <Text style={[styles.compHeaderText, { color: colors.primary }]}>Pro</Text>
          </View>
          {COMPARISON.map((row) => (
            <View key={row.name} style={styles.compRow}>
              <Text style={[styles.compFeature, { flex: 2 }]}>{row.name}</Text>
              <Text style={styles.compValue}>{row.free}</Text>
              <Text style={[styles.compValue, { color: colors.primary }]}>{row.pro}</Text>
            </View>
          ))}
        </View>

        {/* FAQ */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionLabel}>FREQUENTLY ASKED QUESTIONS</Text>
          {FAQ.map((item, i) => (
            <Pressable key={i} onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}>
              <View style={styles.faqItem}>
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{item.q}</Text>
                  <Text style={styles.faqToggle}>{expandedFaq === i ? '−' : '+'}</Text>
                </View>
                {expandedFaq === i && (
                  <Text style={styles.faqAnswer}>{item.a}</Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Paywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  scroll: { padding: spacing.lg, paddingTop: 56, paddingBottom: 60 },

  title: { fontFamily: fontFamilies.heading, fontSize: 24, fontWeight: '700', color: colors.textHeading },
  subtitle: { fontFamily: fontFamilies.body, fontSize: 15, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl },

  pricingRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  priceCard: { flex: 1, backgroundColor: colors.base, borderRadius: 14, padding: spacing.md, alignItems: 'center' },
  priceCardPro: { backgroundColor: colors.base },
  popularBadge: { position: 'absolute', top: -10, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9999 },
  popularText: { fontFamily: fontFamilies.heading, fontSize: 9, fontWeight: '700', color: '#fff' },
  priceName: { fontFamily: fontFamilies.heading, fontSize: 18, fontWeight: '700', color: colors.textHeading, marginTop: spacing.sm },
  priceAmount: { fontFamily: fontFamilies.monoBold, fontSize: 32, fontWeight: '700', color: colors.textHeading, marginTop: spacing.xs },
  pricePeriod: { fontSize: 14, fontWeight: '400', color: colors.textSecondary },
  priceDesc: { fontFamily: fontFamilies.body, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  priceNote: { fontFamily: fontFamilies.body, fontSize: 11, color: colors.textMuted, marginTop: 2 },

  comparisonCard: { backgroundColor: colors.base, borderRadius: 14, padding: spacing.md, marginBottom: spacing.lg },
  sectionLabel: { fontFamily: fontFamilies.heading, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: colors.primary, textTransform: 'uppercase', marginBottom: spacing.sm },
  compHeader: { flexDirection: 'row', paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  compHeaderText: { fontFamily: fontFamilies.heading, fontSize: 12, fontWeight: '700', color: colors.textSecondary, flex: 1, textAlign: 'center' },
  compRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  compFeature: { fontFamily: fontFamilies.body, fontSize: 13, color: colors.textBody },
  compValue: { fontFamily: fontFamilies.mono, fontSize: 13, color: colors.textHeading, flex: 1, textAlign: 'center' },

  faqSection: { marginTop: spacing.md },
  faqItem: { backgroundColor: colors.card, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { fontFamily: fontFamilies.heading, fontSize: 14, fontWeight: '600', color: colors.textHeading, flex: 1, marginRight: spacing.sm },
  faqToggle: { fontSize: 18, color: colors.primary },
  faqAnswer: { fontFamily: fontFamilies.body, fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginTop: spacing.sm },
});
