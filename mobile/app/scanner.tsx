import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import {
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
} from '@/constants/tokens';

/**
 * Camera scanner screen — point at property signage to capture an address.
 *
 * Phase 2 implementation: manual address entry overlay on the camera feed.
 * OCR-based automatic detection will be added in a later phase.
 */
export default function ScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [address, setAddress] = useState('');
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<TextInput>(null);

  function handleAnalyze() {
    const trimmed = address.trim();
    if (!trimmed) return;
    router.replace(`/analyzing?address=${encodeURIComponent(trimmed)}`);
  }

  // ── Permission not determined ──────────────────────────
  if (!permission) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.permissionBox}>
          <Ionicons name="camera-outline" size={48} color={colors.accent} />
          <Text style={styles.permissionTitle}>Camera Access</Text>
          <Text style={styles.permissionText}>
            Allow camera access to scan property addresses from signage.
          </Text>
        </View>
      </View>
    );
  }

  // ── Permission denied ──────────────────────────────────
  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={colors.heading} />
        </Pressable>

        <View style={styles.permissionBox}>
          <View style={styles.iconCircle}>
            <Ionicons name="camera-outline" size={40} color={colors.accent} />
          </View>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            DealGapIQ needs camera access to scan property addresses from
            signage, for-sale signs, and listings.
          </Text>
          <Button title="Grant Access" onPress={requestPermission} />
          <Pressable onPress={() => router.back()}>
            <Text style={styles.skipText}>Skip — enter address manually</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Camera active ──────────────────────────────────────
  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />

      {/* Overlay */}
      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            style={styles.topBtn}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Ionicons name="close" size={26} color={colors.white} />
          </Pressable>
          <Text style={styles.topTitle}>Scan Address</Text>
          <View style={styles.topBtn} />
        </View>

        {/* Center viewfinder */}
        <View style={styles.viewfinderArea}>
          <View style={styles.viewfinder}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.viewfinderHint}>
            Point at a property sign or address
          </Text>
        </View>

        {/* Bottom controls */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
          {showInput ? (
            <View style={styles.manualEntry}>
              <View style={styles.manualInputRow}>
                <TextInput
                  ref={inputRef}
                  style={styles.manualInput}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Type address manually..."
                  placeholderTextColor={colors.muted}
                  autoFocus
                  returnKeyType="search"
                  onSubmitEditing={handleAnalyze}
                  selectionColor={colors.accent}
                />
                <Pressable
                  style={[
                    styles.goBtn,
                    !address.trim() && { opacity: 0.4 },
                  ]}
                  onPress={handleAnalyze}
                  disabled={!address.trim()}
                >
                  <Ionicons name="arrow-forward" size={20} color={colors.black} />
                </Pressable>
              </View>
              <Pressable onPress={() => setShowInput(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <Pressable
                style={styles.manualBtn}
                onPress={() => {
                  setShowInput(true);
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
              >
                <Ionicons name="create-outline" size={20} color={colors.heading} />
                <Text style={styles.manualBtnText}>Enter Manually</Text>
              </Pressable>

              <Pressable
                style={styles.captureBtn}
                onPress={() => {
                  Alert.alert(
                    'Coming Soon',
                    'Automatic address detection from camera will be available in a future update. Use "Enter Manually" for now.',
                  );
                }}
              >
                <View style={styles.captureBtnInner} />
              </Pressable>

              <Pressable
                style={styles.searchBtn}
                onPress={() => router.push('/search-modal')}
              >
                <Ionicons name="search-outline" size={20} color={colors.heading} />
                <Text style={styles.manualBtnText}>Search</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  topBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.md,
    color: colors.white,
  },
  viewfinderArea: {
    alignItems: 'center',
    gap: spacing.md,
  },
  viewfinder: {
    width: 280,
    height: 180,
    position: 'relative',
  },
  viewfinderHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: colors.accent,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: colors.accent,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: colors.accent,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  bottomBar: {
    paddingHorizontal: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  manualBtn: {
    alignItems: 'center',
    gap: 4,
    width: 80,
  },
  manualBtnText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.heading,
  },
  searchBtn: {
    alignItems: 'center',
    gap: 4,
    width: 80,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.white,
  },
  manualEntry: {
    gap: spacing.sm,
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  manualInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.heading,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: colors.glowBorder,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  goBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: spacing.md,
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    paddingBottom: 80,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  permissionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    color: colors.heading,
    textAlign: 'center',
  },
  permissionText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: fontSize.md * 1.6,
    maxWidth: 300,
    marginBottom: spacing.sm,
  },
  skipText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.accent,
    marginTop: spacing.sm,
  },
});
