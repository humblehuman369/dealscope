/**
 * National Averages Reference
 * Route: /national-averages
 *
 * Displays benchmark ranges for 8 key investment metrics
 * with expandable accordion cards.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Metric {
  name: string;
  icon: string;
  low: string;
  avg: string;
  high: string;
  formula: string;
  higherIsBetter: boolean;
  description: string;
  interpretation: string;
  insight: string;
}

// ─── METRICS ───────────────────────────────────────────────────────────────

const METRICS: Metric[] = [
  {
    name: 'Cap Rate',
    icon: 'trending-up-outline',
    low: '4.0%',
    avg: '5.5%',
    high: '7.0%',
    formula: 'NOI / Property Value × 100',
    higherIsBetter: true,
    description: 'Annual return before financing. Used to compare properties regardless of leverage.',
    interpretation: 'A 5.5% cap rate means for every $100K in property value, the property generates $5,500 in net operating income per year. Lower cap rates indicate higher-priced markets; higher cap rates suggest more risk or value-add opportunity.',
    insight: 'Cap rate alone doesn\'t tell the full story. Always factor in appreciation potential, rent growth, and your financing terms.',
  },
  {
    name: 'Cash-on-Cash',
    icon: 'cash-outline',
    low: '5.0%',
    avg: '8.5%',
    high: '12.0%',
    formula: 'Annual Cash Flow / Cash Invested × 100',
    higherIsBetter: true,
    description: 'Return on your actual cash invested, after debt service and expenses.',
    interpretation: 'An 8.5% cash-on-cash means you earn 8.5 cents for every dollar you put in each year. This metric is impacted by leverage—higher leverage typically boosts CoC when the spread between mortgage rate and cap rate is positive.',
    insight: 'Target 8%+ for solid deals. Above 12% often signals higher risk or value-add situations.',
  },
  {
    name: 'DSCR',
    icon: 'shield-outline',
    low: '1.00x',
    avg: '1.25x',
    high: '1.50x',
    formula: 'NOI / Total Debt Service',
    higherIsBetter: true,
    description: 'Debt service coverage ratio. Lenders require ≥1.0; higher is safer.',
    interpretation: '1.25x DSCR means NOI is 25% above debt payments. Most lenders want 1.20–1.35x for conventional loans. At 1.0x you break even—no margin for vacancy or expense increases.',
    insight: 'Never go below 1.0x. Aim for 1.25x+ to weather vacancies and unexpected costs.',
  },
  {
    name: 'Expense Ratio',
    icon: 'pie-chart-outline',
    low: '20%',
    avg: '35%',
    high: '50%',
    formula: 'Operating Expenses / Gross Income × 100',
    higherIsBetter: false,
    description: 'Percentage of gross income consumed by operating expenses.',
    interpretation: 'A 35% expense ratio means $0.35 of every rental dollar goes to taxes, insurance, maintenance, management, etc. Newer properties often run 25–30%; older or poorly managed properties can exceed 50%.',
    insight: 'Lower is better. Above 45% leaves little room for cash flow; investigate high expenses.',
  },
  {
    name: 'GRM',
    icon: 'calculator-outline',
    low: '10:1',
    avg: '7:1',
    high: '4:1',
    formula: 'Price / Annual Rent',
    higherIsBetter: false,
    description: 'Gross rent multiplier. Years of rent to pay off the purchase price.',
    interpretation: 'A 7:1 GRM means the price equals 7 years of gross rent. Lower GRM = more income relative to price. Use for quick market comparisons; GRM ignores expenses and financing.',
    insight: 'Lower GRM suggests better value. Compare to nearby sales—GRM varies by market.',
  },
  {
    name: 'Breakeven Occupancy',
    icon: 'flag-outline',
    low: '60%',
    avg: '80%',
    high: '100%',
    formula: '(Expenses + Debt) / Income × 100',
    higherIsBetter: false,
    description: 'Occupancy rate needed to cover all costs. Lower = more margin of safety.',
    interpretation: '80% breakeven means you need 80% occupancy just to cover expenses and debt. With 75% typical occupancy, you\'d be negative. Target properties with breakeven below 70% for STR.',
    insight: 'Lower is safer. High breakeven leaves no cushion for vacancy or rate drops.',
  },
  {
    name: 'Equity Capture',
    icon: 'home-outline',
    low: '2.0%',
    avg: '5.0%',
    high: '8.0%',
    formula: '(Value - Price) / Price × 100',
    higherIsBetter: true,
    description: 'Immediate equity from buying below market or through value-add.',
    interpretation: '5% equity capture means you bought at 95% of value—instant $5K equity on a $100K deal. Value-add (BRRRR, flip) targets 15–25%+ through renovation.',
    insight: 'Your profit is often made at purchase. Negotiate hard or find value-add opportunities.',
  },
  {
    name: 'Cash Flow Yield',
    icon: 'bar-chart-outline',
    low: '2.0%',
    avg: '5.0%',
    high: '8.0%',
    formula: 'Annual Cash Flow / Total Investment × 100',
    higherIsBetter: true,
    description: 'Annual cash flow as a percentage of total capital invested.',
    interpretation: '5% yield means $5K cash flow per year on $100K invested. Similar to cash-on-cash but includes closing costs and reserves in the denominator. Good for comparing across asset types.',
    insight: 'Target 5%+ for rental properties. Higher yields may indicate higher risk.',
  },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function NationalAveragesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const [expandedId, setExpandedId] = useState<number | null>(null);

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

  const toggleExpand = useCallback((id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedId(prev => (prev === id ? null : id));
  }, []);

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
          <TouchableOpacity
            onPress={handleBack}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <Ionicons name="chevron-back" size={20} color={textColor} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: textColor }}>National Averages</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 13, color: mutedColor, marginBottom: 16 }}>
          Benchmark ranges for U.S. rental properties. Tap a card to expand.
        </Text>

        {METRICS.map((metric, idx) => {
          const isExpanded = expandedId === idx;

          return (
            <View
              key={idx}
              style={{
                backgroundColor: cardBg,
                borderRadius: 14,
                marginBottom: 12,
                borderWidth: 1,
                borderColor,
                overflow: 'hidden',
              }}
            >
              <TouchableOpacity
                onPress={() => toggleExpand(idx)}
                activeOpacity={0.7}
                style={{
                  padding: 16,
                }}
              >
                {/* Row: Icon + Name */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: `${accentColor}18`,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12,
                    }}
                  >
                    <Ionicons name={metric.icon as any} size={18} color={accentColor} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: textColor }}>{metric.name}</Text>
                  <Ionicons name={(isExpanded ? 'chevron-up' : 'chevron-down') as any} size={20} color={mutedColor} />
                </View>

                {/* Short description */}
                <Text style={{ fontSize: 13, color: mutedColor, lineHeight: 18 }}>{metric.description}</Text>

                {/* Formula box */}
                <View
                  style={{
                    marginTop: 12,
                    padding: 10,
                    backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor,
                  }}
                >
                  <Text style={{ fontSize: 12, color: accentColor, letterSpacing: 0.3 }}>{metric.formula}</Text>
                </View>

                {/* National benchmark bar: low | avg | high */}
                <View style={{ marginTop: 14 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      height: 8,
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <View style={{ flex: 1, backgroundColor: metric.higherIsBetter ? mutedColor : accentColor }} />
                    <View style={{ flex: 1, backgroundColor: accentColor }} />
                    <View style={{ flex: 1, backgroundColor: metric.higherIsBetter ? accentColor : mutedColor }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                    <Text style={{ fontSize: 11, color: mutedColor }}>Low: {metric.low}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: accentColor }}>Avg: {metric.avg}</Text>
                    <Text style={{ fontSize: 11, color: mutedColor }}>High: {metric.high}</Text>
                  </View>
                </View>

                {/* Expandable: Interpretation */}
                {isExpanded && (
                  <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: borderColor }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: mutedColor, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Interpretation</Text>
                    <Text style={{ fontSize: 14, color: textColor, lineHeight: 22 }}>{metric.interpretation}</Text>

                    {/* Insight callout */}
                    <View
                      style={{
                        marginTop: 12,
                        padding: 12,
                        backgroundColor: `${accentColor}15`,
                        borderRadius: 8,
                        borderLeftWidth: 4,
                        borderLeftColor: accentColor,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Ionicons name="bulb-outline" size={14} color={accentColor} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: accentColor, marginLeft: 6 }}>Insight</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: textColor, lineHeight: 20 }}>{metric.insight}</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
