import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../theme/colors';
import { formatCurrency } from '../../services/analytics';

interface NearbyProperty {
  id: string;
  address: string;
  lat: number;
  lng: number;
  monthlyProfit: number;
  strategy: string;
}

// Default region (South Florida)
const DEFAULT_REGION = {
  latitude: 26.6683,
  longitude: -80.2683,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [nearbyProperties, setNearbyProperties] = useState<NearbyProperty[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<NearbyProperty | null>(null);

  useEffect(() => {
    async function getLocation() {
      setIsLoadingLocation(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setIsLoadingLocation(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const newLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        setUserLocation(newLocation);
        
        // Update region to center on user location
        const newRegion = {
          ...newLocation,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        setRegion(newRegion);
        
        // Animate map to user location
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }
      } catch (error) {
        console.error('Error getting location:', error);
      } finally {
        setIsLoadingLocation(false);
      }
    }

    getLocation();
  }, []);

  const handlePropertyPress = (property: NearbyProperty) => {
    setSelectedProperty(property);
  };

  const handleViewDetails = () => {
    if (selectedProperty) {
      router.push(`/property/${encodeURIComponent(selectedProperty.address)}`);
    }
  };

  const handleCenterOnLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/property/${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        showsUserLocation
        showsMyLocationButton={false}
        initialRegion={region}
        onRegionChangeComplete={setRegion}
      >
        {nearbyProperties.map((property) => (
          <Marker
            key={property.id}
            coordinate={{ latitude: property.lat, longitude: property.lng }}
            onPress={() => handlePropertyPress(property)}
          >
            <View style={[
              styles.marker,
              property.monthlyProfit > 0 ? styles.markerProfit : styles.markerLoss,
              selectedProperty?.id === property.id && styles.markerSelected,
            ]}>
              <Text style={styles.markerText}>
                {formatCurrency(property.monthlyProfit)}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { paddingTop: insets.top + 8 }]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search address..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.gray[400]}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.gray[400]} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => router.push('/search')}
        >
          <Ionicons name="add" size={22} color={colors.primary[600]} />
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {isLoadingLocation && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary[600]} />
          <Text style={styles.loadingText}>Finding your location...</Text>
        </View>
      )}

      {/* My Location Button */}
      <TouchableOpacity
        style={[styles.locationButton, { bottom: insets.bottom + 120 }]}
        onPress={handleCenterOnLocation}
      >
        <Ionicons 
          name={userLocation ? "locate" : "locate-outline"} 
          size={22} 
          color={userLocation ? colors.primary[600] : colors.gray[400]} 
        />
      </TouchableOpacity>

      {/* Selected Property Card */}
      {selectedProperty && (
        <View style={[styles.propertyCard, { bottom: insets.bottom + 100 }]}>
          <View style={styles.propertyCardContent}>
            <Text style={styles.propertyAddress} numberOfLines={1}>
              {selectedProperty.address}
            </Text>
            <View style={styles.propertyMetrics}>
              <Text style={[
                styles.propertyProfit,
                selectedProperty.monthlyProfit > 0 
                  ? styles.profitText 
                  : styles.lossText
              ]}>
                {formatCurrency(selectedProperty.monthlyProfit)}/mo
              </Text>
              <Text style={styles.propertyStrategy}>
                {selectedProperty.strategy}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={handleViewDetails}
          >
            <Text style={styles.viewButtonText}>View</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Empty State - only show after location is loaded */}
      {!isLoadingLocation && nearbyProperties.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="compass-outline" size={40} color={colors.primary[400]} />
          <Text style={styles.emptyStateTitle}>Explore Properties</Text>
          <Text style={styles.emptyStateText}>
            Use the Scan tab to analyze properties near you, or search for a specific address
          </Text>
          <TouchableOpacity 
            style={styles.emptyStateButton}
            onPress={() => router.push('/search')}
          >
            <Ionicons name="search" size={18} color="#fff" />
            <Text style={styles.emptyStateButtonText}>Search Address</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[100],
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  searchContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontWeight: '400',
    fontSize: 15,
    color: colors.gray[900],
  },
  settingsButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingContainer: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    fontWeight: '500',
    fontSize: 14,
    color: colors.gray[600],
  },
  locationButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#fff',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  marker: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
  },
  markerProfit: {
    backgroundColor: colors.profit.light,
    borderColor: colors.profit.main,
  },
  markerLoss: {
    backgroundColor: colors.loss.light,
    borderColor: colors.loss.main,
  },
  markerSelected: {
    transform: [{ scale: 1.2 }],
  },
  markerText: {
    fontWeight: '700',
    fontSize: 11,
    color: colors.gray[800],
  },
  propertyCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  propertyCardContent: {
    flex: 1,
  },
  propertyAddress: {
    fontWeight: '600',
    fontSize: 15,
    color: colors.gray[900],
    marginBottom: 4,
  },
  propertyMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  propertyProfit: {
    fontWeight: '700',
    fontSize: 16,
  },
  profitText: {
    color: colors.profit.main,
  },
  lossText: {
    color: colors.loss.main,
  },
  propertyStrategy: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.gray[500],
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary[600],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  viewButtonText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#fff',
  },
  emptyState: {
    position: 'absolute',
    top: '50%',
    left: 24,
    right: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.98)',
    padding: 28,
    borderRadius: 20,
    transform: [{ translateY: -80 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyStateTitle: {
    fontWeight: '600',
    fontSize: 18,
    color: colors.gray[900],
    marginTop: 12,
    marginBottom: 8,
  },
  emptyStateText: {
    fontWeight: '400',
    fontSize: 14,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary[600],
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#fff',
  },
});
