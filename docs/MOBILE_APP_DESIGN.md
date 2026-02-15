# DealGapIQ Mobile - Comprehensive Design Document

## Executive Summary

DealGapIQ Mobile transforms real estate investment analysis by enabling investors to **point their phone at any property and receive instant investment analytics**. This document outlines the architecture, technology stack, and implementation strategy for building a best-in-class mobile application.

---

## Table of Contents

1. [Vision & Core Features](#vision--core-features)
2. [Technology Stack](#technology-stack)
3. [Point-and-Scan Architecture](#point-and-scan-architecture)
4. [System Architecture](#system-architecture)
5. [Offline-First Strategy](#offline-first-strategy)
6. [API Integrations](#api-integrations)
7. [UI/UX Design Principles](#uiux-design-principles)
8. [Development Phases](#development-phases)
9. [Technical Specifications](#technical-specifications)

---

## 1. Vision & Core Features

### Mission Statement
> "Point. Scan. Invest with Confidence."

Enable real estate investors to make data-driven decisions instantly by pointing their phone at any property in the United States.

### Core Features

| Feature | Description | Priority |
|---------|-------------|----------|
| **Point-and-Scan** | Camera + GPS + Compass to identify properties | P0 |
| **Instant Analytics** | 6 investment strategies analyzed in <3 seconds | P0 |
| **GPS Auto-Detection** | Automatic location detection and nearby properties | P0 |
| **Interactive Maps** | Property visualization with investment overlays | P0 |
| **Offline Mode** | Full functionality without internet connection | P1 |
| **AR Property Overlay** | Augmented reality investment data display | P1 |
| **Property History** | Saved scans and analysis history | P1 |
| **Portfolio Tracker** | Track and manage investment properties | P2 |
| **Push Notifications** | Price changes, market alerts | P2 |

---

## 2. Technology Stack

### Recommended Framework: **React Native + Expo**

#### Why React Native + Expo?

| Factor | React Native + Expo | Flutter | Native (Swift/Kotlin) |
|--------|---------------------|---------|----------------------|
| **Code Sharing with Web** | 70-80% shared with existing Next.js | 0% | 0% |
| **Development Speed** | Fast (hot reload, Expo tooling) | Fast | Slow |
| **Native Module Access** | Excellent (Expo SDK) | Good | Full |
| **Camera/GPS/Compass** | expo-camera, expo-location, expo-sensors | Yes | Yes |
| **AR Support** | expo-three, ViroReact | ARCore/ARKit | Full |
| **Team Expertise** | Leverages existing React skills | New language | New languages |
| **Offline Support** | WatermelonDB, SQLite | Hive, SQLite | CoreData, Room |
| **App Store Ready** | EAS Build (iOS + Android) | Flutter build | Xcode/Android Studio |

### Core Dependencies

```json
{
  "dependencies": {
    // Core Framework
    "expo": "~51.0.0",
    "react-native": "0.74.0",
    
    // Navigation
    "@react-navigation/native": "^6.0.0",
    "@react-navigation/bottom-tabs": "^6.0.0",
    "@react-navigation/stack": "^6.0.0",
    
    // Camera & Sensors
    "expo-camera": "~15.0.0",
    "expo-location": "~17.0.0",
    "expo-sensors": "~13.0.0",
    
    // Maps & AR
    "react-native-maps": "^1.10.0",
    "expo-three": "~7.0.0",
    
    // State Management
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.5.0",
    
    // Offline Database
    "@nozbe/watermelondb": "^0.27.0",
    "expo-sqlite": "~14.0.0",
    
    // API & Networking
    "axios": "^1.6.0",
    
    // UI Components
    "react-native-reanimated": "~3.10.0",
    "react-native-gesture-handler": "~2.16.0",
    "@shopify/flash-list": "^1.6.0",
    
    // Charts & Visualization
    "react-native-svg": "^15.0.0",
    "victory-native": "^40.0.0"
  }
}
```

---

## 3. Point-and-Scan Architecture

### How It Works

The Point-and-Scan feature uses a sophisticated algorithm combining GPS, compass, and optional AR to identify the exact property a user is looking at.

```
┌─────────────────────────────────────────────────────────────────┐
│                    POINT-AND-SCAN PIPELINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Camera  │───▶│   GPS    │───▶│ Compass  │───▶│ Calculate │  │
│  │  Frame   │    │ Position │    │ Heading  │    │  Bearing  │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                        │         │
│                                                        ▼         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │ Display  │◀───│  Fetch   │◀───│  Match   │◀───│  Query   │  │
│  │ Results  │    │ Property │    │ Parcels  │    │ Parcels  │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Technical Implementation

#### Step 1: Capture User Position & Heading

```typescript
// hooks/usePropertyScanner.ts
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';

interface ScannerState {
  userLat: number;
  userLng: number;
  heading: number;        // Compass heading (0-360°)
  accuracy: number;       // GPS accuracy in meters
  isScanning: boolean;
}

export function usePropertyScanner() {
  const [state, setState] = useState<ScannerState>({
    userLat: 0,
    userLng: 0,
    heading: 0,
    accuracy: 0,
    isScanning: false,
  });

  useEffect(() => {
    // Subscribe to GPS updates
    const locationSub = Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 1,
      },
      (location) => {
        setState(prev => ({
          ...prev,
          userLat: location.coords.latitude,
          userLng: location.coords.longitude,
          accuracy: location.coords.accuracy ?? 10,
        }));
      }
    );

    // Subscribe to compass/magnetometer
    Magnetometer.setUpdateInterval(100);
    const magnetometerSub = Magnetometer.addListener((data) => {
      // Calculate heading from magnetometer data
      const heading = calculateHeading(data);
      setState(prev => ({ ...prev, heading }));
    });

    return () => {
      locationSub.then(sub => sub.remove());
      magnetometerSub.remove();
    };
  }, []);

  return state;
}

function calculateHeading(magnetometerData: { x: number; y: number; z: number }): number {
  const { x, y } = magnetometerData;
  let heading = Math.atan2(y, x) * (180 / Math.PI);
  
  // Normalize to 0-360
  if (heading < 0) heading += 360;
  
  return heading;
}
```

#### Step 2: Calculate Target Property Location

```typescript
// utils/geoCalculations.ts

/**
 * Calculate the GPS coordinates of a point at a given distance and bearing
 * from the user's position using the Haversine formula.
 */
export function calculateTargetPoint(
  userLat: number,
  userLng: number,
  heading: number,    // Compass heading in degrees
  distance: number    // Distance in meters (estimated or user-adjustable)
): { lat: number; lng: number } {
  const R = 6371000; // Earth's radius in meters
  
  const φ1 = userLat * Math.PI / 180;
  const λ1 = userLng * Math.PI / 180;
  const θ = heading * Math.PI / 180;
  const d = distance;

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(d / R) +
    Math.cos(φ1) * Math.sin(d / R) * Math.cos(θ)
  );
  
  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(d / R) * Math.cos(φ1),
    Math.cos(d / R) - Math.sin(φ1) * Math.sin(φ2)
  );

  return {
    lat: φ2 * 180 / Math.PI,
    lng: λ2 * 180 / Math.PI,
  };
}

/**
 * Generate a "scan cone" of possible target coordinates
 * to account for slight heading inaccuracies.
 */
export function generateScanCone(
  userLat: number,
  userLng: number,
  heading: number,
  minDistance: number = 10,    // Minimum distance to scan
  maxDistance: number = 100,   // Maximum distance to scan
  coneAngle: number = 15       // Half-angle of the cone in degrees
): Array<{ lat: number; lng: number; distance: number }> {
  const points: Array<{ lat: number; lng: number; distance: number }> = [];
  
  // Sample at different distances
  for (let d = minDistance; d <= maxDistance; d += 10) {
    // Sample at different angles within the cone
    for (let angle = -coneAngle; angle <= coneAngle; angle += 5) {
      const adjustedHeading = (heading + angle + 360) % 360;
      const point = calculateTargetPoint(userLat, userLng, adjustedHeading, d);
      points.push({ ...point, distance: d });
    }
  }
  
  return points;
}
```

#### Step 3: Query Property Parcels API

```typescript
// services/parcelLookup.ts
import axios from 'axios';

interface ParcelResult {
  apn: string;              // Assessor's Parcel Number
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  geometry: GeoJSON.Polygon;
  owner?: string;
  yearBuilt?: number;
  sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
}

/**
 * Query parcels within a bounding box or at specific coordinates.
 * Uses Regrid/Lightbox or similar parcel data API.
 */
export async function queryParcelsInArea(
  centerLat: number,
  centerLng: number,
  radiusMeters: number = 100
): Promise<ParcelResult[]> {
  // Calculate bounding box
  const latOffset = radiusMeters / 111000; // ~111km per degree latitude
  const lngOffset = radiusMeters / (111000 * Math.cos(centerLat * Math.PI / 180));
  
  const bbox = {
    minLat: centerLat - latOffset,
    maxLat: centerLat + latOffset,
    minLng: centerLng - lngOffset,
    maxLng: centerLng + lngOffset,
  };

  // Query parcel API (example using Regrid-style API)
  const response = await axios.get('/api/parcels/search', {
    params: {
      bbox: `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`,
      limit: 50,
    },
  });

  return response.data.parcels;
}

/**
 * Find the parcel that contains a specific point using
 * point-in-polygon calculation.
 */
export function findParcelAtPoint(
  lat: number,
  lng: number,
  parcels: ParcelResult[]
): ParcelResult | null {
  for (const parcel of parcels) {
    if (isPointInPolygon([lng, lat], parcel.geometry.coordinates[0])) {
      return parcel;
    }
  }
  return null;
}

/**
 * Ray casting algorithm for point-in-polygon test.
 */
function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if (
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }

  return inside;
}
```

#### Step 4: Complete Scan Flow

```typescript
// hooks/usePropertyScan.ts
import { useState, useCallback } from 'react';
import { usePropertyScanner } from './usePropertyScanner';
import { generateScanCone } from '../utils/geoCalculations';
import { queryParcelsInArea, findParcelAtPoint } from '../services/parcelLookup';
import { fetchPropertyAnalytics } from '../services/analytics';

interface ScanResult {
  property: PropertyData | null;
  analytics: InvestmentAnalytics | null;
  confidence: number;
  scanTime: number;
}

export function usePropertyScan() {
  const scanner = usePropertyScanner();
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const performScan = useCallback(async (estimatedDistance: number = 50) => {
    if (!scanner.userLat || !scanner.userLng) {
      setError('Unable to determine your location');
      return;
    }

    setIsScanning(true);
    setError(null);
    const startTime = Date.now();

    try {
      // Step 1: Generate scan cone based on current heading
      const scanPoints = generateScanCone(
        scanner.userLat,
        scanner.userLng,
        scanner.heading,
        10,
        estimatedDistance + 20,
        20 // 20° cone for better accuracy
      );

      // Step 2: Query parcels in the scan area
      const targetPoint = calculateTargetPoint(
        scanner.userLat,
        scanner.userLng,
        scanner.heading,
        estimatedDistance
      );
      
      const parcels = await queryParcelsInArea(
        targetPoint.lat,
        targetPoint.lng,
        100
      );

      // Step 3: Find the most likely property
      // Priority: center of scan cone first, then expand
      let matchedParcel = null;
      let confidence = 0;

      for (const point of scanPoints) {
        const parcel = findParcelAtPoint(point.lat, point.lng, parcels);
        if (parcel) {
          // Calculate confidence based on distance from center of cone
          const distanceFromCenter = Math.sqrt(
            Math.pow(point.lat - targetPoint.lat, 2) +
            Math.pow(point.lng - targetPoint.lng, 2)
          );
          const pointConfidence = Math.max(0, 1 - distanceFromCenter * 10000);
          
          if (pointConfidence > confidence) {
            matchedParcel = parcel;
            confidence = pointConfidence;
          }
        }
      }

      if (!matchedParcel) {
        throw new Error('No property found in scan direction');
      }

      // Step 4: Fetch full property analytics
      const analytics = await fetchPropertyAnalytics(matchedParcel.address);

      setResult({
        property: matchedParcel,
        analytics,
        confidence: Math.round(confidence * 100),
        scanTime: Date.now() - startTime,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  }, [scanner]);

  return {
    scanner,
    isScanning,
    result,
    error,
    performScan,
    clearResult: () => setResult(null),
  };
}
```

### Distance Estimation Methods

Since the phone cannot directly measure distance to a building, we use multiple approaches:

| Method | Description | Accuracy |
|--------|-------------|----------|
| **User Slider** | User adjusts estimated distance (10-200m) | High (user controlled) |
| **AR Depth** | ARKit/ARCore LiDAR on supported devices | Very High |
| **Building Detection** | ML model estimates building size/distance | Medium |
| **Street Width Heuristic** | Assume typical street width + setback | Low-Medium |
| **Multiple Parcel Match** | Show top 3 candidates, user selects | High |

---

## 4. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DealGapIQ Mobile                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      PRESENTATION LAYER                          │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │    │
│  │  │  Scan    │ │   Map    │ │ Property │ │ Portfolio│            │    │
│  │  │  Screen  │ │  Screen  │ │  Detail  │ │  Screen  │            │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                       BUSINESS LOGIC LAYER                        │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │    │
│  │  │   Scanner    │ │  Analytics   │ │    Sync      │              │    │
│  │  │   Service    │ │   Engine     │ │   Manager    │              │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                         DATA LAYER                                │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │    │
│  │  │ WatermelonDB │ │  API Client  │ │ Cache Layer  │              │    │
│  │  │  (Offline)   │ │  (Network)   │ │  (Memory)    │              │    │
│  │  └──────────────┘ └──────────────┘ └──────────────┘              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                      │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                       NATIVE MODULES                              │    │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │    │
│  │  │ Camera │ │  GPS   │ │Compass │ │  Maps  │ │  Push  │         │    │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘         │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND SERVICES                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │   DealGapIQ   │ │   Parcel     │ │  Property    │ │   Market     │   │
│  │     API      │ │   Data API   │ │   Data API   │ │   Data API   │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Navigation Structure

```typescript
// navigation/AppNavigator.tsx
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen 
        name="Scan" 
        component={ScanScreen}
        options={{
          tabBarIcon: ({ color }) => <CameraIcon color={color} />,
        }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{
          tabBarIcon: ({ color }) => <MapIcon color={color} />,
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ color }) => <ClockIcon color={color} />,
        }}
      />
      <Tab.Screen 
        name="Portfolio" 
        component={PortfolioScreen}
        options={{
          tabBarIcon: ({ color }) => <BriefcaseIcon color={color} />,
        }}
      />
      <Tab.Screen 
        name="More" 
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color }) => <MenuIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Main" 
        component={MainTabs} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PropertyDetail" 
        component={PropertyDetailScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen 
        name="StrategyDetail" 
        component={StrategyDetailScreen}
      />
      <Stack.Screen 
        name="Comparison" 
        component={ComparisonScreen}
      />
    </Stack.Navigator>
  );
}
```

---

## 5. Offline-First Strategy

### Database Schema (WatermelonDB)

```typescript
// database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // Scanned properties cache
    tableSchema({
      name: 'scanned_properties',
      columns: [
        { name: 'address', type: 'string', isIndexed: true },
        { name: 'lat', type: 'number' },
        { name: 'lng', type: 'number' },
        { name: 'property_data', type: 'string' }, // JSON
        { name: 'analytics_data', type: 'string' }, // JSON
        { name: 'scanned_at', type: 'number', isIndexed: true },
        { name: 'is_favorite', type: 'boolean' },
        { name: 'notes', type: 'string' },
      ],
    }),
    
    // User portfolio
    tableSchema({
      name: 'portfolio_properties',
      columns: [
        { name: 'address', type: 'string' },
        { name: 'purchase_price', type: 'number' },
        { name: 'purchase_date', type: 'number' },
        { name: 'strategy', type: 'string' },
        { name: 'property_data', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'synced_at', type: 'number' },
      ],
    }),
    
    // Cached market data by zip code
    tableSchema({
      name: 'market_data_cache',
      columns: [
        { name: 'zip_code', type: 'string', isIndexed: true },
        { name: 'rent_data', type: 'string' }, // JSON
        { name: 'str_data', type: 'string' },  // JSON
        { name: 'fetched_at', type: 'number' },
        { name: 'expires_at', type: 'number' },
      ],
    }),
    
    // Pre-cached parcels for frequently visited areas
    tableSchema({
      name: 'cached_parcels',
      columns: [
        { name: 'apn', type: 'string', isIndexed: true },
        { name: 'address', type: 'string', isIndexed: true },
        { name: 'lat', type: 'number' },
        { name: 'lng', type: 'number' },
        { name: 'geometry', type: 'string' }, // GeoJSON
        { name: 'property_details', type: 'string' },
        { name: 'geohash', type: 'string', isIndexed: true }, // For spatial queries
      ],
    }),
    
    // Sync queue for offline changes
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'action', type: 'string' }, // 'create', 'update', 'delete'
        { name: 'table_name', type: 'string' },
        { name: 'record_id', type: 'string' },
        { name: 'payload', type: 'string' }, // JSON
        { name: 'created_at', type: 'number' },
        { name: 'attempts', type: 'number' },
      ],
    }),
  ],
});
```

### Sync Strategy

```typescript
// services/syncManager.ts
import NetInfo from '@react-native-community/netinfo';
import { database } from '../database';

