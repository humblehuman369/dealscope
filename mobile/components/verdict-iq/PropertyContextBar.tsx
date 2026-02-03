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
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: decisionGrade.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: decisionGrade.borderMedium,
    gap: 12,
  },
  photoContainer: {
    width: 56,
    height: 56,
    borderRadius: 6,
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
    gap: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  addressContainer: {
    flex: 1,
  },
  street: {
    fontSize: 14,
    fontWeight: '700',
    color: decisionGrade.textPrimary,
    lineHeight: 18,
  },
  city: {
    fontSize: 11,
    fontWeight: '600',
    color: decisionGrade.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '600',
    color: decisionGrade.textPrimary,
  },
  separator: {
    fontSize: 12,
    color: decisionGrade.borderStrong,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '700',
    color: decisionGrade.pacificTeal,
  },
});

export default PropertyContextBar;
