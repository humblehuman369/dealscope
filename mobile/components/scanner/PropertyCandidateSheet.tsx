import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { PropertyCandidate } from '../../hooks/usePropertyScan';

interface PropertyCandidateSheetProps {
  visible: boolean;
  candidates: PropertyCandidate[];
  onSelect: (candidate: PropertyCandidate) => void;
  onCancel: () => void;
}

/**
 * Bottom sheet for selecting the correct property from multiple candidates.
 * Shown when the scan detects multiple properties with similar confidence.
 */
export function PropertyCandidateSheet({
  visible,
  candidates,
  onSelect,
  onCancel,
}: PropertyCandidateSheetProps) {
  if (!visible || candidates.length === 0) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="help-circle" size={24} color={colors.primary[600]} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Which property?</Text>
              <Text style={styles.subtitle}>
                We found {candidates.length} nearby properties. Tap the correct one.
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
              <Ionicons name="close" size={24} color={colors.gray[500]} />
            </TouchableOpacity>
          </View>

          {/* Candidate List */}
          <ScrollView 
            style={styles.candidateList}
            showsVerticalScrollIndicator={false}
          >
            {candidates.map((candidate, index) => (
              <TouchableOpacity
                key={`${candidate.property.address}-${index}`}
                style={[
                  styles.candidateCard,
                  candidate.isRecommended && styles.recommendedCard,
                ]}
                onPress={() => onSelect(candidate)}
                activeOpacity={0.7}
              >
                {/* Recommended Badge */}
                {candidate.isRecommended && (
                  <View style={styles.recommendedBadge}>
                    <Ionicons name="star" size={12} color="#fff" />
                    <Text style={styles.recommendedText}>Best Match</Text>
                  </View>
                )}

                {/* Property Info */}
                <View style={styles.propertyInfo}>
                  <View style={styles.addressRow}>
                    <Ionicons name="home" size={18} color={colors.gray[600]} />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {candidate.property.address}
                    </Text>
                  </View>
                  
                  <Text style={styles.locationText}>
                    {candidate.property.city}, {candidate.property.state} {candidate.property.zip}
                  </Text>

                  {/* Distance and Confidence */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="navigate-outline" size={14} color={colors.gray[400]} />
                      <Text style={styles.metaText}>
                        ~{Math.round(candidate.distanceFromUser)}m away
                      </Text>
                    </View>
                    
                    <View style={styles.metaItem}>
                      <View style={[
                        styles.confidenceDot,
                        candidate.confidence > 80 ? styles.confidenceHigh :
                        candidate.confidence > 60 ? styles.confidenceMedium :
                        styles.confidenceLow
                      ]} />
                      <Text style={styles.metaText}>
                        {candidate.confidence}% match
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Select Arrow */}
                <View style={styles.selectArrow}>
                  <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Help Text */}
          <View style={styles.helpSection}>
            <Ionicons name="information-circle-outline" size={16} color={colors.gray[400]} />
            <Text style={styles.helpText}>
              Not seeing the right property? Try adjusting the distance slider and scan again.
            </Text>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel & Re-scan</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 34,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray[500],
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
  candidateList: {
    paddingHorizontal: 20,
    maxHeight: 340,
  },
  candidateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  recommendedCard: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[300],
  },
  recommendedBadge: {
    position: 'absolute',
    top: -8,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[600],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  propertyInfo: {
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    flex: 1,
  },
  locationText: {
    fontSize: 13,
    color: colors.gray[500],
    marginLeft: 26,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginLeft: 26,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.gray[500],
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  confidenceHigh: {
    backgroundColor: colors.profit.main,
  },
  confidenceMedium: {
    backgroundColor: '#f59e0b',
  },
  confidenceLow: {
    backgroundColor: colors.loss.main,
  },
  selectArrow: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 8,
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    color: colors.gray[400],
    lineHeight: 18,
  },
  cancelButton: {
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray[300],
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[600],
  },
});
