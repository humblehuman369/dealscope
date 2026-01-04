import { useState, useEffect, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { Magnetometer, Accelerometer } from 'expo-sensors';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Coordinate precision constants
// 6 decimal places = ~0.11m accuracy (optimal for property scanning)
const COORDINATE_PRECISION = 6;

// Storage key for calibration settings (no @ symbol - SecureStore doesn't allow it)
const CALIBRATION_STORAGE_KEY = 'scanner_calibration';

interface CalibrationSettings {
  headingOffset: number;      // Manual heading offset in degrees (-180 to 180)
  tiltCompensation: boolean;  // Whether to use accelerometer for tilt compensation
  lastCalibrated: string | null;
}

interface ScannerState {
  userLat: number;
  userLng: number;
  heading: number;           // Calibrated heading
  rawHeading: number;        // Raw (uncalibrated) heading for debugging
  accuracy: number;
  tiltAngle: number;         // Phone tilt from vertical (0 = vertical, 90 = flat)
  isLocationReady: boolean;
  isCompassReady: boolean;
  needsCalibration: boolean; // True if magnetometer readings are unstable
  error: string | null;
}

interface CalibrationControls {
  headingOffset: number;
  setHeadingOffset: (offset: number) => void;
  tiltCompensation: boolean;
  setTiltCompensation: (enabled: boolean) => void;
  resetCalibration: () => void;
  saveCalibration: () => Promise<void>;
}

// Low-pass filter coefficient for magnetometer smoothing
// Lower value = less smoothing, faster response (better for aiming)
const MAGNETOMETER_SMOOTHING = 0.25;

// Threshold for detecting unstable magnetometer (needs calibration)
const CALIBRATION_THRESHOLD = 50; // If variance exceeds this, suggest calibration

/**
 * Hook to manage GPS location and compass heading for property scanning.
 * Provides real-time updates of user position and direction they're facing.
 * 
 * Includes calibration controls to improve accuracy:
 * - headingOffset: Manual offset to correct systematic compass errors
 * - tiltCompensation: Uses accelerometer to correct for phone not being vertical
 */
export function usePropertyScanner(): ScannerState & CalibrationControls {
  const [state, setState] = useState<ScannerState>({
    userLat: 0,
    userLng: 0,
    heading: 0,
    rawHeading: 0,
    accuracy: 0,
    tiltAngle: 0,
    isLocationReady: false,
    isCompassReady: false,
    needsCalibration: false,
    error: null,
  });

  // Calibration settings
  const [headingOffset, setHeadingOffsetState] = useState(0);
  const [tiltCompensation, setTiltCompensationState] = useState(true);

  // Raw magnetometer data
  const magnetometerData = useRef({ x: 0, y: 0, z: 0 });
  // Smoothed magnetometer data (low-pass filtered)
  const smoothedMagData = useRef({ x: 0, y: 0, z: 0 });
  // Previous heading for additional smoothing
  const previousHeading = useRef(0);
  // Accelerometer data for tilt compensation
  const accelerometerData = useRef({ x: 0, y: 0, z: 0 });
  // Heading variance tracker (for calibration detection)
  const headingHistory = useRef<number[]>([]);
  // Heading offset ref (for use in callbacks)
  const headingOffsetRef = useRef(0);
  const tiltCompensationRef = useRef(true);
  
  // Keep refs in sync with state
  headingOffsetRef.current = headingOffset;
  tiltCompensationRef.current = tiltCompensation;

  // Load saved calibration settings on mount
  useEffect(() => {
    async function loadCalibration() {
      try {
        const saved = await SecureStore.getItemAsync(CALIBRATION_STORAGE_KEY);
        if (saved) {
          const settings: CalibrationSettings = JSON.parse(saved);
          setHeadingOffsetState(settings.headingOffset);
          setTiltCompensationState(settings.tiltCompensation);
        }
      } catch (e) {
        console.log('Failed to load calibration settings:', e);
      }
    }
    loadCalibration();
  }, []);

  // Calibration controls
  const setHeadingOffset = useCallback((offset: number) => {
    // Clamp to -180 to 180
    const clamped = Math.max(-180, Math.min(180, offset));
    setHeadingOffsetState(clamped);
  }, []);

  const setTiltCompensation = useCallback((enabled: boolean) => {
    setTiltCompensationState(enabled);
  }, []);

  const resetCalibration = useCallback(() => {
    setHeadingOffsetState(0);
    setTiltCompensationState(true);
  }, []);

  const saveCalibration = useCallback(async () => {
    try {
      const settings: CalibrationSettings = {
        headingOffset,
        tiltCompensation,
        lastCalibrated: new Date().toISOString(),
      };
      await SecureStore.setItemAsync(CALIBRATION_STORAGE_KEY, JSON.stringify(settings));
      console.log('Calibration saved:', settings);
    } catch (e) {
      console.log('Failed to save calibration:', e);
    }
  }, [headingOffset, tiltCompensation]);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;
    let magnetometerSubscription: { remove: () => void } | null = null;
    let accelerometerSubscription: { remove: () => void } | null = null;

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

        // STEP 1: Try to use last known location IMMEDIATELY (instant)
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          console.log('Using last known location for instant start');
          setState(prev => ({
            ...prev,
            userLat: Number(lastKnown.coords.latitude.toFixed(COORDINATE_PRECISION)),
            userLng: Number(lastKnown.coords.longitude.toFixed(COORDINATE_PRECISION)),
            accuracy: lastKnown.coords.accuracy ?? 100,
            isLocationReady: true,
          }));
        }

        // STEP 2: Get current location with balanced accuracy (fast, 5s timeout)
        try {
          const fastLocation = await Promise.race([
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            }),
            new Promise<null>((_, reject) => 
              setTimeout(() => reject(new Error('timeout')), 5000)
            )
          ]) as Location.LocationObject | null;
          
          if (fastLocation) {
            setState(prev => ({
              ...prev,
              userLat: Number(fastLocation.coords.latitude.toFixed(COORDINATE_PRECISION)),
              userLng: Number(fastLocation.coords.longitude.toFixed(COORDINATE_PRECISION)),
              accuracy: fastLocation.coords.accuracy ?? 50,
              isLocationReady: true,
            }));
          }
        } catch (e) {
          console.log('Fast location timed out, continuing with watch...');
        }

        // Then try to get high accuracy location (but don't block)
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        }).then((preciseLocation) => {
          setState(prev => ({
            ...prev,
            userLat: Number(preciseLocation.coords.latitude.toFixed(COORDINATE_PRECISION)),
            userLng: Number(preciseLocation.coords.longitude.toFixed(COORDINATE_PRECISION)),
            accuracy: preciseLocation.coords.accuracy ?? 10,
            isLocationReady: true,
          }));
        }).catch(e => {
          console.log('High accuracy location failed:', e);
        });

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

        // Setup accelerometer for tilt compensation
        const isAccelerometerAvailable = await Accelerometer.isAvailableAsync();
        if (isAccelerometerAvailable) {
          Accelerometer.setUpdateInterval(100);
          accelerometerSubscription = Accelerometer.addListener((data) => {
            accelerometerData.current = data;
          });
        }

        // Setup magnetometer for compass heading
        const isMagnetometerAvailable = await Magnetometer.isAvailableAsync();
        if (isMagnetometerAvailable) {
          // 10 updates per second for smooth compass
          Magnetometer.setUpdateInterval(100);

          magnetometerSubscription = Magnetometer.addListener((data) => {
            // Store raw data
            magnetometerData.current = data;
            
            // Apply low-pass filter for smooth compass movement
            // This reduces jitter from electromagnetic interference
            smoothedMagData.current = {
              x: smoothedMagData.current.x + MAGNETOMETER_SMOOTHING * (data.x - smoothedMagData.current.x),
              y: smoothedMagData.current.y + MAGNETOMETER_SMOOTHING * (data.y - smoothedMagData.current.y),
              z: smoothedMagData.current.z + MAGNETOMETER_SMOOTHING * (data.z - smoothedMagData.current.z),
            };
            
            // Calculate tilt angle from accelerometer
            const accel = accelerometerData.current;
            const tiltAngle = calculateTiltAngle(accel);
            
            // Calculate heading with optional tilt compensation
            let rawHeading: number;
            if (tiltCompensationRef.current && Math.abs(tiltAngle) < 60) {
              // Use tilt-compensated heading when phone is reasonably upright
              rawHeading = calculateHeadingWithTilt(smoothedMagData.current, accel);
            } else {
              // Fallback to simple heading for extreme tilts
              rawHeading = calculateHeading(smoothedMagData.current);
            }
            
            // Apply additional heading smoothing to prevent jumpiness
            // Handle wrap-around at 0°/360° boundary
            let headingDiff = rawHeading - previousHeading.current;
            if (headingDiff > 180) headingDiff -= 360;
            if (headingDiff < -180) headingDiff += 360;
            
            // Use faster smoothing (0.4 instead of 0.3) for more responsive aiming
            let smoothedHeading = previousHeading.current + headingDiff * 0.4;
            if (smoothedHeading < 0) smoothedHeading += 360;
            if (smoothedHeading >= 360) smoothedHeading -= 360;
            
            previousHeading.current = smoothedHeading;
            
            // Track heading variance to detect need for calibration
            headingHistory.current.push(rawHeading);
            if (headingHistory.current.length > 30) {
              headingHistory.current.shift();
            }
            const needsCalibration = calculateVariance(headingHistory.current) > CALIBRATION_THRESHOLD;
            
            // Apply user's heading offset calibration
            let calibratedHeading = smoothedHeading + headingOffsetRef.current;
            if (calibratedHeading < 0) calibratedHeading += 360;
            if (calibratedHeading >= 360) calibratedHeading -= 360;
            
            setState(prev => ({
              ...prev,
              heading: Math.round(calibratedHeading),
              rawHeading: Math.round(smoothedHeading),
              tiltAngle: Math.round(tiltAngle),
              isCompassReady: true,
              needsCalibration,
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
      if (accelerometerSubscription) {
        accelerometerSubscription.remove();
      }
    };
  }, []);

  return {
    ...state,
    headingOffset,
    setHeadingOffset,
    tiltCompensation,
    setTiltCompensation,
    resetCalibration,
    saveCalibration,
  };
}

/**
 * Calculate tilt angle from accelerometer data.
 * Returns angle from vertical in degrees (0 = upright, 90 = flat).
 */
function calculateTiltAngle(accel: { x: number; y: number; z: number }): number {
  const { x, y, z } = accel;
  // Calculate angle from vertical (Z-axis when flat, Y-axis when upright)
  // For a phone held vertically, Y points up
  const magnitude = Math.sqrt(x * x + y * y + z * z);
  if (magnitude < 0.1) return 0;
  
  // Tilt from vertical is the angle between gravity vector and Y-axis
  const tilt = Math.acos(Math.abs(y) / magnitude) * (180 / Math.PI);
  return tilt;
}

/**
 * Calculate variance of an array of numbers.
 */
function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0;
  
  // Handle circular mean for heading values
  let sinSum = 0, cosSum = 0;
  for (const v of values) {
    sinSum += Math.sin(v * Math.PI / 180);
    cosSum += Math.cos(v * Math.PI / 180);
  }
  const meanAngle = Math.atan2(sinSum / values.length, cosSum / values.length) * 180 / Math.PI;
  
  // Calculate variance with circular awareness
  let variance = 0;
  for (const v of values) {
    let diff = v - meanAngle;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    variance += diff * diff;
  }
  return variance / values.length;
}

/**
 * Calculate heading with tilt compensation.
 * Uses accelerometer data to correct for phone not being perfectly vertical.
 */
function calculateHeadingWithTilt(
  mag: { x: number; y: number; z: number },
  accel: { x: number; y: number; z: number }
): number {
  // Normalize accelerometer
  const aMag = Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2);
  if (aMag < 0.1) return calculateHeading(mag);
  
  const ax = accel.x / aMag;
  const ay = accel.y / aMag;
  const az = accel.z / aMag;
  
  // Calculate pitch and roll from accelerometer
  const pitch = Math.asin(-ax);
  const roll = Math.atan2(az, ay);
  
  // Tilt-compensated magnetic components
  const mX = mag.x * Math.cos(pitch) + mag.z * Math.sin(pitch);
  const mY = mag.x * Math.sin(roll) * Math.sin(pitch) + 
             mag.y * Math.cos(roll) - 
             mag.z * Math.sin(roll) * Math.cos(pitch);
  
  // Calculate heading from compensated components
  let heading = Math.atan2(mX, mY) * (180 / Math.PI);
  
  // Normalize to 0-360
  if (heading < 0) heading += 360;
  
  return heading % 360;
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

