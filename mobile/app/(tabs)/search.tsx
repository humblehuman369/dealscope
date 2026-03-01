import { useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/hooks/useSession';
import { useRecentSearches } from '@/hooks/useSearchHistory';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
  textStyles,
  shadows,
} from '@/constants/tokens';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Shared components ──

const Divider = () => (
  <View style={st.divider} />
);

const Eyebrow = ({ children }: { children: string }) => (
  <Text style={st.eyebrow}>{children}</Text>
);

const SectionHeading = ({ children }: { children: string }) => (
  <Text style={st.sectionHeading}>{children}</Text>
);

const SectionBody = ({ children }: { children: string }) => (
  <Text style={st.sectionBody}>{children}</Text>
);

const CheckIcon = () => (
  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(14,165,233,0.15)', alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name="checkmark" size={10} color={colors.accent} />
  </View>
);

const TrustCheck = ({ text }: { text: string }) => (
  <View style={st.trustCheck}>
    <CheckIcon />
    <Text style={st.trustCheckText}>{text}</Text>
  </View>
);

// ── Data ──

const PROOF_STATS = [
  { num: '35+', label: 'Years in RE data\n& technology' },
  { num: '47s', label: 'Average time\nto analyze' },
  { num: '6', label: 'Strategies scored\nsimultaneously' },
  { num: '4', label: 'Data sources cross-\nreferenced' },
];

const STEPS = [
  {
    step: '1',
    title: 'Paste an Address',
    desc: 'Any U.S. property address. No account needed for your first scan.',
    example: '📍 1451 Sw 10th St, Boca Raton, FL',
  },
  {
    step: '2',
    title: 'We Analyze the Market',
    desc: 'Four valuation sources cross-referenced. Rents, expenses, and comps modeled.',
    rows: [
      { label: 'IQ Estimate', value: '$869,326', accent: true },
      { label: 'Zillow', value: '$802,600' },
      { label: 'RentCast', value: '$1,016,000' },
      { label: 'Redfin', value: '$789,378' },
    ],
  },
  {
    step: '3',
    title: 'Get Your Investment Screen',
    desc: 'A Verdict Score that tells you if this property is worth pursuing.',
    score: '53',
    verdict: 'Marginal Opportunity',
    targetBuy: '$669,608',
  },
];

const THREE_NUMBERS = [
  { icon: '$', iconBg: 'rgba(52,211,153,0.1)', iconColor: '#34D399', title: 'Income Value', desc: 'The maximum price where rental income covers every cost. Your breakeven ceiling.', example: '$704,851' },
  { icon: '⎯', iconBg: 'rgba(14,165,233,0.1)', iconColor: '#0EA5E9', title: 'Target Buy', desc: 'The price where the deal generates positive cash flow. Your offer anchor.', example: '$669,608' },
  { icon: '△', iconBg: 'rgba(251,191,36,0.1)', iconColor: '#FBBF24', title: 'Deal Gap', desc: 'The gap between your Target Buy and market price. Room to negotiate — or walk.', example: '−16.6%' },
];

const STRATEGIES = [
  { score: '100', label: 'BRRRR', level: 'high' as const },
  { score: '100', label: 'House Hack', level: 'high' as const },
  { score: '100', label: 'Wholesale', level: 'high' as const },
  { score: '74', label: 'Fix & Flip', level: 'mid' as const },
  { score: '57', label: 'Long-Term Rental', level: 'low' as const },
  { score: '45', label: 'Short-Term Rental', level: 'low' as const },
];

const FOUNDER_CREDS = [
  { num: '35+', label: 'years in RE data' },
  { num: '80+', label: 'companies served' },
  { num: '500+', label: 'RE projects' },
  { num: '30+', label: 'yr GSE partnerships' },
];

const LEVEL_COLORS = {
  high: { bg: 'rgba(52,211,153,0.12)', color: '#34D399' },
  mid: { bg: 'rgba(251,191,36,0.12)', color: '#FBBF24' },
  low: { bg: 'rgba(249,112,102,0.12)', color: '#F97066' },
};

