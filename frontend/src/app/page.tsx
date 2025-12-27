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
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
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

    // Request orientation permission on iOS (note: may fail silently if not from user gesture)
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
    // Request compass permission on first scan if not granted yet (iOS 13+ requires user gesture)
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

          {/* Compass enable button - required for iOS 13+ user gesture */}
          {scanner.heading === null && (
            <div className="mb-4">
              <button
                onClick={() => scanner.requestOrientationPermission()}
                className="w-full py-3 px-4 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400 font-medium hover:bg-amber-500/30 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Enable Compass
              </button>
              <p className="text-xs text-white/50 mt-2 text-center">
                Tap to enable compass for accurate property targeting
              </p>
            </div>
          )}

          {/* Manual heading input (if compass not available after permission) */}
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
 * Matches the polished scanner design with prominent SCAN button
 */
function DesktopScannerView({ 
  onSwitchMode, 
  isMobileDevice 
}: { 
  onSwitchMode: () => void;
  isMobileDevice: boolean;
}) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [searchAddress, setSearchAddress] = useState('');
  const [nearbyProperties, setNearbyProperties] = useState<ScanResult['property'][]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const scanner = usePropertyScan();

  // Fetch nearby properties when location is ready
  const fetchNearbyProperties = useCallback(async () => {
    if (!scanner.latitude || !scanner.longitude) return;
    
    setIsLoadingNearby(true);
    
    try {
      const directions = [
        { name: 'North', heading: 0 },
        { name: 'NE', heading: 45 },
        { name: 'East', heading: 90 },
        { name: 'SE', heading: 135 },
      ];

      const results: ScanResult['property'][] = [];
      
      for (const dir of directions) {
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
  }, [scanner.latitude, scanner.longitude, scanner.performScan, scanner.result, scanner.clearResult]);
  
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchAddress.trim()) {
      setIsNavigating(true);
      window.location.href = `/property?address=${encodeURIComponent(searchAddress)}`;
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
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950">
      {/* Hero Section with Scanner */}
      <section className="relative overflow-hidden">
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent" />
        
        {/* Animated background dots */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }} />
        </div>

        <div className="relative px-6 pt-12 pb-16">
          {/* Title */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Point. Scan.
              <br />
              <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Analyze Instantly.
              </span>
            </h1>
            <p className="text-gray-400 text-lg">
              Aim your phone at any property to unlock investment analytics across 6 strategies in seconds.
            </p>
          </div>

          {/* Large Scan Button */}
          <div className="flex flex-col items-center mb-10">
            <button
              onClick={onSwitchMode}
              className="group relative w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 bg-gradient-to-br from-teal-400 to-teal-600 hover:from-teal-500 hover:to-teal-700 shadow-2xl shadow-teal-500/40 hover:scale-105 cursor-pointer"
            >
              {/* Animated ping ring */}
              <div className="absolute inset-0 rounded-full border-2 border-teal-400/50 animate-ping" />
              
              {/* Inner ring */}
              <div className="absolute inset-2 rounded-full border border-white/20" />
              
              {/* Icon and text */}
              <ScanLine className="w-10 h-10 text-white mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-white text-lg font-bold tracking-wide">SCAN</span>
              <span className="text-white/60 text-[10px] mt-0.5">Use Camera</span>
            </button>
            
            {/* GPS Status */}
            <div className="mt-4 flex items-center gap-2 text-sm">
              {scanner.isLocationReady ? (
                <>
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-green-400">GPS Ready</span>
                </>
              ) : scanner.locationError ? (
                <>
                  <div className="w-2 h-2 bg-gray-500 rounded-full" />
                  <span className="text-gray-400">GPS unavailable</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                  <span className="text-amber-400">Acquiring GPS...</span>
                </>
              )}
            </div>
          </div>

          {/* OR Divider */}
          <div className="flex items-center justify-center gap-4 mb-8 max-w-md mx-auto">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
            <span className="text-slate-500 text-sm">or</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          </div>

          {/* Search by Address */}
          <div className="max-w-md mx-auto">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50">
              <div className="flex items-center gap-2 text-white mb-4">
                <Search className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">Search by Address</span>
              </div>
              
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  placeholder="1451 SW 10 ST, Boca Raton, FL 33486"
                  className="w-full px-4 py-3 bg-slate-900/80 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-4 text-sm"
                />
                <button
                  type="submit"
                  disabled={isNavigating || !searchAddress.trim()}
                  className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isNavigating ? (
                    <>
                      <Loader2 className="animate-spin w-5 h-5" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Analyze Property
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Investment Strategies */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white mb-2">6 Investment Strategies</h2>
            <p className="text-gray-500">Instant analytics for every approach</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {strategies.map((strategy) => {
              const Icon = strategy.icon;
              const iconColorMap: Record<string, string> = {
                'from-violet-500 to-purple-600': 'bg-violet-500/20 text-violet-400',
                'from-cyan-500 to-blue-600': 'bg-cyan-500/20 text-cyan-400',
                'from-emerald-500 to-green-600': 'bg-emerald-500/20 text-emerald-400',
                'from-orange-500 to-red-500': 'bg-orange-500/20 text-orange-400',
                'from-blue-500 to-indigo-600': 'bg-blue-500/20 text-blue-400',
                'from-pink-500 to-rose-600': 'bg-pink-500/20 text-pink-400',
              };
              const iconColor = iconColorMap[strategy.color] || 'bg-gray-500/20 text-gray-400';
              
              return (
                <div 
                  key={strategy.id} 
                  className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-5 border border-slate-700/50 hover:border-slate-600 transition-all cursor-pointer group flex flex-col items-center text-center"
                >
                  <div className={`w-12 h-12 rounded-xl ${iconColor} flex items-center justify-center mb-3`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-medium text-white text-sm">{strategy.name}</h3>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 mt-2 transition-colors" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-3xl p-8 border border-slate-700/50">
            <h2 className="text-2xl font-bold text-white mb-10 text-center">How It Works</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg">
                  <Target className="w-7 h-7 text-white" />
                </div>
                <div className="text-2xl font-bold text-slate-600 mb-2">01</div>
                <h3 className="font-semibold text-white mb-2">Point at Property</h3>
                <p className="text-gray-500 text-sm">
                  Use your phone&apos;s camera to aim at any property you want to analyze
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-lg">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div className="text-2xl font-bold text-slate-600 mb-2">02</div>
                <h3 className="font-semibold text-white mb-2">Instant Scan</h3>
                <p className="text-gray-500 text-sm">
                  GPS and compass identify the exact property in under 2 seconds
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg">
                  <Home className="w-7 h-7 text-white" />
                </div>
                <div className="text-2xl font-bold text-slate-600 mb-2">03</div>
                <h3 className="font-semibold text-white mb-2">Get Analytics</h3>
                <p className="text-gray-500 text-sm">
                  Instantly see investment strategies, cash flow, and ROI projections
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section (if GPS available) */}
      {scanner.isLocationReady && nearbyProperties.length > 0 && (
        <section className="px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Nearby Properties</h3>
                  <p className="text-gray-500 text-sm">
                    {scanner.latitude?.toFixed(6)}, {scanner.longitude?.toFixed(6)}
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
                  Refresh
                </button>
              </div>

              <div className="grid gap-3">
                {nearbyProperties.map((property, index) => (
                  <button
                    key={index}
                    onClick={() => handlePropertyClick(property)}
                    className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors text-left w-full group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                      <Home className="w-5 h-5 text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{property.address}</div>
                      <div className="text-sm text-gray-500">{property.city}, {property.state} {property.zip}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="px-6 py-8 mt-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-white text-sm font-medium">InvestIQ</span>
          </div>
          <p className="text-gray-600 text-sm">Real estate investment analytics</p>
        </div>
      </footer>
    </main>
  );
}
