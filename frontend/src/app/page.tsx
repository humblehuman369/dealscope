'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Home,
  TrendingUp,
  DollarSign,
  BarChart3,
  Users,
  Repeat,
  LogOut,
  LayoutGrid,
  ChevronLeft,
  Image as ImageIcon,
  Download,
  Camera,
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
import { useAuth } from '@/context/AuthContext';
import { usePropertyScan } from '@/hooks/usePropertyScan';
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

export default function HomePage() {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<'camera' | 'map'>('map');
  
  const showCameraMode = mode === 'camera';
  
  return (
    <>
      {showCameraMode ? (
        <MobileScannerView 
          onSwitchMode={() => setMode('map')} 
        />
      ) : (
        <DesktopLandingPage 
          onSwitchMode={() => setMode('camera')}
        />
      )}
    </>
  );
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
  
  const scanner = usePropertyScan();
  const { user, isAuthenticated, logout, setShowAuthModal } = useAuth();

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
      const GOOGLE_MAPS_API_KEY = 'AIzaSyCKp7Tt4l2zu2h2EV6PXPz7xbZLoPrtziw';
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude.toFixed(6)},${longitude.toFixed(6)}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results?.length > 0) {
        // Get the formatted address
        const result = data.results[0];
        const address = result.formatted_address;
        
        // Navigate to property page with the address
        router.push(`/property?address=${encodeURIComponent(address)}`);
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
      
      router.push(`/property?address=${encodeURIComponent(address)}`);
    }
  };

  if (cameraError) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          {/* Animated location pulse effect */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping"></div>
            <div className="absolute inset-2 rounded-full bg-brand-500/30 animate-pulse"></div>
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <MapPin className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3">Experience Instant Analytics</h2>
          <p className="text-gray-300 mb-2">
            Camera not available on this device, but you can still see the magic!
          </p>
          <p className="text-gray-400 text-sm mb-8">
            We&apos;ll use your GPS to find properties near you and show you our instant property analysis.
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={handleUseCurrentLocation}
              disabled={isGettingLocation}
              className="w-full py-4 px-6 bg-brand-500 text-white rounded-xl font-bold text-lg hover:bg-[#0354d1] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
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
            <button
              onClick={onSwitchMode}
              className="w-full py-3 px-6 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search by Address Instead
            </button>
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
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center gap-1 bg-brand-500/80 backdrop-blur-sm px-3 py-1.5 rounded-full"
                >
                  <LayoutGrid className="w-3 h-3 text-white" />
                  <span className="text-white text-xs font-medium">Dashboard</span>
                </button>
                <button
                  onClick={logout}
                  className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full"
                >
                  <User className="w-3 h-3 text-white" />
                  <span className="text-white text-xs">{user.full_name?.split(' ')[0]}</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal('login')}
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
              onClick={() => router.push('/search')}
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

/**
 * Desktop Landing Page (Landing2 Design)
 */
