/**
 * Push Notification Service for expo-notifications.
 * Handles permission requests, token registration, and deep linking.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';

// Configure how notifications appear when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushToken {
  token: string;
  type: 'expo' | 'fcm' | 'apns';
}

class NotificationService {
  private pushToken: PushToken | null = null;
  private notificationListener: Notifications.EventSubscription | null = null;
  private responseListener: Notifications.EventSubscription | null = null;

  /**
   * Initialize notification service.
   * Call this when the app starts.
   */
  async initialize(): Promise<void> {
    // Register for push notifications
    await this.registerForPushNotifications();

    // Handle notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived
    );

    // Handle notification response (user tapped notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse
    );

    if (__DEV__) console.log('[NotificationService] Initialized');
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
    if (__DEV__) console.log('[NotificationService] Destroyed');
  }

  /**
   * Register for push notifications and get token.
   */
  async registerForPushNotifications(): Promise<PushToken | null> {
    // Only works on physical devices
    if (!Device.isDevice) {
      if (__DEV__) console.log('[NotificationService] Push notifications require a physical device');
      return null;
    }

    try {
      // Check current permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        if (__DEV__) console.log('[NotificationService] Permission not granted');
        return null;
      }

      // Get push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      const tokenResult = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.pushToken = {
        token: tokenResult.data,
        type: 'expo',
      };

      if (__DEV__) console.log('[NotificationService] Push token acquired');

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4F46E5',
        });

        await Notifications.setNotificationChannelAsync('property-alerts', {
          name: 'Property Alerts',
          description: 'Alerts for properties you\'re tracking',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#22C55E',
        });
      }

      return this.pushToken;
    } catch (error) {
      console.error('[NotificationService] Error registering:', error);
      return null;
    }
  }

  /**
   * Handle notification received while app is in foreground.
   */
  private handleNotificationReceived = (notification: Notifications.Notification): void => {
    if (__DEV__) console.log('[NotificationService] Received:', notification.request.content.title);
    // The notification will be shown by the OS based on our handler config
  };

  /**
   * Handle notification response (user tapped on notification).
   * Implements deep linking.
   */
  private handleNotificationResponse = (
    response: Notifications.NotificationResponse
  ): void => {
    const data = response.notification.request.content.data;
    if (__DEV__) console.log('[NotificationService] Response data:', data);

    // Handle deep linking based on notification data
    if (data?.type === 'property' && data?.address) {
      // Navigate to IQ Analyzing screen (new IQ Verdict flow)
      router.push(`/analyzing/${encodeURIComponent(data.address as string)}` as any);
    } else if (data?.type === 'scan') {
      // Navigate to scan tab
      router.replace('/(tabs)/scan');
    } else if (data?.type === 'portfolio') {
      // Navigate to portfolio tab
      router.replace('/(tabs)/portfolio');
    } else if (data?.screen) {
      // Generic screen navigation
      router.push(data.screen as string);
    }
  };

  /**
   * Get the current push token.
   */
  getPushToken(): PushToken | null {
    return this.pushToken;
  }

  /**
   * Check if notifications are enabled.
   */
  async checkPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Request notification permission.
   */
  async requestPermission(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Schedule a local notification.
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>,
    trigger?: Notifications.NotificationTriggerInput
  ): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: trigger || null, // null means immediate
    });
    if (__DEV__) console.log('[NotificationService] Scheduled notification:', id);
    return id;
  }

  /**
   * Cancel a scheduled notification.
   */
  async cancelNotification(id: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(id);
    if (__DEV__) console.log('[NotificationService] Cancelled notification:', id);
  }

  /**
   * Cancel all scheduled notifications.
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (__DEV__) console.log('[NotificationService] Cancelled all notifications');
  }

  /**
   * Get the badge count.
   */
  async getBadgeCount(): Promise<number> {
    return Notifications.getBadgeCountAsync();
  }

  /**
   * Set the badge count.
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear the badge count.
   */
  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }
}

// Singleton instance
export const notificationService = new NotificationService();

// React hook for notifications
import { useState, useEffect, useCallback } from 'react';

export function useNotifications() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    // Check initial permission
    notificationService.checkPermission().then(setHasPermission);

    // Get existing token
    const token = notificationService.getPushToken();
    if (token) {
      setPushToken(token.token);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const granted = await notificationService.requestPermission();
    setHasPermission(granted);

    if (granted) {
      const token = await notificationService.registerForPushNotifications();
      if (token) {
        setPushToken(token.token);
      }
    }

    return granted;
  }, []);

  const sendTestNotification = useCallback(() => {
    return notificationService.scheduleLocalNotification(
      'Test Notification',
      'This is a test notification from DealGapIQ!',
      { type: 'test' }
    );
  }, []);

  return {
    hasPermission,
    pushToken,
    requestPermission,
    sendTestNotification,
    scheduleNotification: notificationService.scheduleLocalNotification.bind(notificationService),
    cancelNotification: notificationService.cancelNotification.bind(notificationService),
    clearBadge: notificationService.clearBadge.bind(notificationService),
  };
}

