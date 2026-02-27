/**
 * Push notification service — expo-notifications wrapper.
 *
 * Handles:
 * - Permission request (deferred until after onboarding)
 * - Device token registration with /api/v1/devices
 * - Unregistration on logout
 * - Notification categories for deep-link routing
 * - Foreground/background notification handling
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { api } from './api';

// ---------------------------------------------------------------------------
// Notification categories
// ---------------------------------------------------------------------------

export type NotificationCategory =
  | 'analysis_complete'
  | 'price_change'
  | 'trial_expiring'
  | 'subscription_change'
  | 'announcement';

export interface NotificationData {
  category?: NotificationCategory;
  address?: string;
  propertyId?: string;
  screen?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Configure how notifications appear when the app is in the foreground. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
  });
}

/** Set up notification channels for Android. */
export async function configureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0EA5E9',
  });

  await Notifications.setNotificationChannelAsync('analysis', {
    name: 'Analysis Complete',
    importance: Notifications.AndroidImportance.HIGH,
    description: 'Notifications when property analysis completes',
  });

  await Notifications.setNotificationChannelAsync('deals', {
    name: 'Deal Alerts',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Price changes on saved properties',
  });
}

// ---------------------------------------------------------------------------
// Permission + token registration
// ---------------------------------------------------------------------------

/**
 * Request push notification permission.
 * Returns true if granted, false otherwise.
 * Should be called after onboarding, not on first launch.
 */
export async function requestPushPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('[Notifications] Push not available on simulator');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Check current permission status without prompting.
 */
export async function getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Get the Expo push token for this device.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId ?? undefined,
    });
    return tokenData.data;
  } catch (err) {
    console.error('[Notifications] Failed to get push token:', err);
    return null;
  }
}

/**
 * Register the device push token with the backend.
 */
export async function registerDeviceToken(): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;

  try {
    await api.post('/api/v1/devices', {
      token,
      platform: Platform.OS,
      device_name: Device.deviceName ?? undefined,
    });
  } catch (err) {
    console.error('[Notifications] Failed to register device token:', err);
  }
}

/**
 * Unregister the device on logout.
 */
export async function unregisterDeviceToken(): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;

  try {
    await api.delete(`/api/v1/devices?token=${encodeURIComponent(token)}`);
  } catch {
    // Best effort — token will expire naturally
  }
}

// ---------------------------------------------------------------------------
// Deep-link resolution from notification data
// ---------------------------------------------------------------------------

/**
 * Resolve a notification's data payload to a deep-link route.
 */
export function resolveNotificationRoute(data: NotificationData): string | null {
  if (data.screen) return data.screen;

  switch (data.category) {
    case 'analysis_complete':
      return data.address
        ? `/verdict?address=${encodeURIComponent(data.address)}`
        : null;

    case 'price_change':
      return data.propertyId
        ? `/property/${data.propertyId}`
        : '/(tabs)/deal-vault';

    case 'trial_expiring':
    case 'subscription_change':
      return '/(protected)/billing';

    case 'announcement':
      return null; // Opens the app to current screen

    default:
      return null;
  }
}
