/**
 * useBiometricLock — prompts biometric auth on app resume.
 *
 * When the app returns to the foreground and biometric is enabled,
 * this hook shows a biometric prompt. If the user fails or cancels,
 * the locked state remains true and the UI should show an overlay.
 *
 * Usage in root layout:
 *   const { isLocked, unlock } = useBiometricLock();
 *   if (isLocked) return <BiometricLockScreen onRetry={unlock} />;
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { hasTokens } from '@/services/token-manager';
import {
  isBiometricEnabled,
  isBiometricAvailable,
  authenticateWithBiometric,
} from '@/services/biometric';

const BACKGROUND_THRESHOLD_MS = 3000;

export function useBiometricLock() {
  const [isLocked, setIsLocked] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  const unlock = useCallback(async () => {
    const success = await authenticateWithBiometric();
    if (success) {
      setIsLocked(false);
    }
    return success;
  }, []);

  useEffect(() => {
    async function handleAppStateChange(nextState: AppStateStatus) {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundedAt.current = Date.now();
        return;
      }

      if (nextState === 'active' && backgroundedAt.current) {
        const elapsed = Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;

        if (elapsed < BACKGROUND_THRESHOLD_MS) return;
        if (!hasTokens()) return;

        const [enabled, available] = await Promise.all([
          isBiometricEnabled(),
          isBiometricAvailable(),
        ]);

        if (!enabled || !available) return;

        setIsLocked(true);
        const success = await authenticateWithBiometric();
        if (success) {
          setIsLocked(false);
        }
      }
    }

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, []);

  return { isLocked, unlock };
}
