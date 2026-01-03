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

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleContactPress = () => {
    Linking.openURL('mailto:legal@investiq.app');
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Terms of Service',
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        <Text style={styles.lastUpdated}>Last updated: January 2, 2026</Text>

        <Section title="1. Acceptance of Terms">
          <Text style={styles.paragraph}>
            By accessing or using InvestIQ ("the App"), you agree to be bound by these
            Terms of Service. If you do not agree to these terms, do not use the App.
          </Text>
        </Section>

        <Section title="2. Description of Service">
          <Text style={styles.paragraph}>
            InvestIQ provides real estate investment analysis tools, including property
            scanning, investment calculations, portfolio tracking, and market data.
            The App is intended for informational purposes only.
          </Text>
        </Section>

        <Section title="3. User Accounts">
          <Text style={styles.paragraph}>
            To access certain features, you must create an account. You are responsible
            for maintaining the confidentiality of your account credentials and for all
            activities under your account.
          </Text>
          <BulletPoint text="You must provide accurate account information" />
          <BulletPoint text="You must be at least 18 years old" />
          <BulletPoint text="One account per person" />
          <BulletPoint text="You may not share your account" />
        </Section>

        <Section title="4. Disclaimer of Investment Advice">
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={24} color={colors.warning.main} />
            <Text style={styles.warningText}>
              InvestIQ does not provide investment, financial, legal, or tax advice.
              All data and calculations are for informational purposes only. Always
              consult qualified professionals before making investment decisions.
            </Text>
          </View>
        </Section>

        <Section title="5. Data Accuracy">
          <Text style={styles.paragraph}>
            While we strive to provide accurate data, we do not guarantee the accuracy,
            completeness, or timeliness of any information. Property data is obtained
            from third-party sources and may contain errors or be outdated.
          </Text>
        </Section>

        <Section title="6. Acceptable Use">
          <Text style={styles.paragraph}>You agree not to:</Text>
          <BulletPoint text="Use the App for any illegal purpose" />
          <BulletPoint text="Attempt to access other users' accounts" />
          <BulletPoint text="Interfere with the App's functionality" />
          <BulletPoint text="Scrape or harvest data from the App" />
          <BulletPoint text="Use the App to harass or harm others" />
          <BulletPoint text="Violate any applicable laws or regulations" />
        </Section>

        <Section title="7. Intellectual Property">
          <Text style={styles.paragraph}>
            All content, features, and functionality of the App are owned by InvestIQ
            and are protected by copyright, trademark, and other intellectual property
            laws. You may not copy, modify, or distribute any part of the App without
            our written permission.
          </Text>
        </Section>

        <Section title="8. Limitation of Liability">
          <Text style={styles.paragraph}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, INVESTIQ SHALL NOT BE LIABLE FOR
            ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
            INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR INVESTMENT LOSSES.
          </Text>
        </Section>

        <Section title="9. Subscription and Payments">
          <Text style={styles.paragraph}>
            Some features may require a paid subscription. Subscriptions are billed
            through the App Store or Google Play. Cancellation policies are governed
            by the respective platform's terms.
          </Text>
        </Section>

        <Section title="10. Termination">
          <Text style={styles.paragraph}>
            We may terminate or suspend your account at any time for violation of
            these Terms. You may delete your account at any time through the Settings
            screen.
          </Text>
        </Section>

        <Section title="11. Changes to Terms">
          <Text style={styles.paragraph}>
            We reserve the right to modify these Terms at any time. We will notify
            you of material changes through the App. Continued use after changes
            constitutes acceptance of the new Terms.
          </Text>
        </Section>

        <Section title="12. Governing Law">
          <Text style={styles.paragraph}>
            These Terms shall be governed by the laws of the State of Florida, without
            regard to conflict of law principles.
          </Text>
        </Section>

        <Section title="13. Contact">
          <Text style={styles.paragraph}>
            For questions about these Terms:
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={handleContactPress}>
            <Ionicons name="mail-outline" size={18} color={colors.primary[600]} />
            <Text style={styles.contactButtonText}>legal@investiq.app</Text>
          </TouchableOpacity>
        </Section>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 InvestIQ. All rights reserved.</Text>
        </View>
      </ScrollView>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function BulletPoint({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 13,
    color: colors.gray[500],
    marginBottom: 24,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.gray[700],
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    paddingLeft: 8,
    marginBottom: 6,
  },
  bullet: {
    fontSize: 15,
    color: colors.gray[600],
    marginRight: 8,
    lineHeight: 24,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: colors.gray[700],
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    backgroundColor: colors.warning[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning[200],
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: colors.warning[800],
    fontWeight: '500',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 16,
    backgroundColor: colors.primary[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[600],
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: colors.gray[400],
  },
});

