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

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleContactPress = () => {
    Linking.openURL('mailto:privacy@investiq.app');
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Privacy Policy',
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        <Text style={styles.lastUpdated}>Last updated: January 2, 2026</Text>

        <Section title="Introduction">
          <Text style={styles.paragraph}>
            InvestIQ ("we," "our," or "us") is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and safeguard
            your information when you use our mobile application.
          </Text>
        </Section>

        <Section title="Information We Collect">
          <Text style={styles.subheading}>Information You Provide</Text>
          <BulletPoint text="Account information (email, name, password)" />
          <BulletPoint text="Property search history and saved properties" />
          <BulletPoint text="Portfolio data you enter" />
          <BulletPoint text="Investment assumptions and preferences" />

          <Text style={styles.subheading}>Automatically Collected Information</Text>
          <BulletPoint text="Device information (type, OS version, identifiers)" />
          <BulletPoint text="Location data (with your permission)" />
          <BulletPoint text="Usage analytics and app performance data" />
          <BulletPoint text="Crash reports and diagnostics" />
        </Section>

        <Section title="How We Use Your Information">
          <BulletPoint text="Provide and improve our services" />
          <BulletPoint text="Process property scans and investment analysis" />
          <BulletPoint text="Personalize your experience" />
          <BulletPoint text="Send notifications and updates (with permission)" />
          <BulletPoint text="Analyze usage patterns to improve the app" />
          <BulletPoint text="Respond to customer support requests" />
        </Section>

        <Section title="Data Storage & Security">
          <Text style={styles.paragraph}>
            Your data is stored securely using industry-standard encryption. We use:
          </Text>
          <BulletPoint text="Local SQLite database with encryption for offline data" />
          <BulletPoint text="Secure cloud storage with encryption at rest" />
          <BulletPoint text="HTTPS for all network communications" />
          <BulletPoint text="Expo Secure Store for sensitive credentials" />
        </Section>

        <Section title="Third-Party Services">
          <Text style={styles.paragraph}>
            We use the following third-party services:
          </Text>
          <BulletPoint text="Google Maps for property location services" />
          <BulletPoint text="RentCast and Axesso for property data" />
          <BulletPoint text="Expo for push notifications" />
          <BulletPoint text="Analytics services to understand app usage" />
          <Text style={styles.paragraph}>
            These services have their own privacy policies governing their use of your data.
          </Text>
        </Section>

        <Section title="Your Rights">
          <Text style={styles.paragraph}>You have the right to:</Text>
          <BulletPoint text="Access your personal data" />
          <BulletPoint text="Correct inaccurate data" />
          <BulletPoint text="Delete your account and data" />
          <BulletPoint text="Export your data" />
          <BulletPoint text="Opt out of marketing communications" />
          <BulletPoint text="Withdraw consent for location access" />
        </Section>

        <Section title="Data Retention">
          <Text style={styles.paragraph}>
            We retain your data for as long as your account is active. Deleted accounts
            are purged from our systems within 30 days. Anonymized analytics data may
            be retained for longer periods.
          </Text>
        </Section>

        <Section title="Children's Privacy">
          <Text style={styles.paragraph}>
            Our app is not intended for users under 18 years of age. We do not knowingly
            collect information from children.
          </Text>
        </Section>

        <Section title="Changes to This Policy">
          <Text style={styles.paragraph}>
            We may update this Privacy Policy from time to time. We will notify you of
            any material changes by posting the new Privacy Policy in the app and
            updating the "Last updated" date.
          </Text>
        </Section>

        <Section title="Contact Us">
          <Text style={styles.paragraph}>
            If you have questions about this Privacy Policy or our data practices,
            please contact us:
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={handleContactPress}>
            <Ionicons name="mail-outline" size={18} color={colors.primary[600]} />
            <Text style={styles.contactButtonText}>privacy@investiq.app</Text>
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
  subheading: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray[800],
    marginTop: 12,
    marginBottom: 8,
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

