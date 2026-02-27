import { type ReactNode } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors, radius, shadows } from '@/constants/tokens';

interface GlowCardProps {
  children: ReactNode;
  glowColor?: string;
  style?: ViewStyle;
  active?: boolean;
}

/**
 * Card component with a teal glow border effect.
 * Matches the web frontend's `.card-hover` CSS class.
 */
export function GlowCard({
  children,
  glowColor = colors.accent,
  style,
  active = false,
}: GlowCardProps) {
  return (
    <View
      style={[
        styles.card,
        {
          borderColor: active
            ? `${glowColor}88`
            : `${glowColor}40`,
          shadowColor: glowColor,
          shadowOpacity: active ? 0.12 : 0.06,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderRadius: radius.lg,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 24,
    elevation: 4,
  },
});
