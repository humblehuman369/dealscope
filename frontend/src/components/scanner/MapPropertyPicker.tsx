'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  type MapMouseEvent,
} from '@vis.gl/react-google-maps';
import {
  X,
  MapPin,
  Loader2,
  Home,
  ArrowRight,
  Navigation,
  LocateFixed,
} from 'lucide-react';
import { reverseGeocodeProperty, type GeocodedProperty } from '@/lib/reverseGeocode';

const MAP_ID = 'DEMO_MAP_ID';
const PARCEL_ZOOM = 18;

interface MapPropertyPickerProps {
  userLat: number;
  userLng: number;
  /** The property the scanner originally matched (shown as a red pin) */
  scannedProperty: GeocodedProperty;
  onSelectProperty: (property: GeocodedProperty) => void;
  onClose: () => void;
}

/**
 * Full-screen map fallback that lets the user tap the correct property
 * when the GPS-based scan matched the wrong one.
 */
export function MapPropertyPicker({
  userLat,
  userLng,
  scannedProperty,
  onSelectProperty,
  onClose,
}: MapPropertyPickerProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const [selectedProperty, setSelectedProperty] = useState<GeocodedProperty | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [tapPin, setTapPin] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const handleMapClick = useCallback(
    async (e: MapMouseEvent) => {
      const latLng = e.detail.latLng;
      if (!latLng || !apiKey) return;

      const lat = Number(latLng.lat);
      const lng = Number(latLng.lng);

      setTapPin({ lat, lng });
      setSelectedProperty(null);
      setIsGeocoding(true);

      const result = await reverseGeocodeProperty(lat, lng, apiKey);
      setSelectedProperty(result);
      setIsGeocoding(false);
    },
    [apiKey],
  );

  const handleConfirm = () => {
    if (selectedProperty) {
      onSelectProperty(selectedProperty);
    }
  };

  const handleRecenter = () => {
    mapRef.current?.panTo({ lat: userLat, lng: userLng });
    mapRef.current?.setZoom(PARCEL_ZOOM);
  };

  if (!apiKey) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: 'var(--surface-base)' }}>
      {/* Header */}
      <div
        className="relative z-10 flex items-center justify-between px-4 py-3 pt-safe-header shadow-md"
        style={{
          background: 'var(--surface-card)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'var(--surface-elevated)' }}
          aria-label="Close map"
        >
          <X className="w-5 h-5" style={{ color: 'var(--text-label)' }} />
        </button>

        <h2
          className="text-sm font-semibold"
          style={{ color: 'var(--text-heading)' }}
        >
          Tap the correct property
        </h2>

        <div className="w-9" />
      </div>

      {/* Map */}
      <div className="flex-1 relative overflow-hidden">
        <APIProvider apiKey={apiKey} libraries={['marker']}>
          <Map
            defaultCenter={{ lat: userLat, lng: userLng }}
            defaultZoom={PARCEL_ZOOM}
            mapId={MAP_ID}
            mapTypeId="hybrid"
            gestureHandling="greedy"
            disableDefaultUI
            zoomControl
            style={{ width: '100%', height: '100%' }}
            clickableIcons={false}
            onClick={handleMapClick}
            onIdle={(e) => {
              if (e.map) mapRef.current = e.map;
            }}
          >
            {/* User location (blue pulse dot) */}
            <AdvancedMarker position={{ lat: userLat, lng: userLng }}>
              <div className="relative w-6 h-6">
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{ background: 'rgba(59, 130, 246, 0.3)' }}
                />
                <div
                  className="absolute inset-0.5 rounded-full"
                  style={{
                    background: '#3B82F6',
                    border: '2px solid #fff',
                    boxShadow: '0 0 6px rgba(59, 130, 246, 0.5)',
                  }}
                />
              </div>
            </AdvancedMarker>

            {/* Original scanned property (muted red pin) */}
            <AdvancedMarker
              position={{ lat: scannedProperty.lat, lng: scannedProperty.lng }}
            >
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shadow-md"
                style={{
                  background: 'rgba(239, 68, 68, 0.85)',
                  color: '#fff',
                  border: '1.5px solid rgba(255,255,255,0.6)',
                }}
              >
                <Navigation className="w-3 h-3" />
                Scanned
              </div>
            </AdvancedMarker>

            {/* Tap pin */}
            {tapPin && (
              <AdvancedMarker position={tapPin}>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
                  style={{
                    background: 'var(--accent-sky, #0EA5E9)',
                    border: '2.5px solid #fff',
                  }}
                >
                  <MapPin className="w-3.5 h-3.5 text-white" />
                </div>
              </AdvancedMarker>
            )}
          </Map>
        </APIProvider>

        {/* Re-center button */}
        <button
          onClick={handleRecenter}
          className="absolute bottom-4 right-4 w-11 h-11 rounded-full shadow-lg flex items-center justify-center"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-default)',
          }}
          aria-label="Re-center on my location"
        >
          <LocateFixed className="w-5 h-5" style={{ color: 'var(--accent-sky, #0EA5E9)' }} />
        </button>

        {/* Instruction hint (shown when nothing tapped yet) */}
        {!tapPin && !isGeocoding && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl"
              style={{
                background: 'rgba(30, 30, 30, 0.9)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <MapPin className="w-4 h-4" style={{ color: 'var(--accent-sky, #0EA5E9)' }} />
              Select any property on the map
            </div>
          </div>
        )}
      </div>

      {/* Bottom card: geocode result or loading */}
      {(tapPin || isGeocoding) && (
        <div
          className="relative z-20 px-4 pb-6 pt-4 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
          style={{
            background: 'var(--surface-card)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {isGeocoding ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2
                className="w-5 h-5 animate-spin"
                style={{ color: 'var(--accent-sky, #0EA5E9)' }}
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Looking up address...
              </span>
            </div>
          ) : selectedProperty ? (
            <>
              <div
                className="rounded-xl p-4 mb-4"
                style={{ background: 'var(--surface-elevated)' }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--accent-sky, #0EA5E9)' }}
                  >
                    <Home className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4
                      className="font-semibold truncate"
                      style={{ color: 'var(--text-heading)' }}
                    >
                      {selectedProperty.address}
                    </h4>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {selectedProperty.city}, {selectedProperty.state}{' '}
                      {selectedProperty.zip}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setTapPin(null);
                    setSelectedProperty(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-medium transition-colors"
                  style={{
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-body)',
                    background: 'var(--surface-card)',
                  }}
                >
                  Pick Another
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-white"
                  style={{ background: 'var(--accent-sky, #0EA5E9)' }}
                >
                  Analyze Property
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                No property found at this location. Try tapping closer to a building.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
