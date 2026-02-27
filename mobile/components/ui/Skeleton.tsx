import { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { colors, radius, spacing } from '@/constants/tokens';

interface SkeletonBoxProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Shimmer skeleton placeholder with animated opacity pulse.
 */
export function SkeletonBox({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  style,
}: SkeletonBoxProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.25, 0.5]),
  }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: colors.panel },
        animStyle,
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Pre-built skeleton screens
// ---------------------------------------------------------------------------

export function VerdictSkeleton() {
  return (
    <View style={skStyles.container}>
      {/* Header */}
      <View style={skStyles.headerRow}>
        <SkeletonBox width={24} height={24} borderRadius={12} />
        <SkeletonBox width={100} height={20} />
        <SkeletonBox width={24} height={24} borderRadius={12} />
      </View>

      {/* Property card */}
      <View style={skStyles.card}>
        <SkeletonBox width="80%" height={18} />
        <View style={skStyles.chipRow}>
          <SkeletonBox width={50} height={22} borderRadius={11} />
          <SkeletonBox width={50} height={22} borderRadius={11} />
          <SkeletonBox width={70} height={22} borderRadius={11} />
          <SkeletonBox width={80} height={22} borderRadius={11} />
        </View>
      </View>

      {/* Score card */}
      <View style={[skStyles.card, { alignItems: 'center' }]}>
        <SkeletonBox width={80} height={12} />
        <SkeletonBox width={132} height={132} borderRadius={66} style={{ marginVertical: spacing.md }} />
        <SkeletonBox width={160} height={28} borderRadius={14} />
        <SkeletonBox width="90%" height={14} style={{ marginTop: spacing.sm }} />
        <SkeletonBox width="70%" height={14} />
      </View>

      {/* Deal gap */}
      <View style={skStyles.card}>
        <View style={skStyles.row}>
          <SkeletonBox width={80} height={14} />
          <SkeletonBox width={70} height={22} borderRadius={11} />
        </View>
        <SkeletonBox width={100} height={30} style={{ alignSelf: 'center', marginVertical: spacing.sm }} />
        <SkeletonBox height={12} borderRadius={6} />
      </View>

      {/* Price cards */}
      <View style={skStyles.card}>
        <SkeletonBox width={160} height={14} />
        <View style={[skStyles.row, { marginTop: spacing.sm }]}>
          <View style={skStyles.priceCard}>
            <SkeletonBox width={60} height={10} />
            <SkeletonBox width={80} height={20} style={{ marginTop: 4 }} />
          </View>
          <View style={skStyles.priceCard}>
            <SkeletonBox width={60} height={10} />
            <SkeletonBox width={80} height={20} style={{ marginTop: 4 }} />
          </View>
          <View style={skStyles.priceCard}>
            <SkeletonBox width={60} height={10} />
            <SkeletonBox width={80} height={20} style={{ marginTop: 4 }} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function StrategySkeleton() {
  return (
    <View style={skStyles.container}>
      <View style={skStyles.headerRow}>
        <SkeletonBox width={24} height={24} borderRadius={12} />
        <SkeletonBox width={100} height={20} />
        <SkeletonBox width={24} height={24} borderRadius={12} />
      </View>
      {/* Pill row */}
      <View style={[skStyles.chipRow, { marginBottom: spacing.md }]}>
        {[90, 80, 60, 70, 80, 70].map((w, i) => (
          <SkeletonBox key={i} width={w} height={36} borderRadius={14} />
        ))}
      </View>
      {/* Title */}
      <SkeletonBox width={160} height={20} />
      <SkeletonBox width="90%" height={14} style={{ marginTop: 4 }} />
      {/* Metrics */}
      <View style={[skStyles.card, { marginTop: spacing.md }]}>
        <View style={skStyles.metricsGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={skStyles.metricItem}>
              <SkeletonBox width={60} height={22} />
              <SkeletonBox width={50} height={10} style={{ marginTop: 4 }} />
            </View>
          ))}
        </View>
      </View>
      {/* Breakdown sections */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={skStyles.card}>
          <SkeletonBox width={120} height={16} />
        </View>
      ))}
    </View>
  );
}

export function PropertyDetailsSkeleton() {
  return (
    <View style={skStyles.container}>
      <SkeletonBox width="100%" height={260} borderRadius={0} />
      <View style={{ padding: spacing.md, gap: spacing.md }}>
        <SkeletonBox width="85%" height={22} />
        <View style={skStyles.card}>
          <View style={skStyles.row}>
            <SkeletonBox width={80} height={22} borderRadius={11} />
            <SkeletonBox width={100} height={26} />
          </View>
          <View style={[skStyles.chipRow, { marginTop: spacing.sm }]}>
            {[70, 70, 90, 70].map((w, i) => (
              <SkeletonBox key={i} width={w} height={36} borderRadius={radius.md} />
            ))}
          </View>
        </View>
        <View style={skStyles.card}>
          <SkeletonBox width={80} height={14} />
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[skStyles.row, { marginTop: spacing.sm }]}>
              <SkeletonBox width={80} height={14} />
              <SkeletonBox width={120} height={14} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function DealVaultListSkeleton() {
  return (
    <View style={{ gap: spacing.sm, padding: spacing.md }}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={skStyles.card}>
          <SkeletonBox width="80%" height={16} />
          <View style={[skStyles.chipRow, { marginTop: spacing.sm }]}>
            <SkeletonBox width={40} height={18} borderRadius={9} />
            <SkeletonBox width={40} height={18} borderRadius={9} />
            <SkeletonBox width={70} height={18} borderRadius={9} />
          </View>
          <View style={[skStyles.row, { marginTop: spacing.sm }]}>
            <SkeletonBox width={60} height={18} />
            <SkeletonBox width={60} height={18} />
            <SkeletonBox width={80} height={18} />
          </View>
        </View>
      ))}
    </View>
  );
}

const skStyles = StyleSheet.create({
  container: {
    gap: spacing.md,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  priceCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
