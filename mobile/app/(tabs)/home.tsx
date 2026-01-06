import { useState } from 'react';
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
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleAnalyze = async () => {
    if (!searchAddress.trim()) return;
    setIsSearching(true);
    try {
      router.push(`/property/${encodeURIComponent(searchAddress.trim())}`);
    } catch {
      // Navigation failed
    } finally {
      setIsSearching(false);
    }
  };

  const handleScanPress = () => {
    router.push('/(tabs)/scan');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>
                Invest<Text style={styles.logoAccent}>IQ</Text>
              </Text>
            </View>
            
            {isAuthenticated && user ? (
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => router.push('/(tabs)/dashboard')}
              >
                <Text style={styles.headerButtonText}>Dashboard</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => router.push('/auth/login')}
              >
                <Text style={styles.headerButtonText}>Sign In</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>
              Analyze Any Property's{'\n'}Potential in{' '}
              <Text style={styles.heroAccent}>60 Seconds</Text>
            </Text>
            <Text style={styles.heroSubtitle}>
              Compare 6 investment strategies and discover your best path to profit
            </Text>
          </View>

          {/* CTA Buttons */}
          <View style={styles.ctaSection}>
            <TouchableOpacity style={styles.scanButton} onPress={handleScanPress}>
              <LinearGradient
                colors={[colors.primary[500], '#0876ff']}
                style={styles.scanButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="camera" size={22} color="#fff" />
                <Text style={styles.scanButtonText}>Point & Scan</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Search Toggle */}
            <TouchableOpacity 
              style={styles.searchToggle}
              onPress={() => setShowSearchBar(!showSearchBar)}
            >
              <Text style={styles.searchToggleText}>Or search by address</Text>
              <Ionicons 
                name={showSearchBar ? 'chevron-up' : 'chevron-down'} 
                size={16} 
                color="#fff" 
              />
            </TouchableOpacity>

            {/* Search Dropdown */}
            {showSearchBar && (
              <View style={styles.searchDropdown}>
                <View style={styles.searchInputContainer}>
                  <Ionicons name="location" size={20} color={colors.accent[500]} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Enter property address..."
                    placeholderTextColor="rgba(255,255,255,0.5)"
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

          {/* Phone Mockup */}
          <View style={styles.phoneMockupContainer}>
            <PhoneMockup />
          </View>

          {/* Results Section */}
          <View style={styles.resultsSection}>
            {/* Glow Effect */}
            <View style={styles.glowEffect} />
            
            <Text style={styles.resultsTitle}>
              See Your <Text style={styles.resultsTitleAccent}>Profit Potential</Text>
            </Text>
            <Text style={styles.resultsSubtitle}>Compare 6 strategies instantly</Text>

            {/* Strategy Cards */}
            <View style={styles.strategyGrid}>
              {strategies.map((strategy, idx) => (
                <StrategyCard key={idx} {...strategy} />
              ))}
            </View>

            {/* Social Proof */}
            <View style={styles.socialProof}>
              <View style={styles.socialProofItem}>
                <Text style={styles.socialProofValue}>10K+</Text>
                <Text style={styles.socialProofLabel}>Properties Analyzed</Text>
              </View>
              <View style={styles.socialProofDivider} />
              <View style={styles.socialProofItem}>
                <Text style={[styles.socialProofValue, { color: colors.profit.main }]}>$2.4M</Text>
                <Text style={styles.socialProofLabel}>Profit Identified</Text>
              </View>
              <View style={styles.socialProofDivider} />
              <View style={styles.socialProofItem}>
                <Text style={styles.socialProofValue}>60s</Text>
                <Text style={styles.socialProofLabel}>Avg Analysis</Text>
              </View>
            </View>

            {/* Bottom CTA */}
            <TouchableOpacity style={styles.bottomCta} onPress={handleScanPress}>
              <LinearGradient
                colors={[colors.primary[500], colors.accent[500]]}
                style={styles.bottomCtaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.bottomCtaText}>Start Analyzing Now</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.bottomCtaSubtext}>Free • No credit card required</Text>
          </View>

          {/* Features Bar */}
          <View style={styles.featuresBar}>
            <FeatureItem icon="camera" text="Point & Scan" />
            <FeatureItem icon="time" text="60 Seconds" />
            <FeatureItem icon="bar-chart" text="6 Strategies" />
          </View>

          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Phone Mockup Component
function PhoneMockup() {
  return (
    <View style={styles.phoneFrame}>
      <View style={styles.phoneScreen}>
        {/* Dynamic Island */}
        <View style={styles.dynamicIsland} />
        
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <Text style={styles.statusTime}>9:41</Text>
          <View style={styles.statusIcons}>
            <View style={styles.signalBars}>
              <View style={[styles.signalBar, { height: 4 }]} />
              <View style={[styles.signalBar, { height: 6 }]} />
              <View style={[styles.signalBar, { height: 8 }]} />
              <View style={[styles.signalBar, { height: 10, opacity: 0.3 }]} />
            </View>
            <Ionicons name="battery-full" size={16} color="#fff" />
          </View>
        </View>

        {/* Analyzing Header */}
        <View style={styles.analyzingHeader}>
          <Text style={styles.analyzingText}>Analyzing Data</Text>
          <View style={styles.loadingDots}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        {/* House with Scanner Brackets */}
        <View style={styles.scannerView}>
          <Svg width={120} height={80} viewBox="0 0 120 80">
            {/* House */}
            <Path
              d="M60 10 L100 40 L100 75 L20 75 L20 40 Z"
              fill="#1a3a4a"
              stroke={colors.accent[500]}
              strokeWidth={1.5}
            />
            <Rect x="45" y="50" width="30" height="25" fill="#0f2535" />
            <Circle cx="60" cy="25" r="8" fill="#2a4a5a" />
            {/* Roof */}
            <Path d="M15 42 L60 8 L105 42" stroke={colors.accent[500]} strokeWidth={2} fill="none" />
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
          <Text style={styles.locationAddress}>123 Main Street,{'\n'}Anytown</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.phoneActions}>
          <TouchableOpacity style={styles.phoneScanBtn}>
            <Text style={styles.phoneScanBtnText}>Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.phoneDetailsBtn}>
            <Text style={styles.phoneDetailsBtnText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// Strategy Card Component
function StrategyCard({ name, roi, icon, multiplier, profit, featured }: {
  name: string;
  roi: string;
  icon: string;
  multiplier: string;
  profit: string;
  featured: boolean;
}) {
  return (
    <View style={[styles.strategyCard, featured && styles.strategyCardFeatured]}>
      {featured && (
        <View style={styles.bestBadge}>
          <Text style={styles.bestBadgeText}>BEST ROI</Text>
        </View>
      )}
      {!featured && multiplier && (
        <View style={styles.multiplierBadge}>
          <Text style={styles.multiplierBadgeText}>{multiplier}</Text>
        </View>
      )}
      
      <View style={styles.strategyHeader}>
        <View style={[styles.strategyIcon, featured && styles.strategyIconFeatured]}>
          <Ionicons 
            name={icon as any} 
            size={20} 
            color={featured ? colors.accent[400] : colors.primary[400]} 
          />
        </View>
        <Text style={styles.strategyName} numberOfLines={1}>{name}</Text>
      </View>

      <View style={styles.strategyMetrics}>
        <View>
          <Text style={styles.strategyRoiLabel}>ROI</Text>
          <Text style={[styles.strategyRoi, featured && styles.strategyRoiFeatured]}>{roi}</Text>
        </View>
        
        {/* Mini Chart */}
        <View style={styles.miniChart}>
          {[3, 5, 4, 7, 6, 9, 8, 12].map((h, i) => (
            <View 
              key={i}
              style={[
                styles.chartBar,
                { 
                  height: h * 2,
                  backgroundColor: featured ? colors.accent[500] : colors.primary[500],
                  opacity: 0.4 + (i * 0.08)
                }
              ]} 
            />
          ))}
          <Ionicons 
            name="arrow-up" 
            size={12} 
            color={featured ? colors.accent[400] : colors.profit.main} 
            style={{ marginLeft: 4 }}
          />
        </View>
      </View>

      {profit && (
        <View style={styles.profitRow}>
          <Text style={styles.profitLabel}>Est. Profit</Text>
          <View style={styles.profitValue}>
            <Text style={[styles.profitAmount, featured && styles.profitAmountFeatured]}>{profit}</Text>
            {featured && multiplier && (
              <View style={styles.profitMultiplier}>
                <Text style={styles.profitMultiplierText}>{multiplier}</Text>
              </View>
            )}
          </View>
        </View>
      )}
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
    backgroundColor: colors.navy[900],
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
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  logoAccent: {
    color: colors.accent[500],
  },
  headerButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  headerButtonText: {
    color: '#e1e8ed',
    fontSize: 14,
    fontWeight: '600',
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 34,
  },
  heroAccent: {
    color: colors.accent[500],
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#8892a0',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },

  // CTA Section
  ctaSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'center',
  },
  scanButton: {
    width: '100%',
    maxWidth: 280,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 15,
    elevation: 8,
  },
  scanButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  searchToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  searchToggleText: {
    color: '#fff',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  searchDropdown: {
    width: '100%',
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
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

  // Phone Mockup
  phoneMockupContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  phoneFrame: {
    width: 180,
    backgroundColor: '#1a2a3a',
    borderRadius: 36,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  phoneScreen: {
    backgroundColor: '#0a1628',
    borderRadius: 30,
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 12,
    minHeight: 340,
  },
  dynamicIsland: {
    width: 80,
    height: 24,
    backgroundColor: '#000',
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 8,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  statusTime: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
  },
  signalBar: {
    width: 3,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  analyzingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 12,
  },
  analyzingText: {
    color: '#fff',
    fontSize: 10,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 2,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.accent[500],
  },
  scannerView: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    position: 'relative',
  },
  bracketTopLeft: { position: 'absolute', top: 0, left: 20, width: 20, height: 20 },
  bracketTopRight: { position: 'absolute', top: 0, right: 20, width: 20, height: 20 },
  bracketBottomLeft: { position: 'absolute', bottom: 0, left: 20, width: 20, height: 20 },
  bracketBottomRight: { position: 'absolute', bottom: 0, right: 20, width: 20, height: 20 },
  bracketH: {
    position: 'absolute',
    width: 20,
    height: 2,
    backgroundColor: colors.accent[500],
  },
  bracketV: {
    position: 'absolute',
    width: 2,
    height: 20,
    backgroundColor: colors.accent[500],
  },
  locationCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  locationLabel: {
    color: colors.accent[500],
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  locationAddress: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
  phoneActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  phoneScanBtn: {
    flex: 1,
    backgroundColor: colors.accent[500],
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  phoneScanBtnText: {
    color: colors.navy[900],
    fontSize: 12,
    fontWeight: '700',
  },
  phoneDetailsBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  phoneDetailsBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Results Section
  resultsSection: {
    backgroundColor: '#0a1628',
    paddingHorizontal: 20,
    paddingVertical: 48,
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -150,
    width: 300,
    height: 150,
    backgroundColor: colors.accent[500],
    opacity: 0.1,
    borderRadius: 150,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  resultsTitleAccent: {
    color: colors.accent[500],
  },
  resultsSubtitle: {
    fontSize: 14,
    color: '#8892a0',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  strategyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  strategyCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  strategyCardFeatured: {
    backgroundColor: 'rgba(0,229,255,0.1)',
    borderColor: 'rgba(0,229,255,0.3)',
    borderWidth: 2,
  },
  bestBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.accent[500],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bestBadgeText: {
    color: colors.navy[900],
    fontSize: 9,
    fontWeight: '800',
  },
  multiplierBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(34,197,94,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  multiplierBadgeText: {
    color: colors.profit.main,
    fontSize: 10,
    fontWeight: '700',
  },
  strategyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  strategyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(4,101,242,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  strategyIconFeatured: {
    backgroundColor: 'rgba(0,229,255,0.3)',
  },
  strategyName: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  strategyMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  strategyRoiLabel: {
    color: '#8892a0',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  strategyRoi: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  strategyRoiFeatured: {
    color: colors.accent[400],
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 30,
  },
  chartBar: {
    width: 3,
    borderRadius: 1,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  profitLabel: {
    color: '#8892a0',
    fontSize: 11,
  },
  profitValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profitAmount: {
    color: colors.profit.main,
    fontSize: 14,
    fontWeight: '700',
  },
  profitAmountFeatured: {
    color: colors.accent[400],
  },
  profitMultiplier: {
    backgroundColor: 'rgba(0,229,255,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  profitMultiplierText: {
    color: colors.accent[300],
    fontSize: 9,
    fontWeight: '700',
  },

  // Social Proof
  socialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  socialProofItem: {
    alignItems: 'center',
    flex: 1,
  },
  socialProofValue: {
    color: colors.accent[500],
    fontSize: 24,
    fontWeight: '800',
  },
  socialProofLabel: {
    color: '#8892a0',
    fontSize: 11,
    marginTop: 4,
  },
  socialProofDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Bottom CTA
  bottomCta: {
    marginTop: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bottomCtaGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  bottomCtaText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  bottomCtaSubtext: {
    color: '#8892a0',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
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
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
});
