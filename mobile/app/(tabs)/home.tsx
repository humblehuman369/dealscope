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
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Strategy data matching web
const strategies = [
  {
    id: 'long',
    name: 'Long-Term Rental',
    tagline: 'Steady income & build equity',
    description: 'Buy and hold properties for consistent monthly rental income. Build long-term wealth through appreciation and mortgage paydown.',
    statValue: '8-12%',
    statLabel: 'Cash-on-Cash',
    color: '#0465f2',
  },
  {
    id: 'short',
    name: 'Short-Term Rental',
    tagline: 'Vacation & business rental income',
    description: 'Maximize income through Airbnb or VRBO rentals. Higher returns with more active management.',
    statValue: '15-25%',
    statLabel: 'Cash-on-Cash',
    color: '#8b5cf6',
  },
  {
    id: 'brrrr',
    name: 'BRRRR',
    tagline: 'Buy-Rehab-Rent-Refi-Repeat',
    description: 'Buy distressed property, renovate, rent, refinance to pull out capital, then repeat.',
    statValue: '∞',
    statLabel: 'Scale',
    color: '#f97316',
    isScale: true,
  },
  {
    id: 'flip',
    name: 'Fix & Flip',
    tagline: 'Buy low, fix up, sell high',
    description: 'Purchase undervalued properties, renovate strategically, and sell for profit.',
    statValue: '$50K+',
    statLabel: 'Profit',
    color: '#ec4899',
  },
  {
    id: 'hack',
    name: 'House Hack',
    tagline: 'Cut your housing costs up to 100%',
    description: 'Live in one unit while renting others. Eliminate your housing payment.',
    statValue: '75%',
    statLabel: 'Cost Savings',
    color: '#14b8a6',
  },
  {
    id: 'wholesale',
    name: 'Wholesale',
    tagline: 'Find deals, assign contracts, profit',
    description: 'Find properties under market value and assign to other investors for a fee.',
    statValue: '$10K+',
    statLabel: 'Per Deal',
    color: '#84cc16',
  },
];

// Features data matching web
const features = [
  {
    icon: 'scan-outline',
    title: 'Point & Scan',
    description: 'Just point your camera at any property. Our AI instantly identifies it and pulls comprehensive data.',
  },
  {
    icon: 'grid-outline',
    title: '6 Strategies Compared',
    description: 'See how each property performs across all major investment strategies, side by side, instantly.',
  },
  {
    icon: 'time-outline',
    title: '60-Second Analysis',
    description: 'From address to investment decision in under a minute. Stop wasting hours on spreadsheets.',
  },
  {
    icon: 'checkmark-circle-outline',
    title: 'Accurate Projections',
    description: 'Real market data, local comps, and proven formulas power every calculation.',
  },
  {
    icon: 'folder-outline',
    title: 'Portfolio Tracking',
    description: 'Save properties, track performance, and monitor your entire portfolio from one dashboard.',
  },
  {
    icon: 'lock-closed-outline',
    title: 'Bank-Level Security',
    description: 'Your data is encrypted and secure. We never share your information with third parties.',
  },
];

