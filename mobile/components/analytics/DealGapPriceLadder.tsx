import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect, Circle, Line, G, Text as SvgText } from 'react-native-svg';
import { GlowCard } from '@/components/ui/GlowCard';
import { formatCurrency } from '@/utils/formatters';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

interface DealGapPriceLadderProps {
  listPrice: number;
  incomeValue: number;
  buyPrice: number;
}

const CHART_W = 320;
const CHART_H = 420;
const BAR_W = 36;
const BAR_X = CHART_W / 2 - BAR_W / 2;
const BAR_TOP = 40;
const BAR_BOTTOM = CHART_H - 40;
const BAR_H = BAR_BOTTOM - BAR_TOP;

function colorForPosition(p: number): string {
  const stops = [
    { p: 0.0, c: [239, 68, 68] },
    { p: 0.36, c: [245, 158, 11] },
    { p: 0.50, c: [253, 216, 53] },
    { p: 0.72, c: [34, 197, 94] },
    { p: 1.0, c: [56, 189, 248] },
  ];
  const cp = Math.max(0, Math.min(1, p));
  let a = stops[0],
    b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (cp >= stops[i].p && cp <= stops[i + 1].p) {
      a = stops[i];
      b = stops[i + 1];
      break;
    }
  }
  const t = (cp - a.p) / (b.p - a.p || 1);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${mix(a.c[0], b.c[0])}, ${mix(a.c[1], b.c[1])}, ${mix(a.c[2], b.c[2])})`;
}

function priceToY(
  price: number,
  incomeValue: number,
  scaleFactor: number,
): number {
  if (incomeValue <= 0) return BAR_TOP + BAR_H / 2;
  const pct = (price - incomeValue) / incomeValue;
  const pos = 0.5 - (pct / scaleFactor) * 0.4;
  const clamped = Math.max(0.05, Math.min(0.95, pos));
  return BAR_TOP + clamped * BAR_H;
}

function posOnLadder(
  price: number,
  incomeValue: number,
  scaleFactor: number,
): number {
  if (incomeValue <= 0) return 0.5;
  const pct = (price - incomeValue) / incomeValue;
  const pos = 0.5 - (pct / scaleFactor) * 0.4;
  return Math.max(0.05, Math.min(0.95, pos));
}

export function DealGapPriceLadder({
  listPrice,
  incomeValue,
  buyPrice,
}: DealGapPriceLadderProps) {
  const needsExpanded =
    incomeValue > 0 &&
    Math.abs(
      Math.abs((listPrice - incomeValue) / incomeValue) -
        Math.abs((buyPrice - incomeValue) / incomeValue),
    ) < 0.05;
  const sf = needsExpanded ? 0.15 : 0.4;

  const listY = priceToY(listPrice, incomeValue, sf);
  const ivY = priceToY(incomeValue, incomeValue, sf);
  const buyY = priceToY(buyPrice, incomeValue, sf);

  const listPos = posOnLadder(listPrice, incomeValue, sf);
  const buyPos = posOnLadder(buyPrice, incomeValue, sf);
  const listClr = colorForPosition(listPos);
  const buyClr = colorForPosition(buyPos);

  const dealGapPct =
    listPrice > 0
      ? ((listPrice - buyPrice) / listPrice) * 100
      : 0;
  const dealGapText = `${dealGapPct >= 0 ? '-' : '+'}${Math.abs(dealGapPct).toFixed(1)}%`;

  const bracketTop = Math.min(listY, buyY);
  const bracketH = Math.abs(buyY - listY);

  return (
    <GlowCard style={styles.container}>
      <Text style={styles.title}>Price Ladder</Text>
      <Text style={styles.subtitle}>
        Deal Gap (Buy vs List) + position vs Income Value
      </Text>

      <View style={styles.chartWrapper}>
        <Svg width={CHART_W} height={CHART_H}>
          <Defs>
            <SvgLinearGradient id="ladderGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#EF4444" />
              <Stop offset="36%" stopColor="#F59E0B" />
              <Stop offset="50%" stopColor="#FDD835" />
              <Stop offset="72%" stopColor="#22C55E" />
              <Stop offset="100%" stopColor="#38BDF8" />
            </SvgLinearGradient>
          </Defs>

          {/* Gradient bar */}
          <Rect
            x={BAR_X}
            y={BAR_TOP}
            width={BAR_W}
            height={BAR_H}
            rx={18}
            fill="url(#ladderGrad)"
          />

          {/* Income Value center line */}
          <Line
            x1={BAR_X - 12}
            y1={ivY}
            x2={BAR_X + BAR_W + 12}
            y2={ivY}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth={1.5}
          />

          {/* Deal Gap bracket (left) */}
          <G>
            <Line
              x1={BAR_X - 20}
              y1={bracketTop}
              x2={BAR_X - 20}
              y2={bracketTop + bracketH}
              stroke={colors.heading}
              strokeWidth={1.5}
              opacity={0.6}
            />
            <Line
              x1={BAR_X - 24}
              y1={bracketTop}
              x2={BAR_X - 14}
              y2={bracketTop}
              stroke={colors.heading}
              strokeWidth={1.5}
              opacity={0.6}
            />
            <Line
              x1={BAR_X - 24}
              y1={bracketTop + bracketH}
              x2={BAR_X - 14}
              y2={bracketTop + bracketH}
              stroke={colors.heading}
              strokeWidth={1.5}
              opacity={0.6}
            />
          </G>

          {/* Deal Gap label */}
          <SvgText
            x={BAR_X - 30}
            y={bracketTop + bracketH / 2 - 8}
            textAnchor="end"
            fill={colors.muted}
            fontSize={9}
            fontWeight="700"
          >
            DEAL GAP
          </SvgText>
          <SvgText
            x={BAR_X - 30}
            y={bracketTop + bracketH / 2 + 10}
            textAnchor="end"
            fill={colors.orange}
            fontSize={16}
            fontWeight="800"
          >
            {dealGapText}
          </SvgText>

          {/* List Price marker */}
          <Circle
            cx={BAR_X + BAR_W / 2}
            cy={listY}
            r={6}
            fill={colors.white}
            stroke={listClr}
            strokeWidth={2}
          />
          {/* LIST label (right) */}
          <SvgText
            x={BAR_X + BAR_W + 14}
            y={listY + 5}
            fill={listClr}
            fontSize={16}
            fontWeight="800"
          >
            LIST
          </SvgText>

          {/* Buy Price marker */}
          <Circle
            cx={BAR_X + BAR_W / 2}
            cy={buyY}
            r={7}
            fill={colors.white}
            stroke={buyClr}
            strokeWidth={2.5}
          />
          {/* BUY label (right) */}
          <SvgText
            x={BAR_X + BAR_W + 14}
            y={buyY + 5}
            fill={buyClr}
            fontSize={16}
            fontWeight="800"
          >
            BUY
          </SvgText>

          {/* Income Value label (right, further out) */}
          <SvgText
            x={BAR_X + BAR_W + 74}
            y={ivY - 6}
            fill={colors.heading}
            fontSize={12}
            fontWeight="700"
            textAnchor="start"
          >
            {formatCurrency(incomeValue)}
          </SvgText>
          <SvgText
            x={BAR_X + BAR_W + 74}
            y={ivY + 8}
            fill={colors.muted}
            fontSize={8}
            fontWeight="600"
            textAnchor="start"
          >
            INCOME VALUE
          </SvgText>
        </Svg>
      </View>

      {/* Price chips below */}
      <View style={styles.chips}>
        <PriceChip label="List Price" value={formatCurrency(listPrice)} color={listClr} sub="Asking" />
        <PriceChip label="Income Value" value={formatCurrency(incomeValue)} color={colorForPosition(0.5)} sub="$0 Cash Flow" />
        <PriceChip label="Buy Price" value={formatCurrency(buyPrice)} color={buyClr} sub="Target" />
      </View>
    </GlowCard>
  );
}

function PriceChip({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color: string;
  sub: string;
}) {
  return (
    <View style={[styles.chip, { borderLeftColor: color }]}>
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
      <Text style={styles.chipSub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.heading,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  chartWrapper: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    flex: 1,
    borderLeftWidth: 3,
    paddingLeft: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipValue: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: colors.heading,
    fontVariant: ['tabular-nums'],
  },
  chipSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
});
