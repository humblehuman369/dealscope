import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { Platform } from 'react-native';

// Coordinate precision constants
// 6 decimal places = ~0.11m accuracy (optimal for property scanning)
const COORDINATE_PRECISION = 6;

interface ScannerState {
  userLat: number;
  userLng: number;
  heading: number;
  accuracy: number;
  isLocationReady: boolean;
  isCompassReady: boolean;
  error: string | null;
}

// Low-pass filter coefficient for magnetometer smoothing
// Higher value = more smoothing, slower response (0.0-1.0)
const MAGNETOMETER_SMOOTHING = 0.15;

/**
 * Hook to manage GPS location and compass heading for property scanning.
 * Provides real-time updates of user position and direction they're facing.
 */
// #region agent log
import * as FileSystem from 'expo-file-system';
const DEBUG_LOG_PATH = '/Users/bradgeisen/IQ-Data/dealscope/.cursor/debug.log';
async function debugLog(location: string, message: string, data: object, hypothesisId: string) {
  const entry = JSON.stringify({ location, message, data, hypothesisId, timestamp: Date.now(), sessionId: 'debug-session' }) + '\n';
  try { await FileSystem.writeAsStringAsync(DEBUG_LOG_PATH, entry, { encoding: FileSystem.EncodingType.UTF8, append: true }); } catch (e) {}
}
// #endregion

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

  // Raw magnetometer data
  const magnetometerData = useRef({ x: 0, y: 0, z: 0 });
  // Smoothed magnetometer data (low-pass filtered)
  const smoothedMagData = useRef({ x: 0, y: 0, z: 0 });
  // Previous heading for additional smoothing
  const previousHeading = useRef(0);

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

        // Get initial location with highest precision
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });

        // Store coordinates with full precision (6+ decimal places)
        // JavaScript numbers handle this natively, but we ensure it's preserved
        setState(prev => ({
          ...prev,
          userLat: Number(initialLocation.coords.latitude.toFixed(COORDINATE_PRECISION)),
          userLng: Number(initialLocation.coords.longitude.toFixed(COORDINATE_PRECISION)),
          accuracy: initialLocation.coords.accuracy ?? 10,
          isLocationReady: true,
        }));

        // Subscribe to location updates with high precision
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 1, // Update every 1 meter
            timeInterval: 1000,  // Or every 1 second
          },
          (location) => {
            // Preserve coordinate precision (6 decimal places = ~0.11m)
            setState(prev => ({
              ...prev,
              userLat: Number(location.coords.latitude.toFixed(COORDINATE_PRECISION)),
              userLng: Number(location.coords.longitude.toFixed(COORDINATE_PRECISION)),
              accuracy: location.coords.accuracy ?? 10,
              isLocationReady: true,
            }));
          }
        );

        // Setup magnetometer for compass heading
        const isMagnetometerAvailable = await Magnetometer.isAvailableAsync();
        // #region agent log
        debugLog('usePropertyScanner.ts:97', 'Magnetometer availability check', { isMagnetometerAvailable }, 'H1');
        // #endregion
        if (isMagnetometerAvailable) {
          // 10 updates per second for smooth compass
          Magnetometer.setUpdateInterval(100);
          // #region agent log
          debugLog('usePropertyScanner.ts:102', 'Magnetometer subscription starting', {}, 'H1');
          // #endregion

          magnetometerSubscription = Magnetometer.addListener((data) => {
            // #region agent log
            debugLog('usePropertyScanner.ts:107', 'Magnetometer data received', { x: data.x, y: data.y, z: data.z }, 'H4');
            // #endregion
            // Store raw data
            magnetometerData.current = data;
            
            // Apply low-pass filter for smooth compass movement
            // This reduces jitter from electromagnetic interference
            smoothedMagData.current = {
              x: smoothedMagData.current.x + MAGNETOMETER_SMOOTHING * (data.x - smoothedMagData.current.x),
              y: smoothedMagData.current.y + MAGNETOMETER_SMOOTHING * (data.y - smoothedMagData.current.y),
              z: smoothedMagData.current.z + MAGNETOMETER_SMOOTHING * (data.z - smoothedMagData.current.z),
            };
            
            // Calculate heading from smoothed data
            const rawHeading = calculateHeading(smoothedMagData.current);
            // #region agent log
            debugLog('usePropertyScanner.ts:122', 'Heading calculated', { rawHeading, smoothedX: smoothedMagData.current.x, smoothedZ: smoothedMagData.current.z, isNaN: isNaN(rawHeading) }, 'H2');
            // #endregion
            
            // Apply additional heading smoothing to prevent jumpiness
            // Handle wrap-around at 0°/360° boundary
            let headingDiff = rawHeading - previousHeading.current;
            if (headingDiff > 180) headingDiff -= 360;
            if (headingDiff < -180) headingDiff += 360;
            
            let smoothedHeading = previousHeading.current + headingDiff * 0.3;
            if (smoothedHeading < 0) smoothedHeading += 360;
            if (smoothedHeading >= 360) smoothedHeading -= 360;
            
            previousHeading.current = smoothedHeading;
            // #region agent log
            debugLog('usePropertyScanner.ts:136', 'State update with heading', { smoothedHeading: Math.round(smoothedHeading), isCompassReady: true }, 'H3');
            // #endregion
            
            setState(prev => ({
              ...prev,
              heading: Math.round(smoothedHeading),
              isCompassReady: true,
            }));
          });
        } else {
          // Fallback: Use location heading if available
          // #region agent log
          debugLog('usePropertyScanner.ts:148', 'Magnetometer NOT available', {}, 'H1');
          // #endregion
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
 * Calculate compass heading from magnetometer data for CAMERA MODE.
 * Returns heading in degrees (0-360), where 0 = North.
 * 
 * IMPORTANT: This function assumes the phone is held VERTICALLY in portrait
 * orientation with the camera facing forward (typical scanning/photo mode).
 * 
 * Device orientation in camera mode:
 * - Phone is roughly vertical (screen facing user, camera facing target)
 * - The camera direction defines "forward" (the direction you're facing)
 * - X-axis points to the right of the device
 * - Y-axis points UP (toward top of phone / sky)
 * - Z-axis points OUT of the screen (toward the user)
 * 
 * When phone is vertical, we use X and Z magnetometer components
 * to calculate the horizontal heading (what the camera is pointing at).
 */
function calculateHeading(data: { x: number; y: number; z: number }): number {
  const { x, y, z } = data;
  
  // For a phone held vertically in portrait mode (camera facing forward):
  // - The horizontal plane is defined by the X and Z axes
  // - X points right, Z points toward user (out of screen)
  // - We want the heading of where the BACK of the phone (camera) points
  // 
  // atan2(x, -z) gives us the angle from magnetic north:
  // - When camera faces North: x≈0, z<0 (mag field comes from front) → heading≈0°
  // - When camera faces East: x>0, z≈0 → heading≈90°
  // - When camera faces South: x≈0, z>0 → heading≈180°
  // - When camera faces West: x<0, z≈0 → heading≈270°
  
  let heading: number;
  
  if (Platform.OS === 'ios') {
    // iOS: Magnetometer data is in device coordinates
    // For vertical phone, heading is based on X and Z
    heading = Math.atan2(x, -z);
  } else {
    // Android: Magnetometer follows same coordinate system
    // but may have different sign conventions depending on device
    heading = Math.atan2(x, -z);
  }
  
  // Convert radians to degrees
  heading = heading * (180 / Math.PI);
  
  // Normalize to 0-360 range
  if (heading < 0) {
    heading += 360;
  }
  heading = heading % 360;
  
  return Math.round(heading);
}

/**
 * Alternative heading calculation for FLAT/MAP MODE.
 * Use this when the phone is held horizontally (like viewing a map).
 * 
 * In flat mode:
 * - Phone screen faces up
 * - Top of phone points in the direction of travel/facing
 * - X-axis points right, Y-axis points to top of device
 */
function calculateHeadingFlatMode(data: { x: number; y: number; z: number }): number {
  const { x, y } = data;
  
  // For flat phone, use X and Y components
  // atan2(x, y) gives heading where Y-axis (top of phone) points
  let heading = Math.atan2(x, y);
  
  // Convert radians to degrees
  heading = heading * (180 / Math.PI);
  
  // Normalize to 0-360 range
  if (heading < 0) {
    heading += 360;
  }
  
  return Math.round(heading % 360);
}

