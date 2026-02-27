import { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  secureToggle?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    icon,
    rightIcon,
    onRightIconPress,
    containerStyle,
    secureToggle,
    secureTextEntry,
    style,
    ...rest
  },
  ref,
) {
  const [isSecure, setIsSecure] = useState(secureTextEntry ?? false);

  const effectiveSecure = secureToggle ? isSecure : secureTextEntry;
  const showToggle = secureToggle && secureTextEntry !== undefined;

  return (
    <View style={containerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={colors.secondary}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          ref={ref}
          style={[
            styles.input,
            icon && styles.inputWithLeftIcon,
            (showToggle || rightIcon) && styles.inputWithRightIcon,
            style,
          ]}
          placeholderTextColor={colors.muted}
          selectionColor={colors.accent}
          secureTextEntry={effectiveSecure}
          autoCapitalize="none"
          {...rest}
        />

        {showToggle && (
          <Pressable
            onPress={() => setIsSecure((v) => !v)}
            style={styles.rightIconBtn}
            hitSlop={8}
            accessibilityLabel={isSecure ? 'Show password' : 'Hide password'}
          >
            <Ionicons
              name={isSecure ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.secondary}
            />
          </Pressable>
        )}

        {!showToggle && rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            style={styles.rightIconBtn}
            hitSlop={8}
          >
            <Ionicons name={rightIcon} size={20} color={colors.secondary} />
          </Pressable>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.body,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    minHeight: 50,
  },
  inputWrapperError: {
    borderColor: colors.red,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    color: colors.heading,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 0,
  },
  leftIcon: {
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  rightIconBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  error: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.red,
    marginTop: 4,
  },
});
