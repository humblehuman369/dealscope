/**
 * Home Screen — matches new frontend DealGapIQHomepage design
 *
 * Clean hero with single search bar, scan button, verdict demo,
 * four-signal cards, toolkit section, and CTA.
 */

import { ScreenErrorFallback as ErrorBoundary } from '../../components/ScreenErrorFallback';
export { ErrorBoundary };

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
import Svg, { Circle } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Four verdict signals
const SIGNALS = [
  { title: 'Deal Gap', desc: 'Distance between Zestimate and your target buy price', value: '$38K', color: '#38bdf8', bgColor: 'rgba(56,189,248,0.12)' },
  { title: 'Rental Income', desc: 'Annual income analysis to determine income value', value: '$2,180/mo', color: '#2dd4bf', bgColor: 'rgba(45,212,191,0.12)' },
  { title: 'Target Price', desc: "The price you'd need to pay to make money", value: '$312K', color: '#34d399', bgColor: 'rgba(52,211,153,0.12)' },
  { title: 'Seller Urgency', desc: 'Signals indicating motivation to negotiate', value: 'Medium', color: '#fbbf24', bgColor: 'rgba(251,191,36,0.12)' },
];

// Toolkit features
const TOOLKIT = [
  { icon: 'bar-chart-outline' as const, title: 'Strategy', suffix: 'IQ', desc: 'Run Flip, BRRRR, Wholesale, and Long-Term Rental models simultaneously.', color: '#38bdf8', bg: 'rgba(56,189,248,0.10)' },
  { icon: 'checkmark-circle-outline' as const, title: 'Verdict', suffix: 'IQ', desc: 'The system flags properties as PASS, MARGINAL, or BUY based on your criteria.', color: '#34d399', bg: 'rgba(52,211,153,0.10)' },
  { icon: 'camera-outline' as const, title: 'Scan', suffix: 'IQ', desc: 'Snap a photo of any property or For Sale sign to pull data instantly.', color: '#a78bfa', bg: 'rgba(167,139,250,0.10)' },
  { icon: 'locate-outline' as const, title: 'Price', suffix: 'IQ', desc: 'Three numbers: Income Value, Target, and Wholesale — in 60 seconds.', color: '#38bdf8', bg: 'rgba(56,189,248,0.10)' },
  { icon: 'document-text-outline' as const, title: 'Report', suffix: 'IQ', desc: 'Generate lender-ready PDF reports. Share with partners or your team.', color: '#fbbf24', bg: 'rgba(251,191,36,0.10)' },
  { icon: 'folder-outline' as const, title: 'Pipeline', suffix: 'IQ', desc: 'Save deals, track offers, and compare opportunities side-by-side.', color: '#38bdf8', bg: 'rgba(56,189,248,0.10)' },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Redirect to onboarding if needed (only when auth is resolved to avoid flash)
  useEffect(() => {
    if (!authLoading && user && isAuthenticated && !user.onboarding_completed) {
      router.replace('/onboarding');
    }
  }, [authLoading, user, isAuthenticated, router]);

  const handleAnalyze = () => {
    if (!searchAddress.trim()) return;
    setIsSearching(true);
    router.push(`/analyzing/${encodeURIComponent(searchAddress.trim())}` as any);
  };

  const handleScanPress = () => {
    router.push('/(tabs)/scan');
  };

  // Palette
  const c = isDark
    ? {
        bg: '#0A0F1C', surface: '#0C1220', panel: '#101828', white: '#F1F5F9',
        text: '#CBD5E1', dim: '#94A3B8', faint: '#64748B', blue: '#38bdf8',
        teal: '#2dd4bf', green: '#34d399', gold: '#fbbf24', purple: '#a78bfa',
        border: 'rgba(255,255,255,0.07)', borderLight: 'rgba(255,255,255,0.12)',
      }
    : {
        bg: '#ffffff', surface: '#f8fafc', panel: '#f1f5f9', white: '#0f172a',
        text: '#475569', dim: '#64748b', faint: '#94a3b8', blue: '#0ea5e9',
        teal: '#0d9488', green: '#059669', gold: '#d97706', purple: '#7c3aed',
        border: 'rgba(0,0,0,0.06)', borderLight: 'rgba(0,0,0,0.10)',
      };

  return (
    <View style={[s.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ─── NAV ─────────────────────────────────────────────────── */}
          <View style={[s.nav, { borderBottomColor: c.border }]}>
            <Text style={[s.logo, { color: c.white }]}>
              DealGap<Text style={{ color: c.blue }}>IQ</Text>
            </Text>
            <View style={s.navRight}>
              {authLoading ? null : isAuthenticated && user ? (
                <>
                  <TouchableOpacity style={[s.navIcon, { backgroundColor: c.border }]} onPress={() => router.push('/search' as any)} accessibilityRole="button" accessibilityLabel="Search properties">
                    <Ionicons name="search" size={18} color={c.white} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.navIcon, { backgroundColor: c.border }]} onPress={() => router.push('/profile' as any)} accessibilityRole="button" accessibilityLabel="Your profile">
                    <Ionicons name="person" size={18} color={c.white} />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity onPress={() => router.push('/auth/login')} accessibilityRole="link" accessibilityLabel="Login or Register">
                  <Text style={[s.loginText, { color: c.dim }]}>Login/Register</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[s.navIcon, { backgroundColor: c.border }]} onPress={toggleTheme} accessibilityRole="button" accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
                <Ionicons name={isDark ? 'sunny' : 'moon'} size={16} color={c.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ─── HERO ────────────────────────────────────────────────── */}
          <View style={s.hero}>
            {/* Badge */}
            <View style={[s.badge, { backgroundColor: isDark ? 'rgba(52,211,153,0.08)' : 'rgba(52,211,153,0.12)', borderColor: isDark ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.3)' }]}>
              <View style={s.badgeDot} />
              <Text style={[s.badgeText, { color: c.green }]}>Real estate investment intelligence</Text>
            </View>

            <Text style={[s.heroTitle, { color: c.white }]}>
              Stop Researching Deals That Were{' '}
              <Text style={{ color: c.teal }}>Never Going to Work.</Text>
            </Text>

            <Text style={[s.heroSub, { color: c.text }]}>
              Scan any property and know in 60 seconds if it's worth your time — before you waste a weekend running numbers.
            </Text>

            {/* Search input */}
            <TouchableOpacity
              style={[s.searchRow, { backgroundColor: c.panel, borderColor: c.borderLight }]}
              activeOpacity={0.8}
              onPress={() => inputRef.current?.focus()}
            >
              <Ionicons name="location" size={18} color={c.dim} style={{ marginLeft: 4 }} accessibilityElementsHidden />
              <TextInput
                ref={inputRef}
                style={[s.searchInput, { color: c.white }]}
                placeholder="Enter property address..."
                placeholderTextColor={c.faint}
                value={searchAddress}
                onChangeText={setSearchAddress}
                onSubmitEditing={handleAnalyze}
                returnKeyType="search"
                accessibilityLabel="Property address"
                accessibilityHint="Enter an address to analyze investment potential"
              />
              <TouchableOpacity
                style={[s.analyzeBtn, { backgroundColor: c.blue }, !searchAddress.trim() && { opacity: 0.4 }]}
                onPress={handleAnalyze}
                disabled={!searchAddress.trim() || isSearching}
                accessibilityRole="button"
                accessibilityLabel={isSearching ? 'Analyzing property' : 'Analyze property'}
                accessibilityState={{ disabled: !searchAddress.trim() || isSearching, busy: isSearching }}
              >
                {isSearching ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.analyzeBtnText}>Analyze</Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>

            {/* Scan button */}
            <TouchableOpacity
              style={[s.scanBtn, { backgroundColor: c.panel, borderColor: c.borderLight }]}
              onPress={handleScanPress}
              accessibilityRole="button"
              accessibilityLabel="Scan Property"
              accessibilityHint="Use your camera to scan a property for instant analysis"
            >
              <Ionicons name="scan-outline" size={20} color={c.white} />
              <Text style={[s.scanBtnText, { color: c.white }]}>Scan Property</Text>
            </TouchableOpacity>

            <Text style={[s.heroNote, { color: c.dim }]}>
              <Text style={{ fontWeight: '700', color: c.text }}>&lt;60s analysis</Text>
              {'  ·  No credit card required'}
            </Text>
          </View>

          {/* ─── VERDICT DEMO ────────────────────────────────────────── */}
          <View style={[s.section, { backgroundColor: c.surface }]}>
            <Text style={[s.sLabel, { color: c.blue }]}>IQ Verdict</Text>
            <Text style={[s.sTitle, { color: c.white }]}>One Scan. Four Signals. Your Answer.</Text>
            <Text style={[s.sDesc, { color: c.text }]}>
              DealGapIQ evaluates every property across four key factors that determine if a deal is worth pursuing.
            </Text>

            <View style={s.signalGrid}>
              {SIGNALS.map((sig) => (
                <View key={sig.title} style={[s.signalCard, { backgroundColor: c.panel, borderColor: c.border }]}>
                  <View style={[s.signalDot, { backgroundColor: sig.bgColor }]}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sig.color }} />
                  </View>
                  <Text style={[s.signalTitle, { color: c.white }]}>{sig.title}</Text>
                  <Text style={[s.signalDesc, { color: c.dim }]}>{sig.desc}</Text>
                  <Text style={[s.signalValue, { color: sig.color }]}>{sig.value}</Text>
                </View>
              ))}
            </View>

            {/* Score ring demo */}
            <View style={[s.verdictDemo, { backgroundColor: c.panel, borderColor: c.border }]}>
              <Text style={[s.verdictQ, { color: c.white }]}>
                Is this worth your time as an{' '}
                <Text style={{ color: c.blue }}>investment?</Text>
              </Text>
              <View style={s.ringWrap}>
                <Svg width={110} height={110} viewBox="0 0 140 140">
                  <Circle cx="70" cy="70" r="58" fill="none" stroke={c.border} strokeWidth={9} />
                  <Circle cx="70" cy="70" r="58" fill="none" stroke="#fbbf24" strokeWidth={9} strokeLinecap="round" strokeDasharray="364" strokeDashoffset="170" rotation={-90} origin="70,70" />
                </Svg>
                <View style={s.ringOverlay}>
                  <Text style={s.ringNum}>53</Text>
                  <Text style={[s.ringDen, { color: c.dim }]}>/ 100</Text>
                </View>
              </View>
              <View style={[s.verdictBadge, { backgroundColor: 'rgba(251,191,36,0.10)', borderColor: 'rgba(245,158,11,0.25)' }]}>
                <Ionicons name="warning" size={14} color="#fbbf24" />
                <Text style={{ color: '#fbbf24', fontSize: 13, fontWeight: '700' }}>Marginal Deal</Text>
              </View>
            </View>
          </View>

          {/* ─── TOOLKIT ─────────────────────────────────────────────── */}
          <View style={[s.section, { backgroundColor: c.bg }]}>
            <Text style={[s.sTitle, { color: c.white, textAlign: 'center' }]}>The Complete Toolkit</Text>
            <Text style={[s.sDesc, { color: c.text, textAlign: 'center', marginBottom: 24 }]}>
              Everything you need to underwrite with confidence.
            </Text>
            {TOOLKIT.map((t) => (
              <View key={t.title} style={[s.tkCard, { backgroundColor: c.panel, borderColor: c.border }]}>
                <View style={[s.tkIcon, { backgroundColor: t.bg }]}>
                  <Ionicons name={t.icon} size={20} color={t.color} />
                </View>
                <View style={s.tkContent}>
                  <Text style={[s.tkTitle, { color: c.white }]}>
                    {t.title}<Text style={{ color: c.blue }}>{t.suffix}</Text>
                  </Text>
                  <Text style={[s.tkDesc, { color: c.text }]}>{t.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ─── CTA ─────────────────────────────────────────────────── */}
          <View style={[s.cta, { borderTopColor: c.border }]}>
            <Text style={[s.ctaTitle, { color: c.white }]}>Stop wondering. Start knowing.</Text>
            <Text style={[s.ctaDesc, { color: c.text }]}>
              Join thousands of serious investors using DealGapIQ to uncover value others miss.
            </Text>
            <TouchableOpacity
              style={[s.ctaBtn, { backgroundColor: c.blue }]}
              onPress={() => inputRef.current?.focus()}
              accessibilityRole="button"
              accessibilityLabel="Start free analysis"
              accessibilityHint="Focuses the address search input"
            >
              <Text style={s.ctaBtnText}>Start Free Analysis</Text>
            </TouchableOpacity>
          </View>

          {/* ─── FOOTER ──────────────────────────────────────────────── */}
          <View style={[s.footer, { backgroundColor: isDark ? '#000' : '#0f172a', borderTopColor: c.border }]}>
            <Text style={s.footerLogo}>DealGap<Text style={{ color: c.blue }}>IQ</Text></Text>
            <Text style={s.footerTag}>Professional Real Estate Intelligence for Everyone.</Text>
            <View style={s.footerLinks}>
              <TouchableOpacity onPress={() => router.push('/privacy' as any)} accessibilityRole="link" accessibilityLabel="Privacy policy"><Text style={s.footerLink}>Privacy</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/terms' as any)} accessibilityRole="link" accessibilityLabel="Terms of service"><Text style={s.footerLink}>Terms</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:support@dealgapiq.com')} accessibilityRole="link" accessibilityLabel="Contact support"><Text style={s.footerLink}>Contact</Text></TouchableOpacity>
            </View>
            <Text style={s.footerCopy}>© 2026 DealGapIQ. All rights reserved.{'\n'}Professional use only. Not a lender.</Text>
          </View>

          <View style={{ height: insets.bottom + 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },

  // Nav
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  logo: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  loginText: { fontSize: 13, fontWeight: '500' },

  // Hero
  hero: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 32, alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, borderWidth: 1, marginBottom: 24 },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34d399' },
  badgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  heroTitle: { fontSize: 27, fontWeight: '800', textAlign: 'center', lineHeight: 34, letterSpacing: -0.8, marginBottom: 16 },
  heroSub: { fontSize: 15, lineHeight: 24, textAlign: 'center', marginBottom: 28, maxWidth: 340 },

  // Search
  searchRow: { flexDirection: 'row', alignItems: 'center', width: '100%', borderRadius: 12, borderWidth: 1, paddingLeft: 12, paddingVertical: 4, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 12, paddingHorizontal: 8 },
  analyzeBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginRight: 4 },
  analyzeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Scan
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', paddingVertical: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  scanBtnText: { fontSize: 15, fontWeight: '600' },
  heroNote: { fontSize: 12 },

  // Sections
  section: { paddingVertical: 36, paddingHorizontal: 20 },
  sLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  sTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5, lineHeight: 28, marginBottom: 10 },
  sDesc: { fontSize: 14, lineHeight: 22, marginBottom: 20 },

  // Signals
  signalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  signalCard: { width: (SCREEN_WIDTH - 50) / 2, borderRadius: 14, borderWidth: 1, padding: 16 },
  signalDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  signalTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  signalDesc: { fontSize: 11, lineHeight: 16, marginBottom: 8 },
  signalValue: { fontSize: 18, fontWeight: '800' },

  // Verdict demo
  verdictDemo: { marginTop: 24, borderRadius: 14, borderWidth: 1, padding: 24, alignItems: 'center' },
  verdictQ: { fontSize: 16, fontWeight: '700', textAlign: 'center', lineHeight: 24, marginBottom: 16 },
  ringWrap: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  ringOverlay: { position: 'absolute', alignItems: 'center' },
  ringNum: { fontSize: 36, fontWeight: '800', color: '#fbbf24' },
  ringDen: { fontSize: 12, marginTop: -2 },
  verdictBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1 },

  // Toolkit
  tkCard: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10, gap: 14, alignItems: 'flex-start' },
  tkIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tkContent: { flex: 1 },
  tkTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  tkDesc: { fontSize: 12, lineHeight: 19 },

  // CTA
  cta: { paddingVertical: 48, paddingHorizontal: 24, alignItems: 'center', borderTopWidth: 1 },
  ctaTitle: { fontSize: 24, fontWeight: '700', textAlign: 'center', lineHeight: 30, letterSpacing: -0.5, marginBottom: 12 },
  ctaDesc: { fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 28 },
  ctaBtn: { width: '100%', paddingVertical: 16, borderRadius: 10, alignItems: 'center' },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Footer
  footer: { paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center', borderTopWidth: 1 },
  footerLogo: { fontSize: 22, fontWeight: '700', color: '#F1F5F9', marginBottom: 8 },
  footerTag: { fontSize: 14, color: '#CBD5E1', marginBottom: 24, textAlign: 'center' },
  footerLinks: { flexDirection: 'row', gap: 24, marginBottom: 24 },
  footerLink: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
  footerCopy: { fontSize: 11, color: '#64748B', textAlign: 'center', lineHeight: 18 },
});
