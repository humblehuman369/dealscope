import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { getAccessToken } from '@/services/token-manager';
import { Card } from '@/components/ui';
import { colors, shadows } from '@/constants/colors';
import { typography, fontFamilies } from '@/constants/typography';
import { spacing, layout } from '@/constants/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={colors.success} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <View style={styles.stepBadge}>
      <Text style={styles.stepBadgeText}>{n}</Text>
    </View>
  );
}

const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'The Verdict',
    subtitle: 'The Smell Test',
    desc: 'Search any address. In seconds, see whether the numbers work — or move on.',
    pills: ['Instant Deal Score', 'Cross-referenced valuations', 'Income Value + Target Buy'],
  },
  {
    step: 2,
    title: 'The Strategy',
    subtitle: 'The Deep Dive',
    desc: 'Pick a strategy, adjust every assumption, and see the full financial breakdown.',
    pills: ['6 investment strategies', 'DealMaker price negotiation', 'Full proforma worksheets'],
  },
];

const VALUE_PROPS = [
  { icon: '⚡', title: 'Results in seconds', desc: 'Not hours of spreadsheet work' },
  { icon: '🎯', title: '3 price thresholds', desc: 'Income Value, Target Buy, Deal Gap' },
  { icon: '📊', title: '6 strategies analyzed', desc: 'LTR, STR, BRRRR, Flip, House Hack, Wholesale' },
  { icon: '🔒', title: 'No guessing', desc: 'Cross-referenced from multiple data sources' },
];

const FOUNDER_STATS = [
  { value: '35+', label: 'Years in RE Data' },
  { value: '30+', label: 'Yr GSE Partnerships' },
  { value: '35+', label: 'Years RE Investor' },
];

