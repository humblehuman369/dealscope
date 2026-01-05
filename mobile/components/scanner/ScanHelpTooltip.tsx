import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ScanHelpTooltipProps {
  visible: boolean;
  onClose: () => void;
}

interface TipItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  iconColor?: string;
}

function TipItem({ icon, title, description, iconColor = colors.primary[600] }: TipItemProps) {
  return (
    <View style={styles.tipItem}>
      <View style={[styles.tipIconContainer, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.tipContent}>
        <Text style={styles.tipTitle}>{title}</Text>
        <Text style={styles.tipDescription}>{description}</Text>
      </View>
    </View>
  );
}

export function ScanHelpTooltip({ visible, onClose }: ScanHelpTooltipProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      // Reset values before animating in
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.backdropTouchable} 
          activeOpacity={1} 
          onPress={onClose}
        />
        <Animated.View 
          style={[
            styles.container,
            { 
              paddingBottom: insets.bottom + 20,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="help-circle" size={24} color={colors.primary[600]} />
              <Text style={styles.headerTitle}>Scan Guide</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.gray[500]} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* How to Use Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How to Scan a Property</Text>
              
              <View style={styles.stepContainer}>
                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Position Yourself</Text>
                    <Text style={styles.stepDescription}>
                      Stand across the street or on the sidewalk, 30-50 feet away from the property you want to scan.
                    </Text>
                  </View>
                </View>

                <View style={styles.stepConnector} />

                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Aim Your Phone</Text>
                    <Text style={styles.stepDescription}>
                      Hold your phone upright like you're taking a photo. Point the camera directly at the center of the property.
                    </Text>
                  </View>
                </View>

                <View style={styles.stepConnector} />

                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Set the Distance</Text>
                    <Text style={styles.stepDescription}>
                      Use the slider to estimate how far you are from the property. The more accurate, the better the results.
                    </Text>
                  </View>
                </View>

                <View style={styles.stepConnector} />

                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>4</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Tap Scan</Text>
                    <Text style={styles.stepDescription}>
                      Press the SCAN button and hold steady for a moment. You'll see the property details and investment analysis.
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Tips Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tips for Better Accuracy</Text>
              
              <TipItem
                icon="phone-portrait-outline"
                title="Hold Phone Vertically"
                description="Keep your phone upright like taking a photo. Tilting it can throw off the compass reading."
              />

              <TipItem
                icon="locate-outline"
                title="Wait for GPS Lock"
                description="Make sure you see 'GPS Active' before scanning. Better GPS accuracy = better property matching."
              />

              <TipItem
                icon="navigate-outline"
                title="Point at the Center"
                description="Aim at the middle of the property, not the edges. This helps identify the correct parcel."
                iconColor={colors.profit.main}
              />

              <TipItem
                icon="magnet-outline"
                title="Calibrate Your Compass"
                description="If scans keep missing, wave your phone in a figure-8 pattern to calibrate the magnetometer."
                iconColor="#9333ea"
              />

              <TipItem
                icon="settings-outline"
                title="Adjust Heading Offset"
                description="If scans consistently hit the wrong house, use Settings (⚙️) to add a heading offset correction."
              />
            </View>

            {/* Common Issues Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Troubleshooting</Text>
              
              <View style={styles.troubleItem}>
                <View style={styles.troubleHeader}>
                  <Ionicons name="arrow-forward" size={16} color={colors.loss.main} />
                  <Text style={styles.troubleTitle}>Scans hit the house next door</Text>
                </View>
                <Text style={styles.troubleDescription}>
                  Try adding a heading offset. If it's consistently to the right, use a negative offset (-5° to -15°). If to the left, use positive.
                </Text>
              </View>

              <View style={styles.troubleItem}>
                <View style={styles.troubleHeader}>
                  <Ionicons name="swap-horizontal" size={16} color={colors.loss.main} />
                  <Text style={styles.troubleTitle}>Scans hit the house across the street</Text>
                </View>
                <Text style={styles.troubleDescription}>
                  Make sure you're close enough (within 100 feet) and the distance slider matches your actual distance. Move closer if needed.
                </Text>
              </View>

              <View style={styles.troubleItem}>
                <View style={styles.troubleHeader}>
                  <Ionicons name="compass-outline" size={16} color={colors.loss.main} />
                  <Text style={styles.troubleTitle}>Compass is jumping around</Text>
                </View>
                <Text style={styles.troubleDescription}>
                  Move away from metal objects, cars, or power lines. Try the figure-8 calibration motion. Check Settings for the calibration warning.
                </Text>
              </View>
            </View>

            {/* Pro Tips */}
            <View style={[styles.section, styles.proTipSection]}>
              <View style={styles.proTipHeader}>
                <Ionicons name="bulb" size={20} color="#f59e0b" />
                <Text style={styles.proTipTitle}>Pro Tip</Text>
              </View>
              <Text style={styles.proTipText}>
                For the most accurate scans, stand still for a moment before scanning to let the GPS and compass stabilize. The accuracy indicator (±Xm) shows your current GPS precision.
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray[300],
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray[800],
    marginBottom: 16,
  },
  stepContainer: {
    gap: 0,
  },
  step: {
    flexDirection: 'row',
    gap: 14,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  stepContent: {
    flex: 1,
    paddingBottom: 4,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: colors.gray[600],
    lineHeight: 19,
  },
  stepConnector: {
    width: 2,
    height: 20,
    backgroundColor: colors.primary[200],
    marginLeft: 13,
    marginVertical: 4,
  },
  tipItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  tipIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 2,
  },
  tipDescription: {
    fontSize: 13,
    color: colors.gray[600],
    lineHeight: 19,
  },
  troubleItem: {
    backgroundColor: colors.gray[50],
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  troubleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  troubleTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[800],
  },
  troubleDescription: {
    fontSize: 12,
    color: colors.gray[600],
    lineHeight: 18,
    paddingLeft: 24,
  },
  proTipSection: {
    backgroundColor: '#fffbeb',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 16,
    borderBottomWidth: 0,
  },
  proTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  proTipTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#b45309',
  },
  proTipText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 20,
  },
});

