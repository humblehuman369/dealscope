import { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleSectionProps {
  title: string;
  accentColor?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function CollapsibleSection({
  title,
  accentColor = colors.accent,
  defaultOpen = false,
  children,
  actionLabel,
  onAction,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen((v) => !v);
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={toggle}>
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerRight}>
          {actionLabel && onAction && (
            <Pressable onPress={onAction} hitSlop={8}>
              <Text style={[styles.action, { color: accentColor }]}>{actionLabel}</Text>
            </Pressable>
          )}
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.secondary}
          />
        </View>
      </Pressable>
      {isOpen && <View style={styles.body}>{children}</View>}
    </View>
  );
}

interface RowProps {
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
  accentColor?: string;
}

export function FinancialRow({
  label,
  value,
  highlight,
  negative,
  accentColor = colors.accent,
}: RowProps) {
  return (
    <View
      style={[
        styles.row,
        highlight && { backgroundColor: `${accentColor}10` },
      ]}
    >
      <Text
        style={[
          styles.rowLabel,
          highlight && { fontFamily: fontFamily.semiBold, color: colors.heading },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.rowValue,
          highlight && { color: accentColor, fontFamily: fontFamily.bold, fontSize: fontSize.md },
          negative && { color: colors.red },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  accentBar: {
    width: 3,
    height: 20,
    borderRadius: 1.5,
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.heading,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  action: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
  },
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md + 4,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
    flex: 1,
  },
  rowValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.heading,
    fontVariant: ['tabular-nums'],
  },
});
