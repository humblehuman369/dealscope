/**
 * Strategy Education Screen
 * Route: /learn/[strategy]
 *
 * Displays educational content for each investment strategy:
 * ltr, str, brrrr, flip, house_hack, wholesale.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';
import type { StrategyId } from '../../types/analytics';
import { isValidStrategy, InvalidParamFallback } from '../../hooks/useValidatedParams';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Benefit {
  title: string;
  desc: string;
  icon: string;
}

interface StrategyContent {
  tagline: string;
  headline: string;
  color: string;
  icon: string;
  benefits: Benefit[];
  howItWorks: string[];
  keyMetrics: string[];
  proTip: string;
}

// ─── STRATEGY_CONTENT ───────────────────────────────────────────────────────

const STRATEGY_CONTENT: Record<StrategyId, StrategyContent> = {
  ltr: {
    tagline: 'Steady income & build equity over time',
    headline: 'The Classic Buy-and-Hold Strategy',
    color: '#34d399',
    icon: 'home-outline',
    benefits: [
      { title: 'Steady Income', desc: 'Predictable monthly cash flow from annual leases', icon: 'cash-outline' },
      { title: 'Wealth Building', desc: 'Equity growth through appreciation and mortgage paydown', icon: 'trending-up-outline' },
      { title: 'Tax Benefits', desc: 'Depreciation, deductions, and long-term capital gains', icon: 'shield-outline' },
    ],
    howItWorks: [
      'Purchase a property in a strong rental market',
      'Screen tenants and sign annual lease',
      'Collect rent that exceeds your expenses',
      'Reinvest or enjoy the monthly cash flow',
    ],
    keyMetrics: [
      'Cap Rate: 5-8% target',
      'Cash-on-Cash: 8-12%',
      'DSCR: 1.25+ minimum',
      '1% Rule: Monthly rent ≥ 1% of price',
    ],
    proTip: 'The magic happens three ways: monthly cash flow puts money in your pocket, tenants build equity for you by paying down the loan, and appreciation compounds your returns over time.',
  },

  str: {
    tagline: 'Higher revenue from vacation rentals',
    headline: 'Maximize Revenue with Airbnb & VRBO',
    color: '#8b5cf6',
    icon: 'bed-outline',
    benefits: [
      { title: '2-3x LTR Revenue', desc: 'Nightly rates can significantly exceed monthly rent', icon: 'trending-up-outline' },
      { title: 'Flexibility', desc: 'Use the property yourself during off-peak seasons', icon: 'calendar-outline' },
      { title: 'Tourism Demand', desc: 'Capitalize on vacation and business travel markets', icon: 'airplane-outline' },
    ],
    howItWorks: [
      'Purchase in a high-tourism or business travel area',
      'Furnish and list on Airbnb, VRBO, etc.',
      'Optimize pricing and occupancy seasonally',
      'Manage guests or hire a property manager',
    ],
    keyMetrics: [
      'ADR: Average Daily Rate',
      'Occupancy: 65-80% target',
      'RevPAR: Revenue per available night',
      'Break-even Occupancy: below 60%',
    ],
    proTip: 'STR can generate 2-3x the revenue of traditional rentals, but requires more active management. Consider a property manager (typically 20-25% of revenue) for truly passive income.',
  },

  brrrr: {
    tagline: 'Buy, Rehab, Rent, Refinance, Repeat',
    headline: 'Recycle Capital & Scale Quickly',
    color: '#f97316',
    icon: 'refresh-outline',
    benefits: [
      { title: 'Infinite ROI', desc: 'Pull out all your cash and keep the asset', icon: 'infinite-outline' },
      { title: 'Scale Quickly', desc: 'Recycle the same capital into multiple deals', icon: 'rocket-outline' },
      { title: 'Forced Appreciation', desc: 'Add value through renovation', icon: 'hammer-outline' },
    ],
    howItWorks: [
      'Buy a distressed property below Zestimate',
      'Rehab to increase value (target 70% rule)',
      'Rent to a qualified tenant at market rate',
      'Refinance based on new appraised value (75% LTV)',
      'Repeat with recovered capital',
    ],
    keyMetrics: [
      'All-in at 75% of ARV or less',
      'Cash left in deal: $0 target',
      'Post-refi cash flow positive',
      'Equity capture: 20%+ of ARV',
    ],
    proTip: 'The goal is to recover 100% of your cash at refinance while keeping a cash-flowing rental. If you leave $0 in the deal, your ROI is technically infinite.',
  },

  flip: {
    tagline: 'Renovate and sell for quick profit',
    headline: 'Quick Returns Through Value Creation',
    color: '#ec4899',
    icon: 'hammer-outline',
    benefits: [
      { title: 'Quick Returns', desc: 'Profit in 3-6 months, not years', icon: 'flash-outline' },
      { title: 'Profit Potential', desc: 'Typical net profit $30K-$100K+ per flip', icon: 'cash-outline' },
      { title: 'Value Creation', desc: 'Transform neglected properties', icon: 'construct-outline' },
    ],
    howItWorks: [
      'Find a distressed property below 70% of ARV',
      'Secure hard money or private financing',
      'Complete renovation on time and on budget',
      'List and sell at or above ARV',
      'Repeat with profits',
    ],
    keyMetrics: [
      '70% Rule: Purchase + Rehab ≤ 70% ARV',
      'ROI: 15-30% per flip',
      'Profit margin: 10-15% of ARV',
      'Holding period: 3-6 months',
    ],
    proTip: 'Your profit is made when you buy, not when you sell. Never pay more than 70% of ARV minus rehab costs. Speed kills profit — every month of holding costs eats into your margin.',
  },

  house_hack: {
    tagline: 'Live for free while building wealth',
    headline: 'Reduce or Eliminate Your Housing Cost',
    color: '#22c55e',
    icon: 'people-outline',
    benefits: [
      { title: 'Low/No Housing Cost', desc: 'Tenants cover your mortgage', icon: 'home-outline' },
      { title: 'Beginner Friendly', desc: 'FHA loans with 3.5% down payment', icon: 'school-outline' },
      { title: 'Built-in Equity', desc: 'Own an asset while others pay the bill', icon: 'trending-up-outline' },
    ],
    howItWorks: [
      'Purchase a multi-unit (duplex, triplex, fourplex)',
      'Move into one unit as your primary residence',
      'Rent the other units at market rate',
      'Use FHA financing with just 3.5% down',
      'When ready, move out and rent all units',
    ],
    keyMetrics: [
      'Housing cost offset: 80-100%+',
      'Savings vs renting: $500-$2,000/mo',
      'Move-out cap rate: 5-8%',
      'Down payment: as low as 3.5%',
    ],
    proTip: "This is the ultimate beginner strategy. You qualify for owner-occupant financing (3.5% down vs 20-25%), and your tenants pay your mortgage. When you move out, you have a fully-rented investment property.",
  },

  wholesale: {
    tagline: 'Assign contracts for quick fees',
    headline: 'No Capital Required — Just Hustle',
    color: '#06b6d4',
    icon: 'document-text-outline',
    benefits: [
      { title: 'No Capital Needed', desc: 'You never actually buy the property', icon: 'wallet-outline' },
      { title: 'Quick Fees', desc: 'Assignment fees of $5K-$15K+ per deal', icon: 'cash-outline' },
      { title: 'Low Risk', desc: 'Limited financial exposure', icon: 'shield-outline' },
    ],
    howItWorks: [
      'Find a motivated seller with a below-market property',
      'Get the property under contract at a discount',
      'Find a cash buyer (investor) willing to pay more',
      'Assign the contract for an assignment fee',
      'Collect your fee at closing',
    ],
    keyMetrics: [
      'Assignment fee: $5K-$15K+',
      'MAO: 70% of ARV - Rehab',
      'Marketing cost per deal: $500-$2,000',
      'Total cash at risk: <$2,000',
    ],
    proTip: "Wholesale is about volume and marketing. Build a strong buyer's list and focus on finding deals. The more motivated the seller, the better the spread. Always use an inspection period for your exit strategy.",
  },
};

// ─── Strategy display names ──────────────────────────────────────────────────

const STRATEGY_LABELS: Record<StrategyId, string> = {
  ltr: 'Long-Term Rental',
  str: 'Short-Term Rental',
  brrrr: 'BRRRR',
  flip: 'Fix & Flip',
  house_hack: 'House Hack',
  wholesale: 'Wholesale',
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LearnStrategyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const params = useLocalSearchParams<{ strategy: string }>();
  const strategy = (params.strategy || 'ltr').toLowerCase() as StrategyId;
  const content = STRATEGY_CONTENT[strategy];

  // Theme colors
  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#0d9488';

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleAnalyze = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/home');
  };

  if (!isValidStrategy(params.strategy)) return <InvalidParamFallback message="Unknown strategy" />;

  if (!content) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }}>
        <Ionicons name="alert-circle-outline" size={48} color={mutedColor} />
        <Text style={{ color: textColor, fontSize: 18, fontWeight: '600', marginTop: 12 }}>Unknown Strategy</Text>
        <Text style={{ color: mutedColor, fontSize: 14, marginTop: 4 }}>"{params.strategy}" is not a valid strategy.</Text>
        <TouchableOpacity
          onPress={handleBack}
          style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: accentColor, borderRadius: 10 }}
        >
          <Text style={{ color: '#ffffff', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const strategyColor = content.color;
  const label = STRATEGY_LABELS[strategy];

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: cardBg,
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={handleBack} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? '#0f172a' : '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
            <Ionicons name="chevron-back" size={20} color={textColor} />
          </TouchableOpacity>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${strategyColor}18`, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
            <Ionicons name={content.icon as any} size={20} color={strategyColor} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: textColor }}>{label}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Tagline */}
        <Text style={{ fontSize: 13, color: strategyColor, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
          {content.tagline}
        </Text>

        {/* Headline */}
        <Text style={{ fontSize: 22, fontWeight: '800', color: textColor, lineHeight: 28, marginBottom: 20 }}>
          {content.headline}
        </Text>

        {/* Benefits grid */}
        <Text style={{ fontSize: 14, fontWeight: '700', color: textColor, marginBottom: 10 }}>Benefits</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 24 }}>
          {content.benefits.map((b, i) => (
            <View key={i} style={{ width: '33.33%', padding: 4 }}>
              <View
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor,
                }}
              >
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${strategyColor}18`, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name={b.icon as any} size={14} color={strategyColor} />
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: textColor }} numberOfLines={1}>{b.title}</Text>
                <Text style={{ fontSize: 10, color: mutedColor, marginTop: 2, lineHeight: 14 }} numberOfLines={2}>{b.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* How It Works */}
        <Text style={{ fontSize: 14, fontWeight: '700', color: textColor, marginBottom: 10 }}>How It Works</Text>
        <View style={{ backgroundColor: cardBg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor, marginBottom: 24 }}>
          {content.howItWorks.map((step, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: i < content.howItWorks.length - 1 ? 12 : 0 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: `${strategyColor}20`, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: strategyColor }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 14, color: textColor, lineHeight: 20 }}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Key Metrics */}
        <Text style={{ fontSize: 14, fontWeight: '700', color: textColor, marginBottom: 10 }}>Key Metrics</Text>
        <View style={{ backgroundColor: cardBg, borderRadius: 12, padding: 16, borderWidth: 1, borderColor, marginBottom: 24 }}>
          {content.keyMetrics.map((m, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: i < content.keyMetrics.length - 1 ? 8 : 0 }}>
              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: strategyColor, marginRight: 10 }} />
              <Text style={{ fontSize: 13, color: textColor }}>{m}</Text>
            </View>
          ))}
        </View>

        {/* Pro Tip */}
        <View
          style={{
            backgroundColor: `${accentColor}15`,
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: `${accentColor}40`,
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="bulb-outline" size={18} color={accentColor} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: accentColor, marginLeft: 8 }}>Pro Tip</Text>
          </View>
          <Text style={{ fontSize: 14, color: textColor, lineHeight: 22 }}>{content.proTip}</Text>
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={handleAnalyze}
          style={{
            backgroundColor: accentColor,
            borderRadius: 12,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="analytics-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>Analyze a Property</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
