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

import { usePropertyScan } from '../../hooks/usePropertyScan';
import { ScanTarget } from '../../components/scanner/ScanTarget';
import { CompassDisplay } from '../../components/scanner/CompassDisplay';
import { DistanceSlider } from '../../components/scanner/DistanceSlider';
import { ScanResultSheet } from '../../components/scanner/ScanResultSheet';
import { CalibrationPanel } from '../../components/scanner/CalibrationPanel';
import { ScanHelpTooltip } from '../../components/scanner/ScanHelpTooltip';
import { colors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Loading messages to cycle through during initialization
const LOADING_MESSAGES = [
  'Acquiring GPS signal...',
  'Analyzing neighborhood data...',
  'Loading property database...',
  'Preparing scanner...',
];

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  
  // Scanner state - use the scanner from usePropertyScan to ensure single instance
  const [distance, setDistance] = useState(50);
  const [showCalibration, setShowCalibration] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const { scanner, isScanning, result, error, performScan, clearResult, clearError } = usePropertyScan();
  
  // Animations
  const scanAnimation = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(new Animated.Value(0.6)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;
  const dotAnimation = useRef(new Animated.Value(0)).current;
  
  // Cycle through loading messages during initialization
  useEffect(() => {
    if (!scanner.isLocationReady) {
      const messageInterval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2500); // Change message every 2.5 seconds
      
      return () => clearInterval(messageInterval);
    } else {
      // Reset to first message for next time
      setLoadingMessageIndex(0);
    }
  }, [scanner.isLocationReady]);

  // Clear any previous errors when location becomes ready
  useEffect(() => {
    if (scanner.isLocationReady && error) {
      clearError();
    }
  }, [scanner.isLocationReady, error, clearError]);

  // Pulsing and rotating animation for "Analyzing Area Data" state
  useEffect(() => {
    if (!scanner.isLocationReady || isScanning) {
      // Reset to initial value to prevent jump/glitch when animation restarts
      pulseAnimation.setValue(0.6);
      rotateAnimation.setValue(0);
      dotAnimation.setValue(0);
      
      // Pulse animation
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
      
      // Rotate animation for the icon
      const rotate = Animated.loop(
        Animated.timing(rotateAnimation, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      
      // Dot animation for loading text
      const dots = Animated.loop(
        Animated.timing(dotAnimation, {
          toValue: 3,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );
      
      pulse.start();
      rotate.start();
      dots.start();
      
      return () => {
        pulse.stop();
        rotate.stop();
        dots.stop();
      };
    }
  }, [scanner.isLocationReady, isScanning, pulseAnimation, rotateAnimation, dotAnimation]);
  
  // Interpolate rotation
  const spin = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
      const encodedAddress = encodeURIComponent(result.property.address);
      
      // Get property details from analytics result
      const fullAnalytics = result.analytics as any;
      const propertyDetails = fullAnalytics?.property || result.property;
      const estimatedValue = fullAnalytics?.pricing?.estimatedValue || 
                             fullAnalytics?.pricing?.listPrice || 0;
      
      // Build query params with property data for the IQ Verdict flow
      const queryParams = new URLSearchParams({
        price: estimatedValue.toString(),
        beds: (propertyDetails.bedrooms || 3).toString(),
        baths: (propertyDetails.bathrooms || 2).toString(),
        sqft: (propertyDetails.sqft || 1500).toString(),
      });

      // Route to IQ Analyzing screen (new IQ Verdict flow)
      router.push(`/analyzing/${encodedAddress}?${queryParams.toString()}`);
    }
  }, [result, router]);

  // Permission handling
  if (!permission) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.permissionText, { color: theme.textMuted }]}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="camera-outline" size={64} color={theme.textMuted} />
        <Text style={[styles.permissionTitle, { color: theme.text }]}>Camera Access Required</Text>
        <Text style={[styles.permissionText, { color: theme.textSecondary }]}>
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
                  !scanner.isLocationReady && styles.scanButtonDisabled,
                ]}
                onPress={handleScan}
                disabled={isScanning || !scanner.isLocationReady}
                activeOpacity={0.8}
              >
                {isScanning ? (
                  <View style={styles.scanningIndicator}>
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                      <Ionicons name="sync" size={28} color="#fff" />
                    </Animated.View>
                    <Text style={styles.scanButtonText}>Analyzing...</Text>
                  </View>
                ) : !scanner.isLocationReady ? (
                  <Animated.View style={[styles.analyzingIndicator, { opacity: pulseAnimation }]}>
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                      <Ionicons name="navigate-circle-outline" size={28} color={colors.gray[400]} />
                    </Animated.View>
                    <Text style={styles.disabledButtonText}>PLEASE WAIT</Text>
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

          {/* Loading Status Banner - shows when initializing */}
          {!scanner.isLocationReady && (
            <Animated.View style={[styles.loadingBanner, { opacity: pulseAnimation }]}>
              <View style={styles.loadingBannerContent}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="planet-outline" size={20} color={colors.accent[500]} />
                </Animated.View>
                <View style={styles.loadingTextContainer}>
                  <Text style={styles.loadingBannerTitle}>Initializing Scanner</Text>
                  <Text style={styles.loadingBannerMessage}>{LOADING_MESSAGES[loadingMessageIndex]}</Text>
                </View>
              </View>
              <View style={styles.loadingProgressBar}>
                <Animated.View 
                  style={[
                    styles.loadingProgressFill,
                    { 
                      width: `${((loadingMessageIndex + 1) / LOADING_MESSAGES.length) * 100}%`,
                    }
                  ]} 
                />
              </View>
            </Animated.View>
          )}

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
            {scanner.userLat !== 0 && scanner.isLocationReady && (
              <Text style={[styles.statusText, { fontSize: 10, opacity: 0.7 }]}>
                📍 {scanner.userLat.toFixed(5)}, {scanner.userLng.toFixed(5)}
              </Text>
            )}
            {scanner.headingOffset !== 0 && (
              <Text style={[styles.statusText, { fontSize: 10, opacity: 0.7 }]}>
                Offset: {scanner.headingOffset > 0 ? '+' : ''}{scanner.headingOffset}°
              </Text>
            )}
          </View>

          {/* Error Display - Show scan errors or scanner errors */}
          {(error || scanner.error) && scanner.isLocationReady && !isScanning && (
            <TouchableOpacity 
              style={styles.errorContainer}
              onPress={clearError}
              activeOpacity={0.8}
            >
              <View style={styles.errorContent}>
                <Ionicons name="alert-circle" size={18} color={colors.loss.main} />
                <View style={styles.errorTextContainer}>
                  <Text style={styles.errorText}>{error || scanner.error}</Text>
                  <Text style={styles.errorHint}>
                    {scanner.error 
                      ? 'Check location settings and try again' 
                      : 'Tap to dismiss • Try adjusting distance or aim'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
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
  scanButtonDisabled: {
    backgroundColor: colors.gray[700],
    shadowColor: colors.gray[700],
    shadowOpacity: 0.2,
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
  disabledButtonText: {
    fontWeight: '700',
    fontSize: 12,
    color: colors.gray[400],
    letterSpacing: 1,
  },
  loadingBanner: {
    marginTop: 16,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    overflow: 'hidden',
  },
  loadingBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  loadingTextContainer: {
    flex: 1,
  },
  loadingBannerTitle: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.accent[500],
    marginBottom: 2,
  },
  loadingBannerMessage: {
    fontWeight: '500',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  loadingProgressBar: {
    height: 3,
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
  },
  loadingProgressFill: {
    height: '100%',
    backgroundColor: colors.accent[500],
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
    marginTop: 12,
    backgroundColor: 'rgba(244,63,94,0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.3)',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorText: {
    fontWeight: '600',
    fontSize: 13,
    color: colors.loss.main,
    marginBottom: 4,
  },
  errorHint: {
    fontWeight: '400',
    fontSize: 11,
    color: 'rgba(244,63,94,0.7)',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontWeight: '600',
    fontSize: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontWeight: '400',
    fontSize: 14,
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

