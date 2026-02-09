'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutGrid,
  MapPin,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  Map,
  ScanLine,
  User,
  Compass
} from 'lucide-react';
import { useSession, useLogout } from '@/hooks/useSession';
import { useAuthModal } from '@/hooks/useAuthModal';
import { usePropertyScan } from '@/hooks/usePropertyScan';
import { DistanceSlider } from '@/components/scanner/DistanceSlider';
import { ScanTarget } from '@/components/scanner/ScanTarget';
import { CompassDisplay } from '@/components/scanner/CompassDisplay';
import { ScanResultSheet } from '@/components/scanner/ScanResultSheet';
import { getCardinalDirection } from '@/lib/geoCalculations';
import { InvestIQHomepage } from '@/components/landing';

export default function HomePage() {
  const [mode, setMode] = useState<'landing' | 'camera'>('landing');

  // Show camera scanner view
  if (mode === 'camera') {
    return <MobileScannerView onSwitchMode={() => setMode('landing')} />;
  }

  // Use the new InvestIQ homepage
  return <InvestIQHomepage onPointAndScan={() => setMode('camera')} />;
}

/**
 * Mobile Camera Scanner View
 */
function MobileScannerView({ onSwitchMode }: { onSwitchMode: () => void }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [distance, setDistance] = useState(50);
  const [manualHeading, setManualHeading] = useState<number | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const scanner = usePropertyScan();

  // Handle address search - uses new IQ Verdict flow
  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;
    
    setIsSearching(true);
    try {
      // Navigate to IQ Analyzing screen (new IQ Verdict flow)
      router.push(`/analyzing?address=${encodeURIComponent(addressInput.trim())}`);
    } catch (error) {
      console.error('Search error:', error);
      setIsSearching(false);
    }
  };
  const { user, isAuthenticated } = useSession();
  const { openAuthModal } = useAuthModal();
  const logoutMutation = useLogout();

  // Handle "Use your current location" for desktop users without camera
  const handleUseCurrentLocation = async () => {
    setIsGettingLocation(true);
    
    try {
      // Get user's current GPS position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      
      const { latitude, longitude } = position.coords;
      
      // Use Google Maps reverse geocode to find property at location
      const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude.toFixed(6)},${longitude.toFixed(6)}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results?.length > 0) {
        // Get the formatted address
        const result = data.results[0];
        const address = result.formatted_address;
        
        // Navigate to IQ Analyzing screen (new IQ Verdict flow)
        router.push(`/analyzing?address=${encodeURIComponent(address)}`);
      } else {
        throw new Error('Could not find an address at your location');
      }
    } catch (error) {
      console.error('Location error:', error);
      // If geolocation fails, show a message but still let them use the app
      if (error instanceof GeolocationPositionError) {
        if (error.code === error.PERMISSION_DENIED) {
          alert('Location access denied. Please enable location services and try again, or use the address search.');
        } else {
          alert('Could not determine your location. Please try the address search instead.');
        }
      } else {
        alert('Could not find a property at your location. Please try the address search.');
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
        }
      } catch (error) {
        console.error('Camera error:', error);
        if (error instanceof Error) {
          if (error.name === 'NotAllowedError') {
            setCameraError('Camera permission denied. Please enable camera access in your browser settings.');
          } else if (error.name === 'NotFoundError') {
            setCameraError('No camera found. Please use a device with a camera.');
          } else {
            setCameraError('Unable to access camera. Please try again.');
          }
        }
      }
    }

    startCamera();

    if (scanner.hasCompass && !scanner.heading) {
      scanner.requestOrientationPermission();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [scanner]);

  const handleScan = async () => {
    if (scanner.heading === null && scanner.isOrientationSupported) {
      await scanner.requestOrientationPermission();
    }
    await scanner.performScan(distance, manualHeading ?? undefined);
  };

  const handleViewDetails = () => {
    if (scanner.result?.property) {
      const address = [
        scanner.result.property.address,
        scanner.result.property.city,
        scanner.result.property.state,
        scanner.result.property.zip
      ].filter(Boolean).join(', ');
      
      // Navigate to IQ Analyzing screen (new IQ Verdict flow)
      router.push(`/analyzing?address=${encodeURIComponent(address)}`);
    }
  };

  if (cameraError) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          {/* Animated location pulse effect */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-[#4dd0e1]/20 animate-ping"></div>
            <div className="absolute inset-2 rounded-full bg-[#4dd0e1]/30 animate-pulse"></div>
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#4dd0e1] to-[#007ea7] flex items-center justify-center shadow-lg shadow-[#4dd0e1]/30">
              <MapPin className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3">Experience Instant Analytics</h2>
          <p className="text-gray-300 mb-2">
            Camera not available on this device,<br />
            but you can still see the magic!
          </p>
          <p className="text-gray-400 text-sm mb-8">
            We&apos;ll use your GPS to find properties near you<br />
            and show you our instant property analysis.
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={handleUseCurrentLocation}
              disabled={isGettingLocation}
              className="w-full py-4 px-6 bg-gradient-to-r from-[#4dd0e1] to-gray-900 text-white rounded-xl font-bold text-lg hover:from-[#5dd8e8] hover:to-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isGettingLocation ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Finding your location...
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5" />
                  Use your current location
                </>
              )}
            </button>
            {!showAddressSearch ? (
              <button
                onClick={() => setShowAddressSearch(true)}
                className="w-full py-3 px-6 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                Search by Address Instead
              </button>
            ) : (
              <form onSubmit={handleAddressSearch} className="w-full">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value)}
                      placeholder="Enter property address..."
                      className="w-full py-3 pl-10 pr-4 bg-gray-800 text-white rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-[#4dd0e1]"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!addressInput.trim() || isSearching}
                    className="px-6 py-3 bg-[#4dd0e1] text-white rounded-xl font-bold hover:bg-[#3dc0d1] transition-colors disabled:opacity-50"
                  >
                    {isSearching ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Go'
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddressSearch(false)}
                  className="w-full mt-2 py-2 text-gray-400 text-sm hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
          
          <p className="text-gray-500 text-xs mt-6">
            ✨ Try the mobile app for the full Point & Scan experience
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Address Search Overlay */}
      {showAddressSearch && (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4 text-center">Search by Address</h2>
            <form onSubmit={handleAddressSearch}>
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Enter property address..."
                  className="w-full py-4 pl-12 pr-4 bg-gray-800 text-white rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!addressInput.trim() || isSearching}
                className="w-full py-4 bg-brand-500 text-white rounded-xl font-bold text-lg hover:bg-[#0354d1] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  'Analyze Property'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddressSearch(false);
                  setAddressInput('');
                }}
                className="w-full mt-3 py-3 text-gray-400 font-medium hover:text-white transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="absolute inset-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pt-safe bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg font-display">
              Invest<span className="text-brand-500">IQ</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {scanner.isLocationReady && (
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                <MapPin className="w-3 h-3 text-accent-500" />
                <span className="text-white text-xs">GPS Active</span>
              </div>
            )}
            {isAuthenticated && user ? (
              <>
                <button
                  onClick={() => router.push('/search')}
                  className="flex items-center gap-1 bg-brand-500/80 backdrop-blur-sm px-3 py-1.5 rounded-full"
                >
                  <LayoutGrid className="w-3 h-3 text-white" />
                  <span className="text-white text-xs font-medium">Dashboard</span>
                </button>
                <button
                  onClick={() => logoutMutation.mutate()}
                  className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full"
                >
                  <User className="w-3 h-3 text-white" />
                  <span className="text-white text-xs">{user.full_name?.split(' ')[0]}</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full"
              >
                <span className="text-white text-xs font-medium">Sign In</span>
              </button>
            )}
            <button
              onClick={onSwitchMode}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
              aria-label="Switch to desktop mode"
            >
              <Map className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <ScanTarget isScanning={scanner.isScanning} />
        </div>

        <div className="absolute top-24 right-4">
          <CompassDisplay 
            heading={scanner.heading} 
            accuracy={scanner.accuracy}
          />
        </div>

        <div className="bg-gradient-to-t from-black/80 to-transparent p-6 pb-safe rounded-t-3xl">
          <div className="mb-6">
            <DistanceSlider
              value={distance}
              onChange={setDistance}
              min={10}
              max={200}
            />
          </div>

          {scanner.heading === null && (
            <div className="mb-4">
              <button
                onClick={() => scanner.requestOrientationPermission()}
                className="w-full py-3 px-4 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400 font-medium hover:bg-amber-500/30 transition-colors flex items-center justify-center gap-2"
              >
                <Compass className="w-5 h-5" />
                Enable Compass
              </button>
            </div>
          )}

          {!scanner.hasCompass && scanner.heading === null && (
            <div className="mb-4">
              <label className="text-xs text-white/70 mb-2 block">
                Point device at property and enter direction (0-360°)
              </label>
              <input
                type="number"
                min={0}
                max={360}
                value={manualHeading ?? 0}
                onChange={(e) => setManualHeading(Number(e.target.value))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white text-center"
                placeholder="Enter heading (0-360)"
              />
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setShowAddressSearch(true)}
              className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              aria-label="Search by address"
            >
              <Search className="w-6 h-6 text-white" />
            </button>

            <button
              onClick={handleScan}
              disabled={scanner.isScanning || !scanner.isLocationReady}
              className={`w-20 h-20 rounded-full flex flex-col items-center justify-center gap-1 transition-all ${
                scanner.isScanning 
                  ? 'bg-brand-500 scale-95' 
                  : scanner.isLocationReady
                    ? 'bg-brand-500 hover:opacity-90 active:scale-95'
                    : 'bg-gray-600'
              }`}
              aria-label="Scan property"
            >
              {scanner.isScanning ? (
                <>
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                  <span className="text-[10px] text-white font-medium">SCANNING</span>
                </>
              ) : !scanner.isLocationReady ? (
                <>
                  <MapPin className="w-8 h-8 text-white" />
                  <span className="text-[10px] text-white font-medium">GPS...</span>
                </>
              ) : (
                <>
                  <ScanLine className="w-8 h-8 text-white" />
                  <span className="text-[10px] text-white font-bold">SCAN</span>
                </>
              )}
            </button>

            <button
              onClick={scanner.refreshLocation}
              className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              aria-label="Refresh location"
            >
              <RefreshCw className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="flex items-center justify-between mt-4 text-xs text-white/60">
            <span>
              {scanner.heading !== null 
                ? `${scanner.heading}° ${getCardinalDirection(scanner.heading)}`
                : 'No compass'
              }
            </span>
            <span>
              {scanner.latitude !== null && scanner.longitude !== null
                ? `📍 ${scanner.latitude.toFixed(5)}, ${scanner.longitude.toFixed(5)}`
                : '⏳ Waiting for GPS...'
              }
            </span>
          </div>

          {(scanner.error || scanner.locationError) && (
            <div className="mt-4 flex items-center gap-2 bg-red-500/20 text-red-300 px-4 py-2 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{scanner.error || scanner.locationError}</span>
            </div>
          )}
        </div>
      </div>

      {scanner.result && (
        <ScanResultSheet
          result={scanner.result}
          onClose={scanner.clearResult}
          onViewDetails={handleViewDetails}
        />
      )}
    </div>
  );
}