export default function Index() {
  const token = getAccessToken();
  if (token) return <Redirect href="/(tabs)/search" />;

  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero ─── */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Built for Real Estate Investors</Text>
          </View>

          <Text style={styles.heroTitle}>
            See Every Property{'\n'}Through an{' '}
            <Text style={styles.heroAccent}>Investor Lens.</Text>
          </Text>

          <Text style={styles.heroSub}>
            Not a listing site. A decision engine.{'\n'}
            Answer the only question that matters:{'\n'}
            <Text style={styles.heroEmphasis}>"Is this a good deal?"</Text>
          </Text>

          {/* Primary CTA */}
          <Pressable
            onPress={() => router.push('/(auth)/register')}
            style={({ pressed }) => [styles.ctaPrimary, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaPrimaryText}>Get Started Free</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(auth)/login')}
            style={({ pressed }) => [styles.ctaSecondary, pressed && styles.ctaSecondaryPressed]}
          >
            <Text style={styles.ctaSecondaryText}>Sign In</Text>
          </Pressable>

          {/* Trust pills */}
          <View style={styles.trustRow}>
            {['No credit card', '3 free analyses/month', 'Results in seconds'].map((t) => (
              <View key={t} style={styles.trustPill}>
                <CheckIcon size={12} />
                <Text style={styles.trustText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ─── The Difference ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>THE DIFFERENCE</Text>
          <Text style={styles.sectionTitle}>
            Listing Sites Market Properties.{'\n'}
            <Text style={styles.heroAccent}>We Analyze Them.</Text>
          </Text>

          <Card glow="sm" style={styles.quoteCard}>
            <Text style={styles.quoteText}>
              "You're not asking <Text style={styles.quoteItalic}>do I love this kitchen?</Text>{'\n'}
              You're asking <Text style={styles.quoteItalic}>does this property cash flow?</Text>"
            </Text>
          </Card>
        </View>

        {/* ─── Value Props ─── */}
        <View style={styles.valueGrid}>
          {VALUE_PROPS.map((v) => (
            <View key={v.title} style={styles.valueItem}>
              <Text style={styles.valueIcon}>{v.icon}</Text>
              <View style={styles.valueContent}>
                <Text style={styles.valueTitle}>{v.title}</Text>
                <Text style={styles.valueDesc}>{v.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ─── How It Works ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
          <Text style={styles.sectionTitle}>
            Two Steps.{'\n'}Zero Wasted Time.
          </Text>

          {HOW_IT_WORKS.map((step) => (
            <Card key={step.step} glow="sm" style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <StepNumber n={step.step} />
                <View style={styles.stepTitles}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
                </View>
              </View>
              <Text style={styles.stepDesc}>{step.desc}</Text>
              <View style={styles.stepPills}>
                {step.pills.map((p) => (
                  <View key={p} style={styles.stepPill}>
                    <CheckIcon size={11} />
                    <Text style={styles.stepPillText}>{p}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ))}
        </View>

        {/* ─── Three Numbers ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YOUR THREE NUMBERS</Text>
          <Text style={styles.sectionTitle}>
            Every Property Has Three{'\n'}Price Thresholds
          </Text>
          <Text style={styles.sectionSub}>
            Numbers listing sites will never show you.
          </Text>

          {[
            { name: 'Income Value', color: colors.incomeValue, desc: 'The maximum price where cash flow = $0. Your breakeven.' },
            { name: 'Target Buy', color: colors.success, desc: 'Income Value minus a 5% safety margin. This is what you should offer.' },
            { name: 'Deal Gap', color: colors.primary, desc: 'The gap between asking price and your Target Buy. The bigger, the better.' },
          ].map((n) => (
            <View key={n.name} style={styles.thresholdRow}>
              <View style={[styles.thresholdDot, { backgroundColor: n.color }]} />
              <View style={styles.thresholdContent}>
                <Text style={[styles.thresholdName, { color: n.color }]}>{n.name}</Text>
                <Text style={styles.thresholdDesc}>{n.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ─── Founder ─── */}
        <View style={styles.section}>
          <Card glow="sm" style={styles.founderCard}>
            <Text style={styles.founderName}>Built by Brad Geisen</Text>
            <Text style={styles.founderBio}>
              35 years in real estate data. HomePath.com, HomeSteps.com, Foreclosure.com.
              DealGapIQ was built to think like an investor, not market like an agent.
            </Text>
            <View style={styles.founderStats}>
              {FOUNDER_STATS.map((s) => (
                <View key={s.label} style={styles.founderStat}>
                  <Text style={styles.founderStatValue}>{s.value}</Text>
                  <Text style={styles.founderStatLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        {/* ─── Final CTA ─── */}
        <View style={styles.finalCta}>
          <Text style={styles.finalTitle}>
            Stop Browsing Like a Buyer.
          </Text>
          <Text style={[styles.finalTitle, { color: colors.primary }]}>
            Start Thinking Like an Investor.
          </Text>
          <Text style={styles.finalSub}>
            Search any address. See the three price thresholds, the Verdict Score, and which strategy makes it work.
          </Text>

          <Pressable
            onPress={() => router.push('/(auth)/register')}
            style={({ pressed }) => [styles.ctaPrimary, pressed && styles.ctaPressed, { marginTop: spacing.lg }]}
          >
            <Text style={styles.ctaPrimaryText}>Analyze a Property Free</Text>
          </Pressable>

          <View style={styles.trustRow}>
            {['No credit card', '3 free analyses/month', 'Every assumption editable'].map((t) => (
              <View key={t} style={styles.trustPill}>
                <CheckIcon size={12} />
                <Text style={styles.trustText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ─── Footer ─── */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>DealGapIQ</Text>
          <Text style={styles.footerCopy}>&copy; 2026 DealGapIQ. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.base },
  scrollContent: {
    paddingBottom: spacing['2xl'] + 20,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
  },
  heroBadge: {
    backgroundColor: 'rgba(14,165,233,0.12)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: spacing.lg,
  },
  heroBadgeText: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontFamily: fontFamilies.heading,
    fontSize: 30,
    fontWeight: '700',
    color: colors.textHeading,
    textAlign: 'center',
    lineHeight: 38,
  },
  heroAccent: {
    color: colors.primary,
  },
  heroSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 22,
  },
  heroEmphasis: {
    color: colors.textBody,
    fontFamily: fontFamilies.bodyMedium,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  ctaPrimary: {
    width: '100%',
    height: layout.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: layout.buttonRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    ...shadows.cta,
  },
  ctaPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  ctaPrimaryText: {
    fontFamily: fontFamilies.heading,
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  ctaSecondary: {
    width: '100%',
    height: layout.buttonHeight,
    borderRadius: layout.buttonRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  ctaSecondaryPressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  ctaSecondaryText: {
    fontFamily: fontFamilies.heading,
    fontSize: 17,
    fontWeight: '700',
    color: colors.textHeading,
  },
  trustRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustText: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
    color: colors.textSecondary,
  },

  // Sections
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing['2xl'],
  },
  sectionLabel: {
    ...typography.label,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fontFamilies.heading,
    fontSize: 24,
    fontWeight: '700',
    color: colors.textHeading,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: spacing.md,
  },
  sectionSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  // Quote
  quoteCard: {
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  quoteText: {
    fontFamily: fontFamilies.body,
    fontSize: 15,
    color: colors.textBody,
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  quoteItalic: {
    color: colors.textHeading,
    fontWeight: '600',
  },

  // Value props
  valueGrid: {
    paddingHorizontal: spacing.md,
    marginTop: spacing['2xl'],
    gap: spacing.md,
  },
  valueItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  valueIcon: {
    fontSize: 24,
    marginTop: 2,
  },
  valueContent: {
    flex: 1,
  },
  valueTitle: {
    fontFamily: fontFamilies.heading,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textHeading,
  },
  valueDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Steps
  stepCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  stepTitles: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: fontFamilies.heading,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textHeading,
  },
  stepSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  stepDesc: {
    ...typography.bodySmall,
    color: colors.textBody,
    lineHeight: 22,
  },
  stepPills: {
    gap: spacing.xs,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepPillText: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Three numbers
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
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
  thresholdName: {
    fontFamily: fontFamilies.heading,
    fontSize: 16,
    fontWeight: '700',
  },
  thresholdDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 20,
  },

  // Founder
  founderCard: {
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  founderName: {
    fontFamily: fontFamilies.heading,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textHeading,
  },
  founderBio: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  founderStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  founderStat: {
    alignItems: 'center',
  },
  founderStatValue: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  founderStatLabel: {
    fontFamily: fontFamilies.body,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },

  // Final CTA
  finalCta: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing['2xl'],
    alignItems: 'center',
  },
  finalTitle: {
    fontFamily: fontFamilies.heading,
    fontSize: 24,
    fontWeight: '700',
    color: colors.textHeading,
    textAlign: 'center',
    lineHeight: 32,
  },
  finalSub: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 22,
    maxWidth: 320,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.md,
    gap: 4,
  },
  footerBrand: {
    fontFamily: fontFamilies.heading,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  footerCopy: {
    fontFamily: fontFamilies.body,
    fontSize: 11,
    color: colors.textMuted,
  },
});
