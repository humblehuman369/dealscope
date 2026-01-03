import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface CalibrationPanelProps {
  visible: boolean;
  onClose: () => void;
  headingOffset: number;
  onHeadingOffsetChange: (offset: number) => void;
  tiltCompensation: boolean;
  onTiltCompensationChange: (enabled: boolean) => void;
  onReset: () => void;
  onSave: () => void;
  currentHeading: number;
  rawHeading: number;
  tiltAngle: number;
  needsCalibration: boolean;
}

export function CalibrationPanel({
  visible,
  onClose,
  headingOffset,
  onHeadingOffsetChange,
  tiltCompensation,
  onTiltCompensationChange,
  onReset,
  onSave,
  currentHeading,
  rawHeading,
  tiltAngle,
  needsCalibration,
}: CalibrationPanelProps) {
  const handleSaveAndClose = () => {
    onSave();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.panel}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Compass Calibration</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>

          {/* Calibration Warning */}
          {needsCalibration && (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color={colors.loss.main} />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Compass Needs Calibration</Text>
                <Text style={styles.warningText}>
                  Move your phone in a figure-8 pattern to calibrate the magnetometer.
                </Text>
              </View>
            </View>
          )}

          {/* Current Readings */}
          <View style={styles.readingsContainer}>
            <View style={styles.reading}>
              <Text style={styles.readingLabel}>Current Heading</Text>
              <Text style={styles.readingValue}>{currentHeading}°</Text>
            </View>
            <View style={styles.reading}>
              <Text style={styles.readingLabel}>Raw Heading</Text>
              <Text style={styles.readingValue}>{rawHeading}°</Text>
            </View>
            <View style={styles.reading}>
              <Text style={styles.readingLabel}>Phone Tilt</Text>
              <Text style={styles.readingValue}>{tiltAngle}°</Text>
            </View>
          </View>

          {/* Heading Offset Adjustment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Heading Offset</Text>
            <Text style={styles.sectionDescription}>
              If scans consistently identify the wrong property, adjust this offset. 
              Positive = turn right, Negative = turn left.
            </Text>
            
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>{headingOffset > 0 ? '+' : ''}{headingOffset}°</Text>
              <Slider
                style={styles.slider}
                minimumValue={-45}
                maximumValue={45}
                step={1}
                value={headingOffset}
                onValueChange={onHeadingOffsetChange}
                minimumTrackTintColor={colors.primary[500]}
                maximumTrackTintColor={colors.gray[300]}
                thumbTintColor={colors.primary[600]}
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>-45° (Left)</Text>
                <Text style={styles.sliderLabel}>+45° (Right)</Text>
              </View>
            </View>

            {/* Quick Adjust Buttons */}
            <View style={styles.quickAdjust}>
              <TouchableOpacity 
                style={styles.quickButton}
                onPress={() => onHeadingOffsetChange(headingOffset - 5)}
              >
                <Ionicons name="remove" size={18} color="#fff" />
                <Text style={styles.quickButtonText}>5°</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickButton}
                onPress={() => onHeadingOffsetChange(headingOffset - 1)}
              >
                <Ionicons name="remove" size={18} color="#fff" />
                <Text style={styles.quickButtonText}>1°</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.quickButton, styles.resetButton]}
                onPress={() => onHeadingOffsetChange(0)}
              >
                <Text style={styles.quickButtonText}>0°</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickButton}
                onPress={() => onHeadingOffsetChange(headingOffset + 1)}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.quickButtonText}>1°</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickButton}
                onPress={() => onHeadingOffsetChange(headingOffset + 5)}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.quickButtonText}>5°</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tilt Compensation Toggle */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.toggleRow}
              onPress={() => onTiltCompensationChange(!tiltCompensation)}
            >
              <View style={styles.toggleInfo}>
                <Text style={styles.sectionTitle}>Tilt Compensation</Text>
                <Text style={styles.sectionDescription}>
                  Uses accelerometer to correct heading when phone isn't perfectly vertical.
                </Text>
              </View>
              <View style={[
                styles.toggle,
                tiltCompensation && styles.toggleActive
              ]}>
                <View style={[
                  styles.toggleKnob,
                  tiltCompensation && styles.toggleKnobActive
                ]} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Tips */}
          <View style={styles.tipsBox}>
            <Ionicons name="bulb-outline" size={18} color={colors.primary[600]} />
            <View style={styles.tipsContent}>
              <Text style={styles.tipsTitle}>Tips for Accurate Scans</Text>
              <Text style={styles.tipsText}>
                • Hold phone vertically like taking a photo{'\n'}
                • Point directly at the center of the property{'\n'}
                • Stay at least 30-50 feet from the property{'\n'}
                • Avoid scanning near large metal objects
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.resetAllButton} onPress={onReset}>
              <Text style={styles.resetAllText}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveAndClose}>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
  },
  closeButton: {
    padding: 4,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(244,63,94,0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.loss.main,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: colors.gray[600],
    lineHeight: 18,
  },
  readingsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.gray[50],
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  reading: {
    alignItems: 'center',
  },
  readingLabel: {
    fontSize: 11,
    color: colors.gray[500],
    marginBottom: 4,
  },
  readingValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 12,
    color: colors.gray[500],
    lineHeight: 18,
  },
  sliderContainer: {
    marginTop: 16,
  },
  sliderValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary[600],
    textAlign: 'center',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  sliderLabel: {
    fontSize: 10,
    color: colors.gray[400],
  },
  quickAdjust: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[500],
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 2,
  },
  resetButton: {
    backgroundColor: colors.gray[400],
  },
  quickButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  toggleInfo: {
    flex: 1,
  },
  toggle: {
    width: 50,
    height: 28,
    backgroundColor: colors.gray[300],
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary[500],
  },
  toggleKnob: {
    width: 24,
    height: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  tipsBox: {
    flexDirection: 'row',
    backgroundColor: colors.primary[50],
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[700],
    marginBottom: 6,
  },
  tipsText: {
    fontSize: 12,
    color: colors.gray[600],
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  resetAllButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[300],
    alignItems: 'center',
  },
  resetAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[600],
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary[600],
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