// Stats data matching web
const stats = [
  { value: '10K+', label: 'Properties Analyzed' },
  { value: '$2.4M', label: 'Profit Discovered' },
  { value: '60s', label: 'Avg. Analysis Time' },
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
    // Use new IQ Verdict flow
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
            {/* Eyebrow */}
            <View style={[
              styles.heroEyebrow,
              { backgroundColor: isDark ? 'rgba(77,208,225,0.1)' : 'rgba(8,145,178,0.1)' }
            ]}>
              <Text style={[styles.heroEyebrowText, { color: accentColor }]}>
                Intel for Real Estate Investors
              </Text>
            </View>
            
            <Text style={[styles.heroTitle, { color: isDark ? '#fff' : '#0f172a' }]}>
              Know the <Text style={{ color: accentColor }}>Real Return</Text>
            </Text>
            <Text style={[styles.heroTitle, { color: isDark ? '#fff' : '#0f172a' }]}>
              Before You Invest
            </Text>
            
            <Text style={[styles.heroSubtitle, { color: isDark ? '#9ca3af' : '#475569' }]}>
              Scan any property with phone or enter an address.{'\n'}
              IQ analyzes the deal and local market across{'\n'}
              6 strategies in 60 seconds.
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
                  <Text style={styles.primaryBtnText}>Try It Now</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.ghostBtn,
                  { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }
                ]}
                onPress={handleScanPress}
              >
                <Ionicons name="scan-outline" size={18} color={isDark ? '#fff' : '#0f172a'} />
                <Text style={[styles.ghostBtnText, { color: isDark ? '#fff' : '#0f172a' }]}>
                  Point & Scan
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Trust Signals */}
            <View style={styles.trustSignals}>
              <Text style={[styles.trustText, { color: isDark ? '#6b7280' : '#64748b' }]}>
                ✓ No credit card required
              </Text>
              <Text style={[styles.trustText, { color: isDark ? '#6b7280' : '#64748b' }]}>
                ✓ 10K+ properties analyzed
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

          {/* Scanner Demo Card */}
          <View style={styles.demoSection}>
            <ScannerDemoCard 
              isDark={isDark}
              accentColor={accentColor}
              onScanPress={handleScanPress}
            />
          </View>

          {/* Strategies Section */}
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
                  6 Investment Strategies
                </Text>
              </View>
              <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#0f172a' }]}>
                One Property, Multiple Opportunities
              </Text>
              <Text style={[styles.sectionSubtitle, { color: isDark ? '#9ca3af' : '#475569' }]}>
                Instantly see how any property performs across all major real estate investment strategies.
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

          {/* Stats Section */}
          <View style={[
            styles.statsSection,
            { backgroundColor: isDark ? '#0a0a12' : '#f8fafc' }
          ]}>
            <View style={styles.statsGrid}>
              {stats.map((stat, idx) => (
                <View key={idx} style={styles.statItem}>
                  <Text style={[styles.statValue, { color: accentColor }]}>
                    {stat.value}
                  </Text>
                  <Text style={[styles.statLabel, { color: isDark ? '#6b7280' : '#64748b' }]}>
                    {stat.label}
                  </Text>
                </View>
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
                  Why InvestIQ
                </Text>
              </View>
              <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#0f172a' }]}>
                Everything You Need to Invest Smarter
              </Text>
              <Text style={[styles.sectionSubtitle, { color: isDark ? '#9ca3af' : '#475569' }]}>
                Powerful features designed to give you an edge in real estate investing.
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
              Let IQ Analyze Your First Property{' '}
              <Text style={{ color: accentColor }}>Free</Text>
            </Text>
            <Text style={[styles.ctaSubtitle, { color: isDark ? '#9ca3af' : '#475569' }]}>
              Point your camera at any property and IQ will deliver genius-level analysis across 6 investment strategies. No credit card required.
            </Text>
            <TouchableOpacity onPress={handleTryItNow} style={styles.ctaButtonWrapper}>
              <LinearGradient
                colors={[buttonGradientStart, buttonGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaButton}
              >
                <Text style={styles.ctaButtonText}>Try It Now</Text>
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
              Intel for Real Estate Investors
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
              © 2024 InvestIQ. All rights reserved.
            </Text>
          </View>

          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// =============================================================================
// SCANNER DEMO CARD COMPONENT
// =============================================================================

function ScannerDemoCard({ 
  isDark, 
  accentColor,
  onScanPress, 
}: { 
  isDark: boolean;
  accentColor: string;
  onScanPress: () => void;
}) {
  const glowOpacity = useSharedValue(0.3);
  const glowScale = useSharedValue(0.95);
  const scanLinePosition = useSharedValue(10);
  const scanLineOpacity = useSharedValue(0);
  
  const corner1Opacity = useSharedValue(0.6);
  const corner2Opacity = useSharedValue(0.6);
  const corner3Opacity = useSharedValue(0.6);
  const corner4Opacity = useSharedValue(0.6);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    glowScale.value = withRepeat(
      withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    corner1Opacity.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    corner2Opacity.value = withDelay(100, withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    ));
    corner3Opacity.value = withDelay(200, withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    ));
    corner4Opacity.value = withDelay(300, withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    ));

    scanLinePosition.value = withRepeat(
      withSequence(
        withTiming(110, { duration: 2250, easing: Easing.inOut(Easing.ease) }),
        withTiming(10, { duration: 0 })
      ),
      -1
    );
    
    scanLineOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration: 250 }),
        withTiming(1, { duration: 1750 }),
        withTiming(0, { duration: 250 })
      ),
      -1
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const scanLineStyle = useAnimatedStyle(() => ({
    top: scanLinePosition.value,
    opacity: scanLineOpacity.value,
  }));

  const corner1Style = useAnimatedStyle(() => ({ opacity: corner1Opacity.value }));
  const corner2Style = useAnimatedStyle(() => ({ opacity: corner2Opacity.value }));
  const corner3Style = useAnimatedStyle(() => ({ opacity: corner3Opacity.value }));
  const corner4Style = useAnimatedStyle(() => ({ opacity: corner4Opacity.value }));

  return (
    <View style={[
      styles.demoCard,
      { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#fff' }
    ]}>
      <Text style={[styles.demoBrandLine, { color: isDark ? '#fff' : '#0f172a' }]}>
        <Text style={{ color: accentColor }}>Point.</Text> Scan.{' '}
        <Text style={{ color: accentColor }}>Know.</Text>
      </Text>
      
      {/* Scanner Frame */}
      <View style={styles.scannerFrame}>
        <Animated.View style={[styles.scannerGlow, glowStyle, { 
          backgroundColor: isDark ? 'rgba(77,208,225,0.15)' : 'rgba(8,145,178,0.12)' 
        }]} />
        
        <Animated.View style={[styles.corner, styles.cornerTL, corner1Style, { borderColor: accentColor }]} />
        <Animated.View style={[styles.corner, styles.cornerTR, corner2Style, { borderColor: accentColor }]} />
        <Animated.View style={[styles.corner, styles.cornerBL, corner3Style, { borderColor: accentColor }]} />
        <Animated.View style={[styles.corner, styles.cornerBR, corner4Style, { borderColor: accentColor }]} />
        
        <Animated.View style={[styles.scanLine, scanLineStyle]}>
          <LinearGradient
            colors={['transparent', accentColor, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.scanLineGradient}
          />
        </Animated.View>
        
        <View style={styles.houseIcon}>
          <Svg viewBox="0 0 100 80" style={{ width: 80, height: 64 }}>
            <Path 
              d="M50 5L5 40h10v35h70V40h10L50 5zm-20 65V45h15v25H30zm25 0V45h15v25H55z" 
              fill="none"
              stroke={accentColor}
              strokeWidth={2}
              opacity={0.6}
            />
          </Svg>
        </View>
      </View>
      
      {/* Floating Data Cards */}
      <View style={[styles.floatingCard, styles.floatingCardTopRight]}>
        <Text style={[styles.floatingCardValue, { color: isDark ? '#fff' : '#0f172a' }]}>$847/mo</Text>
        <Text style={[styles.floatingCardLabel, { color: isDark ? '#9ca3af' : '#64748b' }]}>Cash Flow</Text>
      </View>
      <View style={[styles.floatingCard, styles.floatingCardMidLeft]}>
        <Text style={[styles.floatingCardValue, { color: isDark ? '#fff' : '#0f172a' }]}>12.4%</Text>
        <Text style={[styles.floatingCardLabel, { color: isDark ? '#9ca3af' : '#64748b' }]}>Cash-on-Cash</Text>
      </View>
      <View style={[styles.floatingCard, styles.floatingCardBottomRight]}>
        <Text style={[styles.floatingCardValue, { color: '#22c55e' }]}>A+</Text>
        <Text style={[styles.floatingCardLabel, { color: isDark ? '#9ca3af' : '#64748b' }]}>Deal Grade</Text>
      </View>
      
      {/* Try Demo Button */}
      <TouchableOpacity 
        style={[styles.demoButton, { backgroundColor: accentColor }]}
        onPress={onScanPress}
      >
        <Ionicons name="scan-outline" size={18} color="#fff" />
        <Text style={styles.demoButtonText}>Try Point & Scan</Text>
      </TouchableOpacity>
    </View>
  );
}

// =============================================================================
// STRATEGY CARD COMPONENT (Matching Web Design)
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
            <Ionicons name="trending-up" size={24} color={strategy.color} />
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
      <Text style={[styles.strategyDescription, { color: isDark ? '#6b7280' : '#64748b' }]}>
        {strategy.description}
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
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
      }
    ]}>
      <View style={[styles.featureIcon, { backgroundColor: isDark ? 'rgba(77,208,225,0.1)' : 'rgba(8,145,178,0.1)' }]}>
        <Ionicons name={feature.icon as any} size={24} color={accentColor} />
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  heroEyebrowText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 40,
  },
  heroSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 16,
    marginBottom: 24,
  },
  heroCta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  primaryBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  ghostBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  trustSignals: {
    flexDirection: 'row',
    gap: 20,
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
    backgroundColor: '#0465f2',
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

  // Demo Section
  demoSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  demoCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    minHeight: 280,
  },
  demoBrandLine: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  scannerFrame: {
    width: 180,
    height: 140,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 20,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderWidth: 3,
    zIndex: 2,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 2,
    zIndex: 3,
  },
  scanLineGradient: {
    flex: 1,
    height: 2,
  },
  houseIcon: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCard: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    alignItems: 'center',
  },
  floatingCardTopRight: {
    top: 60,
    right: 10,
  },
  floatingCardMidLeft: {
    top: 120,
    left: 10,
  },
  floatingCardBottomRight: {
    bottom: 80,
    right: 20,
  },
  floatingCardValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  floatingCardLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 24,
  },
  demoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 26,
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
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  strategyStat: {
    alignItems: 'flex-end',
  },
  strategyStatValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  strategyStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  strategyTagline: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  strategyDescription: {
    fontSize: 12,
    lineHeight: 18,
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

  // Stats Section
  statsSection: {
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
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
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
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
