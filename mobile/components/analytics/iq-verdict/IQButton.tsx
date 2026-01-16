/**
 * IQButton - Branded button component for InvestIQ
 * Matches verdict section color scheme with soft teal styling
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { IQ_COLORS } from './types';

interface IQButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'default' | 'small';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  isDark?: boolean;
}

export function IQButton({
  title,
  onPress,
  variant = 'primary',
  size = 'default',
  disabled = false,
  style,
  textStyle,
  isDark = false,
}: IQButtonProps) {
  const getButtonStyle = (): ViewStyle[] => {
    const baseStyle: ViewStyle[] = [
      styles.button,
      size === 'small' ? styles.buttonSmall : undefined,
      disabled ? styles.disabled : undefined,
    ].filter(Boolean) as ViewStyle[];

    switch (variant) {
      case 'primary':
        return [...baseStyle, isDark ? styles.primaryButtonDark : styles.primaryButton];
      case 'secondary':
        return [...baseStyle, isDark ? styles.secondaryButtonDark : styles.secondaryButton];
      case 'text':
        return [...baseStyle, styles.textButton];
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle[] => {
    const baseStyle: TextStyle[] = [
      styles.buttonText,
      size === 'small' ? styles.buttonTextSmall : undefined,
      disabled ? styles.disabledText : undefined,
    ].filter(Boolean) as TextStyle[];

    switch (variant) {
      case 'primary':
        return [...baseStyle, isDark ? styles.primaryTextDark : styles.primaryText];
      case 'secondary':
        return [...baseStyle, isDark ? styles.secondaryTextDark : styles.secondaryText];
      case 'text':
        return [...baseStyle, styles.textOnlyText];
      default:
        return baseStyle;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
      style={[...getButtonStyle(), style]}
    >
      <Text style={[...getTextStyle(), textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Base button
  button: {
    borderRadius: 40,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 32,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  buttonTextSmall: {
    fontSize: 13,
  },

  // Primary - Soft Teal (matches verdict section gradient) - Light mode
  primaryButton: {
    backgroundColor: 'rgba(8, 145, 178, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(8, 145, 178, 0.25)',
  },
  primaryText: {
    color: IQ_COLORS.deepNavy,
  },

  // Primary - Dark mode
  primaryButtonDark: {
    backgroundColor: 'rgba(8, 145, 178, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(8, 145, 178, 0.4)',
  },
  primaryTextDark: {
    color: IQ_COLORS.white,
  },

  // Secondary - Outlined - Light mode
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(8, 145, 178, 0.4)',
  },
  secondaryText: {
    color: IQ_COLORS.deepNavy,
    fontWeight: '600',
  },

  // Secondary - Dark mode
  secondaryButtonDark: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(8, 145, 178, 0.5)',
  },
  secondaryTextDark: {
    color: IQ_COLORS.electricCyan,
    fontWeight: '600',
  },

  // Text only - No background/border
  textButton: {
    backgroundColor: 'transparent',
  },
  textOnlyText: {
    color: IQ_COLORS.pacificTeal,
    fontWeight: '600',
  },

  // Disabled state
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: IQ_COLORS.slate,
  },
});

export default IQButton;
