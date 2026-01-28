import { useState, useRef, useEffect } from 'react';
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
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Slider from '@react-native-community/slider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Strategy data matching web
const strategies = [
  {
    id: 'long',
    name: 'Long-Term Rental',
    tagline: 'Steady income & build equity over time',
    statValue: '8-12%',
    statLabel: 'Cash-on-Cash',
    color: '#0465f2',
  },
  {
    id: 'short',
    name: 'Short-Term Rental',
    tagline: 'Maximize income via Airbnb/VRBO',
    statValue: '15-25%',
    statLabel: 'Cash-on-Cash',
    color: '#8b5cf6',
  },
  {
    id: 'brrrr',
    name: 'BRRRR',
    tagline: 'Buy-Rehab-Rent-Refi-Repeat',
    statValue: '∞',
    statLabel: 'Scale',
    color: '#f97316',
    isScale: true,
  },
  {
    id: 'flip',
    name: 'Fix & Flip',
    tagline: 'Buy low, renovate, sell high',
    statValue: '$50K+',
    statLabel: 'Profit',
    color: '#ec4899',
  },
  {
    id: 'hack',
    name: 'House Hack',
    tagline: 'Live free by renting extra units',
    statValue: '75%',
    statLabel: 'Cost Savings',
    color: '#14b8a6',
  },
  {
    id: 'wholesale',
    name: 'Wholesale',
    tagline: 'Find deals & assign contracts',
    statValue: '$10K+',
    statLabel: 'Per Deal',
    color: '#84cc16',
  },
];

// Features data matching new web design
const features = [
  {
    icon: 'scan-outline',
    title: "Know if it's a deal in 60 seconds",
    description: 'Point your camera at any property and get instant analysis without spreadsheets.',
  },
  {
    icon: 'checkmark-circle-outline',
    title: 'Find the strategy that fits YOUR goals',
    description: 'See how every property performs across all 6 investment strategies instantly.',
  },
  {
    icon: 'home-outline',
    title: 'See what similar properties sold for',
    description: 'Access real market comps to validate your analysis and make confident offers.',
  },
  {
    icon: 'cash-outline',
    title: 'Model your exact profit before offering',
    description: 'Adjust every variable and watch returns update in real-time with DealMakerIQ.',
  },
  {
    icon: 'document-text-outline',
    title: 'Professional PDF reports',
    description: 'Generate lender-ready reports to share with partners or your investment team.',
  },
  {
    icon: 'git-compare-outline',
    title: 'Save & compare deals',
    description: 'Build a pipeline of investments and compare them side-by-side.',
  },
];

// Capability stats (replaces social proof for launch)
const capabilityStats = [
  { value: '60s', label: 'Analysis Time' },
  { value: '6', label: 'Strategies' },
  { value: '15+', label: 'Variables' },
  { value: '100%', label: 'Free to Start' },
];

// Format helpers
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyShort = (value: number) => {
  if (Math.abs(value) >= 1000) {
    return '$' + (value / 1000).toFixed(1) + 'K';
  }
  return formatCurrency(value);
};

