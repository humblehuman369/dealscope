import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '@/hooks/useSession';
import { colors, fontFamily, fontSize, spacing, textStyles } from '@/constants/tokens';

export default function DealVaultScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useSession();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.screenTitle}>DealVault<Text style={styles.accent}>IQ</Text></Text>

      <View style={styles.emptyState}>
        <View style={styles.iconCircle}>
          <Ionicons name="bookmark-outline" size={40} color={colors.accent} />
        </View>
        <Text style={styles.emptyTitle}>
          {isAuthenticated ? 'No Saved Properties' : 'Sign In to Save Deals'}
        </Text>
        <Text style={styles.emptyMessage}>
          {isAuthenticated
            ? 'Properties you save during analysis will appear here for quick comparison and tracking.'
            : 'Create an account to save properties, track deals, and build your investment pipeline.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base,
    paddingHorizontal: spacing.lg,
  },
  screenTitle: {
    ...textStyles.h1,
    marginBottom: spacing.xl,
  },
  accent: {
    color: colors.accent,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
    gap: spacing.md,
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
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xl,
    color: colors.heading,
  },
  emptyMessage: {
    ...textStyles.body,
    color: colors.secondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: fontSize.md * 1.6,
  },
});
