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
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const { theme, isDark } = useTheme();
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSearch = () => {
    if (searchAddress.trim()) {
      setIsSearching(true);
      router.push(`/property/${encodeURIComponent(searchAddress.trim())}`);
      setIsSearching(false);
    }
  };

  const handleScanPress = () => {
    router.push('/(tabs)/scan');
  };

  const handleMapPress = () => {
    router.push('/(tabs)/map');
  };

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: { backgroundColor: theme.background },
    logoText: { color: theme.text },
    signInText: { color: theme.text },
    heroTitle: { color: theme.text },
    heroHighlight: { color: theme.text },
    heroSubtitle: { color: theme.textMuted },
    searchInputContainer: { 
      backgroundColor: theme.card, 
      borderColor: isDark ? theme.border : colors.gray[200] 
    },
    searchInput: { color: theme.text },
    featuresTitle: { color: theme.text },
    featureCard: { backgroundColor: theme.card },
    featureTitle: { color: theme.text },
    featureDescription: { color: theme.textMuted },
    featureIconContainer: { 
      backgroundColor: isDark ? colors.primary[900] : colors.primary[50] 
    },
    mapButton: { 
      backgroundColor: theme.card,
      borderColor: isDark ? colors.primary[700] : colors.primary[200],
    },
  };

  return (
    <View style={[styles.container, dynamicStyles.container, { paddingTop: insets.top }]}>
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
              <Text style={[styles.logoText, dynamicStyles.logoText]}>
                Invest<Text style={styles.logoAccent}>IQ</Text>
              </Text>
            </View>
            
            {isAuthenticated && user ? (
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => router.push('/(tabs)/settings')}
              >
                <Ionicons name="person-circle-outline" size={32} color={colors.primary[isDark ? 400 : 600]} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.signInButton}
                onPress={() => router.push('/auth/login')}
              >
                <Text style={[styles.signInText, dynamicStyles.signInText]}>Sign In</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={[styles.heroTitle, dynamicStyles.heroTitle]}>
              Analyze Investment{'\n'}Real Estate
            </Text>
            <Text style={[styles.heroHighlight, dynamicStyles.heroHighlight]}>
              in <Text style={styles.heroAccent}>60</Text> seconds!
            </Text>
            <Text style={[styles.heroSubtitle, dynamicStyles.heroSubtitle]}>
              Point & Scan or simply input address
            </Text>
          </View>

          {/* Search Section */}
          <View style={styles.searchSection}>
            <View style={[styles.searchInputContainer, dynamicStyles.searchInputContainer]}>
              <Ionicons name="location-outline" size={22} color={theme.textMuted} style={styles.searchIcon} />
              <TextInput
                ref={inputRef}
                style={[styles.searchInput, dynamicStyles.searchInput]}
                placeholder="Enter property address..."
                placeholderTextColor={theme.textMuted}
                value={searchAddress}
                onChangeText={setSearchAddress}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                autoCapitalize="words"
                autoCorrect={false}
              />
              {searchAddress.length > 0 && (
                <TouchableOpacity 
                  onPress={() => setSearchAddress('')}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.analyzeButton, !searchAddress.trim() && styles.analyzeButtonDisabled]}
              onPress={handleSearch}
              disabled={!searchAddress.trim() || isSearching}
            >
              {isSearching ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="search" size={20} color="#fff" />
                  <Text style={styles.analyzeButtonText}>Analyze</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.scanButton} onPress={handleScanPress}>
              <LinearGradient
                colors={[colors.primary[500], colors.primary[600]]}
                style={styles.scanButtonGradient}
              >
                <Ionicons name="scan-outline" size={24} color="#fff" />
                <Text style={styles.scanButtonText}>Point & Scan Property</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.mapButton, dynamicStyles.mapButton]} onPress={handleMapPress}>
              <Ionicons name="map-outline" size={22} color={colors.primary[isDark ? 400 : 600]} />
              <Text style={[styles.mapButtonText, { color: colors.primary[isDark ? 400 : 600] }]}>Explore Map</Text>
            </TouchableOpacity>
          </View>

          {/* Features Section */}
          <View style={styles.featuresSection}>
            <Text style={[styles.featuresTitle, dynamicStyles.featuresTitle]}>Instant Property Analytics</Text>
            
            <View style={styles.featureGrid}>
              <FeatureCard
                icon="cash-outline"
                title="Cash Flow"
                description="Monthly & annual projections"
                theme={theme}
                isDark={isDark}
              />
              <FeatureCard
                icon="trending-up-outline"
                title="ROI Analysis"
                description="Cap rate, CoC return"
                theme={theme}
                isDark={isDark}
              />
              <FeatureCard
                icon="layers-outline"
                title="6 Strategies"
                description="LTR, STR, BRRRR & more"
                theme={theme}
                isDark={isDark}
              />
              <FeatureCard
                icon="calculator-outline"
                title="Deal Tuning"
                description="Adjust & compare scenarios"
                theme={theme}
                isDark={isDark}
              />
            </View>
          </View>

          {/* CTA Section */}
          {!isAuthenticated && (
            <View style={styles.ctaSection}>
              <LinearGradient
                colors={[colors.primary[600], colors.primary[700]]}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaTitle}>Ready to find your next deal?</Text>
                <Text style={styles.ctaSubtitle}>Create a free account to save properties and track your portfolio</Text>
                <TouchableOpacity 
                  style={styles.ctaButton}
                  onPress={() => router.push('/auth/register')}
                >
                  <Text style={styles.ctaButtonText}>Get Started Free</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.primary[600]} />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}

          {/* Bottom Spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function FeatureCard({ icon, title, description, theme, isDark }: { 
  icon: string; 
  title: string; 
  description: string;
  theme: any;
  isDark: boolean;
}) {
  return (
    <View style={[styles.featureCard, { backgroundColor: theme.card }]}>
      <View style={[styles.featureIconContainer, { backgroundColor: isDark ? colors.primary[900] : colors.primary[50] }]}>
        <Ionicons name={icon as any} size={24} color={colors.primary[isDark ? 400 : 600]} />
      </View>
      <Text style={[styles.featureTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.featureDescription, { color: theme.textMuted }]}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.navy[900],
  },
  logoAccent: {
    color: colors.primary[600],
  },
  profileButton: {
    padding: 4,
  },
  signInButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  signInText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.navy[900],
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.navy[900],
    textAlign: 'center',
    lineHeight: 40,
  },
  heroHighlight: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.navy[900],
    textAlign: 'center',
    marginTop: 4,
  },
  heroAccent: {
    color: colors.primary[600],
    fontSize: 36,
  },
  heroSubtitle: {
    fontSize: 17,
    color: colors.gray[500],
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },

  // Search Section
  searchSection: {
    marginTop: 8,
    gap: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: colors.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: colors.navy[900],
  },
  clearButton: {
    padding: 4,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[400],
    borderRadius: 14,
    height: 56,
    gap: 8,
  },
  analyzeButtonDisabled: {
    backgroundColor: colors.primary[300],
    opacity: 0.7,
  },
  analyzeButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },

  // Action Buttons
  actionButtons: {
    marginTop: 24,
    gap: 12,
  },
  scanButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scanButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  scanButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 2,
    borderColor: colors.primary[200],
  },
  mapButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[600],
  },

  // Features Section
  featuresSection: {
    marginTop: 40,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.navy[900],
    textAlign: 'center',
    marginBottom: 20,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy[900],
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: colors.gray[500],
    textAlign: 'center',
  },

  // CTA Section
  ctaSection: {
    marginTop: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaGradient: {
    padding: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary[600],
  },
});

