/**
 * Skeleton — Shimmer loading placeholders.
 *
 * Provides composable skeleton primitives for building loading states:
 *   <SkeletonLine />         — single text line
 *   <SkeletonCircle />       — avatar / score ring
 *   <SkeletonCard />         — card-shaped block
 *   <SkeletonGroup />        — vertical stack with gap
 *
 * Pre-built screen skeletons:
 *   <VerdictSkeleton />      — VerdictIQ loading state
 *   <StrategySkeleton />     — StrategyIQ / worksheet loading state
 *   <HomeSkeleton />         — Home screen loading state
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing, type ViewStyle } from 'react-native';

// ─── Theme constants ─────────────────────────────────────────────
const BASE_COLOR = 'rgba(255,255,255,0.04)';
const SHIMMER_COLOR = 'rgba(255,255,255,0.08)';

// ─── Animated shimmer ────────────────────────────────────────────
function useShimmer() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    ).start();
  }, [anim]);
  return anim;
}

// ─── Primitives ──────────────────────────────────────────────────

interface SkeletonLineProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLine({ width = '100%', height = 14, borderRadius = 6, style }: SkeletonLineProps) {
  const shimmer = useShimmer();
  const bg = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [BASE_COLOR, SHIMMER_COLOR, BASE_COLOR],
  });

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: bg },
        style,
      ]}
    />
  );
}

interface SkeletonCircleProps {
  size?: number;
  style?: ViewStyle;
}

export function SkeletonCircle({ size = 48, style }: SkeletonCircleProps) {
  const shimmer = useShimmer();
  const bg = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [BASE_COLOR, SHIMMER_COLOR, BASE_COLOR],
  });
  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        style,
      ]}
    />
  );
}

interface SkeletonCardProps {
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonCard({ height = 80, borderRadius = 12, style }: SkeletonCardProps) {
  const shimmer = useShimmer();
  const bg = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [BASE_COLOR, SHIMMER_COLOR, BASE_COLOR],
  });
  return (
    <Animated.View
      style={[
        { width: '100%' as any, height, borderRadius, backgroundColor: bg },
        style,
      ]}
    />
  );
}

interface SkeletonGroupProps {
  children: React.ReactNode;
  gap?: number;
  style?: ViewStyle;
}

export function SkeletonGroup({ children, gap = 12, style }: SkeletonGroupProps) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

// ─── Pre-built screen skeletons ──────────────────────────────────

/** VerdictIQ loading skeleton — score ring, price targets, signal cards */
export function VerdictSkeleton() {
  return (
    <View style={screen.container}>
      {/* Header bar */}
      <View style={screen.header}>
        <SkeletonLine width={120} height={16} />
        <SkeletonLine width={200} height={12} />
      </View>

      {/* Score ring area */}
      <View style={screen.centered}>
        <SkeletonCircle size={120} />
        <SkeletonLine width={100} height={20} style={{ marginTop: 16 }} />
        <SkeletonLine width={220} height={12} style={{ marginTop: 8 }} />
      </View>

      {/* Signal cards row */}
      <View style={screen.row}>
        <SkeletonCard height={72} style={{ flex: 1 }} />
        <SkeletonCard height={72} style={{ flex: 1 }} />
        <SkeletonCard height={72} style={{ flex: 1 }} />
        <SkeletonCard height={72} style={{ flex: 1 }} />
      </View>

      {/* Price targets */}
      <SkeletonGroup gap={10} style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <SkeletonLine width="40%" height={10} />
        <SkeletonCard height={56} />
        <SkeletonCard height={56} />
        <SkeletonCard height={56} />
      </SkeletonGroup>

      {/* CTA */}
      <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <SkeletonCard height={52} borderRadius={14} />
      </View>
    </View>
  );
}