// DealMakerIQ calculation
function calculateMetrics(buyPrice: number, downPaymentPct: number, monthlyRent: number) {
  const downPayment = buyPrice * (downPaymentPct / 100);
  const closingCosts = buyPrice * 0.03;
  const cashNeeded = downPayment + closingCosts;

  const loanAmount = buyPrice - downPayment;
  const monthlyRate = 0.07 / 12;
  const numPayments = 360;
  const mortgagePayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  const totalMonthlyExpenses = mortgagePayment +
    (buyPrice * 0.012) / 12 +
    150 +
    monthlyRent * 0.05 +
    monthlyRent * 0.05;

  const monthlyFlow = monthlyRent - totalMonthlyExpenses;
  const annualFlow = monthlyFlow * 12;
  const cocReturn = (annualFlow / cashNeeded) * 100;

  let verdict: string;
  if (cocReturn >= 8) verdict = 'Great Deal';
  else if (cocReturn >= 4) verdict = 'Good Deal';
  else if (cocReturn >= 0) verdict = 'Marginal';
  else verdict = 'Risky';

  return { cashNeeded, monthlyFlow, cocReturn, verdict };
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // DealMakerIQ state
  const [buyPrice, setBuyPrice] = useState(350000);
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [monthlyRent, setMonthlyRent] = useState(2800);
  
  const metrics = calculateMetrics(buyPrice, downPaymentPct, monthlyRent);

  const handleAnalyze = () => {
    if (!searchAddress.trim()) return;
    setIsSearching(true);
    router.push(`/analyzing/${encodeURIComponent(searchAddress.trim())}` as any);
  };

  const handleScanPress = () => {
    router.push('/(tabs)/scan');
  };

  const handleTryItNow = () => {
    setShowSearchBar(true);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Theme-aware colors
  const accentColor = isDark ? '#4dd0e1' : '#0891b2';
  const buttonGradientStart = isDark ? '#0097a7' : '#007ea7';
  const buttonGradientEnd = isDark ? '#4dd0e1' : '#0097a7';

  return (
    <View style={[
      styles.container, 
      { backgroundColor: isDark ? '#0a0a12' : '#f8fafc', paddingTop: insets.top }
    ]}>
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
          {/* Header */}
          <View style={[
            styles.header,
            { 
              backgroundColor: isDark ? 'rgba(10,10,18,0.85)' : 'rgba(255,255,255,0.9)',
              borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
            }
          ]}>
            <Text style={[styles.logoText, { color: isDark ? '#fff' : '#0f172a' }]}>
              Invest<Text style={{ color: accentColor }}>IQ</Text>
            </Text>
            
            <View style={styles.headerRight}>
              {isAuthenticated && user ? (
                <TouchableOpacity 
                  style={[styles.headerBtn, { backgroundColor: accentColor }]}
                  onPress={() => router.push('/(tabs)/dashboard')}
                >
                  <Text style={styles.headerBtnText}>Dashboard</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.headerBtn, { backgroundColor: accentColor }]}
                  onPress={() => router.push('/auth/login')}
                >
                  <Text style={styles.headerBtnText}>Sign In</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[
                  styles.themeToggle,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                ]}
                onPress={toggleTheme}
              >
                <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Section */}
          <View style={styles.heroSection}>
            {/* Eyebrow Badge */}
            <View style={[
              styles.heroEyebrow,
              { backgroundColor: isDark ? 'rgba(77,208,225,0.15)' : 'rgba(8,145,178,0.1)' }
            ]}>
              <Text style={styles.heroEyebrowIcon}>🚀</Text>
              <Text style={[styles.heroEyebrowText, { color: accentColor }]}>
                Early Access — Limited Beta
              </Text>
            </View>
            
            <Text style={[styles.heroTitle, { color: isDark ? '#fff' : '#0f172a' }]}>
              Point. Scan.
            </Text>
            <Text style={[styles.heroTitleAccent, { color: accentColor }]}>
              Invest Smarter.
            </Text>
            
            <Text style={[styles.heroSubtitle, { color: isDark ? '#9ca3af' : '#475569' }]}>
              Point your phone at any property and get professional-grade investment analysis across 6 strategies in 60 seconds. No spreadsheets. No guesswork.
            </Text>
            
            {/* Hero CTA Buttons */}
            <View style={styles.heroCta}>
              <TouchableOpacity onPress={handleTryItNow}>
                <LinearGradient
                  colors={[buttonGradientStart, buttonGradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>Scan Your First Property Free</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.ghostBtn,
                  { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }
                ]}
                onPress={handleScanPress}
              >
                <Ionicons name="play" size={16} color={isDark ? '#fff' : '#0f172a'} />
                <Text style={[styles.ghostBtnText, { color: isDark ? '#fff' : '#0f172a' }]}>
                  Watch Demo
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Trust Signals */}
            <View style={styles.trustSignals}>
              <Text style={[styles.trustText, { color: isDark ? '#6b7280' : '#64748b' }]}>
                ✓ No credit card required
              </Text>
              <Text style={[styles.trustText, { color: isDark ? '#6b7280' : '#64748b' }]}>
                ✓ 3 free property scans
              </Text>
            </View>
          </View>

          {/* Address Search (when visible) */}
          {showSearchBar && (
            <View style={[
              styles.searchSection,
              { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              }
            ]}>
              <View style={[
                styles.searchInputContainer,
                { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                }
              ]}>
                <Ionicons name="location" size={20} color={accentColor} />
                <TextInput
                  style={[styles.searchInput, { color: isDark ? '#fff' : '#0f172a' }]}
                  placeholder="Enter property address..."
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : '#94a3b8'}
                  value={searchAddress}
                  onChangeText={setSearchAddress}
                  onSubmitEditing={handleAnalyze}
                  returnKeyType="search"
                  autoFocus
                />
              </View>
              <TouchableOpacity
                style={[
                  styles.analyzeButton,
                  !searchAddress.trim() && styles.analyzeButtonDisabled
                ]}
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

          {/* Capability Stats Bar */}
          <View style={[
            styles.capabilityBar,
            { 
              backgroundColor: isDark ? '#07172e' : '#fff',
              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
            }
          ]}>
            {capabilityStats.map((stat, idx) => (
              <View key={idx} style={styles.capabilityItem}>
                <Text style={[styles.capabilityValue, { color: accentColor }]}>
                  {stat.value}
                </Text>
                <Text style={[styles.capabilityLabel, { color: isDark ? '#6b7280' : '#64748b' }]}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>

          {/* DealMakerIQ Section */}
          <View style={[
            styles.dealmakerSection,
            { backgroundColor: isDark ? '#0a0a12' : '#f0f9ff' }
          ]}>
            <View style={styles.dealmakerHeader}>
              <View style={styles.dealmakerBadge}>
                <Text style={styles.dealmakerBadgeText}>
                  Deal<Text style={styles.dealmakerBadgeAccent}>Maker</Text>IQ
                </Text>
              </View>
              <Text style={[styles.dealmakerTitle, { color: isDark ? '#fff' : '#0f172a' }]}>
                Dial In Your Perfect Deal
              </Text>
              <Text style={[styles.dealmakerSubtitle, { color: isDark ? '#9ca3af' : '#475569' }]}>
                Adjust the numbers and watch your returns update in real time.
              </Text>
            </View>

            <View style={[
              styles.dealmakerCard,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff' }
            ]}>
              {/* Property Header */}
              <View style={[
                styles.dealmakerProperty,
                { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)' }
              ]}>
                <View style={[styles.dealmakerPropertyIcon, { backgroundColor: isDark ? 'rgba(77,208,225,0.15)' : 'rgba(8,145,178,0.1)' }]}>
                  <Ionicons name="home" size={20} color={accentColor} />
                </View>
                <View style={styles.dealmakerPropertyInfo}>
                  <Text style={[styles.dealmakerPropertyAddress, { color: isDark ? '#fff' : '#0f172a' }]}>
                    3742 Lighthouse Circle, Boca Raton
                  </Text>
                  <Text style={[styles.dealmakerPropertySpecs, { color: isDark ? '#6b7280' : '#64748b' }]}>
                    4 bed · 2 bath · 1,850 sqft
                  </Text>
                </View>
                <View style={[styles.dealmakerSampleBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9' }]}>
                  <Text style={[styles.dealmakerSampleText, { color: isDark ? '#9ca3af' : '#64748b' }]}>Sample</Text>
                </View>
              </View>

              {/* Sliders */}
              <View style={styles.dealmakerSliders}>
                <SliderInput
                  label="Buy Price"
                  value={formatCurrency(buyPrice)}
                  min={200000}
                  max={600000}
                  step={5000}
                  sliderValue={buyPrice}
                  onChange={setBuyPrice}
                  minLabel="$200K"
                  maxLabel="$600K"
                  isDark={isDark}
                  accentColor={accentColor}
                />
                <SliderInput
                  label="Down Payment"
                  value={`${downPaymentPct}%`}
                  min={5}
                  max={50}
                  step={1}
                  sliderValue={downPaymentPct}
                  onChange={setDownPaymentPct}
                  minLabel="5%"
                  maxLabel="50%"
                  isDark={isDark}
                  accentColor={accentColor}
                />
                <SliderInput
                  label="Monthly Rent"
                  value={formatCurrency(monthlyRent)}
                  min={1500}
                  max={5000}
                  step={50}
                  sliderValue={monthlyRent}
                  onChange={setMonthlyRent}
                  minLabel="$1,500"
                  maxLabel="$5,000"
                  isDark={isDark}
                  accentColor={accentColor}
                />
              </View>

              {/* Metrics Grid */}
              <View style={styles.dealmakerMetrics}>
                <View style={[styles.dealmakerMetric, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }]}>
                  <Text style={[styles.dealmakerMetricLabel, { color: isDark ? '#6b7280' : '#64748b' }]}>Cash Needed</Text>
                  <Text style={[styles.dealmakerMetricValue, { color: isDark ? '#fff' : '#0f172a' }]}>
                    {formatCurrencyShort(metrics.cashNeeded)}
                  </Text>
                </View>
                <View style={[styles.dealmakerMetric, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }]}>
                  <Text style={[styles.dealmakerMetricLabel, { color: isDark ? '#6b7280' : '#64748b' }]}>Monthly Flow</Text>
                  <Text style={[
                    styles.dealmakerMetricValue, 
                    { color: metrics.monthlyFlow >= 0 ? accentColor : '#ef4444' }
                  ]}>
                    {metrics.monthlyFlow >= 0 ? '+' : ''}{formatCurrency(Math.round(metrics.monthlyFlow))}
                  </Text>
                </View>
                <View style={[styles.dealmakerMetric, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }]}>
                  <Text style={[styles.dealmakerMetricLabel, { color: isDark ? '#6b7280' : '#64748b' }]}>COC Return</Text>
                  <Text style={[
                    styles.dealmakerMetricValue, 
                    { color: metrics.cocReturn >= 4 ? accentColor : isDark ? '#fff' : '#0f172a' }
                  ]}>
                    {metrics.cocReturn.toFixed(1)}%
                  </Text>
                </View>
                <View style={[
                  styles.dealmakerMetric, 
                  styles.dealmakerMetricVerdict,
                  { borderColor: accentColor, backgroundColor: isDark ? 'rgba(77,208,225,0.1)' : 'rgba(8,145,178,0.08)' }
                ]}>
                  <Text style={[styles.dealmakerMetricLabel, { color: isDark ? '#6b7280' : '#64748b' }]}>IQ Verdict</Text>
                  <Text style={[styles.dealmakerMetricValueVerdict, { color: accentColor }]}>
                    {metrics.verdict}
                  </Text>
                </View>
              </View>

              {/* CTA Button */}
              <TouchableOpacity onPress={handleTryItNow}>
                <LinearGradient
                  colors={[buttonGradientStart, buttonGradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.dealmakerCta}
                >
                  <Text style={styles.dealmakerCtaText}>Try DealMakerIQ Free</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Feature Pills */}
            <View style={styles.dealmakerPills}>
              {['15+ Variables', '6 Strategies', 'Instant Updates', 'PDF Reports'].map((pill) => (
                <View key={pill} style={[
                  styles.dealmakerPill,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }
                ]}>
                  <Ionicons name="checkmark" size={14} color={accentColor} />
                  <Text style={[styles.dealmakerPillText, { color: isDark ? '#fff' : '#0f172a' }]}>{pill}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Founder Quote Section */}
          <View style={[
            styles.founderQuoteSection,
            { 
              backgroundColor: isDark ? '#07172e' : '#fff',
              borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
              borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
            }
          ]}>
            <View style={[styles.founderQuoteIcon, { backgroundColor: isDark ? 'rgba(77,208,225,0.15)' : 'rgba(8,145,178,0.1)' }]}>
              <Ionicons name="chatbubble-ellipses" size={20} color={accentColor} />
            </View>
            <Text style={[styles.founderQuoteText, { color: isDark ? '#fff' : '#0f172a' }]}>
              "I analyzed 200+ properties manually before my first purchase—each taking 30+ minutes in spreadsheets. InvestIQ is the tool I wish existed. Now you can screen deals in seconds, not hours."
            </Text>
            <View style={styles.founderQuoteAuthor}>
              <View style={[styles.founderAvatar, { backgroundColor: accentColor }]}>
                <Text style={styles.founderAvatarText}>H</Text>
              </View>
              <View>
                <Text style={[styles.founderName, { color: isDark ? '#fff' : '#0f172a' }]}>Humble</Text>
                <Text style={[styles.founderTitle, { color: isDark ? '#6b7280' : '#64748b' }]}>Founder, InvestIQ</Text>
              </View>
            </View>
          </View>

          {/* Strategies Section */}
          <View style={[
            styles.section,
            { backgroundColor: isDark ? '#0a0a12' : '#f8fafc' }
          ]}>
            <View style={styles.sectionHeader}>
              <View style={[
                styles.sectionLabel,
                { backgroundColor: isDark ? 'rgba(77,208,225,0.1)' : 'rgba(8,145,178,0.1)' }
              ]}>
                <Text style={[styles.sectionLabelText, { color: accentColor }]}>
                  6 Investment Strategies
                </Text>
              </View>
              <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#0f172a' }]}>
                One Property, Multiple Opportunities
              </Text>
              <Text style={[styles.sectionSubtitle, { color: isDark ? '#9ca3af' : '#475569' }]}>
                See how any property performs across all major real estate investment strategies—instantly.
              </Text>
            </View>

            <View style={styles.strategyGrid}>
              {strategies.map((strategy) => (
                <StrategyCard 
                  key={strategy.id} 
                  strategy={strategy} 
                  isDark={isDark}
                />
              ))}
            </View>
          </View>

          {/* Features Section */}
          <View style={[
            styles.section,
            { backgroundColor: isDark ? '#07172e' : '#fff' }
          ]}>
            <View style={styles.sectionHeader}>
              <View style={[
                styles.sectionLabel,
                { backgroundColor: isDark ? 'rgba(77,208,225,0.1)' : 'rgba(8,145,178,0.1)' }
              ]}>
                <Text style={[styles.sectionLabelText, { color: accentColor }]}>
                  Everything You Need
                </Text>
              </View>
              <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#0f172a' }]}>
                What You Get with <Text style={{ color: accentColor }}>InvestIQ</Text>
              </Text>
            </View>

            <View style={styles.featuresGrid}>
              {features.map((feature, idx) => (
                <FeatureCard 
                  key={idx} 
                  feature={feature} 
                  isDark={isDark}
                  accentColor={accentColor}
                />
              ))}
            </View>
          </View>

          {/* CTA Section */}
          <View style={[
            styles.ctaSection,
            { backgroundColor: isDark ? '#0a0a12' : '#f8fafc' }
          ]}>
            <View style={[
              styles.sectionLabel,
              { backgroundColor: isDark ? 'rgba(77,208,225,0.1)' : 'rgba(8,145,178,0.1)' }
            ]}>
              <Text style={[styles.sectionLabelText, { color: accentColor }]}>
                Get Started Today
              </Text>
            </View>
            <Text style={[styles.ctaTitle, { color: isDark ? '#fff' : '#0f172a' }]}>
              Analyze Your First Property{' '}
              <Text style={{ color: accentColor }}>Free</Text>
            </Text>
            <Text style={[styles.ctaSubtitle, { color: isDark ? '#9ca3af' : '#475569' }]}>
              Point your camera at any property and get genius-level analysis across 6 strategies. No credit card required.
            </Text>
            <TouchableOpacity onPress={handleTryItNow} style={styles.ctaButtonWrapper}>
              <LinearGradient
                colors={[buttonGradientStart, buttonGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaButton}
              >
                <Text style={styles.ctaButtonText}>Start Your Free Analysis</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={[
            styles.footer,
            { 
              backgroundColor: isDark ? '#07172e' : '#0f172a',
              borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)',
            }
          ]}>
            <Text style={styles.footerLogo}>
              Invest<Text style={{ color: accentColor }}>IQ</Text>
            </Text>
            <Text style={styles.footerTagline}>
              The fastest path from address to investable decision.
            </Text>
            
            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => router.push('/privacy')}>
                <Text style={styles.footerLink}>Privacy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/terms')}>
                <Text style={styles.footerLink}>Terms</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:support@investiq.com')}>
                <Text style={styles.footerLink}>Contact</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.footerCopyright}>
              © 2026 InvestIQ. All rights reserved.
            </Text>
          </View>

          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// =============================================================================
// SLIDER INPUT COMPONENT
// =============================================================================

interface SliderInputProps {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  sliderValue: number;
  onChange: (value: number) => void;
  minLabel: string;
  maxLabel: string;
  isDark: boolean;
  accentColor: string;
}

function SliderInput({ label, value, min, max, step, sliderValue, onChange, minLabel, maxLabel, isDark, accentColor }: SliderInputProps) {
  return (
    <View style={styles.sliderGroup}>
      <View style={styles.sliderHeader}>
        <Text style={[styles.sliderLabel, { color: isDark ? '#9ca3af' : '#64748b' }]}>{label}</Text>
        <Text style={[styles.sliderValue, { color: isDark ? '#fff' : '#0f172a' }]}>{value}</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={sliderValue}
        onValueChange={onChange}
        minimumTrackTintColor={accentColor}
        maximumTrackTintColor={isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'}
        thumbTintColor={accentColor}
      />
      <View style={styles.sliderRange}>
        <Text style={[styles.sliderRangeText, { color: isDark ? '#6b7280' : '#94a3b8' }]}>{minLabel}</Text>
        <Text style={[styles.sliderRangeText, { color: isDark ? '#6b7280' : '#94a3b8' }]}>{maxLabel}</Text>
      </View>
    </View>
  );
}

// =============================================================================
// STRATEGY CARD COMPONENT
// =============================================================================

function StrategyCard({ 
  strategy, 
  isDark 
}: { 
  strategy: typeof strategies[0]; 
  isDark: boolean;
}) {
  return (
    <View style={[
      styles.strategyCard,
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
      }
    ]}>
      <View style={styles.strategyCardHeader}>
        <Text style={[styles.strategyName, { color: isDark ? '#fff' : '#0f172a' }]}>
          {strategy.name}
        </Text>
        <View style={styles.strategyStat}>
          {strategy.isScale ? (
            <Ionicons name="trending-up" size={20} color={strategy.color} />
          ) : (
            <Text style={[styles.strategyStatValue, { color: strategy.color }]}>
              {strategy.statValue}
            </Text>
          )}
          <Text style={[styles.strategyStatLabel, { color: isDark ? '#6b7280' : '#64748b' }]}>
            {strategy.statLabel}
          </Text>
        </View>
      </View>
      <Text style={[styles.strategyTagline, { color: isDark ? '#9ca3af' : '#475569' }]}>
        {strategy.tagline}
      </Text>
      <View style={[styles.strategyIndicator, { backgroundColor: strategy.color }]} />
    </View>
  );
}

// =============================================================================
// FEATURE CARD COMPONENT
// =============================================================================

function FeatureCard({ 
  feature, 
  isDark,
  accentColor,
}: { 
  feature: typeof features[0]; 
  isDark: boolean;
  accentColor: string;
}) {
  return (
    <View style={[
      styles.featureCard,
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
      }
    ]}>
      <View style={[styles.featureIcon, { backgroundColor: isDark ? 'rgba(77,208,225,0.1)' : 'rgba(8,145,178,0.1)' }]}>
        <Ionicons name={feature.icon as any} size={22} color={accentColor} />
      </View>
      <Text style={[styles.featureTitle, { color: isDark ? '#fff' : '#0f172a' }]}>
        {feature.title}
      </Text>
      <Text style={[styles.featureDescription, { color: isDark ? '#9ca3af' : '#475569' }]}>
        {feature.description}
      </Text>
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

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
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  headerBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  themeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    alignItems: 'center',
  },
  heroEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 24,
  },
  heroEyebrowIcon: {
    fontSize: 14,
  },
  heroEyebrowText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 42,
  },
  heroTitleAccent: {
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 42,
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 8,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  heroCta: {
    gap: 12,
    marginBottom: 20,
    width: '100%',
  },
  primaryBtn: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  ghostBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  trustSignals: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  trustText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Search Section
  searchSection: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 12,
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
    borderRadius: 12,
    backgroundColor: '#0891b2',
    gap: 8,
  },
  analyzeButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Capability Bar
  capabilityBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  capabilityItem: {
    alignItems: 'center',
  },
  capabilityValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  capabilityLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  // DealMaker Section
  dealmakerSection: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  dealmakerHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  dealmakerBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  dealmakerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  dealmakerBadgeAccent: {
    color: '#00D4FF',
  },
  dealmakerTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  dealmakerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  dealmakerCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  dealmakerProperty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  dealmakerPropertyIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealmakerPropertyInfo: {
    flex: 1,
  },
  dealmakerPropertyAddress: {
    fontSize: 13,
    fontWeight: '600',
  },
  dealmakerPropertySpecs: {
    fontSize: 11,
    marginTop: 2,
  },
  dealmakerSampleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dealmakerSampleText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dealmakerSliders: {
    gap: 20,
    marginBottom: 24,
  },
  sliderGroup: {
    gap: 8,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  sliderValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderRangeText: {
    fontSize: 11,
  },
  dealmakerMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  dealmakerMetric: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  dealmakerMetricVerdict: {
    borderWidth: 2,
  },
  dealmakerMetricLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dealmakerMetricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  dealmakerMetricValueVerdict: {
    fontSize: 18,
    fontWeight: '800',
  },
  dealmakerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
  },
  dealmakerCtaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dealmakerPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  dealmakerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  dealmakerPillText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Founder Quote Section
  founderQuoteSection: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  founderQuoteIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  founderQuoteText: {
    fontSize: 16,
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 20,
  },
  founderQuoteAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  founderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  founderAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  founderName: {
    fontSize: 15,
    fontWeight: '600',
  },
  founderTitle: {
    fontSize: 12,
  },

  // Section
  section: {
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  sectionLabel: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  sectionLabelText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Strategy Grid
  strategyGrid: {
    gap: 12,
  },
  strategyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  strategyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  strategyName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  strategyStat: {
    alignItems: 'flex-end',
  },
  strategyStatValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  strategyStatLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  strategyTagline: {
    fontSize: 13,
  },
  strategyIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },

  // Features Grid
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 13,
    lineHeight: 20,
  },

  // CTA Section
  ctaSection: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 12,
  },
  ctaSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  ctaButtonWrapper: {
    width: '100%',
  },
  ctaButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 17,
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
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  footerTagline: {
    fontSize: 13,
    color: '#9ca3af',
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
    color: '#9ca3af',
    fontWeight: '500',
  },
  footerCopyright: {
    fontSize: 12,
    color: '#6b7280',
  },
});