class SyncManager {
  private isOnline = true;
  private syncInProgress = false;

  constructor() {
    // Monitor network status
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      // Trigger sync when coming back online
      if (wasOffline && this.isOnline) {
        this.performSync();
      }
    });
  }

  async performSync() {
    if (this.syncInProgress || !this.isOnline) return;
    
    this.syncInProgress = true;
    
    try {
      // 1. Push local changes to server
      await this.pushLocalChanges();
      
      // 2. Pull server updates
      await this.pullServerUpdates();
      
      // 3. Refresh market data cache
      await this.refreshMarketDataCache();
      
    } finally {
      this.syncInProgress = false;
    }
  }

  private async pushLocalChanges() {
    const syncQueue = await database
      .get('sync_queue')
      .query()
      .fetch();

    for (const item of syncQueue) {
      try {
        await this.syncItem(item);
        await item.destroyPermanently();
      } catch (error) {
        // Increment retry count
        await item.update(record => {
          record.attempts += 1;
        });
      }
    }
  }

  private async syncItem(item: SyncQueueItem) {
    const payload = JSON.parse(item.payload);
    
    switch (item.action) {
      case 'create':
      case 'update':
        await api.post(`/sync/${item.table_name}`, payload);
        break;
      case 'delete':
        await api.delete(`/sync/${item.table_name}/${item.record_id}`);
        break;
    }
  }
}