function DesktopLandingPage({ onSwitchMode }: { onSwitchMode: () => void }) {
  const router = useRouter();
  const { user, isAuthenticated, logout, setShowAuthModal } = useAuth();
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchAddress.trim()) {
      setIsSearching(true);
      router.push(`/property?address=${encodeURIComponent(searchAddress)}`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-navy-50 border-b border-neutral-300">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <a href="/" className="flex items-center gap-3">
              <img 
                src="/images/investiq-logo-icon.png" 
                alt="InvestIQ" 
                className="w-12 h-12 rounded-xl"
              />
              <span className="text-2xl font-bold text-navy-900">
                Invest<span className="text-brand-500">IQ</span>
              </span>
            </a>
            
            <nav className="hidden md:flex items-center gap-6">
              <a href="/search" className="text-neutral-500 font-medium hover:text-navy-900 transition-colors flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search
              </a>
              <button
                onClick={onSwitchMode}
                className="text-neutral-500 font-medium hover:text-navy-900 transition-colors flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Point & Scan
              </button>
            </nav>
            
            <nav className="flex items-center gap-4">
              {isAuthenticated && user ? (
                <>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-3 bg-brand-500 text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Dashboard
                  </button>
                  <button
                    onClick={logout}
                    className="px-6 py-3 bg-transparent text-navy-900 font-bold rounded-xl hover:bg-black/5 transition-all flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowAuthModal('login')}
                    className="px-6 py-3 bg-transparent text-navy-900 font-bold rounded-xl hover:bg-black/5 transition-all"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setShowAuthModal('register')}
                    className="px-6 py-3 h-12 bg-brand-500 text-white font-bold rounded-xl hover:opacity-90 transition-all"
                  >
                    Get Started
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-navy-50 py-16 pb-24 overflow-hidden">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-brand-500 dark:text-brand-500 leading-tight mb-6">
              Analyze Investment Real Estate<br />
              in <span className="text-accent-500 dark:text-accent-500">60</span> seconds!
            </h1>
            <p className="text-xl md:text-2xl text-neutral-500 font-medium mb-8">
              Point & Scan or simply input address
            </p>

            {/* Address Search Bar */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                  <input
                    type="text"
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    placeholder="Enter property address..."
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-neutral-300 bg-white text-navy-900 placeholder-[#6b7280] focus:outline-none focus:border-[#0465f2] transition-colors text-lg"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchAddress.trim()}
                  className="px-8 py-4 bg-brand-500 text-white font-bold text-lg rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSearching ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Analyze
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Point & Scan Button */}
            <button
              onClick={onSwitchMode}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#07172e] text-white font-bold rounded-xl hover:bg-brand-500 transition-all"
            >
              <Camera className="w-5 h-5" />
              Point & Scan Property
            </button>
          </div>

          {/* Phone Mockup Container */}
          <div className="relative max-w-5xl mx-auto min-h-[500px] md:min-h-[600px] flex items-center justify-center">
            
            {/* Floating Card: ROI - Top Left */}
            <div className="absolute left-0 md:left-0 top-0 md:top-12 bg-white rounded-2xl shadow-xl p-4 md:p-6 w-40 md:w-56 z-10 animate-float-slow hidden md:block">
              <p className="text-xs md:text-sm text-neutral-500 font-semibold mb-1 md:mb-2">Estimated ROI:</p>
              <div className="flex items-center gap-2 text-2xl md:text-4xl font-bold text-navy-900">
                <span>12.5%</span>
                <svg width="20" height="20" className="md:w-7 md:h-7" fill="none" stroke="#22c55e" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
                </svg>
              </div>
            </div>

            {/* Floating Card: Cash Flow - Top Right */}
            <div className="absolute right-0 top-0 md:top-8 bg-white rounded-2xl shadow-xl p-4 md:p-6 w-40 md:w-56 z-10 animate-float-medium hidden md:block">
              <p className="text-xs md:text-sm text-neutral-500 font-semibold mb-1 md:mb-2">Cash Flow:</p>
              <p className="text-2xl md:text-4xl font-bold text-navy-900 mb-1 md:mb-2">$1,200/mo</p>
              <svg viewBox="0 0 200 60" className="w-full h-10 md:h-16">
                <path d="M 0,50 Q 50,30 100,35 T 200,20" fill="none" stroke="#0465f2" strokeWidth="3"/>
                <rect x="160" y="10" width="8" height="30" fill="#0465f2"/>
              </svg>
            </div>

            {/* Phone Frame */}
            <div className="relative w-[260px] h-[520px] md:w-[280px] md:h-[560px] lg:w-[320px] lg:h-[640px] bg-black rounded-[2.5rem] md:rounded-[3rem] p-2 md:p-3 shadow-2xl z-20">
              {/* Phone Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 md:w-32 lg:w-40 h-5 md:h-6 lg:h-7 bg-black rounded-b-2xl md:rounded-b-3xl z-30"></div>
              
              {/* Phone Screen */}
              <div className="relative w-full h-full bg-[#1f2937] rounded-[2rem] md:rounded-[2.5rem] overflow-hidden">
                {/* Status Bar */}
                <div className="absolute top-0 left-0 right-0 h-12 flex items-center justify-between px-8 text-white text-xs z-20">
                  <span>9:41</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-3 border border-white rounded-sm"></div>
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>

                {/* Background Image */}
                <div className="absolute inset-0 z-0">
                  <div className="w-full h-full bg-gradient-to-br from-[#374151] to-[#1f2937] flex items-center justify-center">
                    <Home className="w-32 h-32 text-white/10" />
                  </div>
                </div>

                {/* Content */}
                <div className="absolute inset-0 flex flex-col">
                  {/* Header */}
                  <div className="pt-14 px-6 pb-4 bg-gradient-to-b from-black/60 to-transparent relative z-10">
                    <div className="flex items-center justify-between text-white">
                      <button className="w-8 h-8" aria-label="Go back">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-semibold">GPS Targeting</span>
                      <div className="w-8"></div>
                    </div>
                  </div>

                  {/* Targeting Area */}
                  <div className="flex-1 flex items-center justify-center relative">
                    <div className="relative w-44 h-44 md:w-52 md:h-52 lg:w-64 lg:h-64">
                      {/* Animated Circles */}
                      <div className="absolute inset-0 border-4 border-accent-500 rounded-full animate-ping-slow opacity-75"></div>
                      <div className="absolute inset-4 border-4 border-accent-500 rounded-full opacity-60"></div>
                      <div className="absolute inset-8 border-4 border-accent-500 rounded-full opacity-40"></div>
                      
                      {/* Crosshair */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 border-4 border-accent-500 rounded-full bg-accent-500/20 backdrop-blur-sm flex items-center justify-center">
                          <div className="w-2 h-2 bg-accent-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>

                    {/* Property Info Card */}
                    <div className="absolute bottom-24 left-6 right-6 bg-[#1f2937]/90 backdrop-blur-xl rounded-2xl p-4 text-white">
                      <p className="text-xs text-gray-400 mb-1">Property Located</p>
                      <p className="text-sm font-semibold mb-3">123 Main Street, Anytown</p>
                      <div className="flex gap-2">
                        <button className="flex-1 py-2 px-4 bg-accent-500 text-black font-bold rounded-lg text-sm">
                          Scan
                        </button>
                        <button className="flex-1 py-2 px-4 bg-[#374151] text-white font-bold rounded-lg text-sm">
                          Details
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Bar */}
                  <div className="absolute bottom-0 left-0 right-0 px-6 pb-8 pt-4 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center justify-center gap-12">
                      <button className="w-12 h-12 bg-[#1f2937] rounded-xl flex items-center justify-center text-white" aria-label="Gallery">
                        <ImageIcon className="w-6 h-6" />
                      </button>
                      <button className="w-20 h-20 bg-accent-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.5)]" aria-label="Capture">
                        <div className="w-16 h-16 border-4 border-black rounded-full"></div>
                      </button>
                      <button className="w-12 h-12 bg-[#1f2937] rounded-xl flex items-center justify-center text-white" aria-label="Download">
                        <Download className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Card: Property Value - Bottom Left */}
            <div className="absolute left-0 md:left-4 lg:left-12 bottom-8 md:bottom-16 bg-white rounded-2xl shadow-xl p-4 md:p-6 w-40 md:w-56 z-10 animate-float-fast hidden md:block">
              <p className="text-xs md:text-sm text-neutral-500 font-semibold mb-1 md:mb-2">Property Value:</p>
              <p className="text-2xl md:text-4xl font-bold text-navy-900 mb-2 md:mb-3">62.5%</p>
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="absolute left-0 top-0 h-full rounded-full bg-forest-500 w-progress-62"></div>
              </div>
              <div className="flex justify-between text-xs text-neutral-500 mt-1">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>

            {/* Floating Card: Cap Rate - Bottom Right */}
            <div className="absolute right-0 md:right-4 lg:right-12 bottom-12 md:bottom-20 bg-white rounded-2xl shadow-xl p-4 md:p-6 w-40 md:w-56 z-10 animate-float-medium animation-delay-500 hidden md:block">
              <p className="text-xs md:text-sm text-neutral-500 font-semibold mb-1 md:mb-2">Cap Rate:</p>
              <p className="text-2xl md:text-4xl font-bold text-navy-900 mb-1 md:mb-2">6.8%</p>
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="absolute left-0 top-0 h-full rounded-full bg-forest-500 w-progress-68"></div>
              </div>
            </div>
          </div>

          {/* Mobile Metrics Cards - Show only on small screens */}
          <div className="grid grid-cols-2 gap-3 mt-8 md:hidden">
            <div className="bg-white rounded-xl shadow-lg p-4">
              <p className="text-xs text-neutral-500 font-semibold mb-1">Estimated ROI:</p>
              <div className="flex items-center gap-1 text-xl font-bold text-navy-900">
                <span>12.5%</span>
                <svg width="16" height="16" fill="none" stroke="#22c55e" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
                </svg>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4">
              <p className="text-xs text-neutral-500 font-semibold mb-1">Cash Flow:</p>
              <p className="text-xl font-bold text-navy-900">$1,200/mo</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4">
              <p className="text-xs text-neutral-500 font-semibold mb-1">Property Value:</p>
              <p className="text-xl font-bold text-navy-900">62.5%</p>
              <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                <div className="absolute left-0 top-0 h-full rounded-full bg-forest-500 w-progress-62"></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4">
              <p className="text-xs text-neutral-500 font-semibold mb-1">Cap Rate:</p>
              <p className="text-xl font-bold text-navy-900">6.8%</p>
              <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                <div className="absolute left-0 top-0 h-full rounded-full bg-forest-500 w-progress-68"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tagline Section */}
      <section className="bg-navy-50 py-12">
        <div className="max-w-5xl mx-auto px-8 md:px-16 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 h-1 bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent"></div>
            <div className="bg-accent-500 text-black py-4 px-10 font-bold text-base md:text-lg clip-angled">
              &quot;The fastest path from address to investable decision.&quot;
            </div>
            <div className="flex-1 h-1 bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent"></div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-1 h-1 bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent"></div>
            <div className="bg-accent-500 text-black py-4 px-10 font-bold text-base md:text-lg clip-angled">
              &quot;The only tool that delivers institutional-grade analytics on-the-go.&quot;
            </div>
            <div className="flex-1 h-1 bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent"></div>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="bg-brand-500 text-white py-20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-6xl font-bold text-accent-500 mb-2">60</div>
              <div className="text-xl font-semibold">Seconds to Analysis</div>
            </div>
            <div>
              <div className="text-6xl font-bold text-accent-500 mb-2">6</div>
              <div className="text-xl font-semibold">Investment Strategies</div>
            </div>
            <div>
              <div className="text-6xl font-bold text-accent-500 mb-2">100%</div>
              <div className="text-xl font-semibold">Data-Driven Intelligence</div>
            </div>
          </div>
        </div>
      </section>

      {/* Strategies Section */}
      <section className="bg-white py-12 md:py-20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-navy-solid mb-4">6 Investment Strategies</h2>
            <div className="h-1 w-24 bg-brand-500 mx-auto mb-4 md:mb-6"></div>
            <p className="text-lg md:text-xl text-neutral-500">One property. Six strategies. Unlimited potential.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[
              { icon: Home, name: 'Long-Term Rental', href: '/strategies/long-term-rental' },
              { icon: TrendingUp, name: 'Short-Term Rental', href: '/strategies/short-term-rental' },
              { icon: DollarSign, name: 'BRRRR', href: '/strategies/brrrr' },
              { icon: BarChart3, name: 'Fix & Flip', href: '/strategies/fix-flip' },
              { icon: Users, name: 'House Hack', href: '/strategies/house-hack' },
              { icon: Repeat, name: 'Wholesale', href: '/strategies/wholesale' },
            ].map((strategy, idx) => (
              <a 
                key={idx}
                href={strategy.href}
                className="bg-white border-2 border-neutral-300 rounded-xl p-4 md:p-6 transition-all hover:border-brand-500 hover:shadow-lg cursor-pointer group flex flex-row items-center gap-3 md:gap-4"
              >
                <strategy.icon className="w-8 h-8 md:w-10 md:h-10 text-brand-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-lg md:text-xl font-bold text-navy-solid">{strategy.name}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Section */}
      <section className="bg-navy-50 py-12 md:py-20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-navy-solid mb-4">Data-Driven Investment Decisions</h2>
            <div className="h-1 w-24 bg-brand-500 mx-auto"></div>
          </div>
          
          <div className="text-center mt-6 md:mt-8">
            <p className="text-xl md:text-2xl font-bold text-navy-solid mb-6">Stop Guessing. Start Investing.</p>
            <button
              onClick={() => setShowAuthModal('register')}
              className="px-12 py-4 h-16 bg-brand-500 text-white font-bold text-lg rounded-xl hover:opacity-90 transition-all"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-300 py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img 
                src="/images/investiq-logo-icon.png" 
                alt="InvestIQ" 
                className="w-12 h-12 rounded-xl"
              />
              <span className="text-xl font-bold text-navy-900">
                Invest<span className="text-brand-500">IQ</span>
              </span>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-neutral-500">© 2026 InvestIQ. All rights reserved.</p>
              <p className="text-sm font-semibold text-navy-900 mt-1">Invest like a Guru!</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Animations */}
      <style jsx global>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes ping-slow {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        
        .animate-float-slow {
          animation: float-slow 6s ease-in-out infinite;
        }
        
        .animate-float-medium {
          animation: float-medium 5s ease-in-out infinite;
        }
        
        .animate-float-fast {
          animation: float-fast 4s ease-in-out infinite;
        }
        
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
