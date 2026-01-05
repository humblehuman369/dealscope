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
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { useDatabaseStats, useClearAllData, useDatabaseInit } from '../../hooks/useDatabase';
import { useSyncStatus } from '../../services/syncManager';
import { getSetting, setSetting } from '../../database';

const THEME_OPTIONS: { label: string; value: ThemeMode; icon: string }[] = [
  { label: 'Light', value: 'light', icon: 'sunny' },
  { label: 'Dark', value: 'dark', icon: 'moon' },
  { label: 'System', value: 'system', icon: 'phone-portrait' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, isAuthenticated, logout, isLoading: authLoading } = useAuth();
  const { theme, isDark, mode: themeMode, setMode: setThemeMode } = useTheme();
  const { isReady: dbReady } = useDatabaseInit();
  const { data: dbStats } = useDatabaseStats();
  const clearAllData = useClearAllData();
  const syncStatus = useSyncStatus();
  
  // Settings state
  const [notifications, setNotifications] = useState(true);

  // Load settings from database
  useEffect(() => {
    async function loadSettings() {
      if (!dbReady) return;
      try {
        const notifSetting = await getSetting('notifications');
        if (notifSetting !== null) setNotifications(notifSetting === 'true');
      } catch (error) {
        console.warn('Failed to load settings:', error);
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
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications(value);
    saveSetting('notifications', value);
  }, [saveSetting]);

  const handleThemeChange = useCallback(async (newMode: ThemeMode) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThemeMode(newMode);
  }, [setThemeMode]);

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
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            clearAllData.mutate();
            Alert.alert('Success', 'All local data has been cleared.');
          },
        },
      ]
    );
  }, [clearAllData]);

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
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await logout();
          },
        },
      ]
    );
  }, [logout]);

  const handleSync = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    syncStatus.triggerSync();
  }, [syncStatus]);

  // Calculate approximate cache size
  const cacheSize = dbStats 
    ? ((dbStats.scannedCount * 2) + (dbStats.portfolioCount * 1.5) + 0.5).toFixed(1)
    : '0';

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: {
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.headerBackground,
      borderBottomColor: theme.headerBorder,
    },
    title: {
      color: theme.text,
    },
    syncCard: {
      backgroundColor: theme.card,
      borderColor: colors.primary[isDark ? 600 : 300],
    },
    syncText: {
      color: theme.textSecondary,
    },
    sectionTitle: {
      color: theme.sectionTitle,
    },
    sectionContent: {
      backgroundColor: theme.card,
      borderColor: colors.primary[isDark ? 600 : 300],
    },
    userAvatar: {
      backgroundColor: isDark ? colors.primary[800] : colors.primary[100],
    },
    userInitial: {
      color: isDark ? colors.primary[200] : colors.primary[600],
    },
    userName: {
      color: theme.text,
    },
    userEmail: {
      color: theme.textMuted,
    },
    menuTitle: {
      color: theme.text,
    },
    menuSubtitle: {
      color: theme.textMuted,
    },
    settingTitle: {
      color: theme.text,
    },
    divider: {
      backgroundColor: theme.divider,
    },
    dataStatValue: {
      color: theme.text,
    },
    dataStatLabel: {
      color: theme.textMuted,
    },
    dataStatDivider: {
      backgroundColor: theme.divider,
    },
    version: {
      color: theme.textMuted,
    },
    menuIcon: {
      backgroundColor: theme.iconBackground,
    },
  };

  return (
    <View style={[styles.container, dynamicStyles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <Text style={[styles.title, dynamicStyles.title]}>Settings</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Sync Status Card */}
        <View style={[styles.syncCard, dynamicStyles.syncCard]}>
          <View style={styles.syncStatus}>
            <View style={[
              styles.syncDot,
              syncStatus.isOnline ? styles.syncDotOnline : styles.syncDotOffline
            ]} />
            <Text style={[styles.syncText, dynamicStyles.syncText]}>
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
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Account</Text>
          <View style={[styles.sectionContent, dynamicStyles.sectionContent]}>
            {isAuthenticated ? (
              <>
                <View style={styles.userInfo}>
                  <View style={[styles.userAvatar, dynamicStyles.userAvatar]}>
                    <Text style={[styles.userInitial, dynamicStyles.userInitial]}>
                      {user?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={[styles.userName, dynamicStyles.userName]}>{user?.full_name || 'User'}</Text>
                    <Text style={[styles.userEmail, dynamicStyles.userEmail]}>{user?.email}</Text>
                  </View>
                </View>
                <View style={[styles.divider, dynamicStyles.divider]} />
                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                  <View style={[styles.menuIcon, { backgroundColor: isDark ? colors.loss.dark + '30' : colors.loss.light }]}>
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
                <View style={[styles.menuIcon, { backgroundColor: isDark ? colors.primary[800] : colors.primary[100] }]}>
                  <Ionicons name="person" size={18} color={colors.primary[isDark ? 300 : 600]} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuTitle, dynamicStyles.menuTitle]}>Sign In / Create Account</Text>
                  <Text style={[styles.menuSubtitle, dynamicStyles.menuSubtitle]}>Sync your data across devices</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Appearance</Text>
          <View style={[styles.sectionContent, dynamicStyles.sectionContent]}>
            <View style={styles.themeSelector}>
              {THEME_OPTIONS.map((option, index) => (
                <React.Fragment key={option.value}>
                  <TouchableOpacity
                    style={[
                      styles.themeOption,
                      themeMode === option.value && styles.themeOptionSelected,
                      themeMode === option.value && { backgroundColor: isDark ? colors.primary[800] : colors.primary[50] }
                    ]}
                    onPress={() => handleThemeChange(option.value)}
                  >
                    <Ionicons 
                      name={option.icon as any} 
                      size={20} 
                      color={themeMode === option.value ? colors.primary[isDark ? 300 : 600] : theme.textMuted} 
                    />
                    <Text style={[
                      styles.themeOptionText,
                      { color: theme.text },
                      themeMode === option.value && { color: colors.primary[isDark ? 300 : 600], fontWeight: '600' }
                    ]}>
                      {option.label}
                    </Text>
                    {themeMode === option.value && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary[isDark ? 300 : 600]} />
                    )}
                  </TouchableOpacity>
                  {index < THEME_OPTIONS.length - 1 && (
                    <View style={[styles.divider, dynamicStyles.divider, { marginLeft: 0 }]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Notifications</Text>
          <View style={[styles.sectionContent, dynamicStyles.sectionContent]}>
            <View style={styles.settingItem}>
              <View style={[styles.menuIcon, { backgroundColor: isDark ? colors.info.dark + '30' : colors.info.light }]}>
                <Ionicons name="notifications" size={18} color={colors.info.main} />
              </View>
              <Text style={[styles.settingTitle, dynamicStyles.settingTitle]}>Push Notifications</Text>
              <Switch
                value={notifications}
                onValueChange={handleNotificationsChange}
                trackColor={{ false: isDark ? colors.navy[700] : colors.gray[300], true: colors.primary[500] }}
                thumbColor={notifications ? '#fff' : isDark ? colors.gray[400] : '#fff'}
              />
            </View>
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Data</Text>
          <View style={[styles.sectionContent, dynamicStyles.sectionContent]}>
            <View style={styles.dataStats}>
              <View style={styles.dataStat}>
                <Text style={[styles.dataStatValue, dynamicStyles.dataStatValue]}>{dbStats?.scannedCount ?? 0}</Text>
                <Text style={[styles.dataStatLabel, dynamicStyles.dataStatLabel]}>Scanned</Text>
              </View>
              <View style={[styles.dataStatDivider, dynamicStyles.dataStatDivider]} />
              <View style={styles.dataStat}>
                <Text style={[styles.dataStatValue, dynamicStyles.dataStatValue]}>{dbStats?.portfolioCount ?? 0}</Text>
                <Text style={[styles.dataStatLabel, dynamicStyles.dataStatLabel]}>Portfolio</Text>
              </View>
              <View style={[styles.dataStatDivider, dynamicStyles.dataStatDivider]} />
              <View style={styles.dataStat}>
                <Text style={[styles.dataStatValue, dynamicStyles.dataStatValue]}>{cacheSize} MB</Text>
                <Text style={[styles.dataStatLabel, dynamicStyles.dataStatLabel]}>Cache</Text>
              </View>
            </View>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <TouchableOpacity style={styles.menuItem} onPress={handleClearCache}>
              <View style={[styles.menuIcon, dynamicStyles.menuIcon]}>
                <Ionicons name="trash" size={18} color={theme.textTertiary} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, dynamicStyles.menuTitle]}>Clear All Data</Text>
                <Text style={[styles.menuSubtitle, dynamicStyles.menuSubtitle]}>Remove all local data</Text>
              </View>
              {clearAllData.isPending && (
                <ActivityIndicator size="small" color={theme.textTertiary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Support</Text>
          <View style={[styles.sectionContent, dynamicStyles.sectionContent]}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: isDark ? colors.primary[800] : colors.primary[100] }]}>
                <Ionicons name="help-circle" size={18} color={colors.primary[isDark ? 300 : 600]} />
              </View>
              <Text style={[styles.menuTitle, dynamicStyles.menuTitle]}>Help Center</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: isDark ? colors.primary[800] : colors.primary[100] }]}>
                <Ionicons name="mail" size={18} color={colors.primary[isDark ? 300 : 600]} />
              </View>
              <Text style={[styles.menuTitle, dynamicStyles.menuTitle]}>Contact Support</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: isDark ? colors.primary[800] : colors.primary[100] }]}>
                <Ionicons name="star" size={18} color={colors.primary[isDark ? 300 : 600]} />
              </View>
              <Text style={[styles.menuTitle, dynamicStyles.menuTitle]}>Rate InvestIQ</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Legal</Text>
          <View style={[styles.sectionContent, dynamicStyles.sectionContent]}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/privacy')}
            >
              <Text style={[styles.menuTitle, dynamicStyles.menuTitle]}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => router.push('/terms')}
            >
              <Text style={[styles.menuTitle, dynamicStyles.menuTitle]}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Version */}
        <Text style={[styles.version, dynamicStyles.version]}>InvestIQ v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: '700',
    fontSize: 24,
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1.5,
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
  },
  pendingBadge: {
    backgroundColor: colors.warning.light,
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    fontSize: 20,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 13,
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
    flex: 1,
  },
  menuSubtitle: {
    fontWeight: '400',
    fontSize: 12,
    marginTop: 2,
  },
  themeSelector: {
    paddingVertical: 0,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  themeOptionSelected: {
    // Background color applied dynamically
  },
  themeOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
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
  },
  dataStatLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  dataStatDivider: {
    width: 1,
    height: 32,
  },
  divider: {
    height: 1,
    marginLeft: 64,
  },
  version: {
    fontWeight: '400',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
});
