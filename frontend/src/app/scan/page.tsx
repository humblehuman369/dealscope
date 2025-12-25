'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Camera, 
  MapPin, 
  Search, 
  Loader2, 
  AlertCircle,
  Home,
  ChevronRight,
  RefreshCw,
  Map,
  Target,
  Zap,
  ScanLine,
  ArrowLeft
} from 'lucide-react';
import { usePropertyScan, ScanResult } from '@/hooks/usePropertyScan';
import { DistanceSlider } from '@/components/scanner/DistanceSlider';
import { ScanTarget } from '@/components/scanner/ScanTarget';
import { CompassDisplay } from '@/components/scanner/CompassDisplay';
import { ScanResultSheet } from '@/components/scanner/ScanResultSheet';
import { getCardinalDirection } from '@/lib/geoCalculations';

// Detect if user is on mobile device
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (window.innerWidth <= 768 && 'ontouchstart' in window);
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

export default function ScanPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<'auto' | 'camera' | 'map'>('auto');
  
  // Determine which view to show
  const showCameraMode = mode === 'camera' || (mode === 'auto' && isMobile);
  
  return (
    <>
      {showCameraMode ? (
        <MobileScannerView 
          onSwitchMode={() => setMode('map')} 
        />
      ) : (
        <DesktopScannerView 
          onSwitchMode={() => setMode('camera')}
          isMobileDevice={isMobile}
        />
      )}
    </>
  );
}

/**
 * Mobile Camera Scanner View
 * Full-screen camera experience with compass and scan targeting
 */
