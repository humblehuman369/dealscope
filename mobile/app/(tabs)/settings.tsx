import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = React.useState(true);
  const [offlineMode, setOfflineMode] = React.useState(true);
  const [haptics, setHaptics] = React.useState(true);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: colors.primary[100] }]}>
                <Ionicons name="person" size={18} color={colors.primary[600]} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Sign In / Create Account</Text>
                <Text style={styles.menuSubtitle}>Sync your data across devices</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.sectionContent}>
            <View style={styles.settingItem}>
              <View style={[styles.menuIcon, { backgroundColor: colors.info[100] }]}>
                <Ionicons name="notifications" size={18} color={colors.info.main} />
              </View>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ true: colors.primary[500] }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={[styles.menuIcon, { backgroundColor: colors.profit[100] }]}>
                <Ionicons name="cloud-offline" size={18} color={colors.profit.main} />
              </View>
              <Text style={styles.settingTitle}>Offline Mode</Text>
              <Switch
                value={offlineMode}
                onValueChange={setOfflineMode}
                trackColor={{ true: colors.primary[500] }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={[styles.menuIcon, { backgroundColor: colors.warning[100] }]}>
                <Ionicons name="phone-portrait" size={18} color={colors.warning.main} />
              </View>
              <Text style={styles.settingTitle}>Haptic Feedback</Text>
              <Switch
                value={haptics}
                onValueChange={setHaptics}
                trackColor={{ true: colors.primary[500] }}
              />
            </View>
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: colors.gray[100] }]}>
                <Ionicons name="download" size={18} color={colors.gray[600]} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Download Offline Data</Text>
                <Text style={styles.menuSubtitle}>Cache nearby property data</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: colors.gray[100] }]}>
                <Ionicons name="trash" size={18} color={colors.gray[600]} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Clear Cache</Text>
                <Text style={styles.menuSubtitle}>12.5 MB used</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: colors.primary[100] }]}>
                <Ionicons name="help-circle" size={18} color={colors.primary[600]} />
              </View>
              <Text style={styles.menuTitle}>Help Center</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: colors.primary[100] }]}>
                <Ionicons name="mail" size={18} color={colors.primary[600]} />
              </View>
              <Text style={styles.menuTitle}>Contact Support</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: colors.primary[100] }]}>
                <Ionicons name="star" size={18} color={colors.primary[600]} />
              </View>
              <Text style={styles.menuTitle}>Rate InvestIQ</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuTitle}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuTitle}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Version */}
        <Text style={styles.version}>InvestIQ v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  title: {
    fontWeight: '700',
    fontSize: 24,
    color: colors.gray[900],
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 13,
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontWeight: '500',
    fontSize: 15,
    color: colors.gray[900],
    flex: 1,
  },
  menuSubtitle: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.gray[500],
    marginTop: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  settingTitle: {
    fontWeight: '500',
    fontSize: 15,
    color: colors.gray[900],
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginLeft: 64,
  },
  version: {
    fontWeight: '400',
    fontSize: 13,
    color: colors.gray[400],
    textAlign: 'center',
    marginTop: 8,
  },
});

