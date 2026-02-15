import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  const handleContactPress = () => {
    Linking.openURL('mailto:legal@dealgapiq.com');
  };

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: { backgroundColor: theme.background },
    lastUpdated: { color: theme.textMuted },
    sectionTitle: { color: theme.text },
    paragraph: { color: theme.textSecondary },
    bullet: { color: theme.textTertiary },
    bulletText: { color: theme.textSecondary },
    warningBox: { 
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : colors.warning.light,
      borderColor: colors.warning.main,
    },
    warningText: { color: isDark ? colors.warning.main : colors.warning.text },
    contactButton: { 
      backgroundColor: isDark ? colors.primary[900] : colors.primary[50],
      borderColor: isDark ? colors.primary[700] : colors.primary[200],
    },
    footerBorder: { borderTopColor: isDark ? colors.navy[700] : colors.gray[200] },
    footerText: { color: theme.textMuted },
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Terms of Service',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: theme.headerBackground },
          headerTintColor: theme.text,
        }}
      />
      <ScrollView
        style={[styles.container, dynamicStyles.container]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        <Text style={[styles.lastUpdated, dynamicStyles.lastUpdated]}>Last updated: January 2, 2026</Text>

        <Section title="1. Acceptance of Terms" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>
            By accessing or using DealGapIQ ("the App"), you agree to be bound by these
            Terms of Service. If you do not agree to these terms, do not use the App.
          </Text>
        </Section>

        <Section title="2. Description of Service" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>
            DealGapIQ provides real estate investment analysis tools, including property
            scanning, investment calculations, portfolio tracking, and market data.
            The App is intended for informational purposes only.
          </Text>
        </Section>

        <Section title="3. User Accounts" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>
            To access certain features, you must create an account. You are responsible
            for maintaining the confidentiality of your account credentials and for all
            activities under your account.
          </Text>
          <BulletPoint text="You must provide accurate account information" theme={theme} />
          <BulletPoint text="You must be at least 18 years old" theme={theme} />
          <BulletPoint text="One account per person" theme={theme} />
          <BulletPoint text="You may not share your account" theme={theme} />
        </Section>

        <Section title="4. Disclaimer of Investment Advice" theme={theme}>
          <View style={[styles.warningBox, dynamicStyles.warningBox]}>
            <Ionicons name="warning-outline" size={24} color={colors.warning.main} />
            <Text style={[styles.warningText, dynamicStyles.warningText]}>
              DealGapIQ does not provide investment, financial, legal, or tax advice.
              All data and calculations are for informational purposes only. Always
              consult qualified professionals before making investment decisions.
            </Text>
          </View>
        </Section>

        <Section title="5. Data Accuracy" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>
            While we strive to provide accurate data, we do not guarantee the accuracy,
            completeness, or timeliness of any information. Property data is obtained
            from third-party sources and may contain errors or be outdated.
          </Text>
        </Section>

        <Section title="6. Acceptable Use" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>You agree not to:</Text>
          <BulletPoint text="Use the App for any illegal purpose" theme={theme} />
          <BulletPoint text="Attempt to access other users' accounts" theme={theme} />
          <BulletPoint text="Interfere with the App's functionality" theme={theme} />
          <BulletPoint text="Scrape or harvest data from the App" theme={theme} />
          <BulletPoint text="Use the App to harass or harm others" theme={theme} />
          <BulletPoint text="Violate any applicable laws or regulations" theme={theme} />
        </Section>

        <Section title="7. Intellectual Property" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>
            All content, features, and functionality of the App are owned by DealGapIQ
            and are protected by copyright, trademark, and other intellectual property
            laws. You may not copy, modify, or distribute any part of the App without
            our written permission.
          </Text>
        </Section>

        <Section title="8. Limitation of Liability" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, DEALGAPIQ SHALL NOT BE LIABLE FOR
            ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
            INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR INVESTMENT LOSSES.
          </Text>
        </Section>

        <Section title="9. Subscription and Payments" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>
            Some features may require a paid subscription. Subscriptions are billed
            through the App Store or Google Play. Cancellation policies are governed
            by the respective platform's terms.
          </Text>
        </Section>

        <Section title="10. Termination" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>
            We may terminate or suspend your account at any time for violation of
            these Terms. You may delete your account at any time through the Settings
            screen.
          </Text>
        </Section>

        <Section title="11. Changes to Terms" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>
            We reserve the right to modify these Terms at any time. We will notify
            you of material changes through the App. Continued use after changes
            constitutes acceptance of the new Terms.
          </Text>
        </Section>

        <Section title="12. Governing Law" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>
            These Terms shall be governed by the laws of the State of Florida, without
            regard to conflict of law principles.
          </Text>
        </Section>

        <Section title="13. Contact" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>
            For questions about these Terms:
          </Text>
          <TouchableOpacity style={[styles.contactButton, dynamicStyles.contactButton]} onPress={handleContactPress}>
            <Ionicons name="mail-outline" size={18} color={colors.primary[isDark ? 400 : 600]} />
            <Text style={[styles.contactButtonText, { color: colors.primary[isDark ? 400 : 600] }]}>legal@dealgapiq.com</Text>
          </TouchableOpacity>
        </Section>

        <View style={[styles.footer, dynamicStyles.footerBorder]}>
          <Text style={[styles.footerText, dynamicStyles.footerText]}>© 2026 DealGapIQ. All rights reserved.</Text>
        </View>
      </ScrollView>
    </>
  );
}

function Section({ title, children, theme }: { title: string; children: React.ReactNode; theme: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function BulletPoint({ text, theme }: { text: string; theme: any }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={[styles.bullet, { color: theme.textTertiary }]}>•</Text>
      <Text style={[styles.bulletText, { color: theme.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 13,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    paddingLeft: 8,
    marginBottom: 6,
  },
  bullet: {
    fontSize: 15,
    marginRight: 8,
    lineHeight: 24,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
  },
});
