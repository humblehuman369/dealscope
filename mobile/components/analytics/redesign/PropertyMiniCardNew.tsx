/**
 * PropertyMiniCardNew - Compact property header with photo carousel
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PropertyData } from './types';

interface PropertyMiniCardNewProps {
  property: PropertyData;
  isDark?: boolean;
  onExpand?: () => void;
}

export function PropertyMiniCardNew({ property, isDark = true, onExpand }: PropertyMiniCardNewProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  const photos = property.photos || (property.thumbnailUrl ? [property.thumbnailUrl] : []);
  const photoCount = property.photoCount || photos.length;

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const handlePrevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(7,23,46,0.02)',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }
    ]}>
      {/* Photo with carousel */}
      <View style={styles.photoContainer}>
        {photos.length > 0 ? (
          <>
            <Image
              source={{ uri: photos[currentPhotoIndex] }}
              style={styles.photo}
              resizeMode="cover"
            />
            
            {/* Photo navigation */}
            {photos.length > 1 && (
              <>
                <TouchableOpacity 
                  style={[styles.photoNav, styles.photoNavLeft]}
                  onPress={handlePrevPhoto}
                >
                  <Ionicons name="chevron-back" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.photoNav, styles.photoNavRight]}
                  onPress={handleNextPhoto}
                >
                  <Ionicons name="chevron-forward" size={16} color="#fff" />
                </TouchableOpacity>
              </>
            )}

            {/* Photo counter */}
            <View style={styles.photoCounter}>
              <Text style={styles.photoCounterText}>
                📷 {currentPhotoIndex + 1}/{photoCount}
              </Text>
            </View>
          </>
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Ionicons name="image-outline" size={24} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(7,23,46,0.3)'} />
          </View>
        )}

        {/* Photo dots */}
        {photos.length > 1 && (
          <View style={styles.photoDots}>
            {photos.slice(0, 5).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.photoDot,
                  index === currentPhotoIndex && styles.photoDotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Property info */}
      <View style={styles.info}>
        <Text style={[styles.address, { color: isDark ? '#fff' : '#07172e' }]} numberOfLines={1}>
          {property.address}
        </Text>
        <Text style={[styles.location, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
          {property.city}, {property.state} {property.zipCode}
        </Text>
        
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
            {formatCurrency(property.listPrice)}
          </Text>
          <Text style={[styles.priceLabel, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)' }]}>
            List Price
          </Text>
        </View>

        <Text style={[styles.specs, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(7,23,46,0.6)' }]}>
          {property.bedrooms} bd · {property.bathrooms} ba · {property.sqft?.toLocaleString()} sqft
        </Text>
      </View>

      {/* Expand button */}
      {onExpand && (
        <TouchableOpacity style={styles.expandBtn} onPress={onExpand}>
          <Ionicons name="chevron-forward" size={18} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)'} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  photoContainer: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  photoPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoNav: {
    position: 'absolute',
    top: '50%',
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoNavLeft: {
    left: 4,
  },
  photoNavRight: {
    right: 4,
  },
  photoCounter: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photoCounterText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  photoDots: {
    position: 'absolute',
    bottom: -8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  photoDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  photoDotActive: {
    backgroundColor: '#4dd0e1',
  },
  info: {
    flex: 1,
  },
  address: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  location: {
    fontSize: 11,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
  },
  priceLabel: {
    fontSize: 10,
  },
  specs: {
    fontSize: 11,
  },
  expandBtn: {
    padding: 8,
  },
});
