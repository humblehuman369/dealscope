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
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { 
  Path, 
  Rect, 
  Defs, 
  LinearGradient as SvgLinearGradient, 
  Stop, 
  Text as SvgText 
} from 'react-native-svg';
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

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Enhanced strategy data with full content for expandable cards
const strategies = [
  {
    id: 'ltr',
    name: 'Long-Term Rental',
    tagline: 'Steady income & build equity',
    statValue: '8-12%',
    statLabel: 'Avg CoC',
    color: colors.strategies.longTermRental.primary,
    gradientStart: '#0353c9',
    gradientEnd: '#0465f2',
    description: 'You buy a property and rent it to a tenant who signs a lease (usually 12 months). They pay you rent every month, and after expenses, you keep the profit. It\'s the most beginner-friendly way to invest in real estate.',
    pros: ['Predictable monthly income', 'Tax advantages', 'Low management time'],
    cons: ['Slower wealth building', 'Tenant management', 'Vacancy risk'],
    iqMetrics: [
      { value: '$486', label: 'Cash Flow' },
      { value: '12.4%', label: 'CoC Return' },
      { value: '8.1%', label: 'Cap Rate' },
    ],
    chartData: [40, 55, 50, 65, 70, 75, 80, 85, 90, 100],
  },
  {
    id: 'str',
    name: 'Short-Term Rental',
    tagline: 'Vacation & business rental income',
    statValue: '15-25%',
    statLabel: 'Avg CoC',
    color: colors.strategies.shortTermRental.primary,
    gradientStart: '#7c3aed',
    gradientEnd: '#8b5cf6',
    description: 'Instead of one tenant for a year, you rent to travelers night-by-night on platforms like Airbnb or VRBO. Think of it like running a mini-hotel — more work, but potentially 2-3x the income of a traditional rental.',
    pros: ['2-3x higher income', 'Flexible personal use', 'Dynamic pricing power'],
    cons: ['Higher management', 'Seasonal fluctuations', 'Regulation risks'],
    iqMetrics: [
      { value: '$1,580', label: 'Cash Flow' },
      { value: '23.4%', label: 'CoC Return' },
      { value: '$200', label: 'Nightly Rate' },
    ],
    chartData: [60, 85, 70, 90, 50, 75, 95, 100, 80, 65],
  },
  {
    id: 'brrrr',
    name: 'BRRRR',
    tagline: 'Buy-Rehab-Rent-Refi-Repeat wealth builder',
    statValue: 'SCALE',
    statLabel: 'SCALE',
    isGrowthIcon: true,
    color: colors.strategies.brrrr.primary,
    gradientStart: '#ea580c',
    gradientEnd: '#f97316',
    description: 'A 5-step wealth-building strategy: Buy a fixer-upper cheap, Rehab it, Rent it out, Refinance based on the new higher value, then Repeat with the cash you pulled out. You end up owning a rental AND getting your original investment back.',
    pros: ['Recycle capital infinitely', 'Force equity creation', 'Scale portfolio fast'],
    cons: ['Requires rehab skills', 'More complex process', 'Market timing matters'],
    iqMetrics: [
      { value: '100%', label: 'Cash Back' },
      { value: '$146K', label: 'Equity Made' },
      { value: '$412', label: 'Cash Flow' },
    ],
    chartData: [100, 30, 50, 70, 100, 30, 55, 75, 100, 35],
  },
  {
    id: 'flip',
    name: 'Fix & Flip',
    tagline: 'Buy low, fix up, sell high',
    statValue: '$50K+',
    statLabel: 'Profit Goal',
    color: colors.strategies.fixAndFlip.primary,
    gradientStart: '#db2777',
    gradientEnd: '#ec4899',
    description: 'Buy an ugly or outdated house below market value, fix it up to make it beautiful, then sell it for a profit. Like the TV shows — buy low, renovate, sell high. Most flips take 3-6 months from purchase to sale.',
    pros: ['Big lump sum profits', 'Quick turnaround', 'No landlord duties'],
    cons: ['Active work required', 'Market risk', 'Capital intensive'],
    iqMetrics: [
      { value: '$62.8K', label: 'Net Profit' },
      { value: '35%', label: 'ROI' },
      { value: '70%', label: 'Rule Check' },
    ],
    chartData: [20, 25, 35, 50, 60, 100, 0, 0, 0, 0],
  },
  {
    id: 'hack',
    name: 'House Hack',
    tagline: 'Cut your housing costs up to 100%',
    statValue: '75%',
    statLabel: 'Cost Savings',
    color: colors.strategies.houseHack.primary,
    gradientStart: '#0d9488',
    gradientEnd: '#14b8a6',
    description: 'Buy a home and rent out part of it — spare bedrooms, a basement apartment, or units in a duplex. Your tenants\' rent covers your mortgage, so you live for free (or nearly free) while building equity. The ultimate first-time investor strategy.',
    pros: ['Eliminate housing cost', 'Low down payment (FHA)', 'Build wealth fast'],
    cons: ['Live with tenants', 'Less privacy', 'Landlord duties'],
    iqMetrics: [
      { value: '$0', label: 'Your Cost' },
      { value: '$24K', label: 'Yr Savings' },
      { value: '3.5%', label: 'FHA Down' },
    ],
    chartData: [100, 80, 60, 40, 20, 10, 5, 0, 0, 0],
  },
  {
    id: 'wholesale',
    name: 'Wholesale',
    tagline: 'Find deals, assign contracts, profit',
    statValue: '$10K+',
    statLabel: 'Per Deal',
    color: colors.strategies.wholesale.primary,
    gradientStart: '#65a30d',
    gradientEnd: '#84cc16',
    description: 'You find a property selling below market value, get it under contract, then sell that contract to another investor for a fee ($5K-$20K typically). You never actually buy the property — you\'re the middleman connecting motivated sellers with buyers. Zero money needed.',
    pros: ['No capital needed', 'Quick profits', 'Low risk'],
    cons: ['Need deal flow', 'Negotiation skills', 'No equity built'],
    iqMetrics: [
      { value: '$10K', label: 'Your Fee' },
      { value: '$265K', label: 'MAO' },
      { value: '667%', label: 'ROI' },
    ],
    chartData: [10, 100, 0, 10, 100, 0, 10, 100, 0, 10],
  },
];

