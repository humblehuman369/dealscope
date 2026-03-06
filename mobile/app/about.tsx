import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { colors, cardGlow } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

const METRICS = [
  { icon: '📊', title: 'Income Value', desc: 'The maximum price the rental income supports. Above it, you lose money.' },
  { icon: '🎯', title: 'Target Buy Price', desc: 'The optimal purchase price that balances returns with risk tolerance.' },
  { icon: '📐', title: 'Deal Gap', desc: 'How far the list price is from your target — the negotiation opportunity.' },
];

const STRATEGIES = [
  'Long-Term Rental', 'Short-Term Rental', 'BRRRR',
  'Fix & Flip', 'House Hack', 'Wholesale',
];

export default function AboutScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

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

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.title}>
            What is <Text style={{ color: colors.primary }}>DealGapIQ</Text>?
          </Text>
          <Text style={styles.body}>
            DealGapIQ is an instant investment analysis platform for real estate investors.
            Enter any US property address and get a full financial verdict across 6 strategies in ~60 seconds.
          </Text>
        </Animated.View>

        {/* Proprietary Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>THREE PROPRIETARY METRICS</Text>
          {METRICS.map((m) => (
            <View key={m.title} style={[styles.metricCard, cardGlow.sm]}>
              <Text style={styles.metricIcon}>{m.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.metricTitle}>{m.title}</Text>
                <Text style={styles.metricDesc}>{m.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Strategies */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>6 INVESTMENT STRATEGIES</Text>
          <View style={styles.stratGrid}>
            {STRATEGIES.map((s) => (
              <View key={s} style={styles.stratChip}>
                <Text style={styles.stratText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
          <Step num="1" title="Enter any address" desc="Type or paste a US property address." />
          <Step num="2" title="IQ analyzes it" desc="We pull data from multiple sources and run financial models across all 6 strategies." />
          <Step num="3" title="Get your verdict" desc="A VerdictIQ score (0-95), AI-written narrative, and full financial breakdown." />
        </View>

        {/* Founder */}
        <View style={[styles.section, styles.founderCard, cardGlow.sm]}>
          <Text style={styles.sectionLabel}>BUILT BY AN INVESTOR, FOR INVESTORS</Text>
          <Text style={styles.body}>
            DealGapIQ was built by a real estate investor who was tired of spending hours
            analyzing deals manually. Every feature exists because it solved a real problem
            in the deal evaluation process.
          </Text>
        </View>

        <View style={styles.ctaSection}>
          <Button
            title="Start Analyzing"
            onPress={() => router.replace('/(tabs)/search')}
          />
          <Text style={styles.ctaSubtext}>
            5 free analyses per month. No credit card required.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepNum}>{num}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.base },
  scroll: { padding: spacing.lg, paddingTop: 56, paddingBottom: 60 },

  title: { fontFamily: fontFamilies.heading, fontSize: 28, fontWeight: '700', color: colors.textHeading, marginBottom: spacing.sm },
  body: { fontFamily: fontFamilies.body, fontSize: 15, color: colors.textBody, lineHeight: 24 },

  section: { marginTop: spacing.xl },
  sectionLabel: { fontFamily: fontFamilies.heading, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: colors.primary, textTransform: 'uppercase', marginBottom: spacing.md },

  metricCard: { flexDirection: 'row', backgroundColor: colors.base, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm, alignItems: 'flex-start' },
  metricIcon: { fontSize: 24 },
  metricTitle: { fontFamily: fontFamilies.heading, fontSize: 16, fontWeight: '700', color: colors.textHeading },
  metricDesc: { fontFamily: fontFamilies.body, fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginTop: 2 },

  stratGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stratChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999, borderWidth: 1, borderColor: colors.borderLight, backgroundColor: 'rgba(14,165,233,0.06)' },
  stratText: { fontFamily: fontFamilies.bodyMedium, fontSize: 13, color: colors.textBody },

  stepRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, alignItems: 'flex-start' },
  stepBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontFamily: fontFamilies.heading, fontSize: 14, fontWeight: '700', color: '#fff' },
  stepTitle: { fontFamily: fontFamilies.heading, fontSize: 15, fontWeight: '700', color: colors.textHeading },
  stepDesc: { fontFamily: fontFamilies.body, fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginTop: 2 },

  founderCard: { backgroundColor: colors.base, borderRadius: 14, padding: spacing.md },

  ctaSection: { marginTop: spacing.xl, alignItems: 'center' },
  ctaSubtext: { fontFamily: fontFamilies.body, fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
});
