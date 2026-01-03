import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../theme/colors';

interface AuthRequiredModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: string; // What feature requires auth (e.g., "save properties")
  onContinueWithoutAuth?: () => void; // Optional callback to continue without auth
}

/**
 * Modal that prompts users to login or register to access a feature.
 * Used when unauthenticated users try to save properties, sync data, etc.
 */
export function AuthRequiredModal({
  visible,
  onClose,
  feature = 'save properties',
  onContinueWithoutAuth,
}: AuthRequiredModalProps) {
  const router = useRouter();

  const handleLogin = () => {
    onClose();
    router.push('/auth/login');
  };

  const handleRegister = () => {
    onClose();
    router.push('/auth/register');
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.gray[400]} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="person-outline" size={40} color={colors.primary[600]} />
            </View>
          </View>

          {/* Title & Description */}
          <Text style={styles.title}>Account Required</Text>
          <Text style={styles.description}>
            Create a free account or sign in to {feature}. Your data will be securely 
            saved and synced across all your devices.
          </Text>

          {/* Benefits List */}
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="cloud-done-outline" size={20} color={colors.profit.main} />
              <Text style={styles.benefitText}>Sync properties across devices</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="heart-outline" size={20} color={colors.profit.main} />
              <Text style={styles.benefitText}>Save favorites & notes</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="briefcase-outline" size={20} color={colors.profit.main} />
              <Text style={styles.benefitText}>Build your investment portfolio</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="notifications-outline" size={20} color={colors.profit.main} />
              <Text style={styles.benefitText}>Get price & listing alerts</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleRegister}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Create Free Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Already have an account? Sign In</Text>
            </TouchableOpacity>

            {onContinueWithoutAuth && (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => {
                  onClose();
                  onContinueWithoutAuth();
                }}
              >
                <Text style={styles.skipButtonText}>Continue without saving</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 10,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  benefitsList: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 8,
  },
  benefitText: {
    fontSize: 14,
    color: colors.gray[700],
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary[600],
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary[600],
    borderRadius: 14,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[600],
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 13,
    color: colors.gray[500],
    textDecorationLine: 'underline',
  },
});

