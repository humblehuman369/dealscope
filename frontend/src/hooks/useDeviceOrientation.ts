'use client';

import { useState, useEffect, useCallback } from 'react';

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
    
    setState(prev => ({ ...prev, isSupported }));
  }, []);

  // Handle orientation event
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    // Calculate compass heading
    // On iOS, webkitCompassHeading gives the heading directly
    // On Android, we use alpha (but it's relative to initial orientation)
    let heading: number | null = null;

    // Check for iOS webkitCompassHeading
    const iosEvent = event as DeviceOrientationEvent & { webkitCompassHeading?: number };
    if (iosEvent.webkitCompassHeading !== undefined) {
      heading = iosEvent.webkitCompassHeading;
    } else if (event.alpha !== null) {
      // Android: alpha is degrees from North, but we need to adjust
      // Alpha: 0-360 where 0 is initial device orientation
      // We approximate compass heading (may need calibration)
      heading = (360 - event.alpha) % 360;
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
    if (!state.isSupported) {
      setState(prev => ({
        ...prev,
        error: 'Device orientation not supported on this device',
      }));
      return false;
    }

    setPermissionRequested(true);

    // Check if we need to request permission (iOS 13+)
    const DeviceOrientationEventWithPermission = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
    };

    if (typeof DeviceOrientationEventWithPermission.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEventWithPermission.requestPermission();
        if (permission === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true);
          return true;
        } else {
          setState(prev => ({
            ...prev,
            error: 'Permission denied for device orientation',
          }));
          return false;
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: 'Failed to request orientation permission',
        }));
        return false;
      }
    } else {
      // No permission needed (Android, older iOS)
      window.addEventListener('deviceorientation', handleOrientation, true);
      return true;
    }
  }, [state.isSupported, handleOrientation]);

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

  return {
    ...state,
    requestPermission,
    permissionRequested,
    isMobileDevice,
    hasCompass: state.isSupported && isMobileDevice,
  };
}

