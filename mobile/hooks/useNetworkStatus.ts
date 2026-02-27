/**
 * useNetworkStatus — global network connectivity detection.
 *
 * Uses @react-native-community/netinfo to detect online/offline state.
 * Provides:
 * - isOnline: boolean (true when connected)
 * - isOffline: boolean (true when disconnected)
 * - connectionType: wifi, cellular, etc.
 */

import { useState, useEffect } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  connectionType: string | null;
}

let _globalOnline = true;
const _listeners = new Set<(online: boolean) => void>();

/**
 * Initialize the global network listener once. Called from root layout.
 */
export function initNetworkListener(): () => void {
  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const online = state.isConnected === true && state.isInternetReachable !== false;
    _globalOnline = online;
    _listeners.forEach((cb) => cb(online));
  });
  return unsubscribe;
}

/**
 * Read the current global online state (non-reactive).
 */
export function isGloballyOnline(): boolean {
  return _globalOnline;
}

/**
 * React hook for reactive network status.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(_globalOnline);
  const [type, setType] = useState<string | null>(null);

  useEffect(() => {
    function handler(online: boolean) {
      setIsOnline(online);
    }
    _listeners.add(handler);

    // Get initial state
    NetInfo.fetch().then((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline(online);
      setType(state.type ?? null);
    });

    return () => {
      _listeners.delete(handler);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    connectionType: type,
  };
}