// ── Main Screen ──

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { data: recentSearches } = useRecentSearches(5);

  const greeting = user?.full_name
    ? `Hey, ${user.full_name.split(' ')[0]}`
    : 'Find your next deal';

  function openSearch() {
    router.push('/search-modal');
  }

  function openScanner() {
    router.push('/scanner');
  }

  function analyzeRecent(address: string) {
    router.push(`/analyzing?address=${encodeURIComponent(address)}`);
  }

  return (
    <ScrollView
      style={st.scroll}
      contentContainerStyle={[st.content, { paddingTop: insets.top + spacing.md }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={st.header}>
        <View>
          <Text style={st.logo}>
            DealGap<Text style={st.logoAccent}>IQ</Text>
          </Text>
          <Text style={st.greeting}>{greeting}</Text>
        </View>
        <Pressable
          style={st.avatarCircle}
          onPress={() => router.push('/(tabs)/profile')}
          accessibilityLabel="Profile"
        >
          <Ionicons name="person" size={20} color={colors.secondary} />
        </Pressable>
      </View>

      {/* ── Hero ── */}
      <View style={st.hero}>
        <Text style={st.heroTitle}>
          Is That Property{'\n'}a <Text style={st.heroAccent}>Good Deal</Text>?
        </Text>
        <Text
          style={st.heroSubheadline}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
        >
          <Text style={{ color: colors.accent }}>Know if it's Worth</Text> Your Time{'\n'}
          <Text style={{ color: colors.accent }}>Before You Spend Hours on It.</Text>
        </Text>
        <Text style={st.heroSubtitle}>
          Paste any address. In 60 seconds, get a buy price, a deal score,{'\n'}that tell you whether to pursue or pass.
        </Text>
      </View>

      {/* ── Search Bar ── */}
      <Pressable style={st.searchBar} onPress={openSearch}>
        <Ionicons name="search" size={20} color={colors.secondary} style={st.searchIcon} />
        <Text style={st.searchPlaceholder}>Enter any property address...</Text>
      </Pressable>

      <Pressable style={st.analyzeBtn} onPress={openSearch}>
        <Text style={st.analyzeBtnText}>Analyze a Property Free</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.black} />
      </Pressable>

      {/* ── Trust Checks ── */}
      <View style={st.trustRow}>
        <TrustCheck text="No credit card" />
        <TrustCheck text="5 free analyses / month" />
        <TrustCheck text="60-second results" />
      </View>

      <Divider />

      {/* ── Proof Bar ── */}
      <View style={st.proofBar}>
        {PROOF_STATS.map((stat, i) => (
          <View key={i} style={st.proofStat}>
            <Text style={st.proofNum}>{stat.num}</Text>
            <Text style={st.proofLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <Divider />

      {/* ── Quick Actions ── */}
      <View style={st.quickActions}>
        <Pressable style={st.quickAction} onPress={openScanner}>
          <View style={st.quickActionIcon}>
            <Ionicons name="camera-outline" size={22} color={colors.accent} />
          </View>
          <Text style={st.quickActionLabel}>Scan Address</Text>
        </Pressable>
        <Pressable style={st.quickAction} onPress={openSearch}>
          <View style={st.quickActionIcon}>
            <Ionicons name="search-outline" size={22} color={colors.accent} />
          </View>
          <Text style={st.quickActionLabel}>Search</Text>
        </Pressable>
        <Pressable style={st.quickAction} onPress={() => {}}>
          <View style={st.quickActionIcon}>
            <Ionicons name="trending-up-outline" size={22} color={colors.accent} />
          </View>
          <Text style={st.quickActionLabel}>Market Data</Text>
        </Pressable>
      </View>

      <Divider />

      {/* ── How It Works ── */}
      <View style={st.section}>
        <Eyebrow>How It Works</Eyebrow>
        <SectionHeading>Three Steps. One Decision.</SectionHeading>
        <SectionBody>Paste an address and let the data do the work.</SectionBody>

        {STEPS.map((step, i) => (
          <View key={i} style={st.stepCard}>
            <View style={st.stepBadge}>
              <Text style={st.stepBadgeText}>{step.step}</Text>
            </View>
            <Text style={st.stepTitle}>{step.title}</Text>
            <Text style={st.stepDesc}>{step.desc}</Text>

            {step.example && (
              <View style={st.stepExample}>
                <Text style={st.stepExampleText}>{step.example}</Text>
              </View>
            )}

            {step.rows && (
              <View style={st.stepDataBox}>
                {step.rows.map((row, j) => (
                  <View key={j} style={[st.stepDataRow, j < step.rows!.length - 1 && st.stepDataRowBorder]}>
                    <Text style={st.stepDataLabel}>{row.label}</Text>
                    <Text style={[st.stepDataValue, row.accent && { color: colors.accent }]}>{row.value}</Text>
                  </View>
                ))}
              </View>
            )}

            {step.score && (
              <View style={st.stepScoreBox}>
                <Text style={st.stepScoreNum}>{step.score}<Text style={st.stepScoreMax}>/100</Text></Text>
                <Text style={st.stepVerdict}>{step.verdict}</Text>
                <Text style={st.stepTargetBuy}>Target Buy: <Text style={{ color: colors.accent, fontFamily: fontFamily.bold }}>{step.targetBuy}</Text></Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <Divider />

      {/* ── Three Numbers ── */}
      <View style={st.section}>
        <Eyebrow>Your Three Price Thresholds</Eyebrow>
        <SectionHeading>Every Investment Comes Down to Three Numbers</SectionHeading>
        <SectionBody>What's the most you can pay and break even? Where does cash flow start? DealGapIQ calculates all three.</SectionBody>

        {THREE_NUMBERS.map((card, i) => (
          <View key={i} style={st.numberCard}>
            <View style={[st.numberIcon, { backgroundColor: card.iconBg }]}>
              <Text style={[st.numberIconText, { color: card.iconColor }]}>{card.icon}</Text>
            </View>
            <Text style={st.numberTitle}>{card.title}</Text>
            <Text style={st.numberDesc}>{card.desc}</Text>
            <View style={st.numberExample}>
              <Text style={st.numberExLabel}>Example</Text>
              <Text style={[st.numberExValue, { color: card.iconColor }]}>{card.example}</Text>
            </View>
          </View>
        ))}
      </View>

      <Divider />

      {/* ── Six Strategies ── */}
      <View style={st.section}>
        <Eyebrow>One Property, Six Strategies</Eyebrow>
        <SectionHeading>Every Angle, Analyzed Simultaneously</SectionHeading>
        <SectionBody>Other tools analyze one strategy at a time. DealGapIQ models all six simultaneously — so you see which approach works.</SectionBody>

        <View style={st.strategyPills}>
          {STRATEGIES.map((pill, i) => {
            const c = LEVEL_COLORS[pill.level];
            return (
              <View key={i} style={st.strategyPill}>
                <View style={[st.strategyScore, { backgroundColor: c.bg }]}>
                  <Text style={[st.strategyScoreText, { color: c.color }]}>{pill.score}</Text>
                </View>
                <Text style={st.strategyLabel}>{pill.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <Divider />

      {/* ── Cost Comparison ── */}
      <View style={st.costSection}>
        <View style={st.costItem}>
          <Text style={st.costBad}>$21,165</Text>
          <Text style={st.costLabel}>Average cost of a bad{'\n'}investment decision</Text>
        </View>
        <View style={st.costVs}>
          <Text style={st.costVsText}>VS</Text>
        </View>
        <View style={st.costItem}>
          <Text style={st.costGood}>$273<Text style={{ fontSize: 18 }}>/yr</Text></Text>
          <Text style={st.costLabel}>Cost of DealGapIQ Pro{'\n'}Pays for itself once.</Text>
        </View>
      </View>

      <Divider />

      {/* ── Founder ── */}
      <View style={st.section}>
        <Eyebrow>Built by an Insider</Eyebrow>
        <SectionHeading>35 Years of Real Estate Data, Distilled Into One Tool</SectionHeading>

        <View style={st.founderCard}>
          <View style={st.founderAvatar}>
            <Text style={st.founderAvatarText}>BG</Text>
          </View>
          <Text style={st.founderName}>Brad Geisen</Text>
          <Text style={st.founderTitle}>Founder & CEO, DealGapIQ</Text>
          <Text style={st.founderQuote}>
            "I spent 35 years building real estate data systems — HomePath.com for Fannie Mae, HomeSteps.com for Freddie Mac, and Foreclosure.com which I founded and operated for 21 years. I built DealGapIQ because investors still don't have a fast, data-backed way to know their number before making an offer."
          </Text>

          <View style={st.founderCreds}>
            {FOUNDER_CREDS.map((cred, i) => (
              <View key={i} style={st.founderCred}>
                <Text style={st.founderCredNum}>{cred.num}</Text>
                <Text style={st.founderCredLabel}>{cred.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <Divider />

      {/* ── Final CTA ── */}
      <View style={st.section}>
        <Eyebrow>Stop Guessing. Start Calculating.</Eyebrow>
        <SectionHeading>Every Property Has a Deal Gap. Find Yours.</SectionHeading>
        <SectionBody>Paste an address. See the three price thresholds, the Verdict Score, and which strategy makes it work — in under 60 seconds.</SectionBody>

        <Pressable style={st.searchBar} onPress={openSearch}>
          <Ionicons name="search" size={20} color={colors.secondary} style={st.searchIcon} />
          <Text style={st.searchPlaceholder}>Enter any property address...</Text>
        </Pressable>

        <Pressable style={st.analyzeBtn} onPress={openSearch}>
          <Text style={st.analyzeBtnText}>Analyze a Property Free</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.black} />
        </Pressable>

        <View style={st.trustRow}>
          <TrustCheck text="No credit card" />
          <TrustCheck text="5 free analyses per month" />
          <TrustCheck text="Results in 60 seconds" />
          <TrustCheck text="Every assumption editable" />
        </View>

        <Text style={st.priceNote}>
          Free to start · Pro at <Text style={{ color: colors.heading, fontFamily: fontFamily.bold }}>$29/mo</Text> (annual) for unlimited analyses
        </Text>
      </View>

      {/* ── Recent Searches ── */}
      {recentSearches && recentSearches.length > 0 && (
        <>
          <Divider />
          <View style={st.section}>
            <Text style={st.sectionTitle}>Recent Searches</Text>
            {recentSearches.map((item) => (
              <Pressable
                key={item.id}
                style={st.recentItem}
                onPress={() => analyzeRecent(item.search_query)}
              >
                <View style={st.recentIcon}>
                  <Ionicons name="time-outline" size={18} color={colors.secondary} />
                </View>
                <View style={st.recentContent}>
                  <Text style={st.recentAddress} numberOfLines={1}>{item.search_query}</Text>
                  <Text style={st.recentMeta}>
                    {[
                      item.result_summary?.bedrooms && `${item.result_summary.bedrooms}bd`,
                      item.result_summary?.bathrooms && `${item.result_summary.bathrooms}ba`,
                      timeAgo(item.searched_at),
                    ].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* ── Footer ── */}
      <View style={st.footer}>
        <Text style={st.footerLogo}>
          DealGap<Text style={{ color: colors.accent }}>IQ</Text>
        </Text>
        <Text style={st.footerCopy}>© 2026 DealGapIQ. All rights reserved.</Text>
      </View>

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

// ── Styles ──

const CARD_BORDER = 'rgba(14,165,233,0.25)';
const CARD_SHADOW_COLOR = 'rgba(14,165,233,0.08)';

const st = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.base },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing['2xl'] },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  logo: { fontFamily: fontFamily.bold, fontSize: fontSize.xl, color: colors.heading },
  logoAccent: { color: colors.accent },
  greeting: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.secondary, marginTop: 2 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },

  // Hero
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  heroTitle: { fontFamily: fontFamily.bold, fontSize: fontSize['3xl'], lineHeight: fontSize['3xl'] * 1.2, color: colors.heading, textAlign: 'center', letterSpacing: -0.5, marginBottom: spacing.md },
  heroAccent: { color: colors.accent },
  heroSubheadline: { fontFamily: fontFamily.bold, fontSize: fontSize.xl, lineHeight: fontSize.xl * 1.25, color: colors.heading, textAlign: 'center', letterSpacing: -0.3, marginBottom: spacing.md },
  heroSubtitle: { ...textStyles.body, color: colors.secondary, textAlign: 'center', maxWidth: 300 },

  // Search bar
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.base, borderWidth: 1, borderColor: colors.glowBorder, borderRadius: radius.lg, paddingHorizontal: spacing.md, minHeight: 52, ...shadows.glow },
  searchIcon: { marginRight: spacing.sm },
  searchPlaceholder: { flex: 1, fontFamily: fontFamily.regular, fontSize: fontSize.base, color: colors.muted, paddingVertical: 14 },

  // CTA button
  analyzeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.accent, borderRadius: radius.lg, paddingVertical: 14, marginTop: spacing.md },
  analyzeBtnText: { fontFamily: fontFamily.bold, fontSize: fontSize.base, color: colors.black },

  // Trust checks
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md, marginTop: spacing.lg },
  trustCheck: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustCheckText: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.secondary },

  // Divider
  divider: { height: 1, marginVertical: spacing.xl, backgroundColor: 'rgba(14,165,233,0.15)' },

  // Proof bar
  proofBar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  proofStat: { width: '48%', alignItems: 'center', marginBottom: spacing.md },
  proofNum: { fontFamily: fontFamily.bold, fontSize: fontSize['2xl'], color: colors.accent, letterSpacing: -0.5 },
  proofLabel: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.secondary, textAlign: 'center', lineHeight: fontSize.xs * 1.4, marginTop: 4 },

  // Quick actions
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  quickAction: { flex: 1, alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  quickActionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(14,165,233,0.1)', alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.xs, color: colors.body },

  // Section shared
  section: { gap: spacing.sm },
  eyebrow: { fontFamily: fontFamily.semiBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.accent, textAlign: 'center', marginBottom: spacing.xs },
  sectionHeading: { fontFamily: fontFamily.bold, fontSize: fontSize['2xl'], color: colors.heading, textAlign: 'center', letterSpacing: -0.5, lineHeight: fontSize['2xl'] * 1.15 },
  sectionBody: { fontFamily: fontFamily.regular, fontSize: fontSize.base, color: colors.secondary, textAlign: 'center', lineHeight: fontSize.base * 1.6, marginBottom: spacing.sm },

  // How it works — step cards
  stepCard: { backgroundColor: colors.base, borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 12, padding: spacing.lg, alignItems: 'center', shadowColor: CARD_SHADOW_COLOR, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 30, elevation: 4 },
  stepBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  stepBadgeText: { fontFamily: fontFamily.bold, fontSize: fontSize.base, color: colors.black },
  stepTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.lg, color: colors.heading, marginBottom: spacing.xs, textAlign: 'center' },
  stepDesc: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.muted, textAlign: 'center', lineHeight: fontSize.sm * 1.6 },
  stepExample: { marginTop: spacing.md, backgroundColor: 'rgba(14,165,233,0.05)', borderWidth: 1, borderColor: 'rgba(14,165,233,0.1)', borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, width: '100%' },
  stepExampleText: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.muted },
  stepDataBox: { marginTop: spacing.md, backgroundColor: 'rgba(14,165,233,0.03)', borderWidth: 1, borderColor: 'rgba(14,165,233,0.1)', borderRadius: 10, padding: spacing.md, width: '100%' },
  stepDataRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  stepDataRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(14,165,233,0.08)' },
  stepDataLabel: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.muted },
  stepDataValue: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: colors.heading },
  stepScoreBox: { marginTop: spacing.md, backgroundColor: 'rgba(14,165,233,0.03)', borderWidth: 1, borderColor: 'rgba(14,165,233,0.1)', borderRadius: 10, padding: spacing.md, width: '100%', alignItems: 'center' },
  stepScoreNum: { fontFamily: fontFamily.bold, fontSize: 30, color: '#FBBF24' },
  stepScoreMax: { fontSize: fontSize.sm, color: colors.muted },
  stepVerdict: { fontFamily: fontFamily.semiBold, fontSize: fontSize.xs, color: '#FBBF24', marginTop: 3 },
  stepTargetBuy: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.muted, marginTop: spacing.sm },

  // Three numbers
  numberCard: { backgroundColor: colors.base, borderWidth: 1, borderColor: CARD_BORDER, borderRadius: 12, padding: spacing.lg, shadowColor: CARD_SHADOW_COLOR, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 30, elevation: 4 },
  numberIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  numberIconText: { fontFamily: fontFamily.bold, fontSize: fontSize.lg },
  numberTitle: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, color: colors.heading, marginBottom: spacing.xs },
  numberDesc: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.muted, lineHeight: fontSize.sm * 1.6 },
  numberExample: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(14,165,233,0.1)', flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  numberExLabel: { fontFamily: fontFamily.semiBold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: colors.muted },
  numberExValue: { fontFamily: fontFamily.bold, fontSize: fontSize.xl },

  // Six strategies
  strategyPills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  strategyPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.base, borderWidth: 1, borderColor: 'rgba(14,165,233,0.15)', borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  strategyScore: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  strategyScoreText: { fontFamily: fontFamily.bold, fontSize: fontSize.xs },
  strategyLabel: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.heading },

  // Cost comparison
  costSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  costItem: { flex: 1, alignItems: 'center' },
  costBad: { fontFamily: fontFamily.bold, fontSize: fontSize['3xl'], color: '#F97066', letterSpacing: -1 },
  costGood: { fontFamily: fontFamily.bold, fontSize: fontSize['3xl'], color: colors.accent, letterSpacing: -1 },
  costLabel: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.muted, textAlign: 'center', lineHeight: fontSize.sm * 1.5, marginTop: spacing.xs },
  costVs: { width: 1, height: 56, backgroundColor: 'rgba(14,165,233,0.15)', justifyContent: 'center', alignItems: 'center' },
  costVsText: { position: 'absolute', fontFamily: fontFamily.bold, fontSize: 10, letterSpacing: 2, color: colors.muted, backgroundColor: colors.base, paddingVertical: 4, paddingHorizontal: 6, textTransform: 'uppercase' },

  // Founder
  founderCard: { backgroundColor: colors.base, borderWidth: 1, borderColor: 'rgba(14,165,233,0.3)', borderRadius: 16, padding: spacing.lg, alignItems: 'center', shadowColor: CARD_SHADOW_COLOR, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 40, elevation: 6 },
  founderAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  founderAvatarText: { fontFamily: fontFamily.bold, fontSize: fontSize.xl, color: colors.accent },
  founderName: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, color: colors.heading },
  founderTitle: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.accent, marginBottom: spacing.md },
  founderQuote: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.muted, lineHeight: fontSize.sm * 1.7, fontStyle: 'italic', textAlign: 'center', marginBottom: spacing.lg },
  founderCreds: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  founderCred: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.base, borderWidth: 1, borderColor: 'rgba(14,165,233,0.15)', borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: 7 },
  founderCredNum: { fontFamily: fontFamily.bold, fontSize: fontSize.sm, color: colors.heading },
  founderCredLabel: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.muted },

  // Price note
  priceNote: { fontFamily: fontFamily.regular, fontSize: fontSize.sm, color: colors.muted, textAlign: 'center', marginTop: spacing.md },

  // Recent searches
  sectionTitle: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md, color: colors.heading, marginBottom: spacing.xs },
  recentItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  recentIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
  recentContent: { flex: 1 },
  recentAddress: { fontFamily: fontFamily.medium, fontSize: fontSize.sm, color: colors.heading },
  recentMeta: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.muted, marginTop: 1 },

  // Footer
  footer: { alignItems: 'center', marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: 'rgba(14,165,233,0.1)' },
  footerLogo: { fontFamily: fontFamily.bold, fontSize: fontSize.lg, color: colors.heading, marginBottom: 4 },
  footerCopy: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, color: colors.muted, opacity: 0.6 },
});