export const syncManager = new SyncManager();
```

### Geohash-Based Parcel Caching

For efficient offline parcel lookups, we use geohash indexing:

```typescript
// utils/geohash.ts
import geohash from 'ngeohash';

/**
 * Generate geohash for a coordinate.
 * Precision 7 = ~76m x 76m cell
 * Precision 8 = ~19m x 19m cell
 */
export function encodeGeohash(lat: number, lng: number, precision: number = 7): string {
  return geohash.encode(lat, lng, precision);
}

/**
 * Get all neighbor geohashes for spatial queries.
 */
export function getNeighborHashes(hash: string): string[] {
  return geohash.neighbors(hash);
}

/**
 * Pre-cache parcels for an area.
 */
export async function preCacheParcels(
  centerLat: number,
  centerLng: number,
  radiusKm: number = 2
) {
  const centerHash = encodeGeohash(centerLat, centerLng, 6);
  const area = geohash.decode_bbox(centerHash);
  
  // Fetch parcels for the area
  const parcels = await api.get('/parcels/bulk', {
    params: {
      bbox: `${area.minlng},${area.minlat},${area.maxlng},${area.maxlat}`,
    },
  });
  
  // Store in local database with geohash index
  await database.write(async () => {
    for (const parcel of parcels) {
      const hash = encodeGeohash(parcel.lat, parcel.lng, 8);
      await database.get('cached_parcels').create(record => {
        record.apn = parcel.apn;
        record.address = parcel.address;
        record.lat = parcel.lat;
        record.lng = parcel.lng;
        record.geometry = JSON.stringify(parcel.geometry);
        record.geohash = hash;
      });
    }
  });
}
```

---

## 6. API Integrations

### Required External APIs

| API | Purpose | Provider Options |
|-----|---------|-----------------|
| **Parcel/Property Data** | APN, boundaries, owner info | Regrid, ATTOM, CoreLogic, Lightbox |
| **Property Details** | Beds, baths, sqft, year built | ATTOM, Zillow, Redfin API |
| **Rental Estimates** | Market rent data | Rentometer, Zillow, HUD FMR |
| **STR Data** | Short-term rental performance | AirDNA, Mashvisor |
| **Geocoding** | Address ↔ Coordinates | Google Maps, Mapbox, HERE |
| **Maps Tiles** | Map visualization | Mapbox, Google Maps |
| **Mortgage Rates** | Current interest rates | Freddie Mac, Bankrate |

### API Gateway Architecture

```typescript
// services/api/gateway.ts
import axios from 'axios';
import { cacheManager } from '../cache';

