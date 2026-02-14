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

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  const handleContactPress = () => {
    Linking.openURL('mailto:privacy@realvestiq.com');
  };

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: { backgroundColor: theme.background },
    lastUpdated: { color: theme.textMuted },
    sectionTitle: { color: theme.text },
    subheading: { color: isDark ? colors.gray[200] : colors.gray[800] },
    paragraph: { color: theme.textSecondary },
    bullet: { color: theme.textTertiary },
    bulletText: { color: theme.textSecondary },
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
          headerTitle: 'Privacy Policy',
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

        <Section title="Introduction" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>
            InvestIQ ("we," "our," or "us") is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and safeguard
            your information when you use our mobile application.
          </Text>
        </Section>

        <Section title="Information We Collect" theme={theme}>
          <Text style={[styles.subheading, dynamicStyles.subheading]}>Information You Provide</Text>
          <BulletPoint text="Account information (email, name, password)" theme={theme} />
          <BulletPoint text="Property search history and saved properties" theme={theme} />
          <BulletPoint text="Portfolio data you enter" theme={theme} />
          <BulletPoint text="Investment assumptions and preferences" theme={theme} />

          <Text style={[styles.subheading, dynamicStyles.subheading]}>Automatically Collected Information</Text>
          <BulletPoint text="Device information (type, OS version, identifiers)" theme={theme} />
          <BulletPoint text="Location data (with your permission)" theme={theme} />
          <BulletPoint text="Usage analytics and app performance data" theme={theme} />
          <BulletPoint text="Crash reports and diagnostics" theme={theme} />
        </Section>

        <Section title="How We Use Your Information" theme={theme}>
          <BulletPoint text="Provide and improve our services" theme={theme} />
          <BulletPoint text="Process property scans and investment analysis" theme={theme} />
          <BulletPoint text="Personalize your experience" theme={theme} />
          <BulletPoint text="Send notifications and updates (with permission)" theme={theme} />
          <BulletPoint text="Analyze usage patterns to improve the app" theme={theme} />
          <BulletPoint text="Respond to customer support requests" theme={theme} />
        </Section>

        <Section title="Data Storage & Security" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>
            Your data is stored securely using industry-standard encryption. We use:
          </Text>
          <BulletPoint text="Local SQLite database with encryption for offline data" theme={theme} />
          <BulletPoint text="Secure cloud storage with encryption at rest" theme={theme} />
          <BulletPoint text="HTTPS for all network communications" theme={theme} />
          <BulletPoint text="Expo Secure Store for sensitive credentials" theme={theme} />
        </Section>

        <Section title="Third-Party Services" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>
            We use the following third-party services:
          </Text>
          <BulletPoint text="Google Maps for property location services" theme={theme} />
          <BulletPoint text="RentCast and Axesso for property data" theme={theme} />
          <BulletPoint text="Expo for push notifications" theme={theme} />
          <BulletPoint text="Analytics services to understand app usage" theme={theme} />
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>
            These services have their own privacy policies governing their use of your data.
          </Text>
        </Section>

        <Section title="Your Rights" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>You have the right to:</Text>
          <BulletPoint text="Access your personal data" theme={theme} />
          <BulletPoint text="Correct inaccurate data" theme={theme} />
          <BulletPoint text="Delete your account and data" theme={theme} />
          <BulletPoint text="Export your data" theme={theme} />
          <BulletPoint text="Opt out of marketing communications" theme={theme} />
          <BulletPoint text="Withdraw consent for location access" theme={theme} />
        </Section>

        <Section title="Data Retention" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>
            We retain your data for as long as your account is active. Deleted accounts
            are purged from our systems within 30 days. Anonymized analytics data may
            be retained for longer periods.
          </Text>
        </Section>

        <Section title="Children's Privacy" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>
            Our app is not intended for users under 18 years of age. We do not knowingly
            collect information from children.
          </Text>
        </Section>

        <Section title="Changes to This Policy" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>
            We may update this Privacy Policy from time to time. We will notify you of
            any material changes by posting the new Privacy Policy in the app and
            updating the "Last updated" date.
          </Text>
        </Section>

        <Section title="Contact Us" theme={theme}>
          <Text style={[styles.paragraph, dynamicStyles.paragraph]}>
            If you have questions about this Privacy Policy or our data practices,
            please contact us:
          </Text>
          <TouchableOpacity style={[styles.contactButton, dynamicStyles.contactButton]} onPress={handleContactPress}>
            <Ionicons name="mail-outline" size={18} color={colors.primary[isDark ? 400 : 600]} />
            <Text style={[styles.contactButtonText, { color: colors.primary[isDark ? 400 : 600] }]}>privacy@realvestiq.com</Text>
          </TouchableOpacity>
        </Section>

        <View style={[styles.footer, dynamicStyles.footerBorder]}>
          <Text style={[styles.footerText, dynamicStyles.footerText]}>© 2026 InvestIQ. All rights reserved.</Text>
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
  subheading: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
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
