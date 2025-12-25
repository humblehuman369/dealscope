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
  Building2,
  Repeat,
  Hammer,
  Users,
  FileText,
  Sparkles
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

const strategies = [
  { id: 'ltr', name: 'Long-Term Rental', icon: Building2, color: 'from-violet-500 to-purple-600' },
  { id: 'str', name: 'Short-Term Rental', icon: Home, color: 'from-cyan-500 to-blue-600' },
  { id: 'brrrr', name: 'BRRRR', icon: Repeat, color: 'from-emerald-500 to-green-600' },
  { id: 'flip', name: 'Fix & Flip', icon: Hammer, color: 'from-orange-500 to-red-500' },
  { id: 'house_hack', name: 'House Hack', icon: Users, color: 'from-blue-500 to-indigo-600' },
  { id: 'wholesale', name: 'Wholesale', icon: FileText, color: 'from-pink-500 to-rose-600' },
];

export default function HomePage() {
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 via-cyan-500 to-emerald-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg">InvestIQ</span>
          </div>
          
          <div className="flex items-center gap-2">
            {scanner.isLocationReady && (
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                <MapPin className="w-3 h-3 text-teal-400" />
                <span className="text-white text-xs">GPS Active</span>
              </div>
            )}
            <button
              onClick={onSwitchMode}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
              aria-label="Switch to map mode"
            >
              <Map className="w-5 h-5 text-white" />
            </button>
          </div>
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
              onClick={() => router.push('/search')}
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
 * Map-based nearby property discovery with enhanced UI
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

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
    <main className="min-h-screen bg-[#0a0a0f]">
      {/* Hero Section with Scanner */}
      <div className="relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-transparent to-cyan-900/20" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.03) 1px, transparent 0)',
          backgroundSize: '48px 48px',
        }} />
        
        {/* Glowing orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="text-center mb-12">
            {/* Logo badge */}
            <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 px-4 py-2 rounded-full mb-8">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 via-cyan-500 to-emerald-500 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-medium text-white/80">InvestIQ Scanner</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
              Point. Scan.
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Analyze Instantly.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 font-light">
              Aim your phone at any property to unlock investment analytics across 6 strategies in seconds.
            </p>
          </div>

          {/* Main Scanner Card */}
          <div className="flex flex-col lg:flex-row gap-8 items-center justify-center">
            {/* Scan Button */}
            <div className="flex flex-col items-center">
              <button
                onClick={onSwitchMode}
                className="group relative w-44 h-44 rounded-full flex flex-col items-center justify-center transition-all duration-500 bg-gradient-to-br from-teal-400 via-cyan-500 to-teal-600 hover:from-teal-300 hover:via-cyan-400 hover:to-teal-500 shadow-[0_0_60px_rgba(20,184,166,0.4)] hover:shadow-[0_0_80px_rgba(20,184,166,0.6)] hover:scale-105 cursor-pointer"
              >
                {/* Animated rings */}
                <div className="absolute inset-0 rounded-full border-2 border-teal-400/30 animate-ping" />
                <div className="absolute inset-[-8px] rounded-full border border-teal-400/20 animate-pulse" />
                <div className="absolute inset-[-16px] rounded-full border border-teal-400/10" />
                
                {/* Icon and text */}
                <ScanLine className="w-14 h-14 text-white mb-2 group-hover:scale-110 transition-transform drop-shadow-lg" />
                <span className="text-white text-2xl font-bold tracking-wide">SCAN</span>
                <span className="text-white/70 text-xs mt-1">Use Camera</span>
              </button>
              
              {/* GPS Status */}
              <div className="mt-6 flex items-center gap-2 text-sm">
                {scanner.isLocationReady ? (
                  <>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                    <span className="text-emerald-400">GPS Ready</span>
                  </>
                ) : scanner.locationError ? (
                  <>
                    <div className="w-2 h-2 bg-gray-500 rounded-full" />
                    <span className="text-gray-500">GPS unavailable</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                    <span className="text-amber-400">Acquiring GPS...</span>
                  </>
                )}
              </div>
            </div>

            {/* Or divider */}
            <div className="flex lg:flex-col items-center gap-4">
              <div className="w-16 lg:w-px h-px lg:h-16 bg-gradient-to-r lg:bg-gradient-to-b from-transparent via-white/20 to-transparent" />
              <span className="text-gray-500 text-sm font-medium">or</span>
              <div className="w-16 lg:w-px h-px lg:h-16 bg-gradient-to-r lg:bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            </div>

            {/* Search Card */}
            <div className="w-full max-w-md">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5 text-gray-400" />
                  Search by Address
                </h3>
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchAddress}
                      onChange={(e) => setSearchAddress(e.target.value)}
                      placeholder="123 Main St, City, State"
                      className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!searchAddress.trim()}
                    className="w-full py-4 bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    Analyze Property
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strategies Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">6 Investment Strategies</h2>
          <p className="text-gray-400">Instant analytics for every approach</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {strategies.map((strategy) => {
            const Icon = strategy.icon;
            return (
              <div 
                key={strategy.id}
                className="group bg-white/5 backdrop-blur-sm border border-white/5 rounded-2xl p-5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer text-center"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${strategy.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
                </div>
                <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{strategy.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* How it Works */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-10 text-center">How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
                <Target className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-white/20 mb-2">01</div>
              <h3 className="font-semibold text-white mb-2">Point at Property</h3>
              <p className="text-gray-400 text-sm">
                Use your phone&apos;s camera to aim at any property you want to analyze
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-white/20 mb-2">02</div>
              <h3 className="font-semibold text-white mb-2">Instant Scan</h3>
              <p className="text-gray-400 text-sm">
                GPS and compass identify the exact property in under 2 seconds
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Home className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-white/20 mb-2">03</div>
              <h3 className="font-semibold text-white mb-2">Get Analytics</h3>
              <p className="text-gray-400 text-sm">
                Instantly see investment strategies, cash flow, and ROI projections
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Location Section (if GPS available) */}
      {scanner.isLocationReady && (
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Your Location</h3>
                <p className="text-gray-400 text-sm">
                  {scanner.latitude?.toFixed(6)}, {scanner.longitude?.toFixed(6)}
                  {scanner.accuracy && ` (±${Math.round(scanner.accuracy)}m)`}
                </p>
              </div>
              <button
                onClick={fetchNearbyProperties}
                disabled={isLoadingNearby}
                className="flex items-center gap-2 px-4 py-2 bg-teal-500/20 text-teal-400 rounded-lg font-medium hover:bg-teal-500/30 transition-colors disabled:opacity-50"
              >
                {isLoadingNearby ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Find Nearby
              </button>
            </div>

            {/* Nearby properties list */}
            {nearbyProperties.length > 0 && (
              <div className="grid gap-3">
                {nearbyProperties.map((property, index) => (
                  <button
                    key={index}
                    onClick={() => handlePropertyClick(property)}
                    className="flex items-center gap-3 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-left w-full group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                      <Home className="w-5 h-5 text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">
                        {property.address}
                      </div>
                      <div className="text-sm text-gray-400">
                        {property.city}, {property.state} {property.zip}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location permission needed */}
      {!scanner.isLocationReady && scanner.locationError && (
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Location Access Needed</h3>
            <p className="text-gray-400 mb-4 max-w-md mx-auto">{scanner.locationError}</p>
            <button
              onClick={scanner.refreshLocation}
              className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
            >
              Enable Location
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 via-cyan-500 to-emerald-500 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-400">InvestIQ</span>
          </div>
          <p className="text-sm text-gray-500">Real estate investment analytics</p>
        </div>
      </footer>
    </main>
  );
}
