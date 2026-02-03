/**
 * PropertyContextBar Component - Decision-Grade UI
 * Photo thumbnail + Address + Status badge
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { decisionGrade } from '../../theme/colors';
import { rf, rs } from './responsive';

export type PropertyStatus = 'off-market' | 'active' | 'pending';

export interface PropertyContextData {
  street: string;
  city: string;
  state: string;
  zip: string;
  beds: number;
  baths: number;
  sqft: number;
  price: number;
  status: PropertyStatus;
  image?: string;
}

interface PropertyContextBarProps {
  property: PropertyContextData;
}

const getStatusStyles = (status: PropertyStatus) => {
  switch (status) {
    case 'off-market':
      return {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
        textColor: decisionGrade.negative,
        label: 'OFF-MARKET',
      };
    case 'active':
      return {
        backgroundColor: decisionGrade.bgSelected,
        borderColor: decisionGrade.pacificTeal,
        textColor: decisionGrade.pacificTeal,
        label: 'ACTIVE',
      };
    case 'pending':
      return {
        backgroundColor: '#FEF3C7',
        borderColor: decisionGrade.caution,
        textColor: decisionGrade.caution,
        label: 'PENDING',
      };
  }
};

const formatPrice = (price: number): string => {
  return '$' + price.toLocaleString();
};

export function PropertyContextBar({ property }: PropertyContextBarProps) {
  const statusStyles = getStatusStyles(property.status);

  return (
    <View style={styles.container}>
      {/* Property Photo */}
      <View style={styles.photoContainer}>
        {property.image ? (
          <Image source={{ uri: property.image }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="home" size={24} color={decisionGrade.borderStrong} />
          </View>
        )}
      </View>

      {/* Property Info */}
      <View style={styles.infoContainer}>
        {/* Address Row with Status */}
        <View style={styles.addressRow}>
          <View style={styles.addressContainer}>
            <Text style={styles.street}>{property.street}</Text>
            <Text style={styles.city}>
              {property.city}, {property.state} {property.zip}
            </Text>
          </View>
          
          {/* Status Badge - Right Justified */}
          <View style={[
            styles.statusBadge,
            {
              backgroundColor: statusStyles.backgroundColor,
              borderColor: statusStyles.borderColor,
            }
          ]}>
            <View style={[styles.statusDot, { backgroundColor: statusStyles.textColor }]} />
            <Text style={[styles.statusText, { color: statusStyles.textColor }]}>
              {statusStyles.label}
            </Text>
          </View>
        </View>

        {/* Property Details */}
        <View style={styles.detailsRow}>
          <Text style={styles.detailText}>{property.beds} Beds</Text>
          <Text style={styles.separator}>|</Text>
          <Text style={styles.detailText}>{property.baths} Baths</Text>
          <Text style={styles.separator}>|</Text>
          <Text style={styles.detailText}>{property.sqft.toLocaleString()} SqFt</Text>
          <Text style={styles.separator}>|</Text>
          <Text style={styles.priceText}>{formatPrice(property.price)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: rs(12),
    paddingHorizontal: rs(16),
    backgroundColor: decisionGrade.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: decisionGrade.borderMedium,
    gap: rs(12),
  },
  photoContainer: {
    width: rs(56),
    height: rs(56),
    borderRadius: rs(6),
    overflow: 'hidden',
    backgroundColor: decisionGrade.bgSecondary,
    borderWidth: 1,
    borderColor: decisionGrade.borderMedium,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    gap: rs(4),
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: rs(8),
  },
  addressContainer: {
    flex: 1,
  },
  street: {
    fontSize: rf(14),
    fontWeight: '700',
    color: decisionGrade.textPrimary,
    lineHeight: rf(18),
  },
  city: {
    fontSize: rf(11),
    fontWeight: '600',
    color: decisionGrade.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingVertical: rs(3),
    paddingHorizontal: rs(8),
    borderRadius: rs(4),
    borderWidth: 1,
  },
  statusDot: {
    width: rs(5),
    height: rs(5),
    borderRadius: rs(2.5),
  },
  statusText: {
    fontSize: rf(9),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    marginTop: rs(2),
    flexWrap: 'wrap',
  },
  detailText: {
    fontSize: rf(11),
    fontWeight: '600',
    color: decisionGrade.textPrimary,
  },
  separator: {
    fontSize: rf(11),
    color: decisionGrade.borderStrong,
  },
  priceText: {
    fontSize: rf(12),
    fontWeight: '700',
    color: decisionGrade.pacificTeal,
  },
});

export default PropertyContextBar;
