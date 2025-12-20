import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { Platform } from 'react-native';

interface ScannerState {
  userLat: number;
  userLng: number;
  heading: number;
  accuracy: number;
  isLocationReady: boolean;
  isCompassReady: boolean;
  error: string | null;
}

/**
 * Hook to manage GPS location and compass heading for property scanning.
 * Provides real-time updates of user position and direction they're facing.
 */
export function usePropertyScanner() {
  const [state, setState] = useState<ScannerState>({
    userLat: 0,
    userLng: 0,
    heading: 0,
    accuracy: 0,
    isLocationReady: false,
    isCompassReady: false,
    error: null,
  });

  const magnetometerData = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let magnetometerSubscription: { remove: () => void } | null = null;

    async function setupSensors() {
      try {
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setState(prev => ({
            ...prev,
            error: 'Location permission denied',
          }));
          return;
        }

        // Get initial location
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });

        setState(prev => ({
          ...prev,
          userLat: initialLocation.coords.latitude,
          userLng: initialLocation.coords.longitude,
          accuracy: initialLocation.coords.accuracy ?? 10,
          isLocationReady: true,
        }));

        // Subscribe to location updates
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 1, // Update every 1 meter
            timeInterval: 1000,  // Or every 1 second
          },
          (location) => {
            setState(prev => ({
              ...prev,
              userLat: location.coords.latitude,
              userLng: location.coords.longitude,
              accuracy: location.coords.accuracy ?? 10,
              isLocationReady: true,
            }));
          }
        );

        // Setup magnetometer for compass heading
        const isMagnetometerAvailable = await Magnetometer.isAvailableAsync();
        if (isMagnetometerAvailable) {
          Magnetometer.setUpdateInterval(100); // 10 updates per second

          magnetometerSubscription = Magnetometer.addListener((data) => {
            magnetometerData.current = data;
            const heading = calculateHeading(data);
            
            setState(prev => ({
              ...prev,
              heading,
              isCompassReady: true,
            }));
          });
        } else {
          // Fallback: Use location heading if available
          console.log('Magnetometer not available, using location heading');
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to setup sensors',
        }));
      }
    }

    setupSensors();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      if (magnetometerSubscription) {
        magnetometerSubscription.remove();
      }
    };
  }, []);

  return state;
}

/**
 * Calculate compass heading from magnetometer data.
 * Returns heading in degrees (0-360), where 0 = North.
 */
function calculateHeading(data: { x: number; y: number; z: number }): number {
  const { x, y } = data;
  
  // Calculate angle in radians
  let heading = Math.atan2(y, x);
  
  // Convert to degrees
  heading = heading * (180 / Math.PI);
  
  // Adjust for device orientation
  if (Platform.OS === 'ios') {
    // iOS magnetometer is aligned with the device
    heading = 90 - heading;
  } else {
    // Android may need different adjustment
    heading = heading - 90;
  }
  
  // Normalize to 0-360
  if (heading < 0) {
    heading += 360;
  }
  heading = heading % 360;
  
  return Math.round(heading);
}

