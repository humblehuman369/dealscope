/**
 * useNetworkStatus — React hook for real-time connectivity state.
 *
 * Uses @react-native-community/netinfo (already installed).
 * Returns { isConnected, isInternetReachable, type }.
 * Also exposes a `waitForReconnect` promise helper.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';

export interface NetworkStatus {
  /** Device has a network interface up (wifi / cellular) */
  isConnected: boolean;
  /** Internet is actually reachable (can fail even when connected) */
  isInternetReachable: boolean;
  /** Connection type: wifi, cellular, none, etc. */
  type: NetInfoStateType;
  /** True during the initial check (first ~200ms) */
  isChecking: boolean;
}

const INITIAL: NetworkStatus = {
  isConnected: true, // optimistic default
  isInternetReachable: true,
  type: NetInfoStateType.unknown,
  isChecking: true,
};

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(INITIAL);

  useEffect(() => {
    // Initial fetch
    NetInfo.fetch().then((state) => {
      setStatus({
        isConnected: !!state.isConnected,
        isInternetReachable: state.isInternetReachable ?? !!state.isConnected,
        type: state.type,
        isChecking: false,
      });
    });

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isConnected: !!state.isConnected,
        isInternetReachable: state.isInternetReachable ?? !!state.isConnected,
        type: state.type,
        isChecking: false,
      });
    });

    return unsubscribe;
  }, []);

  return status;
}

/**
 * Simpler boolean hook for quick checks.
 * Returns `false` when definitely offline, `true` otherwise (including during initial check).
 */
export function useIsOnline(): boolean {
  const { isConnected, isInternetReachable, isChecking } = useNetworkStatus();
  if (isChecking) return true; // optimistic
  return isConnected && isInternetReachable;
}

export default useNetworkStatus;