/** StrategyIQ / financial breakdown loading skeleton */
export function StrategySkeleton() {
  return (
    <View style={screen.container}>
      {/* Header */}
      <View style={screen.header}>
        <SkeletonLine width={100} height={14} />
        <SkeletonLine width={240} height={12} />
      </View>

      {/* Action bar */}
      <View style={[screen.row, { paddingHorizontal: 20, marginTop: 16 }]}>
        <SkeletonCard height={36} style={{ flex: 1 }} borderRadius={8} />
        <SkeletonCard height={36} style={{ flex: 1 }} borderRadius={8} />
        <SkeletonCard height={36} style={{ flex: 1.5 }} borderRadius={20} />
      </View>

      {/* Financial breakdown */}
      <SkeletonGroup gap={8} style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <SkeletonLine width="50%" height={12} />
        <View style={[screen.row, { gap: 16 }]}>
          <SkeletonGroup gap={8} style={{ flex: 1 }}>
            <SkeletonLine width="80%" height={14} />
            <SkeletonLine width="60%" height={14} />
            <SkeletonLine width="70%" height={14} />
            <SkeletonLine width="65%" height={14} />
            <SkeletonLine width="80%" height={14} />
          </SkeletonGroup>
          <SkeletonGroup gap={8} style={{ flex: 1 }}>
            <SkeletonLine width="80%" height={14} />
            <SkeletonLine width="60%" height={14} />
            <SkeletonLine width="70%" height={14} />
            <SkeletonLine width="65%" height={14} />
            <SkeletonLine width="80%" height={14} />
          </SkeletonGroup>
        </View>
      </SkeletonGroup>

      {/* NOI card */}
      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        <SkeletonCard height={64} />
      </View>

      {/* Benchmarks */}
      <SkeletonGroup gap={8} style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <SkeletonLine width="40%" height={10} />
        <SkeletonCard height={40} />
        <SkeletonCard height={40} />
        <SkeletonCard height={40} />
      </SkeletonGroup>
    </View>
  );
}

/** Home screen loading skeleton */
export function HomeSkeleton() {
  return (
    <View style={screen.container}>
      {/* Hero area */}
      <View style={{ paddingHorizontal: 20, paddingTop: 60 }}>
        <SkeletonLine width="80%" height={28} />
        <SkeletonLine width="60%" height={28} style={{ marginTop: 8 }} />
        <SkeletonLine width="90%" height={14} style={{ marginTop: 16 }} />
      </View>

      {/* Search bar */}
      <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <SkeletonCard height={52} borderRadius={14} />
      </View>

      {/* Signal cards */}
      <View style={[screen.row, { paddingHorizontal: 20, marginTop: 32 }]}>
        <SkeletonCard height={80} style={{ flex: 1 }} />
        <SkeletonCard height={80} style={{ flex: 1 }} />
        <SkeletonCard height={80} style={{ flex: 1 }} />
        <SkeletonCard height={80} style={{ flex: 1 }} />
      </View>

      {/* Toolkit section */}
      <SkeletonGroup gap={10} style={{ paddingHorizontal: 20, marginTop: 32 }}>
        <SkeletonLine width="50%" height={18} />
        <SkeletonCard height={72} />
        <SkeletonCard height={72} />
        <SkeletonCard height={72} />
      </SkeletonGroup>
    </View>
  );
}

/** Generic screen skeleton — works for any detail page */
export function GenericSkeleton() {
  return (
    <View style={screen.container}>
      <View style={screen.header}>
        <SkeletonLine width={100} height={14} />
        <SkeletonLine width={200} height={12} />
      </View>
      <SkeletonGroup gap={12} style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <SkeletonCard height={160} />
        <SkeletonLine width="70%" height={14} />
        <SkeletonLine width="50%" height={14} />
        <SkeletonCard height={100} />
        <SkeletonCard height={100} />
      </SkeletonGroup>
    </View>
  );
}

// ─── Shared screen layout styles ─────────────────────────────────
const screen = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1628',
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    gap: 6,
    marginBottom: 8,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
});
