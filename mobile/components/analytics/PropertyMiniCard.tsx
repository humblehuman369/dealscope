/**
 * PropertyMiniCard - Compact property header showing address and price
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency } from './calculations';

interface PropertyInfo {
  address: string;
  city?: string;
  state?: string;
  price: number;
  image?: string;
}

interface PropertyMiniCardProps {
  property: PropertyInfo;
  isDark?: boolean;
}

export function PropertyMiniCard({ property, isDark = true }: PropertyMiniCardProps) {
  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(7,23,46,0.03)',
      }
    ]}>
      <View style={[
        styles.thumbnail,
        { backgroundColor: isDark ? '#1a3a5c' : '#e5e7eb' }
      ]}>
        <Text style={styles.icon}>🏠</Text>
      </View>
      
      <View style={styles.info}>
        <Text 
          style={[styles.address, { color: isDark ? '#fff' : '#07172e' }]}
          numberOfLines={1}
        >
          {property.address}
        </Text>
        {property.city && property.state && (
          <Text style={[styles.location, { color: '#6b7280' }]}>
            {property.city}, {property.state}
          </Text>
        )}
        <Text style={[
          styles.price,
          { color: isDark ? '#4dd0e1' : '#007ea7' }
        ]}>
          {formatCurrency(property.price)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  address: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  location: {
    fontSize: 11,
    marginBottom: 2,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
  },
});

