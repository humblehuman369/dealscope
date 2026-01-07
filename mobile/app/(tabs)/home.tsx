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
  interpolate,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Strategy data with colors and emojis
const strategies = [
  { 
    name: 'Long-Term Rental', 
    roi: '18%', 
    icon: '🏠', 
    label: 'Est. ROI',
    color: colors.strategies.longTermRental.primary,
  },
  { 
    name: 'Short-Term Rental', 
    roi: '28%', 
    icon: '🏨', 
    label: 'Est. ROI',
    color: colors.strategies.shortTermRental.primary,
  },
  { 
    name: 'Fix & Flip', 
    roi: '22%', 
    icon: '🔨', 
    label: 'Est. ROI',
    color: colors.strategies.fixAndFlip.primary,
  },
  { 
    name: 'BRRRR', 
    roi: '25%', 
    icon: '🔄', 
    label: 'Est. ROI',
    color: colors.strategies.brrrr.primary,
  },
  { 
    name: 'House Hack', 
    roi: '31%', 
    icon: '🏡', 
    label: 'Est. ROI',
    color: colors.strategies.houseHack.primary,
  },
  { 
    name: 'Wholesale', 
    roi: '$12K', 
    icon: '📋', 
    label: 'Est. Profit',
    color: colors.strategies.wholesale.primary,
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
  const scrollViewRef = useRef<ScrollView>(null);

  const handleAnalyze = () => {
    if (!searchAddress.trim()) return;
    setIsSearching(true);
    router.push(`/property/${encodeURIComponent(searchAddress.trim())}`);
  };

  const handleScanPress = () => {
    router.push('/(tabs)/scan');
  };

  const handleStartAnalyzing = () => {
    setShowSearchBar(true);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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

          {/* Hero Section - 3 Lines with Intentional Breaks */}
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

          {/* Scanner Card */}
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

          {/* Strategy Section */}
          <View style={styles.strategySection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#07172e' }]}>
                See Your <Text style={{ color: accentColor }}>Profit Potential</Text>
              </Text>
              <TouchableOpacity>
                <Text style={[styles.seeAll, { color: accentColor }]}>All 6 →</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.strategyScroll}
              style={styles.strategyScrollContainer}
            >
              {strategies.map((strategy, idx) => (
                <StrategyCard key={idx} {...strategy} isDark={isDark} />
              ))}
            </ScrollView>
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
              <Svg viewBox="0 0 335 56" style={styles.ctaButtonSvg}>
                <Defs>
                  <SvgLinearGradient id="ctaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor={buttonGradientStart} />
                    <Stop offset="100%" stopColor={buttonGradientEnd} />
                  </SvgLinearGradient>
                </Defs>
                <Rect width="335" height="56" rx="14" fill="url(#ctaGradient)" />
                <SvgText 
                  x="167.5" 
                  y="34" 
                  textAnchor="middle" 
                  fill="white" 
                  fontFamily="Inter, system-ui, sans-serif" 
                  fontSize="16" 
                  fontWeight="600"
                >
                  Start Analyzing Now
                </SvgText>
              </Svg>
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

// Scanner Card with Animations
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
  // Animation values
  const glowOpacity = useSharedValue(0.3);
  const glowScale = useSharedValue(0.95);
  const scanLinePosition = useSharedValue(15);
  const scanLineOpacity = useSharedValue(0);
  
  // Corner animations with stagger
  const corner1Opacity = useSharedValue(0.6);
  const corner2Opacity = useSharedValue(0.6);
  const corner3Opacity = useSharedValue(0.6);
  const corner4Opacity = useSharedValue(0.6);

  useEffect(() => {
    // Glow pulse animation
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

    // Corner pulse animations with stagger
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

    // Scan line animation
    scanLinePosition.value = withRepeat(
      withSequence(
        withTiming(125, { duration: 2250, easing: Easing.inOut(Easing.ease) }),
        withTiming(15, { duration: 0 })
      ),
      -1
    );
    
    // Scan line opacity animation
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

  // Animated styles
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const scanLineStyle = useAnimatedStyle(() => ({
    top: scanLinePosition.value,
    opacity: scanLineOpacity.value,
  }));

  const corner1Style = useAnimatedStyle(() => ({
    opacity: corner1Opacity.value,
  }));
  const corner2Style = useAnimatedStyle(() => ({
    opacity: corner2Opacity.value,
  }));
  const corner3Style = useAnimatedStyle(() => ({
    opacity: corner3Opacity.value,
  }));
  const corner4Style = useAnimatedStyle(() => ({
    opacity: corner4Opacity.value,
  }));

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
      {/* Scanner Viewport */}
      <View style={styles.scannerViewport}>
        <View style={styles.scannerFrame}>
          {/* Animated Glow Behind Frame */}
          <Animated.View style={[styles.scannerGlow, glowStyle, { 
            backgroundColor: isDark ? 'rgba(77,208,225,0.15)' : 'rgba(0,126,167,0.12)' 
          }]} />
          
          {/* Corner Brackets with Pulse */}
          <Animated.View style={[styles.corner, styles.cornerTL, corner1Style, { borderColor: accentColor }]} />
          <Animated.View style={[styles.corner, styles.cornerTR, corner2Style, { borderColor: accentColor }]} />
          <Animated.View style={[styles.corner, styles.cornerBL, corner3Style, { borderColor: accentColor }]} />
          <Animated.View style={[styles.corner, styles.cornerBR, corner4Style, { borderColor: accentColor }]} />
          
          {/* Scanning Line */}
          <Animated.View style={[styles.scanLine, scanLineStyle]}>
            <LinearGradient
              colors={['transparent', accentColor, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scanLineGradient}
            />
          </Animated.View>
          
          {/* House Icon */}
          <View style={styles.houseIcon}>
            <Svg viewBox="0 0 100 80" style={{ width: 80, height: 65 }}>
              <Path 
                d="M50 5L5 40h10v35h70V40h10L50 5zm-20 65V45h15v25H30zm25 0V45h15v25H55z" 
                fill={isDark ? '#aab2bd' : '#07172e'}
                opacity={isDark ? 0.35 : 0.15}
              />
            </Svg>
          </View>
        </View>
      </View>

      {/* Property Badge */}
      <View style={[
        styles.propertyBadge,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(7,23,46,0.03)' }
      ]}>
        <Text style={[styles.propertyLabel, { color: accentColor }]}>PROPERTY LOCATED</Text>
        <Text style={[styles.propertyAddress, { color: isDark ? '#fff' : '#07172e' }]}>
          123 Main Street, Anytown
        </Text>
      </View>

      {/* Action Buttons - SVG */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.svgButton} onPress={onScanPress}>
          <Svg viewBox="0 0 150 50" style={styles.buttonSvg}>
            <Defs>
              <SvgLinearGradient id="btnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={buttonGradientStart} />
                <Stop offset="100%" stopColor={buttonGradientEnd} />
              </SvgLinearGradient>
            </Defs>
            <Rect width="150" height="50" rx="12" fill="url(#btnGradient)" />
            <SvgText 
              x="75" 
              y="30" 
              textAnchor="middle" 
              fill="white" 
              fontFamily="Inter, system-ui, sans-serif" 
              fontSize="14" 
              fontWeight="600"
            >
              Point &amp; Scan
            </SvgText>
          </Svg>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.svgButton} onPress={onAddressPress}>
          <Svg viewBox="0 0 150 50" style={styles.buttonSvg}>
            <Rect 
              width="150" 
              height="50" 
              rx="12" 
              fill={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.04)'} 
              stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(7,23,46,0.12)'}
              strokeWidth="1"
            />
            <SvgText 
              x="75" 
              y="30" 
              textAnchor="middle" 
              fill={isDark ? 'white' : '#07172e'}
              fontFamily="Inter, system-ui, sans-serif" 
              fontSize="14" 
              fontWeight="600"
            >
              Enter Address
            </SvgText>
          </Svg>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// Strategy Card Component
function StrategyCard({ 
  name, 
  roi, 
  icon, 
  label, 
  color, 
  isDark 
}: {
  name: string;
  roi: string;
  icon: string;
  label: string;
  color: string;
  isDark: boolean;
}) {
  return (
    <View style={[
      styles.strategyCard,
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      },
      !isDark && styles.strategyCardShadow
    ]}>
      <View style={[styles.strategyIconWrap, { backgroundColor: `${color}15` }]}>
        <Text style={styles.strategyIcon}>{icon}</Text>
      </View>
      <Text style={[styles.strategyName, { color: isDark ? '#aab2bd' : '#6b7280' }]} numberOfLines={2}>
        {name}
      </Text>
      <Text style={[styles.strategyRoi, { color }]}>{roi}</Text>
      <Text style={[styles.strategyRoiLabel, { color: '#6b7280' }]}>{label}</Text>
    </View>
  );
}

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
    marginBottom: 28,
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

  // Hero Section - 3 Lines
  heroSection: {
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  heroLine1: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
  },
  heroLine2: {
    fontSize: 28,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 10,
  },
  heroLine3: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 3.2,
  },

  // Scanner Card Container
  scannerCardContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },

  // Scanner Card
  scannerCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },

  // Scanner Viewport
  scannerViewport: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scannerFrame: {
    width: 160,
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
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 6,
  },
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
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

  // Property Badge
  propertyBadge: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  propertyLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.9,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  svgButton: {
    flex: 1,
    height: 50,
  },
  buttonSvg: {
    width: '100%',
    height: 50,
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

  // Strategy Section
  strategySection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
  },
  strategyScrollContainer: {
    // Allow cards to overflow
  },
  strategyScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  strategyCard: {
    width: 130,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  strategyCardShadow: {
    shadowColor: '#07172e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  strategyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  strategyIcon: {
    fontSize: 20,
  },
  strategyName: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginBottom: 8,
    minHeight: 32,
  },
  strategyRoi: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  strategyRoiLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 18,
    marginHorizontal: 20,
    marginBottom: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 21,
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
    marginBottom: 12,
  },
  ctaButtonSvg: {
    width: '100%',
    height: 56,
  },
  trustText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