function MobileScannerView({ onSwitchMode }: { onSwitchMode: () => void }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [distance, setDistance] = useState(50);
  const [manualHeading, setManualHeading] = useState<number | null>(null);
  
  const scanner = usePropertyScan();

  // Initialize camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Back camera
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

    // Request orientation permission on iOS
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
      
      router.push(`/property?address=${encodeURIComponent(address)}`);
    }
  };

  // Show camera permission request
  if (cameraError) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
            <Camera className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Camera Access Required</h2>
          <p className="text-gray-400 mb-6">{cameraError}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-6 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onSwitchMode}
              className="w-full py-3 px-6 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <Map className="w-4 h-4" />
              Use Map Instead
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* Camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pt-safe bg-gradient-to-b from-black/60 to-transparent">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg">InvestIQ</span>
            {scanner.isLocationReady && (
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                <MapPin className="w-3 h-3 text-teal-400" />
                <span className="text-white text-xs">GPS Active</span>
              </div>
            )}
          </div>

          <button
            onClick={onSwitchMode}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
            aria-label="Switch to map mode"
          >
            <Map className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Scan target area */}
        <div className="flex-1 flex items-center justify-center">
          <ScanTarget isScanning={scanner.isScanning} />
        </div>

        {/* Compass display */}
        <div className="absolute top-24 right-4">
          <CompassDisplay 
            heading={scanner.heading} 
            accuracy={scanner.accuracy}
          />
        </div>

        {/* Controls */}
        <div className="bg-gradient-to-t from-black/80 to-transparent p-6 pb-safe rounded-t-3xl">
          {/* Distance slider */}
          <div className="mb-6">
            <DistanceSlider
              value={distance}
              onChange={setDistance}
              min={10}
              max={200}
            />
          </div>

          {/* Manual heading input (if no compass) */}
          {!scanner.hasCompass && (
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

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-4">
            {/* Search button */}
            <button
              onClick={() => router.push('/')}
              className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              aria-label="Search by address"
            >
              <Search className="w-6 h-6 text-white" />
            </button>

            {/* Main scan button */}
            <button
              onClick={handleScan}
              disabled={scanner.isScanning || !scanner.isLocationReady}
              className={`w-20 h-20 rounded-full flex flex-col items-center justify-center gap-1 transition-all ${
                scanner.isScanning 
                  ? 'bg-teal-600 scale-95' 
                  : scanner.isLocationReady
                    ? 'bg-teal-500 hover:bg-teal-600 active:scale-95'
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

            {/* Refresh location button */}
            <button
              onClick={scanner.refreshLocation}
              className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
              aria-label="Refresh location"
            >
              <RefreshCw className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Status info */}
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

          {/* Error display */}
          {(scanner.error || scanner.locationError) && (
            <div className="mt-4 flex items-center gap-2 bg-red-500/20 text-red-300 px-4 py-2 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{scanner.error || scanner.locationError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Result sheet */}
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

/**
 * Desktop/Fallback Scanner View
 * Map-based nearby property discovery
 */
function DesktopScannerView({ 
  onSwitchMode, 
  isMobileDevice 
}: { 
  onSwitchMode: () => void;
  isMobileDevice: boolean;
}) {
  const router = useRouter();
  const [searchAddress, setSearchAddress] = useState('');
  const [nearbyProperties, setNearbyProperties] = useState<ScanResult['property'][]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  
  const scanner = usePropertyScan();

  // Fetch nearby properties when location is ready
  const fetchNearbyProperties = useCallback(async () => {
    if (!scanner.latitude || !scanner.longitude) return;
    
    setIsLoadingNearby(true);
    
    try {
      // Fetch properties in cardinal directions
      const directions = [
        { name: 'North', heading: 0 },
        { name: 'NE', heading: 45 },
        { name: 'East', heading: 90 },
        { name: 'SE', heading: 135 },
        { name: 'South', heading: 180 },
        { name: 'SW', heading: 225 },
        { name: 'West', heading: 270 },
        { name: 'NW', heading: 315 },
      ];

      const results: ScanResult['property'][] = [];
      
      for (const dir of directions.slice(0, 4)) {
        await scanner.performScan(50, dir.heading);
        if (scanner.result?.property) {
          results.push(scanner.result.property);
          scanner.clearResult();
        }
      }

      setNearbyProperties(results);
    } catch (error) {
      console.error('Error fetching nearby:', error);
    } finally {
      setIsLoadingNearby(false);
    }
  }, [scanner]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchAddress.trim()) {
      router.push(`/property?address=${encodeURIComponent(searchAddress)}`);
    }
  };

  const handlePropertyClick = (property: ScanResult['property']) => {
    const address = [
      property.address,
      property.city,
      property.state,
      property.zip
    ].filter(Boolean).join(', ');
    
    router.push(`/property?address=${encodeURIComponent(address)}`);
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 rounded-3xl overflow-hidden mb-8">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }} />
        </div>

        <div className="relative p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            {/* Left: Content */}
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 bg-teal-500/20 text-teal-400 px-3 py-1 rounded-full text-sm font-medium mb-4">
                <Target className="w-4 h-4" />
                Property Scanner
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Scan Any Property
              </h1>
              <p className="text-lg text-gray-300 mb-6 max-w-lg">
                Point your phone at a property to instantly get investment analytics, 
                or search by address.
              </p>

              {/* Search form */}
              <form onSubmit={handleSearch} className="flex gap-3 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    placeholder="Enter property address..."
                    className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition-colors flex items-center gap-2"
                >
                  Analyze
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>

            </div>

            {/* Right: Scan Button */}
            <div className="flex flex-col items-center justify-center md:w-72">
              <button
                onClick={onSwitchMode}
                disabled={!scanner.isLocationReady}
                className={`group relative w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${
                  scanner.isLocationReady
                    ? 'bg-gradient-to-br from-teal-400 to-teal-600 hover:from-teal-500 hover:to-teal-700 shadow-2xl shadow-teal-500/30 hover:scale-105 cursor-pointer'
                    : 'bg-gray-700 cursor-wait'
                }`}
              >
                {/* Animated ring */}
                {scanner.isLocationReady && (
                  <div className="absolute inset-0 rounded-full border-2 border-teal-400/50 animate-ping" />
                )}
                
                {/* Icon and text */}
                {!scanner.isLocationReady ? (
                  <>
                    <Loader2 className="w-12 h-12 text-white/70 animate-spin mb-2" />
                    <span className="text-white/70 text-sm font-medium">Locating...</span>
                  </>
                ) : (
                  <>
                    <ScanLine className="w-12 h-12 text-white mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-white text-lg font-bold">SCAN</span>
                    <span className="text-white/70 text-xs mt-1">Tap to start</span>
                  </>
                )}
              </button>
              
              {/* Status indicator */}
              <div className="mt-4 flex items-center gap-2 text-sm">
                {scanner.isLocationReady ? (
                  <>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-green-400">Ready</span>
                  </>
                ) : scanner.locationError ? (
                  <>
                    <div className="w-2 h-2 bg-red-400 rounded-full" />
                    <span className="text-red-400">Location required</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                    <span className="text-amber-400">Acquiring GPS...</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Location Section */}
      {scanner.isLocationReady && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Your Location</h2>
              <p className="text-gray-500 text-sm">
                {scanner.latitude?.toFixed(6)}, {scanner.longitude?.toFixed(6)}
                {scanner.accuracy && ` (±${Math.round(scanner.accuracy)}m)`}
              </p>
            </div>
            <button
              onClick={fetchNearbyProperties}
              disabled={isLoadingNearby}
              className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-600 rounded-lg font-medium hover:bg-teal-100 transition-colors disabled:opacity-50"
            >
              {isLoadingNearby ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Find Nearby Properties
            </button>
          </div>

          {/* Map placeholder */}
          <div className="relative h-64 bg-gray-100 rounded-xl overflow-hidden mb-4">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Map className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Map view coming soon</p>
                <p className="text-gray-400 text-xs">
                  Lat: {scanner.latitude?.toFixed(4)}, Lng: {scanner.longitude?.toFixed(4)}
                </p>
              </div>
            </div>
            
            {/* Center marker */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <div className="w-3 h-3 bg-white rounded-full" />
              </div>
            </div>
          </div>

          {/* Nearby properties list */}
          {nearbyProperties.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Nearby Properties</h3>
              <div className="grid gap-3">
                {nearbyProperties.map((property, index) => (
                  <button
                    key={index}
                    onClick={() => handlePropertyClick(property)}
                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left w-full"
                  >
                    <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <Home className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {property.address}
                      </div>
                      <div className="text-sm text-gray-500">
                        {property.city}, {property.state} {property.zip}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Location permission needed */}
      {!scanner.isLocationReady && scanner.locationError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Location Access Needed</h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">{scanner.locationError}</p>
          <button
            onClick={scanner.refreshLocation}
            className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
          >
            Enable Location
          </button>
        </div>
      )}

      {/* How it works */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">How It Works</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
              <Target className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">1. Point at Property</h3>
            <p className="text-gray-500 text-sm">
              Use your phone&apos;s camera to aim at any property you want to analyze
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">2. Instant Scan</h3>
            <p className="text-gray-500 text-sm">
              GPS and compass identify the exact property in under 2 seconds
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
              <Home className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">3. Get Analytics</h3>
            <p className="text-gray-500 text-sm">
              Instantly see investment strategies, cash flow, and ROI projections
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