const API_BASE_URL = 'https://api.dealgapiq.com/v1';

class APIGateway {
  private client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
  });

  // Single endpoint for property analysis
  async analyzeProperty(address: string): Promise<PropertyAnalysis> {
    // Check cache first
    const cached = await cacheManager.get(`analysis:${address}`);
    if (cached) return cached;

    const response = await this.client.post('/analyze', { address });
    
    // Cache for 24 hours
    await cacheManager.set(`analysis:${address}`, response.data, 86400);
    
    return response.data;
  }

  // Parcel lookup by coordinates
  async lookupParcelByCoords(lat: number, lng: number): Promise<ParcelData> {
    const response = await this.client.get('/parcels/lookup', {
      params: { lat, lng },
    });
    return response.data;
  }

  // Bulk parcel data for area caching
  async getBulkParcels(bbox: BoundingBox): Promise<ParcelData[]> {
    const response = await this.client.get('/parcels/bulk', {
      params: {
        minLat: bbox.minLat,
        maxLat: bbox.maxLat,
        minLng: bbox.minLng,
        maxLng: bbox.maxLng,
      },
    });
    return response.data;
  }

  // Market data by location
  async getMarketData(zipCode: string): Promise<MarketData> {
    const cached = await cacheManager.get(`market:${zipCode}`);
    if (cached) return cached;

    const response = await this.client.get(`/market/${zipCode}`);
    
    // Cache for 7 days
    await cacheManager.set(`market:${zipCode}`, response.data, 604800);
    
    return response.data;
  }
}

