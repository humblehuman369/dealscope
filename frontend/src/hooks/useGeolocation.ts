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
  timeout: 5000, // 5 second timeout
  maximumAge: 60000, // Accept cached position up to 1 minute old
  watchPosition: false, // Use single request, not watch
};

/**
 * Hook for accessing browser geolocation API.
 * Works on both desktop and mobile browsers.
 */
export function useGeolocation(options: UseGeolocationOptions = {}) {
  // Memoize options to prevent infinite re-renders
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

  // Track if initial request has been made
  const hasRequestedRef = useRef(false);

  const handleSuccess = useCallback((position: GeolocationPosition) => {
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

  const handleError = useCallback((error: GeolocationPositionError) => {
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
        handleError,
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

  // Initial location request - only run once on mount
  useEffect(() => {
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;
    
    const cleanup = requestLocation();
    
    // Fallback timeout in case browser doesn't trigger error
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
    }, 6000); // 6 seconds fallback
    
    return () => {
      clearTimeout(fallbackTimeout);
      if (cleanup) cleanup();
    };
  }, []); // Empty dependency - only run once on mount

  const refresh = useCallback(() => {
    requestLocation();
  }, [requestLocation]);

  return {
    ...state,
    isReady: state.latitude !== null && state.longitude !== null,
    refresh,
  };
}

