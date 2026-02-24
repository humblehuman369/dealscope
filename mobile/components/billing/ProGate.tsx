/**
 * ProGate — wraps Pro-only features on mobile.
 *
 * Cascaded gating (mirrors frontend/src/components/ProGate.tsx):
 *   Loading       → blurred placeholder
 *   Anonymous     → sign-in prompt
 *   Free          → upgrade prompt (UpgradeModal)
 *   Pro / Trialing → children rendered as-is
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../../hooks/useSubscription';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';
import { UpgradeModal } from './UpgradeModal';

interface ProGateProps {
  children: React.ReactNode;
  feature?: string;
  /** "section" blurs content with overlay. "inline" replaces with button. */
  mode?: 'section' | 'inline';
  fallback?: React.ReactNode;
}

export function ProGate({
  children,
  feature,
  mode = 'inline',
  fallback,
}: ProGateProps) {
  const { isPro, isLoading, isAuthenticated } = useSubscription();
  const { isDark } = useTheme();
  const router = useRouter();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (isPro) return <>{children}</>;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
      </View>
    );
  }

  if (fallback) return <>{fallback}</>;

  if (!isAuthenticated) {
    const label = feature ? `Sign in to unlock ${feature}` : 'Sign in';

    if (mode === 'inline') {
      return (
        <TouchableOpacity
          style={[
            styles.inlineButton,
            { borderColor: isDark ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.25)' },
          ]}
          onPress={() => router.push('/auth/login')}
        >
          <Ionicons name="log-in-outline" size={14} color="#94A3B8" />
          <Text style={styles.signInText}>{label}</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.blurredContent} pointerEvents="none">
          {children}
        </View>
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.overlayButton}
            onPress={() => router.push('/auth/login')}
          >
            <Ionicons name="log-in-outline" size={16} color="#e2e8f0" />
            <Text style={styles.overlayButtonText}>{label}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Authenticated free user → upgrade prompt
  if (mode === 'inline') {
    return (
      <>
        <TouchableOpacity
          style={styles.upgradeInlineButton}
          onPress={() => setUpgradeOpen(true)}
        >
          <Ionicons name="lock-closed" size={12} color={colors.primary[500]} />
          <Text style={styles.upgradeInlineText}>
            {feature ? `${feature} — Pro` : 'Upgrade to Pro'}
          </Text>
        </TouchableOpacity>
        <UpgradeModal
          visible={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <View style={styles.sectionContainer}>
        <View style={styles.blurredContent} pointerEvents="none">
          {children}
        </View>
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.upgradeOverlayButton}
            onPress={() => setUpgradeOpen(true)}
          >
            <Ionicons name="lock-closed" size={16} color="#fff" />
            <Text style={styles.upgradeOverlayText}>
              {feature ? `Unlock ${feature}` : 'Upgrade to Pro'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <UpgradeModal
        visible={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(148,163,184,0.08)',
  },
  signInText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  sectionContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
  },
  blurredContent: {
    opacity: 0.3,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  overlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(148,163,184,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)',
  },
  overlayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  upgradeInlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.2)',
    backgroundColor: 'rgba(14,165,233,0.06)',
  },
  upgradeInlineText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary[500],
  },
  upgradeOverlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary[500],
  },
  upgradeOverlayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
