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
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Strategy data
const strategies = [
  { name: 'Long-Term Rental', roi: '18%', icon: 'home-outline', multiplier: '3X', profit: '$42K', featured: false },
  { name: 'Short-Term Rental', roi: '28%', icon: 'calendar-outline', multiplier: '5X', profit: '$68K', featured: false },
  { name: 'Fix & Flip', roi: '22%', icon: 'hammer-outline', multiplier: '2X', profit: '$55K', featured: false },
  { name: 'BRRRR', roi: '35%', icon: 'refresh-outline', multiplier: '7X', profit: '$81K', featured: true },
  { name: 'House Hack', roi: '25%', icon: 'people-outline', multiplier: '4X', profit: '$48K', featured: false },
  { name: 'Wholesale', roi: '12%', icon: 'swap-horizontal-outline', multiplier: '1.5X', profit: '$22K', featured: false },
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
    // Note: isSearching state resets automatically when component unmounts during navigation
  };

  const handleScanPress = () => {
    router.push('/(tabs)/scan');
  };

  const handleStartAnalyzing = () => {
    // Show search bar and scroll to top
    setShowSearchBar(true);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: { backgroundColor: isDark ? colors.navy[900] : colors.gray[50] },
    headerButton: { 
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      borderColor: isDark ? 'rgba(255,255,255,0.15)' : colors.gray[200],
    },
    headerButtonText: { color: isDark ? '#e1e8ed' : colors.navy[900] },
    heroTitle: { color: isDark ? '#fff' : colors.navy[900] },
    heroTitleAccent: { color: isDark ? colors.accent[500] : colors.accent.light },
    heroSubtitle: { color: isDark ? '#fff' : colors.gray[600] },
    searchToggleText: { color: isDark ? '#fff' : colors.primary[600] },
    searchDropdown: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.gray[200],
    },
    searchInputContainer: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff',
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.gray[200],
    },
    searchInput: { color: isDark ? '#fff' : colors.navy[900] },
    searchPlaceholder: isDark ? 'rgba(255,255,255,0.5)' : colors.gray[400],
    phoneFrame: { backgroundColor: isDark ? '#1a2a3a' : '#e0e8f0' },
    phoneScreen: { backgroundColor: isDark ? '#0a1628' : '#1a2a3a' },
    resultsSection: { backgroundColor: isDark ? '#0a1628' : colors.gray[100] },
    resultsTitle: { color: isDark ? '#fff' : colors.navy[900] },
    mobileCard: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.gray[200],
    },
    mobileCardName: { color: isDark ? '#fff' : colors.navy[900] },
    mobileCardRoi: { color: isDark ? '#fff' : colors.navy[900] },
    mobileCardRoiLabel: { color: isDark ? '#fff' : colors.gray[600] },
    statsRow: { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff' },
    statLabel: { color: isDark ? '#fff' : colors.gray[600] },
    bottomCtaSubtext: { color: isDark ? '#fff' : colors.gray[600] },
  };

  return (
    <View style={[styles.container, dynamicStyles.container, { paddingTop: insets.top }]}>
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
            <Image
              source={isDark 
                ? require('../../assets/InvestIQ Logo 3D (Dark View).png')
                : require('../../assets/InvestIQ Logo 3D (Light View).png')
              }
              style={styles.logoLarge}
              resizeMode="contain"
            />
            
            {/* Theme Toggle */}
            <TouchableOpacity 
              style={[styles.themeToggle, dynamicStyles.headerButton]}
              onPress={toggleTheme}
            >
              <Ionicons 
                name={isDark ? 'sunny' : 'moon'} 
                size={20} 
                color={isDark ? colors.accent[500] : colors.navy[900]} 
              />
            </TouchableOpacity>
          </View>

          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={[styles.heroTitle, dynamicStyles.heroTitle]}>
              Know the Real Return
            </Text>
            <Text style={[styles.heroTitleAccentLine, dynamicStyles.heroTitleAccent]}>
              Before You Buy
            </Text>
            <Text style={[styles.heroSubtitle, dynamicStyles.heroSubtitle]}>
              Instantly reveal a property's real{'\n'}investment potential in 60 seconds.
            </Text>
          </View>

          {/* Scanner Viewfinder with integrated CTAs */}
          <View style={styles.phoneMockupContainer}>
            <PhoneMockup 
              onScanPress={handleScanPress} 
              onAddressPress={() => setShowSearchBar(!showSearchBar)}
              isDark={isDark}
            />
            
            {/* Address Search Dropdown */}
            {showSearchBar && (
              <View style={[styles.searchDropdown, dynamicStyles.searchDropdown]}>
                <View style={[styles.searchInputContainer, dynamicStyles.searchInputContainer]}>
                  <Ionicons name="location" size={20} color={colors.accent[500]} />
                  <TextInput
                    style={[styles.searchInput, dynamicStyles.searchInput]}
                    placeholder="Enter property address..."
                    placeholderTextColor={dynamicStyles.searchPlaceholder}
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

          {/* Results Section - Redesigned for Mobile */}
          <View style={[styles.resultsSection, dynamicStyles.resultsSection]}>
            <Text style={[styles.resultsTitle, dynamicStyles.resultsTitle]}>
              See Your <Text style={styles.resultsTitleAccent}>Profit Potential</Text>
            </Text>
            
            {/* Horizontal Scrolling Strategy Cards */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.strategyScroll}
              style={styles.strategyScrollContainer}
            >
              {strategies.map((strategy, idx) => (
                <MobileStrategyCard key={idx} {...strategy} isDark={isDark} />
              ))}
            </ScrollView>

            {/* Compact Stats Row */}
            <View style={[styles.statsRow, dynamicStyles.statsRow]}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>10K+</Text>
                <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Analyzed</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.profit.main }]}>$2.4M</Text>
                <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Profit Found</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>60s</Text>
                <Text style={[styles.statLabel, dynamicStyles.statLabel]}>Analysis</Text>
              </View>
            </View>

            {/* Bottom CTA */}
            <TouchableOpacity style={styles.bottomCta} onPress={handleStartAnalyzing}>
              <LinearGradient
                colors={[colors.primary[500], colors.accent[500]]}
                style={styles.bottomCtaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.bottomCtaText}>Start Analyzing Now</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={[styles.bottomCtaSubtext, dynamicStyles.bottomCtaSubtext]}>Free • No credit card required</Text>
          </View>

          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Scanner Viewfinder Component with integrated CTAs
