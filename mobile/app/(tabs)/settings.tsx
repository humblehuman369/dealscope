import React, { useCallback, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useDatabaseStats, useClearAllData, useDatabaseInit } from '../../hooks/useDatabase';
import { useSyncStatus } from '../../services/syncManager';
import { getSetting, setSetting } from '../../database';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated, logout, isLoading: authLoading } = useAuth();
  const { isReady: dbReady } = useDatabaseInit();
  const { data: dbStats } = useDatabaseStats();
  const clearAllData = useClearAllData();
  const syncStatus = useSyncStatus();
  
  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Load settings from database
  useEffect(() => {
    async function loadSettings() {
      if (!dbReady) return;
      try {
        const notifSetting = await getSetting('notifications');
        const hapticsSetting = await getSetting('haptics');
        
        if (notifSetting !== null) setNotifications(notifSetting === 'true');
        if (hapticsSetting !== null) setHaptics(hapticsSetting === 'true');
      } catch (error) {
        console.warn('Failed to load settings:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    }
    loadSettings();
  }, [dbReady]);

  // Save setting to database
  const saveSetting = useCallback(async (key: string, value: boolean) => {
    try {
      await setSetting(key, String(value));
    } catch (error) {
      console.warn('Failed to save setting:', error);
    }
  }, []);

  const handleNotificationsChange = useCallback(async (value: boolean) => {
    if (haptics) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications(value);
    saveSetting('notifications', value);
  }, [haptics, saveSetting]);

  const handleHapticsChange = useCallback(async (value: boolean) => {
    if (value) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHaptics(value);
    saveSetting('haptics', value);
  }, [saveSetting]);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Clear All Data',
      'This will delete all scanned properties, portfolio data, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            if (haptics) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            clearAllData.mutate();
            Alert.alert('Success', 'All local data has been cleared.');
          },
        },
      ]
    );
  }, [clearAllData, haptics]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            if (haptics) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await logout();
          },
        },
      ]
    );
  }, [logout, haptics]);

  const handleSync = useCallback(() => {
    if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    syncStatus.triggerSync();
  }, [syncStatus, haptics]);

  // Calculate approximate cache size
  const cacheSize = dbStats 
    ? ((dbStats.scannedCount * 2) + (dbStats.portfolioCount * 1.5) + 0.5).toFixed(1)
    : '0';

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
        {/* Sync Status Card */}
        <View style={styles.syncCard}>
          <View style={styles.syncStatus}>
            <View style={[
              styles.syncDot,
              syncStatus.isOnline ? styles.syncDotOnline : styles.syncDotOffline
            ]} />
            <Text style={styles.syncText}>
              {syncStatus.isOnline ? 'Online' : 'Offline'}
            </Text>
            {syncStatus.pendingChanges > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>{syncStatus.pendingChanges} pending</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[styles.syncButton, syncStatus.isSyncing && styles.syncButtonDisabled]}
            onPress={handleSync}
            disabled={syncStatus.isSyncing || !syncStatus.isOnline}
          >
            {syncStatus.isSyncing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="sync" size={16} color="#fff" />
                <Text style={styles.syncButtonText}>Sync Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContent}>
            {isAuthenticated ? (
              <>
                <View style={styles.userInfo}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userInitial}>
                      {user?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                  <View style={[styles.menuIcon, { backgroundColor: colors.loss.light }]}>
                    <Ionicons name="log-out" size={18} color={colors.loss.main} />
                  </View>
                  <Text style={[styles.menuTitle, { color: colors.loss.main }]}>Sign Out</Text>
                  {authLoading && <ActivityIndicator size="small" color={colors.loss.main} />}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => router.push('/auth/login')}
              >
                <View style={[styles.menuIcon, { backgroundColor: colors.primary[100] }]}>
                  <Ionicons name="person" size={18} color={colors.primary[600]} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Sign In / Create Account</Text>
                  <Text style={styles.menuSubtitle}>Sync your data across devices</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
              </TouchableOpacity>
            )}
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
                onValueChange={handleNotificationsChange}
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
                onValueChange={handleHapticsChange}
                trackColor={{ true: colors.primary[500] }}
              />
            </View>
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <View style={styles.sectionContent}>
            <View style={styles.dataStats}>
              <View style={styles.dataStat}>
                <Text style={styles.dataStatValue}>{dbStats?.scannedCount ?? 0}</Text>
                <Text style={styles.dataStatLabel}>Scanned</Text>
              </View>
              <View style={styles.dataStatDivider} />
              <View style={styles.dataStat}>
                <Text style={styles.dataStatValue}>{dbStats?.portfolioCount ?? 0}</Text>
                <Text style={styles.dataStatLabel}>Portfolio</Text>
              </View>
              <View style={styles.dataStatDivider} />
              <View style={styles.dataStat}>
                <Text style={styles.dataStatValue}>{cacheSize} MB</Text>
                <Text style={styles.dataStatLabel}>Cache</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleClearCache}>
              <View style={[styles.menuIcon, { backgroundColor: colors.gray[100] }]}>
                <Ionicons name="trash" size={18} color={colors.gray[600]} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Clear All Data</Text>
                <Text style={styles.menuSubtitle}>Remove all local data</Text>
              </View>
              {clearAllData.isPending && (
                <ActivityIndicator size="small" color={colors.gray[600]} />
              )}
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
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/privacy')}
            >
              <Text style={styles.menuTitle}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/terms')}
            >
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
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  syncDotOnline: {
    backgroundColor: colors.profit.main,
  },
  syncDotOffline: {
    backgroundColor: colors.gray[400],
  },
  syncText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray[700],
  },
  pendingBadge: {
    backgroundColor: colors.warning[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.warning.main,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary[600],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  syncButtonDisabled: {
    backgroundColor: colors.gray[400],
  },
  syncButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary[600],
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
  },
  userEmail: {
    fontSize: 13,
    color: colors.gray[500],
    marginTop: 2,
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
  dataStats: {
    flexDirection: 'row',
    padding: 16,
  },
  dataStat: {
    flex: 1,
    alignItems: 'center',
  },
  dataStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
  },
  dataStatLabel: {
    fontSize: 12,
    color: colors.gray[500],
    marginTop: 2,
  },
  dataStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.gray[200],
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
