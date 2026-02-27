import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlowCard } from '@/components/ui/GlowCard';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { colors, fontFamily, fontSize, spacing, radius } from '@/constants/tokens';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface DetailChip {
  icon: IoniconsName;
  label: string;
  value: string;
}

interface PropertyInfoCardProps {
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFootage?: number | null;
  yearBuilt?: number | null;
  lotSize?: number | null;
  propertyType?: string | null;
  listPrice?: number | null;
  daysOnMarket?: number | null;
  listingStatus?: string | null;
}

function formatStatus(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PropertyInfoCard({
  bedrooms,
  bathrooms,
  squareFootage,
  yearBuilt,
  lotSize,
  propertyType,
  listPrice,
  daysOnMarket,
  listingStatus,
}: PropertyInfoCardProps) {
  const chips: DetailChip[] = [
    bedrooms != null
      ? { icon: 'bed-outline', label: 'Beds', value: String(bedrooms) }
      : null,
    bathrooms != null
      ? { icon: 'water-outline', label: 'Baths', value: String(bathrooms) }
      : null,
    squareFootage != null
      ? {
          icon: 'resize-outline',
          label: 'Sqft',
          value: formatNumber(squareFootage),
        }
      : null,
    yearBuilt != null
      ? { icon: 'calendar-outline', label: 'Built', value: String(yearBuilt) }
      : null,
    lotSize != null
      ? {
          icon: 'map-outline',
          label: 'Lot',
          value: `${formatNumber(lotSize)} sqft`,
        }
      : null,
    propertyType
      ? { icon: 'home-outline', label: 'Type', value: propertyType }
      : null,
  ].filter(Boolean) as DetailChip[];

  return (
    <GlowCard style={styles.container}>
      {/* Status + price header */}
      <View style={styles.headerRow}>
        {listingStatus && (
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    listingStatus === 'FOR_SALE'
                      ? colors.green
                      : listingStatus === 'SOLD'
                        ? colors.red
                        : colors.gold,
                },
              ]}
            />
            <Text style={styles.statusText}>
              {formatStatus(listingStatus)}
            </Text>
          </View>
        )}
        {listPrice != null && (
          <Text style={styles.price}>{formatCurrency(listPrice)}</Text>
        )}
      </View>

      {/* Detail chips */}
      <View style={styles.chips}>
        {chips.map((chip) => (
          <View key={chip.label} style={styles.chip}>
            <Ionicons name={chip.icon} size={16} color={colors.accent} />
            <View>
              <Text style={styles.chipValue}>{chip.value}</Text>
              <Text style={styles.chipLabel}>{chip.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Days on market */}
      {daysOnMarket != null && (
        <View style={styles.domRow}>
          <Ionicons name="time-outline" size={14} color={colors.secondary} />
          <Text style={styles.domText}>
            {daysOnMarket} days on market
          </Text>
        </View>
      )}
    </GlowCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.panel,
    borderRadius: radius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.heading,
  },
  price: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.heading,
  },
  chipLabel: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.muted,
  },
  domRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  domText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
});