// Stats data
const stats = [
  { value: '10K+', label: 'Analyzed' },
  { value: '$2.4M', label: 'Profit Found' },
  { value: '60s', label: 'Avg. Analysis' },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null); // All collapsed on load
  const scrollViewRef = useRef<ScrollView>(null);

  const handleAnalyze = () => {
    if (!searchAddress.trim()) return;
    setIsSearching(true);
    router.push(`/analytics/${encodeURIComponent(searchAddress.trim())}`);
  };

  const handleScanPress = () => {
    router.push('/(tabs)/scan');
  };

  const handleStartAnalyzing = () => {
    setShowSearchBar(true);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleStrategyPress = (strategyId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedStrategy(expandedStrategy === strategyId ? null : strategyId);
  };

  const handleAnalyzeAsStrategy = (strategyId: string) => {
    // Navigate to scan or address input with pre-selected strategy
    router.push('/(tabs)/scan');
  };

  // Theme-aware colors
  const accentColor = isDark ? '#4dd0e1' : '#007ea7';
  const buttonGradientStart = isDark ? '#0097a7' : '#007ea7';
  const buttonGradientEnd = isDark ? '#4dd0e1' : '#0097a7';

  return (
    <View style={[
      styles.container, 
      { backgroundColor: isDark ? '#07172e' : '#ffffff', paddingTop: insets.top }
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
          <View style={styles.header}>
            <Text style={[styles.logoText, { color: isDark ? '#fff' : '#07172e' }]}>
              Invest<Text style={{ color: accentColor }}>IQ</Text>
            </Text>
            
            <TouchableOpacity 
              style={[
                styles.themeToggle,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.05)' }
              ]}
              onPress={toggleTheme}
            >
              <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
          </View>

          {/* Hero Section - Compact */}
          <View style={styles.heroSection}>
            <Text style={[styles.heroLine1, { color: isDark ? '#fff' : '#07172e' }]}>
              Know the Real Return
            </Text>
            <Text style={[styles.heroLine2, { color: accentColor }]}>
              Before You Buy
            </Text>
            <Text style={[styles.heroLine3, { color: accentColor }]}>
              POINT. SCAN. KNOW.
            </Text>
          </View>

          {/* Scanner Card - Compact */}
          <View style={styles.scannerCardContainer}>
            <ScannerCard 
              isDark={isDark}
              accentColor={accentColor}
              buttonGradientStart={buttonGradientStart}
              buttonGradientEnd={buttonGradientEnd}
              onScanPress={handleScanPress}
              onAddressPress={() => setShowSearchBar(!showSearchBar)}
            />
            
            {/* Address Search Dropdown */}
            {showSearchBar && (
              <View style={[
                styles.searchDropdown,
                { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.05)',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(7,23,46,0.12)',
                }
              ]}>
                <View style={[
                  styles.searchInputContainer,
                  { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(7,23,46,0.12)',
                  }
                ]}>
                  <Ionicons name="location" size={20} color={accentColor} />
                  <TextInput
                    style={[styles.searchInput, { color: isDark ? '#fff' : '#07172e' }]}
                    placeholder="Enter property address..."
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.5)' : colors.gray[400]}
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
                      <Ionicons name="search" size={18} color={searchAddress.trim() ? '#fff' : 'rgba(255,255,255,0.4)'} />
                      <Text style={[
                        styles.analyzeButtonText,
                        !searchAddress.trim() && styles.analyzeButtonTextDisabled
                      ]}>
                        Analyze Property
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Strategy Section - Redesigned Accordion */}
          <View style={styles.strategySection}>
            <View style={styles.strategySectionHeader}>
              <Text style={[styles.strategySectionTitle, { color: isDark ? '#fff' : '#07172e' }]}>
                6 Ways to <Text style={{ color: accentColor }}>Profit</Text>
              </Text>
              <Text style={[styles.strategySectionSubtitle, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
                Tap any strategy to see how IQ analyzes it
              </Text>
            </View>

            <View style={styles.strategyGrid}>
              {strategies.map((strategy) => (
                <ExpandableStrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  isExpanded={expandedStrategy === strategy.id}
                  onPress={() => handleStrategyPress(strategy.id)}
                  onAnalyze={() => handleAnalyzeAsStrategy(strategy.id)}
                  isDark={isDark}
                />
              ))}
            </View>
          </View>

          {/* Stats Row */}
          <View style={[
            styles.statsRow,
            { 
              borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
              borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
            }
          ]}>
            {stats.map((stat, idx) => (
              <View key={idx} style={styles.statItem}>
                <Text style={[styles.statValue, { color: accentColor }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.gray[500] }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* CTA Section */}
          <View style={styles.ctaSection}>
            <TouchableOpacity style={styles.ctaButton} onPress={handleStartAnalyzing}>
              <LinearGradient
                colors={[buttonGradientStart, buttonGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaButtonGradient}
              >
                <Text style={styles.ctaButtonText}>Start Analyzing Now</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={[styles.trustText, { color: colors.gray[500] }]}>
              Free • No credit card required
            </Text>
          </View>

          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// =============================================================================
// SCANNER CARD COMPONENT (Simplified - no property badge)
// =============================================================================

function ScannerCard({ 
  isDark, 
  accentColor, 
  buttonGradientStart,
  buttonGradientEnd,
  onScanPress, 
  onAddressPress 
}: { 
  isDark: boolean;
  accentColor: string;
  buttonGradientStart: string;
  buttonGradientEnd: string;
  onScanPress: () => void;
  onAddressPress: () => void;
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
        withTiming(80, { duration: 2250, easing: Easing.inOut(Easing.ease) }),
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

  const gradientStart = isDark ? 'rgba(77,208,225,0.08)' : 'rgba(0,126,167,0.06)';
  const gradientEnd = isDark ? 'rgba(4,101,242,0.08)' : 'rgba(4,101,242,0.06)';
  const borderColor = isDark ? 'rgba(77,208,225,0.2)' : 'rgba(0,126,167,0.15)';

  return (
    <LinearGradient
      colors={[gradientStart, gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.scannerCard, { borderColor }]}
    >
      {/* Scanner Viewport - Compact */}
      <View style={styles.scannerViewport}>
        <View style={styles.scannerFrame}>
          <Animated.View style={[styles.scannerGlow, glowStyle, { 
            backgroundColor: isDark ? 'rgba(77,208,225,0.15)' : 'rgba(0,126,167,0.12)' 
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
            <Svg viewBox="0 0 100 80" style={{ width: 50, height: 40 }}>
              <Path 
                d="M50 5L5 40h10v35h70V40h10L50 5zm-20 65V45h15v25H30zm25 0V45h15v25H55z" 
                fill={isDark ? '#aab2bd' : '#07172e'}
                opacity={isDark ? 0.35 : 0.15}
              />
            </Svg>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={onScanPress}
        >
          <LinearGradient
            colors={[buttonGradientStart, buttonGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionBtnPrimary}
          >
            <Text style={styles.actionBtnText}>Point & Scan</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.actionBtn,
            styles.actionBtnSecondary,
            { 
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(7,23,46,0.03)',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(7,23,46,0.1)',
            }
          ]}
          onPress={onAddressPress}
        >
          <Text style={[styles.actionBtnSecondaryText, { color: isDark ? 'rgba(255,255,255,0.8)' : '#07172e' }]}>
            Enter Address
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// =============================================================================
// EXPANDABLE STRATEGY CARD COMPONENT
// =============================================================================

function ExpandableStrategyCard({
  strategy,
  isExpanded,
  onPress,
  onAnalyze,
  isDark,
}: {
  strategy: typeof strategies[0];
  isExpanded: boolean;
  onPress: () => void;
  onAnalyze: () => void;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.strategyCard,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
          borderColor: isDark 
            ? (isExpanded ? `${strategy.color}80` : 'rgba(255,255,255,0.06)')
            : (isExpanded ? `${strategy.color}60` : 'rgba(7,23,46,0.12)'),
        },
        isExpanded && { backgroundColor: isDark ? `${strategy.color}08` : `${strategy.color}04` },
        !isDark && styles.strategyCardShadow,
      ]}
    >
      {/* Card Header - Always Visible */}
      <View style={styles.strategyCardHeader}>
        <View style={[styles.strategyIndicator, { backgroundColor: strategy.color }]} />
        
        <View style={styles.strategyCardInfo}>
          <Text style={[styles.strategyName, { color: isDark ? '#fff' : '#07172e' }]}>
            {strategy.name}
          </Text>
          <Text style={[styles.strategyTagline, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
            {strategy.tagline}
          </Text>
        </View>

        <View style={styles.strategyStat}>
          {strategy.isGrowthIcon ? (
            <Text style={styles.growthIcon}>📈</Text>
          ) : (
            <Text style={[styles.strategyStatValue, { color: strategy.color }]}>
              {strategy.statValue}
            </Text>
          )}
          <Text style={[styles.strategyStatLabel, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)' }]}>
            {strategy.statLabel}
          </Text>
        </View>

        <Text style={[styles.strategyExpand, { color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(7,23,46,0.3)' }]}>
          {isExpanded ? '▲' : '▼'}
        </Text>
      </View>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.strategyCardBody}>
          {/* Description */}
          <View style={[
            styles.strategyDescription,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(7,23,46,0.02)' }
          ]}>
            <Text style={[styles.strategyDescriptionText, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(7,23,46,0.7)' }]}>
              {strategy.description}
            </Text>
          </View>

          {/* Pros/Cons */}
          <View style={styles.prosConsRow}>
            <View style={styles.prosCol}>
              <Text style={styles.prosColTitle}>✓ Pros</Text>
              {strategy.pros.map((pro, idx) => (
                <Text key={idx} style={styles.prosItem}>• {pro}</Text>
              ))}
            </View>
            <View style={styles.consCol}>
              <Text style={styles.consColTitle}>✕ Cons</Text>
              {strategy.cons.map((con, idx) => (
                <Text key={idx} style={styles.consItem}>• {con}</Text>
              ))}
            </View>
          </View>

          {/* IQ Metrics Preview */}
          <View style={[
            styles.iqMetricsPreview,
            { 
              borderColor: isDark ? 'rgba(77,208,225,0.2)' : 'rgba(0,126,167,0.15)',
            }
          ]}>
            <LinearGradient
              colors={isDark 
                ? ['rgba(77,208,225,0.1)', 'rgba(4,101,242,0.1)']
                : ['rgba(0,126,167,0.06)', 'rgba(4,101,242,0.06)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iqMetricsInner}
            >
              <Text style={[styles.iqMetricsTitle, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
                🎯 IQ Reveals Instantly
              </Text>
              <View style={styles.iqMetricsGrid}>
                {strategy.iqMetrics.map((metric, idx) => (
                  <View 
                    key={idx} 
                    style={[
                      styles.iqMetricItem,
                      { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)' }
                    ]}
                  >
                    <Text style={[styles.iqMetricValue, { color: isDark ? '#fff' : '#07172e' }]}>
                      {metric.value}
                    </Text>
                    <Text style={[styles.iqMetricLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
                      {metric.label}
                    </Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>

          {/* Mini Bar Chart */}
          <View style={[
            styles.miniChart,
            { backgroundColor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(7,23,46,0.04)' }
          ]}>
            {strategy.chartData.map((height, idx) => (
              <View
                key={idx}
                style={[
                  styles.chartBar,
                  { 
                    height: `${height}%`,
                    backgroundColor: height > 0 ? strategy.color : 'transparent',
                    opacity: height > 0 ? (0.3 + (height / 100) * 0.7) : 0,
                  }
                ]}
              />
            ))}
          </View>

          {/* CTA Button */}
          <TouchableOpacity onPress={onAnalyze} activeOpacity={0.8}>
            <LinearGradient
              colors={[strategy.gradientStart, strategy.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.strategyCta}
            >
              <Text style={styles.strategyCtaText}>Analyze as {strategy.name} →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
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
    marginBottom: 24,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  themeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero Section - Compact
  heroSection: {
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  heroLine1: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 30,
  },
  heroLine2: {
    fontSize: 26,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 8,
  },
  heroLine3: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 3.2,
  },

  // Scanner Card Container
  scannerCardContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },

  // Scanner Card - Compact
  scannerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  scannerViewport: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  scannerFrame: {
    width: 120,
    height: 90,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerGlow: {
    position: 'absolute',
    top: -15,
    left: -15,
    right: -15,
    bottom: -15,
    borderRadius: 16,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderWidth: 2,
    zIndex: 2,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 4,
  },
  scanLine: {
    position: 'absolute',
    left: 8,
    right: 8,
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

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 48,
  },
  actionBtnPrimary: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSecondary: {
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Search Dropdown
  searchDropdown: {
    marginTop: 16,
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
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary[500],
    gap: 8,
  },
  analyzeButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  analyzeButtonTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
  },

  // Strategy Section - Redesigned
  strategySection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  strategySectionHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  strategySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  strategySectionSubtitle: {
    fontSize: 11,
  },
  strategyGrid: {
    gap: 10,
  },

  // Strategy Card - Expandable
  strategyCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  strategyCardShadow: {
    shadowColor: '#07172e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  strategyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  strategyIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  strategyCardInfo: {
    flex: 1,
    minWidth: 0,
  },
  strategyName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  strategyTagline: {
    fontSize: 11,
    lineHeight: 14,
  },
  strategyStat: {
    alignItems: 'flex-end',
  },
  strategyStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  growthIcon: {
    fontSize: 24,
  },
  strategyStatLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  strategyExpand: {
    fontSize: 12,
    marginLeft: 8,
  },

  // Strategy Card Body (Expanded)
  strategyCardBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  strategyDescription: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  strategyDescriptionText: {
    fontSize: 12,
    lineHeight: 18,
  },

  // Pros/Cons
  prosConsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  prosCol: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.15)',
  },
  consCol: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
  },
  prosColTitle: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#22c55e',
    marginBottom: 6,
  },
  consColTitle: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#ef4444',
    marginBottom: 6,
  },
  prosItem: {
    fontSize: 10,
    lineHeight: 15,
    color: 'rgba(34,197,94,0.9)',
  },
  consItem: {
    fontSize: 10,
    lineHeight: 15,
    color: 'rgba(239,68,68,0.9)',
  },

  // IQ Metrics Preview
  iqMetricsPreview: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  iqMetricsInner: {
    padding: 12,
  },
  iqMetricsTitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  iqMetricsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  iqMetricItem: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
  },
  iqMetricValue: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  iqMetricLabel: {
    fontSize: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },

  // Mini Chart
  miniChart: {
    height: 50,
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginBottom: 12,
  },
  chartBar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 0,
  },

  // Strategy CTA
  strategyCta: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  strategyCtaText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
  },

  // CTA Section
  ctaSection: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
    height: 56,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  ctaButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  trustText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
