'use client';

import { useState, useEffect, useCallback } from 'react';

// #region agent log
const DEBUG_SERVER = 'http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184';
function debugLog(location: string, message: string, data: object, hypothesisId: string) {
  fetch(DEBUG_SERVER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location, message, data, hypothesisId, timestamp: Date.now(), sessionId: 'debug-session' }) }).catch(() => {});
}
// #endregion

interface DeviceOrientationState {
  heading: number | null;
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  isSupported: boolean;
  isPermissionGranted: boolean;
  error: string | null;
}

/**
 * Hook for accessing device orientation (compass) on mobile browsers.
 * Note: This primarily works on mobile devices. Desktop browsers don't have magnetometers.
 */
export function useDeviceOrientation() {
  const [state, setState] = useState<DeviceOrientationState>({
    heading: null,
    alpha: null,
    beta: null,
    gamma: null,
    isSupported: false,
    isPermissionGranted: false,
    error: null,
  });

  const [permissionRequested, setPermissionRequested] = useState(false);

  // Check if DeviceOrientationEvent is supported
  useEffect(() => {
    const isSupported = typeof window !== 'undefined' && 
      'DeviceOrientationEvent' in window;
    // #region agent log
    debugLog('useDeviceOrientation.ts:45', 'isSupported check', { isSupported, windowDefined: typeof window !== 'undefined', hasEvent: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window }, 'H3');
    // #endregion
    
    setState(prev => ({ ...prev, isSupported }));
  }, []);

  // Handle orientation event
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    // #region agent log
    debugLog('useDeviceOrientation.ts:55', 'Orientation event received', { alpha: event.alpha, beta: event.beta, gamma: event.gamma }, 'H5');
    // #endregion
    // Calculate compass heading
    // On iOS, webkitCompassHeading gives the heading directly
    // On Android, we use alpha (but it's relative to initial orientation)
    let heading: number | null = null;

    // Check for iOS webkitCompassHeading
    const iosEvent = event as DeviceOrientationEvent & { webkitCompassHeading?: number };
    if (iosEvent.webkitCompassHeading !== undefined) {
      heading = iosEvent.webkitCompassHeading;
      // #region agent log
      debugLog('useDeviceOrientation.ts:67', 'iOS compass heading', { webkitCompassHeading: heading }, 'H5');
      // #endregion
    } else if (event.alpha !== null) {
      // Android: alpha is degrees from North, but we need to adjust
      // Alpha: 0-360 where 0 is initial device orientation
      // We approximate compass heading (may need calibration)
      heading = (360 - event.alpha) % 360;
      // #region agent log
      debugLog('useDeviceOrientation.ts:75', 'Android heading calculated', { alpha: event.alpha, heading }, 'H5');
      // #endregion
    }

    setState(prev => ({
      ...prev,
      heading: heading !== null ? Math.round(heading) : null,
      alpha: event.alpha,
      beta: event.beta,
      gamma: event.gamma,
      isPermissionGranted: true,
      error: null,
    }));
  }, []);

  // Request permission (required on iOS 13+)
  const requestPermission = useCallback(async () => {
    // Check support at call time, not from potentially stale state
    const isCurrentlySupported = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
    
    // #region agent log
    debugLog('useDeviceOrientation.ts:92', 'requestPermission called', { isCurrentlySupported, stateIsSupported: state.isSupported }, 'H2');
    // #endregion
    
    if (!isCurrentlySupported) {
      setState(prev => ({
        ...prev,
        error: 'Device orientation not supported on this device',
      }));
      // #region agent log
      debugLog('useDeviceOrientation.ts:101', 'requestPermission - not supported', {}, 'H3');
      // #endregion
      return false;
    }

    setPermissionRequested(true);

    // Check if we need to request permission (iOS 13+)
    const DeviceOrientationEventWithPermission = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
    };

    const hasRequestPermission = typeof DeviceOrientationEventWithPermission.requestPermission === 'function';
    // #region agent log
    debugLog('useDeviceOrientation.ts:115', 'Permission API check', { hasRequestPermission }, 'H4');
    // #endregion

    if (hasRequestPermission) {
      try {
        const permission = await DeviceOrientationEventWithPermission.requestPermission!();
        // #region agent log
        debugLog('useDeviceOrientation.ts:122', 'Permission result', { permission }, 'H4');
        // #endregion
        if (permission === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true);
          // Also update isSupported state to true now that we've confirmed it works
          setState(prev => ({ ...prev, isSupported: true }));
          // #region agent log
          debugLog('useDeviceOrientation.ts:129', 'Event listener added (iOS)', {}, 'H5');
          // #endregion
          return true;
        } else {
          setState(prev => ({
            ...prev,
            error: 'Permission denied for device orientation',
          }));
          return false;
        }
      } catch (error) {
        // #region agent log
        debugLog('useDeviceOrientation.ts:141', 'Permission request error', { error: String(error) }, 'H4');
        // #endregion
        setState(prev => ({
          ...prev,
          error: 'Failed to request orientation permission',
        }));
        return false;
      }
    } else {
      // No permission needed (Android, older iOS, desktop with DeviceOrientation)
      window.addEventListener('deviceorientation', handleOrientation, true);
      // Also update isSupported state
      setState(prev => ({ ...prev, isSupported: true }));
      // #region agent log
      debugLog('useDeviceOrientation.ts:155', 'Event listener added (non-iOS)', {}, 'H5');
      // #endregion
      return true;
    }
  }, [handleOrientation, state.isSupported]);

  // Cleanup
  useEffect(() => {
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [handleOrientation]);

  // Check if device likely has a compass (mobile detection)
  const isMobileDevice = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window)
  );

  // #region agent log
  useEffect(() => {
    debugLog('useDeviceOrientation.ts:155', 'Hook state update', { 
      heading: state.heading, 
      isSupported: state.isSupported, 
      isMobileDevice, 
      hasCompass: state.isSupported && isMobileDevice,
      permissionRequested,
      isPermissionGranted: state.isPermissionGranted,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
    }, 'H1');
  }, [state.heading, state.isSupported, isMobileDevice, permissionRequested, state.isPermissionGranted]);
  // #endregion

  return {
    ...state,
    requestPermission,
    permissionRequested,
    isMobileDevice,
    hasCompass: state.isSupported && isMobileDevice,
  };
}

