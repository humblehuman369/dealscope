import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated,
  Dimensions,
  Platform,
  Easing,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePropertyScanner } from '../../hooks/usePropertyScanner';
import { usePropertyScan } from '../../hooks/usePropertyScan';
import { ScanTarget } from '../../components/scanner/ScanTarget';
import { CompassDisplay } from '../../components/scanner/CompassDisplay';
import { DistanceSlider } from '../../components/scanner/DistanceSlider';
import { ScanResultSheet } from '../../components/scanner/ScanResultSheet';
import { CalibrationPanel } from '../../components/scanner/CalibrationPanel';
import { ScanHelpTooltip } from '../../components/scanner/ScanHelpTooltip';
import { colors } from '../../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  
  // Scanner state
  const [distance, setDistance] = useState(50);
  const [showCalibration, setShowCalibration] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const scanner = usePropertyScanner();
  const { isScanning, result, error, performScan, clearResult } = usePropertyScan();
  
  // Animations
  const scanAnimation = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(new Animated.Value(0.6)).current;
  
  // Pulsing animation for "Analyzing Area Data" state
  useEffect(() => {
    if (!scanner.isLocationReady) {
      // Reset to initial value to prevent jump/glitch when animation restarts
      pulseAnimation.setValue(0.6);
      
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 0.6,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [scanner.isLocationReady, pulseAnimation]);

  const handleScan = useCallback(async () => {
    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Animate scan button
    Animated.sequence([
      Animated.timing(scanAnimation, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scanAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Perform the scan
    await performScan(distance);
    
    if (result) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [distance, performScan, result]);

  const handleViewDetails = useCallback(() => {
    if (result?.property?.address) {
      router.push(`/property/${encodeURIComponent(result.property.address)}`);
    }
  }, [result, router]);

  // Permission handling
  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color={colors.gray[400]} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          InvestIQ needs camera access to scan properties and provide instant investment analytics.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View - no children allowed */}
      <CameraView style={styles.camera} facing="back" />
      
      {/* Overlay elements positioned absolutely on top of camera */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerContent}>
            <Text style={styles.logo}>InvestIQ</Text>
            <View style={styles.headerRight}>
              {/* Help Button */}
              <TouchableOpacity 
                style={styles.helpButton}
                onPress={() => setShowHelp(true)}
              >
                <Ionicons name="help-circle-outline" size={20} color="#fff" />
              </TouchableOpacity>
              {scanner.needsCalibration && (
                <TouchableOpacity 
                  style={styles.calibrationWarning}
                  onPress={() => setShowCalibration(true)}
                >
                  <Ionicons name="warning" size={14} color={colors.loss.main} />
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={styles.settingsButton}
                onPress={() => setShowCalibration(true)}
              >
                <Ionicons name="settings-outline" size={18} color="#fff" />
              </TouchableOpacity>
              {scanner.userLat !== 0 && (
                <View style={styles.locationBadge}>
                  <Ionicons name="location" size={12} color={colors.primary[600]} />
                  <Text style={styles.locationText}>GPS Active</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Scan Target Overlay */}
        <View style={styles.targetContainer}>
          <ScanTarget isScanning={isScanning} />
        </View>

        {/* Compass Display */}
        <View style={styles.compassContainer}>
          <CompassDisplay 
            heading={scanner.heading} 
            accuracy={scanner.accuracy}
          />
        </View>

        {/* Controls */}
        <View style={[styles.controls, { paddingBottom: insets.bottom + 100 }]}>
          {/* Distance Slider */}
          <View style={styles.distanceContainer}>
            <DistanceSlider
              value={distance}
              onChange={setDistance}
              min={10}
              max={200}
            />
          </View>

          {/* Scan Buttons */}
          <View style={styles.buttonRow}>
            {/* Search Button */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                router.push('/search');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="search-outline" size={20} color="#fff" />
              <Text style={styles.secondaryButtonText}>SEARCH</Text>
            </TouchableOpacity>

            {/* Main Scan Button */}
            <Animated.View style={{ transform: [{ scale: scanAnimation }] }}>
              <TouchableOpacity
                style={[
                  styles.scanButton,
                  isScanning && styles.scanButtonScanning,
                  !scanner.isLocationReady && styles.scanButtonAnalyzing,
                ]}
                onPress={handleScan}
                disabled={isScanning || !scanner.isLocationReady}
                activeOpacity={0.8}
              >
                {isScanning ? (
                  <View style={styles.scanningIndicator}>
                    <Ionicons name="scan" size={32} color="#fff" />
                    <Text style={styles.scanButtonText}>Scanning...</Text>
                  </View>
                ) : !scanner.isLocationReady ? (
                  <Animated.View style={[styles.analyzingIndicator, { opacity: pulseAnimation }]}>
                    <Ionicons name="radio-outline" size={28} color="#fff" />
                    <Text style={styles.analyzingText}>ANALYZING</Text>
                  </Animated.View>
                ) : (
                  <>
                    <Ionicons name="scan-outline" size={32} color="#fff" />
                    <Text style={styles.scanButtonText}>SCAN</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Status Info */}
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>
              {scanner.heading}° {getCardinalDirection(scanner.heading)}
            </Text>
            <Text style={styles.statusText}>
              ±{Math.round(scanner.accuracy)}m
            </Text>
          </View>
          
          {/* GPS Status Info */}
          <View style={styles.statusRow}>
            {scanner.userLat !== 0 ? (
              <Text style={[styles.statusText, { fontSize: 10, opacity: 0.7 }]}>
                📍 {scanner.userLat.toFixed(5)}, {scanner.userLng.toFixed(5)}
              </Text>
            ) : (
              <Animated.Text style={[styles.analyzingAreaText, { opacity: pulseAnimation }]}>
                🛰️ Analyzing Area Data...
              </Animated.Text>
            )}
            {scanner.headingOffset !== 0 && (
              <Text style={[styles.statusText, { fontSize: 10, opacity: 0.7 }]}>
                Offset: {scanner.headingOffset > 0 ? '+' : ''}{scanner.headingOffset}°
              </Text>
            )}
          </View>

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={colors.loss.main} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Result Bottom Sheet */}
      {result && (
        <ScanResultSheet
          result={result}
          onClose={clearResult}
          onViewDetails={handleViewDetails}
        />
      )}

      {/* Calibration Panel */}
      <CalibrationPanel
        visible={showCalibration}
        onClose={() => setShowCalibration(false)}
        headingOffset={scanner.headingOffset}
        onHeadingOffsetChange={scanner.setHeadingOffset}
        tiltCompensation={scanner.tiltCompensation}
        onTiltCompensationChange={scanner.setTiltCompensation}
        onReset={scanner.resetCalibration}
        onSave={scanner.saveCalibration}
        currentHeading={scanner.heading}
        rawHeading={scanner.rawHeading}
        tiltAngle={scanner.tiltAngle}
        needsCalibration={scanner.needsCalibration}
      />

      {/* Help Tooltip */}
      <ScanHelpTooltip
        visible={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </View>
  );
}

function getCardinalDirection(heading: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(heading / 45) % 8;
  return directions[index];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    fontWeight: '700',
    fontSize: 20,
    color: '#fff',
  },
  helpButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  settingsButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  calibrationWarning: {
    padding: 8,
    backgroundColor: 'rgba(244,63,94,0.3)',
    borderRadius: 8,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  locationText: {
    fontWeight: '500',
    fontSize: 11,
    color: colors.primary[700],
  },
  targetContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compassContainer: {
    position: 'absolute',
    top: 120,
    right: 20,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  distanceContainer: {
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  secondaryButtonText: {
    fontWeight: '600',
    fontSize: 10,
    color: '#fff',
    letterSpacing: 0.5,
  },
  scanButton: {
    backgroundColor: colors.primary[600],
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  scanButtonScanning: {
    backgroundColor: colors.primary[700],
  },
  scanButtonAnalyzing: {
    backgroundColor: '#1a4a7a',
    shadowColor: '#1a4a7a',
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  analyzingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  analyzingText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#fff',
    letterSpacing: 2,
  },
  analyzingAreaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4ade80',
    letterSpacing: 0.5,
  },
  scanButtonText: {
    fontWeight: '700',
    fontSize: 16,
    color: '#fff',
    letterSpacing: 1,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statusText: {
    fontWeight: '400',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    backgroundColor: 'rgba(244,63,94,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  errorText: {
    fontWeight: '500',
    fontSize: 12,
    color: colors.loss.main,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontWeight: '600',
    fontSize: 20,
    color: colors.gray[900],
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontWeight: '400',
    fontSize: 14,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: colors.primary[600],
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
  },
  permissionButtonText: {
    fontWeight: '600',
    fontSize: 15,
    color: '#fff',
  },
});

