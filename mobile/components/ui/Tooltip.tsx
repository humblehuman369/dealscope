import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

interface TooltipProps {
  term: string;
  definition: string;
  children: React.ReactNode;
}

export function Tooltip({ term, definition, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable onPress={() => setVisible(true)} style={styles.trigger}>
        {children}
        <Text style={styles.infoIcon}> ⓘ</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.tooltipCard}>
            <Text style={styles.tooltipTerm}>{term}</Text>
            <Text style={styles.tooltipDef}>{definition}</Text>
            <Pressable onPress={() => setVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Got it</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center' },
  infoIcon: { fontSize: 12, color: colors.primary },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  tooltipCard: {
    backgroundColor: colors.panel,
    borderRadius: 14,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    maxWidth: 320,
    width: '100%',
  },
  tooltipTerm: {
    fontFamily: fontFamilies.heading,
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  tooltipDef: {
    fontFamily: fontFamilies.body,
    fontSize: 14,
    color: colors.textBody,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 9999,
  },
  closeBtnText: {
    fontFamily: fontFamilies.heading,
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
