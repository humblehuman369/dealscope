/**
 * useRegisterPushToken — Registers the Expo push token with the backend
 * and initializes the notification service.
 *
 * Should be called once in _layout.tsx, gated behind `isAuthenticated`.
 *
 * On mount:
 *   1. Initializes notificationService (permission + listeners + channels)
 *   2. Retrieves the Expo push token
 *   3. POST /api/v1/devices/register to store it server-side
 *
 * On unmount / logout:
 *   Cleans up listeners. Token deactivation on logout is handled
 *   separately via `unregisterPushToken`.
 */

import { useEffect, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { notificationService } from '../services/notificationService';
import { post, del } from '../services/apiClient';

/**
 * Register the device's push token with the backend.
 * Silently no-ops if token acquisition fails (e.g., simulator, permission denied).
 */
async function registerWithBackend(): Promise<string | null> {
  try {
    await notificationService.initialize();
    const pushToken = notificationService.getPushToken();
    if (!pushToken) {
      return null;
    }

    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    await post('/api/v1/devices/register', {
      token: pushToken.token,
      device_platform: platform,
      device_name: `${Platform.OS} ${Platform.Version}`,
    });

    console.log('[PushToken] Registered with backend:', pushToken.token.slice(0, 30) + '…');
    return pushToken.token;
  } catch (error) {
    // Non-critical — app works fine without push
    console.warn('[PushToken] Registration failed (non-fatal):', error);
    return null;
  }
}

/**
 * Unregister the device token on logout.
 * Call this before clearing auth tokens.
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    const pushToken = notificationService.getPushToken();
    if (pushToken) {
      await del(`/api/v1/devices/${encodeURIComponent(pushToken.token)}`);
      console.log('[PushToken] Unregistered from backend');
    }
  } catch (error) {
    // Best-effort — if this fails the token will just go stale
    console.warn('[PushToken] Unregister failed (non-fatal):', error);
  }
}

/**
 * Hook: initializes push notifications and registers token with backend.
 *
 * @param isAuthenticated — only registers when the user is logged in.
 */
export function useRegisterPushToken(isAuthenticated: boolean): void {
  const registeredRef = useRef(false);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      registeredRef.current = false;
      tokenRef.current = null;
      return;
    }

    let cancelled = false;

    /**
     * Initial registration on mount — guarded to prevent duplicate
     * calls from React strict-mode or rapid re-renders.
     */
    const registerInitial = async () => {
      if (registeredRef.current) return;
      const token = await registerWithBackend();
      if (!cancelled && token) {
        registeredRef.current = true;
        tokenRef.current = token;
      }
    };

    /**
     * Re-registration on app resume — always re-acquires the token
     * from Expo and compares to the last-known value.  If the token
     * rotated while the app was suspended, we send the new token to
     * the backend.  If it hasn't changed, this is a no-op.
     */
    const registerOnResume = async () => {
      try {
        await notificationService.initialize();
        const pushToken = notificationService.getPushToken();

        if (!pushToken || cancelled) return;

        // Token unchanged — nothing to do
        if (pushToken.token === tokenRef.current) return;

        // Token rotated (or first resume after a failed initial attempt)
        const token = await registerWithBackend();
        if (!cancelled && token) {
          registeredRef.current = true;
          tokenRef.current = token;
        }
      } catch {
        // Non-critical
        console.warn('[PushToken] Resume re-registration failed (non-fatal)');
      }
    };

    registerInitial();

    // Re-check on every foreground resume (tokens can rotate)
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && isAuthenticated) {
        registerOnResume();
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [isAuthenticated]);

  // Cleanup listeners on final unmount
  useEffect(() => {
    return () => {
      notificationService.destroy();
    };
  }, []);
}
