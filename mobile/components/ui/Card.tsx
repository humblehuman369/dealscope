import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors, shadows, cardGlow } from '@/constants/colors';
import { layout } from '@/constants/spacing';

interface CardProps {
  children: React.ReactNode;
  glow?: 'none' | 'sm' | 'lg' | 'active';
  style?: ViewStyle;
}

export function Card({ children, glow = 'sm', style }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        glow !== 'none' && cardGlow[glow],
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
    borderRadius: layout.cardRadius,
    padding: layout.cardPadding,
    ...shadows.card,
  },
});
