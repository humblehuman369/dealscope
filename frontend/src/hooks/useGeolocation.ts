'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  isLoading: boolean;
  isSupported: boolean;
  timestamp: number | null;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

const defaultOptions: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 60000,
  watchPosition: false,
};

/**
 * Hook for accessing browser geolocation API.
 * Works on both desktop and mobile browsers.
 *
 * Mobile GPS cold starts commonly need 10-20s, so the default timeout
 * is 15s with a 20s fallback. When `watchPosition` is true the browser
 * keeps retrying automatically; transient timeouts are suppressed and
 * only surfaced after the fallback window expires.
 */
export function useGeolocation(options: UseGeolocationOptions = {}) {
  const enableHighAccuracy = options.enableHighAccuracy ?? defaultOptions.enableHighAccuracy;
  const timeout = options.timeout ?? defaultOptions.timeout;
  const maximumAge = options.maximumAge ?? defaultOptions.maximumAge;
  const watchPosition = options.watchPosition ?? defaultOptions.watchPosition;
  
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    isLoading: true,
    isSupported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
    timestamp: null,
  });

  const hasRequestedRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 2;

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    retryCountRef.current = 0;
    setState(prev => ({
      ...prev,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      error: null,
      isLoading: false,
      timestamp: position.timestamp,
    }));
  }, []);

  const requestLocationRef = useRef<(() => void) | null>(null);

  const handleError = useCallback((error: GeolocationPositionError) => {
    if (error.code === error.TIMEOUT && retryCountRef.current < MAX_RETRIES) {
      retryCountRef.current += 1;
      requestLocationRef.current?.();
      return;
    }

    let errorMessage = 'Unable to get location';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location unavailable. Please check your device settings.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out. Please try again.';
        break;
    }
    
    setState(prev => ({
      ...prev,
      error: errorMessage,
      isLoading: false,
    }));
  }, []);

  const requestLocation = useCallback(() => {
    const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
    
    if (!isSupported) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        isLoading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const geoOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge,
    };

    if (watchPosition) {
      const watchId = navigator.geolocation.watchPosition(
        handleSuccess,
        (err) => {
          // In watch mode, transient timeouts are expected while the
          // device acquires a fix — only surface non-timeout errors.
          if (err.code !== err.TIMEOUT) {
            handleError(err);
          }
        },
        geoOptions
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        geoOptions
      );
    }
  }, [enableHighAccuracy, timeout, maximumAge, watchPosition, handleSuccess, handleError]);

  requestLocationRef.current = requestLocation;

  // Initial location request - only run once on mount
  useEffect(() => {
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;
    
    const cleanup = requestLocation();

    const fallbackMs = watchPosition ? 30000 : 20000;
    const fallbackTimeout = setTimeout(() => {
      setState(prev => {
        if (prev.isLoading) {
          return {
            ...prev,
            isLoading: false,
            error: prev.error || 'Location unavailable on this device',
          };
        }
        return prev;
      });
    }, fallbackMs);
    
    return () => {
      clearTimeout(fallbackTimeout);
      if (cleanup) cleanup();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => {
    retryCountRef.current = 0;
    requestLocation();
  }, [requestLocation]);

  return {
    ...state,
    isReady: state.latitude !== null && state.longitude !== null,
    refresh,
  };
}

