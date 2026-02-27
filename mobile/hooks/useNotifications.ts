/**
 * useNotifications — manages push notification lifecycle.
 *
 * - Registers device token when permission is granted
 * - Handles notification tap → deep-link navigation
 * - Provides requestPermission() for deferred permission prompts
 * - Unregisters on logout
 */

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  requestPushPermission,
  getPermissionStatus,
  registerDeviceToken,
  unregisterDeviceToken,
  resolveNotificationRoute,
  type NotificationData,
} from '@/services/notifications';
import { useSession } from './useSession';

/**
 * Call once in the root layout to set up notification tap handling
 * and auto-register the device token when authenticated.
 */
export function useNotificationSetup() {
  const router = useRouter();
  const { isAuthenticated, user } = useSession();
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Handle notification tap → navigate to deep-link
  useEffect(() => {
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content
          .data as NotificationData;
        const route = resolveNotificationRoute(data);
        if (route) {
          router.push(route as any);
        }
      });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);

  // Auto-register device token when authenticated + permission granted
  useEffect(() => {
    if (!isAuthenticated) return;

    (async () => {
      const status = await getPermissionStatus();
      if (status === 'granted') {
        await registerDeviceToken();
      }
    })();
  }, [isAuthenticated, user?.id]);
}

/**
 * Hook for screens that want to request notification permission
 * (e.g., after onboarding completion).
 */
export function useRequestPushPermission() {
  const request = useCallback(async () => {
    const granted = await requestPushPermission();
    if (granted) {
      await registerDeviceToken();
    }
    return granted;
  }, []);

  return { requestPermission: request };
}

/**
 * Call on logout to unregister the device.
 */
export async function cleanupNotificationsOnLogout(): Promise<void> {
  await unregisterDeviceToken();
}
