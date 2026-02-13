/**
 * Help Center — In-app FAQ screen
 * Route: /help
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    category: 'Getting Started',
    question: 'What is InvestIQ?',
    answer: 'InvestIQ is a real estate investment analysis platform that evaluates properties across 6 strategies — Long-Term Rental, Short-Term Rental, BRRRR, Fix & Flip, House Hack, and Wholesale. It gives you a VerdictIQ score (0-95) that tells you whether a deal is worth pursuing.',
  },
  {
    category: 'Getting Started',
    question: 'How do I analyze a property?',
    answer: 'Point your phone camera at any property to scan it, or enter an address manually. InvestIQ will pull real market data and run a full financial analysis in about 60 seconds.',
  },
  {
    category: 'Getting Started',
    question: 'Is InvestIQ free?',
    answer: 'Yes. InvestIQ is currently in free beta. All features — including unlimited analyses, PDF reports, and portfolio tracking — are free during the beta period.',
  },
  {
    category: 'Analysis',
    question: 'What is the VerdictIQ score?',
    answer: 'The VerdictIQ score (0-95) rates a property\'s investment potential by factoring in cash flow, price-to-value opportunity, market conditions, and risk. Above 65 is a strong deal; 40-65 needs a closer look; below 40 doesn\'t work at asking price.',
  },
  {
    category: 'Analysis',
    question: 'Can I adjust the assumptions?',
    answer: 'Yes. After analyzing a property, tap "Change Terms" to adjust down payment, interest rate, loan term, taxes, insurance, management fees, and more. The analysis recalculates instantly.',
  },
  {
    category: 'Analysis',
    question: 'Where does InvestIQ get its data?',
    answer: 'We pull from multiple sources including public property records, MLS listings, tax assessor data, rental comps, short-term rental platforms, and comparable sales.',
  },
  {
    category: 'Scanner',
    question: 'How does the property scanner work?',
    answer: 'The scanner uses your GPS and compass to identify the property you\'re pointing at. It searches parcel data in the direction you\'re facing. If multiple properties are nearby, you\'ll see a list to pick the right one.',
  },
  {
    category: 'Scanner',
    question: 'Why is the scanner showing the wrong property?',
    answer: 'GPS/compass accuracy can vary. Try standing closer to the property, holding your phone steady, or adjusting the distance slider. If it picks wrong, tap "Not the right property?" to see all nearby candidates.',
  },
  {
    category: 'Account',
    question: 'How do I save a property?',
    answer: 'After running an analysis, tap the "Save" button on the VerdictIQ screen or "Save to Portfolio" on the StrategyIQ screen. It will appear in your Portfolio tab with all data pre-filled.',
  },
  {
    category: 'Account',
    question: 'Can I export a PDF report?',
    answer: 'Yes. On the StrategyIQ screen, tap "Report" in the action bar to download a lender-ready PDF that you can share with partners or lenders.',
  },
  {
    category: 'Account',
    question: 'Is my data secure?',
    answer: 'Yes. We use industry-standard encryption (TLS 1.3) for data in transit and at rest. We never sell your personal information or property data.',
  },
];

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const accentColor = '#0ea5e9';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}>
          {/* Header */}
          <Text style={[styles.title, { color: textColor }]}>Help Center</Text>
          <Text style={[styles.subtitle, { color: mutedColor }]}>
            Find answers to common questions about InvestIQ
          </Text>

          {/* FAQ Items */}
          {FAQ_DATA.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.7}
                onPress={() => setOpenIndex(isOpen ? null : i)}
                style={[
                  styles.faqItem,
                  {
                    backgroundColor: cardBg,
                    borderColor: isOpen ? `${accentColor}30` : borderColor,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={faq.question}
                accessibilityState={{ expanded: isOpen }}
              >
                <View style={styles.faqHeader}>
                  <Text style={[styles.faqCategory, { color: accentColor }]}>{faq.category}</Text>
                  <View style={styles.faqRow}>
                    <Text style={[styles.faqQuestion, { color: textColor, flex: 1 }]}>{faq.question}</Text>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={mutedColor}
                    />
                  </View>
                </View>
                {isOpen && (
                  <Text style={[styles.faqAnswer, { color: mutedColor }]}>{faq.answer}</Text>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Contact CTA */}
          <View style={[styles.contactCard, { backgroundColor: `${accentColor}10`, borderColor: `${accentColor}20` }]}>
            <Text style={[styles.contactTitle, { color: textColor }]}>Still need help?</Text>
            <Text style={[styles.contactText, { color: mutedColor }]}>
              Our team typically responds within 24 hours.
            </Text>
            <TouchableOpacity
              style={[styles.contactButton, { borderColor: `${accentColor}30` }]}
              onPress={() => Linking.openURL('mailto:support@investiq.com?subject=InvestIQ%20Support%20Request')}
              accessibilityRole="button"
              accessibilityLabel="Email support"
            >
              <Ionicons name="mail-outline" size={16} color={accentColor} />
              <Text style={[styles.contactButtonText, { color: accentColor }]}>Email Support</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  faqItem: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  faqHeader: { padding: 16 },
  faqCategory: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  faqRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  faqQuestion: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  faqAnswer: { fontSize: 14, lineHeight: 21, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 0 },
  contactCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginTop: 16,
    alignItems: 'center',
  },
  contactTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  contactText: { fontSize: 13, marginBottom: 12 },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  contactButtonText: { fontSize: 14, fontWeight: '600' },
});