export const apiGateway = new APIGateway();
```

---

## 7. UI/UX Design Principles

### Design System

#### Color Palette

```typescript
// theme/colors.ts
export const colors = {
  // Primary - Brand Blue (matches web app)
  primary: {
    50: '#e6f0fe',
    100: '#cce1fd',
    200: '#99c3fb',
    300: '#66a5f9',
    400: '#3387f7',
    500: '#0465f2',  // Main brand blue
    600: '#0354d1',
    700: '#0243b0',
    800: '#02328f',
    900: '#01216e',
  },
  
  // Accent - Electric Cyan
  accent: {
    500: '#00e5ff',  // Main accent cyan
  },
  
  // Navy - Dark backgrounds & text
  navy: {
    900: '#07172e',  // Primary dark navy
  },
  
  // Profit/Positive
  profit: {
    light: '#d1fae5',
    main: '#22c55e',
    dark: '#16a34a',
  },
  
  // Loss/Negative
  loss: {
    light: '#ffe4e6',
    main: '#ef4444',
    dark: '#dc2626',
  },
  
  // Neutral Gray - Cool tones
  gray: {
    50: '#f8fafc',
    100: '#e1e8ed',  // Icy Silver
    200: '#d1d9e0',
    300: '#aab2bd',  // Cool Gray
    400: '#8b95a2',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // Strategy colors
  strategies: {
    longTermRental: '#0465f2',  // Brand blue
    shortTermRental: '#8b5cf6',
    brrrr: '#f59e0b',
    fixAndFlip: '#ef4444',
    houseHack: '#00e5ff',  // Accent cyan
    wholesale: '#22c55e',
  },
};
```

#### Typography

```typescript
// theme/typography.ts
export const typography = {
  fontFamily: {
    sans: 'Inter',
    mono: 'JetBrains Mono',
  },
  
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};
```

### Key Screens

#### 1. Scan Screen (Home)

```
┌─────────────────────────────────────┐
│ ◀ DealGapIQ            📍 Wellington │
├─────────────────────────────────────┤
│                                      │
│         ┌─────────────────┐          │
│         │                 │          │
│         │    CAMERA       │          │
│         │    VIEWFINDER   │          │
│         │                 │          │
│         │   ╔═══════╗     │          │
│         │   ║ SCAN  ║     │          │
│         │   ║TARGET ║     │          │
│         │   ╚═══════╝     │          │
│         │                 │          │
│         └─────────────────┘          │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │ Distance: ●────────────○ 50m   │ │
│  └─────────────────────────────────┘ │
│                                      │
│        ┌──────────────────┐          │
│        │   🔍 SCAN NOW    │          │
│        └──────────────────┘          │
│                                      │
│  Heading: 127° SE    GPS: ± 3m      │
├─────────────────────────────────────┤
│  🎯 Scan  │  🗺 Map  │  📋 History  │
└─────────────────────────────────────┘
```

#### 2. Scan Result (Bottom Sheet)

```
┌─────────────────────────────────────┐
│ ─────────── (drag handle)           │
├─────────────────────────────────────┤
│                                      │
│  3788 Moon Bay Cir, Wellington, FL   │
│  5 bed · 3 bath · 3,172 sqft         │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │ Long-Term Rental          TOP   │ │
│  │ $3,752/mo cash flow  29.8% CoC  │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │ Short-Term Rental               │ │
│  │ $6,872/mo cash flow  54.5% CoC  │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │ BRRRR                           │ │
│  │ $3,714/mo cash flow  25.1% CoC  │ │
│  └─────────────────────────────────┘ │
│                                      │
│  ┌───────────────────────────────┐   │
│  │       View Full Analysis       │   │
│  └───────────────────────────────┘   │
│                                      │
│  ❤️ Save    📤 Share    📝 Notes    │
│                                      │
└─────────────────────────────────────┘
```

#### 3. Map Screen

```
┌─────────────────────────────────────┐
│ 🔍 Search address...         ⚙️     │
├─────────────────────────────────────┤
│                                      │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   │      🏠 $3,752              │   │
│   │           ●                 │   │
│   │    📍                       │   │
│   │         🏠 $2,100           │   │
│   │              ●              │   │
│   │                             │   │
│   │    🏠 -$500                 │   │
│   │         ●                   │   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                      │
│  ┌─────────────────────────────────┐ │
│  │ Strategy: Long-Term ▼           │ │
│  │ Filter: Cash Flow $1,000+ ▼     │ │
│  └─────────────────────────────────┘ │
│                                      │
├─────────────────────────────────────┤
│  🎯 Scan  │  🗺 Map  │  📋 History  │
└─────────────────────────────────────┘
```

### Interaction Patterns

1. **Haptic Feedback**: Vibration on successful scan, button presses
2. **Pull-to-Refresh**: Update property data and market info
3. **Swipe Actions**: Swipe cards to save/dismiss
4. **Bottom Sheets**: Progressive disclosure of property details
5. **Gesture Navigation**: Pinch-zoom on maps and charts

---

## 8. Development Phases

### Phase 1: Foundation (Weeks 1-4)
**Goal**: Core scanning functionality with basic analytics

- [ ] Expo project setup with navigation
- [ ] Camera integration with preview
- [ ] GPS and compass sensor integration
- [ ] Basic scan-to-address flow
- [ ] Property analytics API integration
- [ ] Simple results display
- [ ] Basic offline storage

**Deliverable**: App that can scan and show investment analytics for a property

### Phase 2: Enhancement (Weeks 5-8)
**Goal**: Full feature parity with web app

- [ ] Complete 6-strategy analysis views
- [ ] Interactive charts and projections
- [ ] Assumptions adjustment UI
- [ ] Map integration with property markers
- [ ] Scan history and favorites
- [ ] Pull-to-refresh and real-time updates
- [ ] Enhanced offline mode with sync

**Deliverable**: Feature-complete mobile app

### Phase 3: Polish (Weeks 9-10)
**Goal**: Production-ready quality

- [ ] Performance optimization
- [ ] Error handling and edge cases
- [ ] Accessibility compliance
- [ ] Push notifications
- [ ] App Store assets and metadata
- [ ] Beta testing and feedback integration

**Deliverable**: App Store submission ready

### Phase 4: Advanced Features (Weeks 11-16)
**Goal**: Differentiated features

- [ ] AR property overlay (optional)
- [ ] Portfolio tracking
- [ ] Property comparison
- [ ] Market alerts
- [ ] Social sharing
- [ ] Integration with property listing sites

**Deliverable**: Premium mobile experience

---

## 9. Technical Specifications

### Device Requirements

| Platform | Minimum | Recommended |
|----------|---------|-------------|
| **iOS** | iOS 14.0+ | iOS 16.0+ |
| **Android** | API 24 (Android 7.0) | API 31+ (Android 12) |
| **RAM** | 2GB | 4GB+ |
| **Storage** | 100MB app + 500MB cache | 2GB+ cache |
| **GPS** | Required | High-accuracy GPS |
| **Compass** | Required | True-heading support |
| **Camera** | Required | Any resolution |
| **Network** | Optional (offline mode) | 4G/5G/WiFi |

### Performance Targets

| Metric | Target |
|--------|--------|
| App Launch (cold) | < 2 seconds |
| Scan to Results | < 3 seconds |
| Map Load | < 1 second |
| Offline Scan | < 1 second (cached data) |
| Memory Usage | < 150MB average |
| Battery Impact | < 5% per hour (active scanning) |

### Security Requirements

1. **Data at Rest**: AES-256 encryption for local database
2. **Data in Transit**: TLS 1.3 for all API calls
3. **Authentication**: OAuth 2.0 + biometric unlock
4. **API Keys**: Stored in secure enclave, not in code
5. **PII Handling**: Minimal collection, user-controlled deletion

---

## Appendix A: File Structure

```
mobile/
├── app.json
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
│
├── app/
│   ├── _layout.tsx           # Root layout
│   ├── index.tsx             # Entry point
│   │
│   ├── (tabs)/
│   │   ├── _layout.tsx       # Tab navigator
│   │   ├── scan.tsx          # Scan screen
│   │   ├── map.tsx           # Map screen
│   │   ├── history.tsx       # Scan history
│   │   ├── portfolio.tsx     # Portfolio
│   │   └── settings.tsx      # Settings
│   │
│   └── property/
│       ├── [address].tsx     # Property detail
│       └── compare.tsx       # Property comparison
│
├── components/
│   ├── ui/                   # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── BottomSheet.tsx
│   │   └── ...
│   │
│   ├── scanner/              # Scanning components
│   │   ├── CameraView.tsx
│   │   ├── ScanTarget.tsx
│   │   ├── CompassDisplay.tsx
│   │   └── DistanceSlider.tsx
│   │
│   ├── property/             # Property components
│   │   ├── PropertyCard.tsx
│   │   ├── StrategyCard.tsx
│   │   ├── MetricsTable.tsx
│   │   └── ...
│   │
│   └── charts/               # Chart components
│       ├── CashFlowChart.tsx
│       ├── EquityChart.tsx
│       └── ...
│
├── hooks/
│   ├── usePropertyScanner.ts
│   ├── usePropertyScan.ts
│   ├── useLocation.ts
│   ├── useCompass.ts
│   ├── useOfflineSync.ts
│   └── ...
│
├── services/
│   ├── api/
│   │   ├── gateway.ts
│   │   ├── properties.ts
│   │   └── parcels.ts
│   │
│   ├── analytics/
│   │   ├── calculations.ts
│   │   └── strategies.ts
│   │
│   └── sync/
│       └── syncManager.ts
│
├── database/
│   ├── schema.ts
│   ├── models/
│   │   ├── ScannedProperty.ts
│   │   ├── PortfolioProperty.ts
│   │   └── CachedParcel.ts
│   └── migrations/
│
├── utils/
│   ├── geoCalculations.ts
│   ├── geohash.ts
│   ├── formatters.ts
│   └── ...
│
├── theme/
│   ├── colors.ts
│   ├── typography.ts
│   └── spacing.ts
│
└── assets/
    ├── images/
    ├── icons/
    └── fonts/
```

---

## Appendix B: API Endpoints (Backend Requirements)

The mobile app requires these backend endpoints:

```yaml
# Property Analysis
POST /api/v1/analyze
  body: { address: string }
  response: { property, strategies, analytics }

# Parcel Lookup
GET /api/v1/parcels/lookup
  params: { lat, lng }
  response: { apn, address, geometry, details }

GET /api/v1/parcels/bulk
  params: { minLat, maxLat, minLng, maxLng }
  response: { parcels: [...] }

# Market Data
GET /api/v1/market/{zipCode}
  response: { rentals, str, appreciation, taxes }

# User Data (authenticated)
GET /api/v1/user/portfolio
POST /api/v1/user/portfolio
DELETE /api/v1/user/portfolio/{id}

GET /api/v1/user/scans
POST /api/v1/user/scans
DELETE /api/v1/user/scans/{id}

# Sync
POST /api/v1/sync/push
  body: { changes: [...] }
  
GET /api/v1/sync/pull
  params: { lastSyncedAt }
  response: { changes: [...] }
```

---

## Conclusion

This design document provides a comprehensive blueprint for building DealGapIQ Mobile - a best-in-class real estate investment analysis app with innovative point-and-scan capabilities. The architecture prioritizes:

1. **User Experience**: Instant results with minimal interaction
2. **Reliability**: Offline-first design ensures functionality anywhere
3. **Performance**: Optimized for mobile hardware and networks
4. **Scalability**: Modular architecture supports future enhancements
5. **Code Reuse**: Maximizes shared logic with web application

The phased approach allows for iterative development with continuous user feedback, ensuring the final product meets real investor needs in the field.

---

*Document Version: 1.0*
*Last Updated: December 2024*
*Author: DealGapIQ Engineering Team*

