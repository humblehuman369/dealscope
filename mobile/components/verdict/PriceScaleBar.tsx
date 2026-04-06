import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/colors';
import { fontFamilies } from '@/constants/typography';
import { spacing } from '@/constants/spacing';

interface PriceScaleBarProps {
  purchasePrice: number;
  incomeValue: number;
  marketPrice: number;
  dealGapPercent: number;
}

function fmtCompact(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(v / 1000)}K`;
}

export function PriceScaleBar({
  purchasePrice,
  incomeValue,
  marketPrice,
  dealGapPercent,
}: PriceScaleBarProps) {
  const markers = [
    { label: 'TARGET', price: purchasePrice, color: colors.primary },
    { label: 'INCOME', price: incomeValue, color: colors.gold },
    { label: 'MARKET', price: marketPrice, color: colors.error },
  ]
    .filter((m) => m.price > 0)
    .sort((a, b) => a.price - b.price);

  const allPrices = markers.map((m) => m.price);
  const scaleMin = Math.min(...allPrices) * 0.95;
  const scaleMax = Math.max(...allPrices) * 1.05;
  const range = scaleMax - scaleMin;
  const pos = (v: number) =>
    Math.min(96, Math.max(4, ((v - scaleMin) / range) * 100));

  const effectiveDisplayPct = -dealGapPercent;
  const dealGapDisplay = `${effectiveDisplayPct >= 0 ? '+' : ''}${effectiveDisplayPct.toFixed(1)}%`;

  const priceGapPct =
    marketPrice > 0 && incomeValue > 0
      ? ((incomeValue - marketPrice) / marketPrice) * 100
      : 0;
  const priceGapDisplay = `${priceGapPct >= 0 ? '+' : ''}${priceGapPct.toFixed(1)}%`;
  const showPriceGap = Math.abs(priceGapPct) > 0.1;

  const isPositiveIncomeCase = incomeValue > marketPrice && priceGapPct > 0.1;
  const showDealBracket = Math.abs(dealGapPercent) > 0.1;

  const targetPos = pos(purchasePrice);
  const marketPos = pos(marketPrice);
  const incomePos = pos(incomeValue);

  return (
    <View style={styles.container}>
      {showDealBracket && (
        <View
          style={[
            styles.bracketContainer,
            {
              left: `${Math.min(targetPos, marketPos)}%` as any,
              width: `${Math.abs(marketPos - targetPos)}%` as any,
            },
          ]}
        >
          <Text
            style={[
              styles.bracketLabel,
              {
                color:
                  effectiveDisplayPct > 0 ? colors.success : colors.primary,
              },
            ]}
          >
            DEAL GAP {dealGapDisplay}
          </Text>
          <View style={styles.bracketLine}>
            <View
              style={[
                styles.bracketEnd,
                {
                  backgroundColor:
                    effectiveDisplayPct > 0 ? colors.success : colors.primary,
                },
              ]}
            />
            <View
              style={[
                styles.bracketMiddle,
                {
                  backgroundColor:
                    effectiveDisplayPct > 0 ? colors.success : colors.primary,
                },
              ]}
            />
            <View
              style={[
                styles.bracketEnd,
                {
                  backgroundColor:
                    effectiveDisplayPct > 0 ? colors.success : colors.primary,
                },
              ]}
            />
          </View>
        </View>
      )}

      <View style={styles.barOuter}>
        <LinearGradient
          colors={[
            'rgba(10,30,60,0.95)',
            'rgba(30,80,140,0.85)',
            'rgba(56,160,220,0.7)',
            'rgba(30,80,140,0.85)',
            'rgba(10,30,60,0.95)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bar}
        >
          {isPositiveIncomeCase && (
            <View
              style={[
                styles.sweetSpot,
                {
                  left: `${Math.min(marketPos, incomePos)}%` as any,
                  width: `${Math.abs(incomePos - marketPos)}%` as any,
                },
              ]}
            >
              <Text style={styles.sweetSpotLabel}>SWEET SPOT</Text>
            </View>
          )}

          {markers.map((m, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  left: `${pos(m.price)}%` as any,
                  backgroundColor: m.color,
                },
              ]}
            />
          ))}
        </LinearGradient>
      </View>

      <View style={styles.labelsRow}>
        {markers.map((m, i) => (
          <View
            key={i}
            style={[
              styles.labelWrap,
              { left: `${pos(m.price)}%` as any },
            ]}
          >
            <Text style={[styles.dotLabel, { color: m.color }]}>
              {m.label}
            </Text>
          </View>
        ))}
      </View>

      {showPriceGap && (
        <View
          style={[
            styles.bracketContainer,
            {
              left: `${Math.min(incomePos, marketPos)}%` as any,
              width: `${Math.abs(incomePos - marketPos)}%` as any,
              marginTop: 4,
            },
          ]}
        >
          <View style={styles.bracketLineBottom}>
            <View
              style={[styles.bracketEnd, { backgroundColor: colors.gold }]}
            />
            <View
              style={[styles.bracketMiddle, { backgroundColor: colors.gold }]}
            />
            <View
              style={[styles.bracketEnd, { backgroundColor: colors.gold }]}
            />
          </View>
          <Text style={[styles.bracketLabel, { color: colors.gold }]}>
            PRICE GAP {priceGapDisplay}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  bracketContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 4,
  },
  bracketLabel: {
    fontFamily: fontFamilies.heading,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  bracketLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  bracketLineBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
  },
  bracketEnd: {
    width: 1,
    height: 12,
  },
  bracketMiddle: {
    height: 1,
    flex: 1,
  },
  barOuter: {
    borderRadius: 11,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(56,189,248,0.5)',
  },
  bar: {
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
  },
  sweetSpot: {
    position: 'absolute',
    height: '100%',
    borderRadius: 11,
    backgroundColor: 'rgba(52,211,153,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sweetSpotLabel: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  dot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    top: 3,
    marginLeft: -8,
  },
  labelsRow: {
    position: 'relative',
    height: 16,
    marginTop: 4,
  },
  labelWrap: {
    position: 'absolute',
    transform: [{ translateX: -20 }],
  },
  dotLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});