function PhoneMockup({ 
  onScanPress, 
  onAddressPress,
  isDark 
}: { 
  onScanPress: () => void; 
  onAddressPress: () => void;
  isDark: boolean;
}) {
  return (
    <View style={styles.scannerMockup}>
      {/* Analyzing Header */}
      <View style={styles.analyzingHeader}>
        <Text style={styles.analyzingText}>Analyzing Data</Text>
        <View style={styles.loadingDots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>

      {/* Viewfinder Container */}
      <View style={styles.viewfinderContainer}>
        {/* House with Scanner Brackets */}
        <View style={styles.scannerView}>
          <Svg width={180} height={140} viewBox="0 0 200 160">
            {/* Main house body */}
            <Rect x="30" y="70" width="140" height="80" fill="#4a6070" rx={2} />
            {/* Roof */}
            <Path d="M100 20 L20 70 L180 70 Z" fill="#3a4a55" />
            <Path d="M100 20 L25 70 L175 70" stroke={colors.accent[500]} strokeWidth={1} fill="none" opacity={0.3} />
            {/* Porch roof */}
            <Rect x="55" y="100" width="90" height="8" fill="#2a3a45" />
            {/* Door */}
            <Rect x="85" y="105" width="30" height="45" fill="#2a3540" rx={2} />
            <Circle cx="108" cy="130" r="2" fill={colors.accent[500]} opacity={0.6} />
            {/* Windows - left */}
            <Rect x="40" y="80" width="30" height="25" fill="#1a2530" rx={1} />
            <Rect x="40" y="80" width="30" height="25" fill="none" stroke={colors.accent[500]} strokeWidth={0.5} opacity={0.4} rx={1} />
            {/* Windows - right */}
            <Rect x="130" y="80" width="30" height="25" fill="#1a2530" rx={1} />
            <Rect x="130" y="80" width="30" height="25" fill="none" stroke={colors.accent[500]} strokeWidth={0.5} opacity={0.4} rx={1} />
            {/* Attic window */}
            <Circle cx="100" cy="50" r="12" fill="#1a2530" />
            <Circle cx="100" cy="50" r="12" fill="none" stroke={colors.accent[500]} strokeWidth={0.5} opacity={0.4} />
            {/* Porch pillars */}
            <Rect x="60" y="100" width="6" height="50" fill="#4a5a65" />
            <Rect x="134" y="100" width="6" height="50" fill="#4a5a65" />
            {/* Ground */}
            <Rect x="0" y="148" width="200" height="12" fill="#1a2a35" />
          </Svg>
          
          {/* Scanner Brackets */}
          <View style={styles.bracketTopLeft}>
            <View style={[styles.bracketH, { top: 0 }]} />
            <View style={[styles.bracketV, { left: 0 }]} />
          </View>
          <View style={styles.bracketTopRight}>
            <View style={[styles.bracketH, { top: 0 }]} />
            <View style={[styles.bracketV, { right: 0 }]} />
          </View>
          <View style={styles.bracketBottomLeft}>
            <View style={[styles.bracketH, { bottom: 0 }]} />
            <View style={[styles.bracketV, { left: 0 }]} />
          </View>
          <View style={styles.bracketBottomRight}>
            <View style={[styles.bracketH, { bottom: 0 }]} />
            <View style={[styles.bracketV, { right: 0 }]} />
          </View>
        </View>

        {/* Location Card */}
        <View style={styles.locationCard}>
          <Text style={styles.locationLabel}>PROPERTY LOCATED</Text>
          <Text style={styles.locationAddress}>123 Main Street, Anytown</Text>
        </View>

        {/* Search by either label */}
        <Text style={styles.searchByEither}>Search by either</Text>

        {/* Action Buttons - Now the main CTAs */}
        <View style={styles.phoneActions}>
          <TouchableOpacity style={styles.phoneScanBtn} onPress={onScanPress}>
            <Ionicons name="camera" size={16} color={colors.navy[900]} style={{ marginRight: 6 }} />
            <Text style={styles.phoneScanBtnText}>Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.phoneDetailsBtn} onPress={onAddressPress}>
            <Ionicons name="location" size={16} color="#e1e8ed" style={{ marginRight: 6 }} />
            <Text style={styles.phoneDetailsBtnText}>Address</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// Mobile Strategy Card - Horizontal scroll optimized
function MobileStrategyCard({ name, roi, icon, multiplier, profit, featured, isDark }: {
  name: string;
  roi: string;
  icon: string;
  multiplier: string;
  profit: string;
  featured: boolean;
  isDark: boolean;
}) {
  const cardStyles = {
    card: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.gray[200],
    },
    name: { color: isDark ? '#fff' : colors.navy[900] },
    roi: { color: isDark ? '#fff' : colors.navy[900] },
    roiLabel: { color: isDark ? '#fff' : colors.gray[600] },
  };

  return (
    <View style={[styles.mobileCard, cardStyles.card, featured && styles.mobileCardFeatured]}>
      {/* Badge */}
      {featured ? (
        <View style={styles.mobileBestBadge}>
          <Text style={styles.mobileBestBadgeText}>BEST</Text>
        </View>
      ) : (
        <View style={styles.mobileMultiplierBadge}>
          <Text style={styles.mobileMultiplierText}>{multiplier}</Text>
        </View>
      )}
      
      {/* Icon */}
      <View style={[styles.mobileCardIcon, featured && styles.mobileCardIconFeatured]}>
        <Ionicons 
          name={icon as any} 
          size={24} 
          color={featured ? colors.accent[400] : colors.primary[400]} 
        />
      </View>
      
      {/* Name */}
      <Text style={[styles.mobileCardName, cardStyles.name]} numberOfLines={2}>{name}</Text>
      
      {/* ROI */}
      <Text style={[styles.mobileCardRoi, cardStyles.roi, featured && styles.mobileCardRoiFeatured]}>{roi}</Text>
      <Text style={[styles.mobileCardRoiLabel, cardStyles.roiLabel]}>ROI</Text>
      
      {/* Profit */}
      <View style={styles.mobileCardProfit}>
        <Text style={[styles.mobileCardProfitValue, featured && styles.mobileCardProfitFeatured]}>
          {profit}
        </Text>
      </View>
    </View>
  );
}

// Feature Item Component
function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon as any} size={20} color={colors.accent[500]} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
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
    paddingVertical: 16,
  },
  logoLarge: {
    width: 140,
    height: 44,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 30,
  },
  heroTitleAccentLine: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 2,
  },
  heroAccent: {
    color: colors.accent[500],
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 10,
  },

  // Search Dropdown (shown below scanner when Address is tapped)
  searchDropdown: {
    width: '100%',
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

  // Scanner Mockup with integrated CTAs
  phoneMockupContainer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  scannerMockup: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  viewfinderContainer: {
    width: '100%',
    backgroundColor: '#1a3a4a',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 15,
  },
  analyzingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  analyzingText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent[500],
  },
  scannerView: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 160,
    position: 'relative',
    backgroundColor: 'rgba(15, 35, 50, 0.8)',
    borderRadius: 16,
  },
  bracketTopLeft: { position: 'absolute', top: 16, left: 16, width: 28, height: 28 },
  bracketTopRight: { position: 'absolute', top: 16, right: 16, width: 28, height: 28 },
  bracketBottomLeft: { position: 'absolute', bottom: 16, left: 16, width: 28, height: 28 },
  bracketBottomRight: { position: 'absolute', bottom: 16, right: 16, width: 28, height: 28 },
  bracketH: {
    position: 'absolute',
    width: 28,
    height: 3,
    backgroundColor: colors.accent[500],
    borderRadius: 2,
  },
  bracketV: {
    position: 'absolute',
    width: 3,
    height: 28,
    backgroundColor: colors.accent[500],
    borderRadius: 2,
  },
  locationCard: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  locationLabel: {
    color: colors.accent[500],
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  locationAddress: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  searchByEither: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  phoneActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  phoneScanBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.accent[500],
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  phoneScanBtnText: {
    color: colors.navy[900],
    fontSize: 15,
    fontWeight: '700',
  },
  phoneDetailsBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneDetailsBtnText: {
    color: '#e1e8ed',
    fontSize: 15,
    fontWeight: '600',
  },

  // Results Section
  resultsSection: {
    paddingVertical: 32,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  resultsTitleAccent: {
    color: colors.accent[500],
  },

  // Horizontal Scroll Strategy Cards
  strategyScrollContainer: {
    marginBottom: 24,
  },
  strategyScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  mobileCard: {
    width: 130,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  mobileCardFeatured: {
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderColor: 'rgba(0,229,255,0.25)',
    borderWidth: 2,
  },
  mobileBestBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.accent[500],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mobileBestBadgeText: {
    color: colors.navy[900],
    fontSize: 13,
    fontWeight: '800',
  },
  mobileMultiplierBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(34,197,94,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mobileMultiplierText: {
    color: colors.profit.main,
    fontSize: 13,
    fontWeight: '700',
  },
  mobileCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(4,101,242,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  mobileCardIconFeatured: {
    backgroundColor: 'rgba(0,229,255,0.2)',
  },
  mobileCardName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    minHeight: 32,
  },
  mobileCardRoi: {
    fontSize: 28,
    fontWeight: '800',
  },
  mobileCardRoiFeatured: {
    color: colors.accent[400],
  },
  mobileCardRoiLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  mobileCardProfit: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mobileCardProfitValue: {
    color: colors.profit.main,
    fontSize: 13,
    fontWeight: '700',
  },
  mobileCardProfitFeatured: {
    color: colors.accent[400],
  },

  // Compact Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: colors.accent[500],
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Bottom CTA
  bottomCta: {
    marginHorizontal: 20,
    borderRadius: 14,
    overflow: 'hidden',
  },
  bottomCtaGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  bottomCtaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomCtaSubtext: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 8,
  },

  // Features Bar
  featuresBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#061324',
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
