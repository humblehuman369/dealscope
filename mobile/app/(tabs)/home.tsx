import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Path } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Toolkit features matching new web design
const toolkitFeatures = [
  {
    icon: 'bar-chart-outline' as const,
    title: 'StrategyIQ',
    description: 'Run Flip, BRRRR, Wholesale, and Long-Term Rental models simultaneously.',
    color: '#38bdf8',
    bgColor: 'rgba(56,189,248,0.10)',
  },
  {
    icon: 'checkmark-circle-outline' as const,
    title: 'VerdictIQ',
    description: 'Input your "Buy Box" criteria. The system flags properties as PASS, MARGINAL, or BUY.',
    color: '#34d399',
    bgColor: 'rgba(52,211,153,0.10)',
  },
  {
    icon: 'camera-outline' as const,
    title: 'ScanIQ',
    description: 'Snap a photo of any property or For Sale sign to pull data instantly.',
    color: '#a78bfa',
    bgColor: 'rgba(167,139,250,0.10)',
  },
  {
    icon: 'locate-outline' as const,
    title: 'PriceIQ',
    description: 'Three numbers that define your deal: Breakeven, Target, and Wholesale — in 60 seconds.',
    color: '#38bdf8',
    bgColor: 'rgba(56,189,248,0.10)',
  },
  {
    icon: 'document-text-outline' as const,
    title: 'ReportIQ',
    description: 'Generate lender-ready PDF reports. Share with partners, lenders, or your team.',
    color: '#fbbf24',
    bgColor: 'rgba(251,191,36,0.10)',
  },
  {
    icon: 'folder-outline' as const,
    title: 'PipelineIQ',
    description: 'Save deals, track offers, and compare opportunities side-by-side.',
    color: '#38bdf8',
    bgColor: 'rgba(56,189,248,0.10)',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleAnalyze = () => {
    if (!searchAddress.trim()) return;
    setIsSearching(true);
    router.push(`/analyzing/${encodeURIComponent(searchAddress.trim())}` as any);
  };

  const handleScanPress = () => {
    router.push('/(tabs)/scan');
  };

  const handleEnterAddress = () => {
    setShowSearchBar(true);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleStartAnalysis = () => {
    setShowSearchBar(true);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Colors from new design
  const colors = {
    black: '#000000',
    surface: '#0C1220',
    panel: '#101828',
    panelHover: '#152238',
    white: '#F1F5F9',
    text: '#CBD5E1',
    textDim: '#94A3B8',
    textFaint: '#64748B',
    blue: '#38bdf8',
    blueDeep: '#0EA5E9',
    blueDim: 'rgba(56,189,248,0.10)',
    cyan: '#38bdf8',
    teal: '#2dd4bf',
    gold: '#fbbf24',
    goldDim: 'rgba(251,191,36,0.10)',
    green: '#34d399',
    greenDim: 'rgba(52,211,153,0.10)',
    purple: '#a78bfa',
    purpleDim: 'rgba(167,139,250,0.10)',
    border: 'rgba(255,255,255,0.07)',
    borderLight: 'rgba(255,255,255,0.12)',
  };

  // Light mode overrides
  const c = isDark ? colors : {
    ...colors,
    black: '#f8fafc',
    surface: '#ffffff',
    panel: '#f1f5f9',
    panelHover: '#e2e8f0',
    white: '#0f172a',
    text: '#475569',
    textDim: '#64748b',
    textFaint: '#94a3b8',
    border: 'rgba(0,0,0,0.08)',
    borderLight: 'rgba(0,0,0,0.12)',
  };

  return (
    <View style={[styles.container, { backgroundColor: c.black, paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* NAV HEADER */}
          <View style={[styles.header, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)', borderBottomColor: c.border }]}>
            <Text style={[styles.logoText, { color: c.white }]}>
              Invest<Text style={{ color: colors.blue }}>IQ</Text>
            </Text>
            <View style={styles.headerRight}>
              {isAuthenticated && user ? (
                <TouchableOpacity
                  style={[styles.headerBtn, { backgroundColor: colors.blue }]}
                  onPress={() => router.push('/(tabs)/dashboard')}
                >
                  <Text style={styles.headerBtnText}>Search</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.loginBtn}
                  onPress={() => router.push('/auth/login')}
                >
                  <Text style={[styles.loginBtnText, { color: c.text }]}>Login/Register</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.themeToggle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                onPress={toggleTheme}
              >
                <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* HERO SECTION */}
          <View style={[styles.heroSection, { backgroundColor: c.black }]}>
            {/* Badge */}
            <View style={[styles.heroBadge, { backgroundColor: c.panel, borderColor: c.border }]}>
              <View style={styles.badgeDot} />
              <Text style={[styles.heroBadgeText, { color: colors.green }]}>Platform 1.0 Live</Text>
            </View>

            <Text style={[styles.heroTitle, { color: c.white }]}>
              Don't Just Analyze.
            </Text>
            <Text style={styles.heroTitleGrad}>
              Engineer Your Deal.
            </Text>

            <Text style={[styles.heroDesc, { color: c.text }]}>
              The first platform that combines automated speed with{' '}
              <Text style={{ fontWeight: '600', color: c.white }}>appraisal autonomy</Text>. Select your own comps. Weight your assumptions. Manage your pipeline.
            </Text>

            {/* Action Cards */}
            <View style={styles.heroActions}>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: c.panel, borderColor: c.border }]}
                onPress={handleEnterAddress}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.blueDim }]}>
                  <Ionicons name="search" size={18} color={colors.blue} />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={[styles.actionLabel, { color: c.white }]}>Enter Address</Text>
                  <Text style={[styles.actionSub, { color: c.textDim }]}>Search MLS Nationwide</Text>
                </View>
                <Text style={[styles.actionArrow, { color: c.textFaint }]}>→</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: c.panel, borderColor: c.border }]}
                onPress={handleScanPress}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.blueDim }]}>
                  <Ionicons name="camera" size={18} color={colors.blue} />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={[styles.actionLabel, { color: c.white }]}>Scan Property</Text>
                  <Text style={[styles.actionSub, { color: c.textDim }]}>Snap a Photo</Text>
                </View>
                <Text style={[styles.actionArrow, { color: c.textFaint }]}>→</Text>
              </TouchableOpacity>
            </View>

            {/* Ticker */}
            <View style={[styles.heroTicker, { borderTopColor: c.border }]}>
              <Text style={[styles.heroTickerStrong, { color: c.text }]}>Institutional Data Intelligence</Text>
              <Text style={[styles.heroTickerSub, { color: c.textDim }]}>Analyze 50 deals in the time it takes to do 1.</Text>
            </View>
          </View>

          {/* Address Search (when visible) */}
          {showSearchBar && (
            <View style={[styles.searchSection, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={[styles.searchInputContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderColor: c.border }]}>
                <Ionicons name="location" size={20} color={colors.blue} />
                <TextInput
                  style={[styles.searchInput, { color: c.white }]}
                  placeholder="Enter property address..."
                  placeholderTextColor={c.textFaint}
                  value={searchAddress}
                  onChangeText={setSearchAddress}
                  onSubmitEditing={handleAnalyze}
                  returnKeyType="search"
                  autoFocus
                />
              </View>
              <TouchableOpacity
                style={[styles.analyzeButton, { backgroundColor: colors.blue }, !searchAddress.trim() && styles.analyzeButtonDisabled]}
                onPress={handleAnalyze}
                disabled={!searchAddress.trim() || isSearching}
              >
                {isSearching ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="analytics" size={18} color="#fff" />
                    <Text style={styles.analyzeButtonText}>Analyze Property</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* VERDICT IQ CARD */}
          <View style={[styles.verdictSection, { backgroundColor: c.black }]}>
            <View style={[styles.verdictCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.verdictQuestion, { color: c.white }]}>
                Is this worth your time as an{'\n'}
                <Text style={{ color: colors.blue, fontStyle: 'normal' }}>investment?</Text>
              </Text>

              <View style={{ height: 16 }} />

              {/* Score Ring */}
              <View style={styles.verdictScoreRing}>
                <Svg width={130} height={130} viewBox="0 0 140 140">
                  <Circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
                  <Circle
                    cx="70" cy="70" r="60" fill="none"
                    stroke="#fbbf24"
                    strokeWidth={10}
                    strokeLinecap="round"
                    strokeDasharray="377"
                    strokeDashoffset="177"
                    rotation={-90}
                    origin="70, 70"
                  />
                </Svg>
                <View style={styles.verdictScoreOverlay}>
                  <Text style={styles.verdictScoreNum}>53</Text>
                  <Text style={[styles.verdictScoreDen, { color: c.textDim }]}>/ 100</Text>
                </View>
              </View>

              {/* Badge */}
              <View style={[styles.verdictBadge, { backgroundColor: colors.goldDim, borderColor: 'rgba(245,158,11,0.25)' }]}>
                <Ionicons name="warning" size={14} color={colors.gold} />
                <Text style={[styles.verdictBadgeText, { color: colors.gold }]}>Marginal Deal</Text>
              </View>

              <Text style={[styles.verdictDesc, { color: c.text }]}>
                This property <Text style={{ fontWeight: '600', color: c.white }}>could work as an investment</Text> — but only at a significant discount. The income potential is there, but the numbers don't add up at the asking price.
              </Text>
            </View>
          </View>

          {/* FOUNDER BAR */}
          <View style={[styles.founderBar, { backgroundColor: c.surface, borderTopColor: c.border, borderBottomColor: c.border }]}>
            <View style={[styles.founderInfo, { borderBottomColor: c.border }]}>
              <Text style={[styles.founderMeta, { color: c.textDim }]}>Architecture By</Text>
              <Text style={[styles.founderName, { color: c.white }]}>Brad Geisen</Text>
              <Text style={[styles.founderRole, { color: c.textDim }]}>Founder, Foreclosure.com</Text>
            </View>
            <Text style={[styles.founderQuoteText, { color: c.text }]}>
              "I built the infrastructure behind <Text style={{ fontWeight: '600', color: c.white, fontStyle: 'normal' }}>HomePath.com</Text> (Fannie Mae) and <Text style={{ fontWeight: '600', color: c.white, fontStyle: 'normal' }}>HomeSteps.com</Text> (Freddie Mac). InvestIQ isn't a calculator; it's 35 years of institutional intelligence, now in your hands."
            </Text>
          </View>

          {/* VALUATION CONTROLS */}
          <View style={[styles.valPanel, { backgroundColor: c.panel, borderColor: c.border }]}>
            <View style={[styles.valHeader, { borderBottomColor: c.border }]}>
              <Text style={[styles.valHeaderTitle, { color: c.white }]}>Valuation Controls</Text>
              <Text style={[styles.valHeaderBadge, { color: colors.blue }]}>Edit Mode: On</Text>
            </View>
            <View style={styles.valBody}>
              {/* Condition Slider */}
              <View style={styles.sliderRow}>
                <View style={styles.sliderTop}>
                  <Text style={[styles.sliderLabel, { color: c.text }]}>Property Condition</Text>
                  <View style={[styles.sliderBadge, { backgroundColor: colors.goldDim }]}>
                    <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '600' }}>Needs Rehab (-$85k)</Text>
                  </View>
                </View>
                <View style={[styles.sliderTrack, { backgroundColor: c.border }]}>
                  <LinearGradient colors={[colors.gold, '#fbbf24']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.sliderFill, { width: '42%' }]} />
                  <View style={[styles.sliderThumb, { left: '39%', borderColor: c.black }]} />
                </View>
                <View style={styles.sliderScale}>
                  <Text style={[styles.sliderScaleText, { color: c.textDim }]}>Distressed</Text>
                  <Text style={[styles.sliderScaleText, { color: c.textDim }]}>Average</Text>
                  <Text style={[styles.sliderScaleText, { color: c.textDim }]}>Turnkey</Text>
                </View>
              </View>
              {/* Location Slider */}
              <View style={styles.sliderRow}>
                <View style={styles.sliderTop}>
                  <Text style={[styles.sliderLabel, { color: c.text }]}>Location Premium</Text>
                  <View style={[styles.sliderBadge, { backgroundColor: colors.goldDim }]}>
                    <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '600' }}>High Demand (+5%)</Text>
                  </View>
                </View>
                <View style={[styles.sliderTrack, { backgroundColor: c.border }]}>
                  <LinearGradient colors={[colors.gold, '#fbbf24']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.sliderFill, { width: '58%' }]} />
                  <View style={[styles.sliderThumb, { left: '55%', borderColor: c.black }]} />
                </View>
                <View style={styles.sliderScale}>
                  <Text style={[styles.sliderScaleText, { color: c.textDim }]}>Poor</Text>
                  <Text style={[styles.sliderScaleText, { color: c.textDim }]}>Standard</Text>
                  <Text style={[styles.sliderScaleText, { color: c.textDim }]}>Premium</Text>
                </View>
              </View>
              {/* Result */}
              <View style={[styles.valResult, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)', borderColor: c.border }]}>
                <View>
                  <Text style={[styles.valResultLabel, { color: c.textDim }]}>Adjusted Value</Text>
                  <Text style={[styles.valResultValue, { color: c.white }]}>$766,733</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.valResultLabel, { color: c.textDim }]}>Impact</Text>
                  <Text style={styles.valResultImpact}>+ $12,400</Text>
                </View>
              </View>
            </View>
          </View>

          {/* BLACK BOX + PIPELINE SECTION */}
          <View style={[styles.section, { backgroundColor: c.black }]}>
            <Text style={[styles.bbLabel, { color: colors.blue }]}>01 — Appraisal Autonomy</Text>
            <Text style={[styles.bbTitle, { color: c.white }]}>The End of the{'\n'}"Black Box" Estimate.</Text>
            <Text style={[styles.bbDesc, { color: c.text }]}>
              Traditional AVMs give you a number but hide the math. <Text style={{ fontWeight: '600', color: c.white }}>PriceCheckerIQ</Text> is transparent. The AI gathers the data, but you act as the Appraiser.
            </Text>

            {/* Features */}
            <View style={styles.bbFeature}>
              <View style={[styles.bbFeatureIcon, { backgroundColor: c.panel, borderColor: c.border }]}>
                <Ionicons name="grid-outline" size={18} color={colors.blue} />
              </View>
              <View style={styles.bbFeatureText}>
                <Text style={[styles.bbFeatureTitle, { color: c.white }]}>Curate Your Comps</Text>
                <Text style={[styles.bbFeatureDesc, { color: c.text }]}>Don't like a comp? Uncheck it. See the valuation update instantly.</Text>
              </View>
            </View>
            <View style={styles.bbFeature}>
              <View style={[styles.bbFeatureIcon, { backgroundColor: c.panel, borderColor: c.border }]}>
                <Ionicons name="options-outline" size={18} color={colors.blue} />
              </View>
              <View style={styles.bbFeatureText}>
                <Text style={[styles.bbFeatureTitle, { color: c.white }]}>Weighted Adjustments</Text>
                <Text style={[styles.bbFeatureDesc, { color: c.text }]}>Apply appraiser-style adjustments for pools, renovations, and square footage.</Text>
              </View>
            </View>

            {/* Pipeline Panel */}
            <View style={[styles.pipelinePanel, { backgroundColor: c.panel, borderColor: c.border }]}>
              <View style={[styles.pipelineHeader, { borderBottomColor: c.border }]}>
                <Text style={[styles.pipelineTitle, { color: c.white }]}>Deal Pipeline</Text>
                <View style={[styles.pipelineBadge, { backgroundColor: colors.greenDim, borderColor: 'rgba(52,211,153,0.2)' }]}>
                  <Text style={{ color: colors.green, fontSize: 11, fontWeight: '700' }}>4 Active Offers</Text>
                </View>
              </View>
              <View style={styles.pipelineBody}>
                <Text style={[styles.pipelineColLabel, { color: c.textDim }]}>Underwriting <Text style={[styles.pipelineCnt, { color: c.textDim }]}>2</Text></Text>
                <View style={[styles.pCard, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.03)', borderColor: c.border }]}>
                  <Text style={[styles.pCardTitle, { color: c.white }]}>12 Oak Street</Text>
                  <View style={styles.pCardMeta}>
                    <View style={[styles.pTag, { backgroundColor: colors.blueDim }]}>
                      <Text style={{ color: colors.blue, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Flip</Text>
                    </View>
                    <Text style={[styles.pRoi, { color: c.textDim }]}>ROI: 18%</Text>
                  </View>
                </View>
                <View style={[styles.pCard, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.03)', borderColor: c.border }]}>
                  <Text style={[styles.pCardTitle, { color: c.white }]}>550 Main Ave</Text>
                  <View style={styles.pCardMeta}>
                    <View style={[styles.pTag, { backgroundColor: colors.purpleDim }]}>
                      <Text style={{ color: colors.purple, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>BRRRR</Text>
                    </View>
                    <Text style={{ color: colors.blue, fontSize: 11, fontWeight: '600' }}>Analysis Req</Text>
                  </View>
                </View>

                <Text style={[styles.pipelineColLabel, { color: colors.green, marginTop: 16 }]}>Offer Sent</Text>
                <View style={[styles.pCard, { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.03)', borderColor: 'rgba(52,211,153,0.2)' }]}>
                  <Text style={[styles.pCardTitle, { color: c.white }]}>953 Banyan Dr</Text>
                  <Text style={[styles.pOffer, { color: c.text }]}>$536k Offer</Text>
                  <View style={[styles.pCardMeta, { marginTop: 6 }]}>
                    <View />
                    <Text style={{ color: colors.gold, fontSize: 11, fontWeight: '600' }}>Pending</Text>
                  </View>
                  <Text style={[styles.pNote, { color: c.textFaint }]}>Counter-offer expected today</Text>
                </View>
              </View>
            </View>
          </View>

          {/* INVESTMENT OS SECTION */}
          <View style={[styles.section, { backgroundColor: isDark ? c.surface : '#f8fafc', borderTopColor: c.border, borderTopWidth: 1, borderBottomColor: c.border, borderBottomWidth: 1 }]}>
            <Text style={[styles.bbLabel, { color: colors.blue }]}>02 — Workflow OS</Text>
            <Text style={[styles.bbTitle, { color: c.white }]}>Your Investment{'\n'}Operating System.</Text>
            <Text style={[styles.bbDesc, { color: c.text }]}>
              Stop managing millions of dollars in spreadsheets and text messages. <Text style={{ fontWeight: '600', color: c.white }}>DealVaultIQ</Text> centralizes your entire workflow from lead to close.
            </Text>

            <View style={styles.osBullet}>
              <View style={[styles.osDot, { backgroundColor: colors.blue }]} />
              <Text style={[styles.osBulletText, { color: c.text }]}>
                <Text style={{ fontWeight: '700', color: c.white }}>DealVaultIQ:</Text> Saves every photo, comp, and underwriting assumption forever.
              </Text>
            </View>
            <View style={styles.osBullet}>
              <View style={[styles.osDot, { backgroundColor: colors.green }]} />
              <Text style={[styles.osBulletText, { color: c.text }]}>
                <Text style={{ fontWeight: '700', color: c.white }}>Side-by-Side:</Text> Compare Rental Cashflow vs. Flip Profit instantly for the same address.
              </Text>
            </View>
            <View style={styles.osBullet}>
              <View style={[styles.osDot, { backgroundColor: colors.gold }]} />
              <Text style={[styles.osBulletText, { color: c.text }]}>
                <Text style={{ fontWeight: '700', color: c.white }}>Export:</Text> Generate PDF lender packages in one click.
              </Text>
            </View>
          </View>

          {/* TOOLKIT */}
          <View style={[styles.section, { backgroundColor: c.black }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: c.white }]}>The Complete Toolkit</Text>
              <Text style={[styles.sectionDesc, { color: c.text }]}>Everything you need to underwrite with confidence.</Text>
            </View>
            {toolkitFeatures.map((feature, idx) => (
              <View key={idx} style={[styles.toolkitCard, { backgroundColor: c.panel, borderColor: c.border }]}>
                <View style={[styles.tkIcon, { backgroundColor: feature.bgColor }]}>
                  <Ionicons name={feature.icon} size={20} color={feature.color} />
                </View>
                <View style={styles.tkContent}>
                  <Text style={[styles.tkTitle, { color: c.white }]}>
                    {feature.title.replace('IQ', '')}
                    <Text style={{ color: colors.blue }}>IQ</Text>
                  </Text>
                  <Text style={[styles.tkText, { color: c.text }]}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* CTA */}
          <View style={[styles.ctaSection, { backgroundColor: c.black, borderTopColor: c.border }]}>
            <Text style={[styles.ctaTitle, { color: c.white }]}>
              Stop wondering. Start knowing.
            </Text>
            <Text style={[styles.ctaDesc, { color: c.text }]}>
              Join thousands of serious investors using InvestIQ to uncover value others miss.
            </Text>
            <TouchableOpacity style={[styles.ctaButton, { backgroundColor: colors.blue }]} onPress={handleStartAnalysis}>
              <Text style={styles.ctaButtonText}>Start Free Analysis</Text>
            </TouchableOpacity>
          </View>

          {/* FOOTER */}
          <View style={[styles.footer, { backgroundColor: isDark ? '#000000' : '#0f172a', borderTopColor: c.border }]}>
            <Text style={styles.footerLogo}>
              Invest<Text style={{ color: colors.blue }}>IQ</Text>
            </Text>
            <Text style={styles.footerTagline}>
              Professional Real Estate Intelligence for Everyone.
            </Text>
            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => router.push('/privacy' as any)}>
                <Text style={styles.footerLink}>Privacy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/terms' as any)}>
                <Text style={styles.footerLink}>Terms</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:support@investiq.com')}>
                <Text style={styles.footerLink}>Contact</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.footerCopyright}>
              © 2026 InvestIQ. All rights reserved.{'\n'}Professional use only. Not a lender.
            </Text>
          </View>

          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 7,
  },
  headerBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  loginBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  loginBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  themeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    marginBottom: 20,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34d399',
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -1.2,
  },
  heroTitleGrad: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -1.2,
    color: '#2dd4bf',
    marginBottom: 16,
  },
  heroDesc: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 24,
  },
  heroActions: {
    gap: 10,
    marginBottom: 24,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextWrap: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionSub: {
    fontSize: 12,
    marginTop: 1,
  },
  actionArrow: {
    fontSize: 16,
  },
  heroTicker: {
    paddingTop: 16,
    borderTopWidth: 1,
  },
  heroTickerStrong: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTickerSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Search
  searchSection: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  analyzeButtonDisabled: {
    opacity: 0.4,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Verdict Card
  verdictSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  verdictCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  verdictQuestion: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 26,
  },
  verdictScoreRing: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  verdictScoreOverlay: {
    position: 'absolute',
    alignItems: 'center',
  },
  verdictScoreNum: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fbbf24',
    marginTop: -4,
  },
  verdictScoreDen: {
    fontSize: 13,
    marginTop: -2,
  },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    marginBottom: 16,
  },
  verdictBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  verdictDesc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 280,
  },

  // Founder Bar
  founderBar: {
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  founderInfo: {
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  founderMeta: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  founderName: {
    fontSize: 18,
    fontWeight: '700',
  },
  founderRole: {
    fontSize: 12,
    marginTop: 2,
  },
  founderQuoteText: {
    fontSize: 15,
    lineHeight: 24,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Valuation Controls
  valPanel: {
    marginHorizontal: 20,
    marginVertical: 24,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  valHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  valHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valHeaderBadge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  valBody: {
    padding: 16,
  },
  sliderRow: {
    marginBottom: 20,
  },
  sliderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderLabel: {
    fontSize: 13,
  },
  sliderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sliderTrack: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
  },
  sliderFill: {
    height: 6,
    borderRadius: 3,
  },
  sliderThumb: {
    width: 18,
    height: 18,
    backgroundColor: '#F1F5F9',
    borderRadius: 9,
    borderWidth: 3,
    position: 'absolute',
    top: -6,
  },
  sliderScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderScaleText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valResult: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  valResultLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  valResultValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  valResultImpact: {
    fontSize: 14,
    fontWeight: '700',
    color: '#34d399',
  },

  // Section shared
  section: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Black Box features
  bbLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  bbTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 16,
  },
  bbDesc: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  bbFeature: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  bbFeatureIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bbFeatureText: {
    flex: 1,
  },
  bbFeatureTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  bbFeatureDesc: {
    fontSize: 13,
    lineHeight: 20,
  },

  // Pipeline
  pipelinePanel: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 24,
  },
  pipelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  pipelineTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  pipelineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
  },
  pipelineBody: {
    padding: 14,
  },
  pipelineColLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  pipelineCnt: {
    fontSize: 11,
  },
  pCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  pCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  pCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pRoi: {
    fontSize: 11,
    fontWeight: '600',
  },
  pOffer: {
    fontSize: 11,
    marginTop: 2,
  },
  pNote: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // OS Bullets
  osBullet: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  osDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 7,
  },
  osBulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },

  // Toolkit
  toolkitCard: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    gap: 14,
    alignItems: 'flex-start',
  },
  tkIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tkContent: {
    flex: 1,
  },
  tkTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  tkText: {
    fontSize: 12,
    lineHeight: 19,
  },

  // CTA
  ctaSection: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 12,
  },
  ctaDesc: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  ctaButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Footer
  footer: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  footerLogo: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 8,
  },
  footerTagline: {
    fontSize: 14,
    color: '#CBD5E1',
    marginBottom: 24,
    textAlign: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  footerLink: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  footerCopyright: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
