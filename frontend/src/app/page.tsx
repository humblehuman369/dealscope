'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ScanLine,
  Building2,
  Repeat,
  Hammer,
  Users,
  FileText,
  Sparkles,
  X,
  User,
  LogOut,
  Compass,
  BarChart3,
  TrendingUp,
  LayoutGrid,
  Zap,
  Play,
  Calendar,
  DollarSign,
  Box
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
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

type StrategyId = 'ltr' | 'str' | 'brrrr' | 'flip' | 'house_hack' | 'wholesale';

const strategies: { id: StrategyId; name: string; icon: typeof Building2 }[] = [
  { id: 'ltr', name: 'Long-Term Rental', icon: Home },
  { id: 'str', name: 'Short-Term Rental', icon: Calendar },
  { id: 'brrrr', name: 'BRRRR', icon: TrendingUp },
  { id: 'flip', name: 'Fix & Flip', icon: DollarSign },
  { id: 'house_hack', name: 'House Hack', icon: Users },
  { id: 'wholesale', name: 'Wholesale', icon: Box },
];

// Strategy explanations for the info modal
const strategyExplanations: Record<StrategyId, { title: string; content: React.ReactNode }> = {
  ltr: {
    title: 'Long-Term Rental',
    content: (
      <>
        <p className="mb-3"><strong>Long-term rental</strong> is the classic buy-and-hold strategy that&apos;s made countless millionaires! You purchase a property, rent it out to reliable tenants on an annual lease, and watch your wealth grow on autopilot.</p>
        <p className="mb-2">The magic happens in three ways:</p>
        <ol className="list-decimal list-inside mb-3 space-y-1 ml-2">
          <li>Monthly cash flow puts money in your pocket NOW!</li>
          <li>Your tenants build equity for you by paying down the loan</li>
          <li>Appreciation grows your property value over time.</li>
        </ol>
        <p>It&apos;s the perfect <strong>&quot;set it and forget it&quot;</strong> strategy—ideal for investors who want to build lasting wealth.</p>
      </>
    )
  },
  str: {
    title: 'Short-Term Rental',
    content: (
      <>
        <p className="mb-3"><strong>Short-term rental</strong> is where you turn your property into a high-revenue hospitality business using platforms like Airbnb or VRBO! Properties in hot tourist areas can generate <strong>2-3X more revenue</strong> than traditional rentals.</p>
        <p><strong>The best part?</strong> You can block off dates to use the property yourself for vacations!</p>
      </>
    )
  },
  brrrr: {
    title: 'BRRRR',
    content: (
      <>
        <p className="mb-3"><strong>BRRRR</strong> stands for <strong>Buy, Rehab, Rent, Refinance, Repeat</strong>—and it&apos;s the holy grail for serious investors who want to scale FAST!</p>
        <p className="mb-3">The goal is &quot;infinite return&quot;—when you&apos;ve pulled out 100% of your investment but still own a property that pays you every month.</p>
      </>
    )
  },
  flip: {
    title: 'Fix & Flip',
    content: (
      <>
        <p className="mb-3"><strong>Fix & Flip</strong> is the <strong>fast-cash strategy</strong> where you buy a distressed property at a discount, transform it into something beautiful, and sell it for profit—sometimes in just 3-6 months!</p>
        <p>A successful flip can net you <strong>$30,000-$100,000+ in profit</strong>!</p>
      </>
    )
  },
  house_hack: {
    title: 'House Hacking',
    content: (
      <>
        <p className="mb-3"><strong>House hacking</strong> is the <strong>ultimate beginner</strong> strategy where your biggest expense—housing—becomes your biggest asset instead!</p>
        <p>You&apos;re essentially <strong>living for FREE</strong> while building equity and learning the landlord game with training wheels on.</p>
      </>
    )
  },
  wholesale: {
    title: 'Wholesale',
    content: (
      <>
        <p className="mb-3"><strong>Wholesaling</strong> is how you make money in real estate with <strong>little to no money</strong> of your own!</p>
        <p><strong>It&apos;s pure deal-finding hustle!</strong> Your job is to be the matchmaker—connecting motivated sellers with cash buyers.</p>
      </>
    )
  }
};

// Strategy Info Modal Component
function StrategyInfoModal({ 
  strategyId, 
  isOpen, 
  onClose 
}: { 
  strategyId: StrategyId
  isOpen: boolean
  onClose: () => void 
}) {
  const explanation = strategyExplanations[strategyId];
  
  if (!isOpen || !explanation) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
        
        <div className="px-5 py-5 overflow-y-auto max-h-[70vh]">
          <h3 className="text-lg font-bold text-[#07172e] mb-4">{explanation.title}</h3>
          <div className="text-sm text-gray-700 leading-relaxed pr-6">
            {explanation.content}
          </div>
        </div>
        
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gradient-to-r from-[#0465f2] to-[#00e5ff] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<'auto' | 'camera' | 'map'>('auto');
  
  const showCameraMode = mode === 'camera' || (mode === 'auto' && isMobile);
  
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
  
  const scanner = usePropertyScan();
  const { user, isAuthenticated, logout, setShowAuthModal } = useAuth();

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
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center">
            <Camera className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Camera Access Required</h2>
          <p className="text-gray-400 mb-6">{cameraError}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-6 bg-[#0465f2] text-white rounded-xl font-medium hover:bg-[#0354d1] transition-colors"
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
            <span className="text-white font-bold text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Invest<span className="text-[#0465f2]">IQ</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {scanner.isLocationReady && (
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                <MapPin className="w-3 h-3 text-[#00e5ff]" />
                <span className="text-white text-xs">GPS Active</span>
              </div>
            )}
            {isAuthenticated && user ? (
              <>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center gap-1 bg-[#0465f2]/80 backdrop-blur-sm px-3 py-1.5 rounded-full"
                >
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
              aria-label="Switch to map mode"
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
                  ? 'bg-[#0465f2] scale-95' 
                  : scanner.isLocationReady
                    ? 'bg-gradient-to-br from-[#0465f2] to-[#00e5ff] hover:opacity-90 active:scale-95'
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
 * Desktop Landing Page - New Design
 */
function DesktopLandingPage({ onSwitchMode }: { onSwitchMode: () => void }) {
  const router = useRouter();
  const { user, isAuthenticated, logout, setShowAuthModal } = useAuth();
  const [searchAddress, setSearchAddress] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [infoModalStrategy, setInfoModalStrategy] = useState<StrategyId | null>(null);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchAddress.trim()) {
      setIsNavigating(true);
      window.location.href = `/property?address=${encodeURIComponent(searchAddress)}`;
    }
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Load Poppins font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-[5%] py-4 flex justify-between items-center bg-white/95 backdrop-blur-[20px] border-b border-black/5">
        <a href="#" className="flex items-center">
          <span className="text-2xl font-bold text-[#07172e]" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Invest<span className="text-[#0465f2]">IQ</span>
          </span>
        </a>
        
        <div className="hidden md:flex items-center gap-10">
          <a href="#strategies" className="text-[#64748b] font-medium text-sm hover:text-[#07172e] transition-colors">Strategies</a>
          <a href="#features" className="text-[#64748b] font-medium text-sm hover:text-[#07172e] transition-colors">Features</a>
          <a href="#how-it-works" className="text-[#64748b] font-medium text-sm hover:text-[#07172e] transition-colors">How It Works</a>
        </div>
        
        <div className="flex gap-3">
          {isAuthenticated && user ? (
            <>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2.5 bg-gradient-to-r from-[#0465f2] to-[#00e5ff] text-white font-semibold text-sm rounded-[10px] hover:shadow-lg hover:shadow-[#0465f2]/30 transition-all flex items-center gap-2"
              >
                <LayoutGrid className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={logout}
                className="px-4 py-2.5 bg-transparent text-[#07172e] font-semibold text-sm rounded-[10px] hover:bg-[#e1e8ed] transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowAuthModal('login')}
                className="px-4 py-2.5 bg-transparent text-[#07172e] font-semibold text-sm rounded-[10px] hover:bg-[#e1e8ed] transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => setShowAuthModal('register')}
                className="px-4 py-2.5 bg-[#07172e] text-white font-semibold text-sm rounded-[10px] hover:bg-[#0465f2] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#0465f2]/30 transition-all"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen pt-28 pb-16 px-[5%] grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-[1400px] mx-auto">
        <div className="animate-fadeUp">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0465f2]/10 to-[#00e5ff]/10 border border-[#0465f2]/20 text-[#0465f2] px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Zap className="w-4 h-4" />
            Instant Property Analysis
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#07172e] leading-tight mb-6">
            Analyze Investment Real Estate in{' '}
            <span className="bg-gradient-to-r from-[#0465f2] to-[#00e5ff] bg-clip-text text-transparent">
              60 Seconds!
            </span>
          </h1>
          
          <p className="text-xl text-[#64748b] mb-2">
            Point & Scan — or simply input an address
          </p>
          
          <p className="text-lg text-[#07172e] font-semibold mb-8 flex items-center gap-3">
            <span className="w-10 h-[3px] bg-gradient-to-r from-[#0465f2] to-[#00e5ff] rounded-full"></span>
            The fastest path from address to investable decision.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="flex flex-col sm:flex-row gap-3 max-w-lg">
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="Enter property address..."
                className="flex-1 px-4 py-3.5 rounded-xl border border-gray-200 text-[#07172e] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0465f2] focus:border-transparent"
              />
              <button
                type="submit"
                disabled={isNavigating || !searchAddress.trim()}
                className="px-6 py-3.5 bg-[#07172e] text-white font-semibold rounded-xl hover:bg-[#0465f2] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#0465f2]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isNavigating ? (
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
          
          <div className="flex gap-4 flex-wrap mb-10">
            <button 
              onClick={onSwitchMode}
              className="px-6 py-3 bg-gradient-to-r from-[#0465f2] to-[#00e5ff] text-white font-semibold rounded-xl hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#0465f2]/40 transition-all flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Point & Scan
            </button>
            <a href="#how-it-works" className="px-6 py-3 bg-transparent text-[#07172e] font-semibold rounded-xl hover:bg-[#e1e8ed] transition-colors">
              See How It Works
            </a>
          </div>
          
          <div className="flex gap-10">
            <div>
              <div className="text-4xl font-extrabold bg-gradient-to-r from-[#0465f2] to-[#00e5ff] bg-clip-text text-transparent">60s</div>
              <div className="text-sm text-[#64748b] mt-1">Analysis Time</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold bg-gradient-to-r from-[#0465f2] to-[#00e5ff] bg-clip-text text-transparent">6</div>
              <div className="text-sm text-[#64748b] mt-1">Strategies</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold bg-gradient-to-r from-[#0465f2] to-[#00e5ff] bg-clip-text text-transparent">150M+</div>
              <div className="text-sm text-[#64748b] mt-1">Properties</div>
            </div>
          </div>
        </div>

        <div className="relative animate-fadeUp" style={{ animationDelay: '0.2s' }}>
          <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-[#07172e]/20">
            <img 
              src="/images/hero-phone-scan.png" 
              alt="InvestIQ - Point and scan any property" 
              className="w-full rounded-3xl"
            />
            
            {/* Scanner Overlay */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[45%] aspect-square pointer-events-none">
              <div className="absolute top-0 left-0 w-[20%] h-[20%] border-l-[3px] border-t-[3px] border-[#00e5ff]"></div>
              <div className="absolute top-0 right-0 w-[20%] h-[20%] border-r-[3px] border-t-[3px] border-[#00e5ff]"></div>
              <div className="absolute bottom-0 left-0 w-[20%] h-[20%] border-l-[3px] border-b-[3px] border-[#00e5ff]"></div>
              <div className="absolute bottom-0 right-0 w-[20%] h-[20%] border-r-[3px] border-b-[3px] border-[#00e5ff]"></div>
              <div className="absolute top-0 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent animate-scanMove"></div>
            </div>
          </div>

          {/* Floating Data Cards */}
          <div className="absolute top-[10%] -left-[10%] bg-white rounded-2xl p-4 shadow-xl animate-float z-10">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0465f2] to-[#00e5ff] rounded-xl flex items-center justify-center mb-2">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div className="text-xs text-[#64748b] font-medium">Monthly Cash Flow</div>
            <div className="text-lg font-bold text-[#10b981]">+$1,240</div>
          </div>

          <div className="absolute bottom-[25%] -right-[8%] bg-white rounded-2xl p-4 shadow-xl animate-float z-10" style={{ animationDelay: '0.5s' }}>
            <div className="w-10 h-10 bg-gradient-to-br from-[#0465f2] to-[#00e5ff] rounded-xl flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="text-xs text-[#64748b] font-medium">Annual ROI</div>
            <div className="text-lg font-bold text-[#10b981]">18.5%</div>
          </div>

          <div className="absolute bottom-[5%] -left-[5%] bg-white rounded-2xl p-4 shadow-xl animate-float z-10" style={{ animationDelay: '1s' }}>
            <div className="w-10 h-10 bg-gradient-to-br from-[#0465f2] to-[#00e5ff] rounded-xl flex items-center justify-center mb-2">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div className="text-xs text-[#64748b] font-medium">Cap Rate</div>
            <div className="text-lg font-bold text-[#07172e]">7.2%</div>
          </div>
        </div>
      </section>

      {/* Strategies Section */}
      <section id="strategies" className="py-24 px-[5%] bg-gradient-to-br from-[#07172e] to-[#0d2847] relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(4,101,242,0.15)_0%,transparent_60%)] pointer-events-none"></div>
        
        <div className="text-center mb-14 relative z-10">
          <h2 className="text-4xl font-bold text-white mb-3">6 Investment Strategies</h2>
          <p className="text-lg text-[#64748b]">Instant analytics for every approach</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 max-w-[1200px] mx-auto relative z-10">
          {strategies.map((strategy) => {
            const Icon = strategy.icon;
            return (
              <button
                key={strategy.id}
                onClick={() => setInfoModalStrategy(strategy.id)}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center transition-all hover:bg-white/10 hover:-translate-y-2 hover:shadow-2xl hover:shadow-black/30 hover:border-[#00e5ff] cursor-pointer group"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-[#0465f2] to-[#00e5ff] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-white text-sm font-semibold">{strategy.name}</h4>
              </button>
            );
          })}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-[5%] bg-white">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold text-[#07172e] mb-3">Why InvestIQ?</h2>
          <p className="text-xl font-semibold bg-gradient-to-r from-[#0465f2] to-[#00e5ff] bg-clip-text text-transparent">Invest Like a Guru</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1100px] mx-auto">
          {[
            { icon: Compass, title: 'GPS Property Detection', desc: 'Point your camera at any property. Our tech instantly identifies it using GPS and compass.' },
            { icon: BarChart3, title: 'Multi-Strategy Analysis', desc: 'Get instant ROI projections across 6 investment strategies tailored to your goals.' },
            { icon: Zap, title: 'Real-Time Market Data', desc: 'Access live comps, rental rates, and market trends updated continuously.' },
            { icon: LayoutGrid, title: 'Cash Flow Projections', desc: 'Detailed monthly and annual forecasts with complete expense breakdowns.' },
            { icon: Box, title: 'Professional Reports', desc: 'Generate investment-ready reports to share with partners and lenders.' },
            { icon: Users, title: 'Portfolio Tracking', desc: 'Save properties and track performance of your entire portfolio in one place.' },
          ].map((feature, idx) => (
            <div 
              key={idx} 
              className="p-8 rounded-2xl bg-[#f8fafc] transition-all relative overflow-hidden group hover:bg-white hover:shadow-xl hover:-translate-y-1"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#0465f2] to-[#00e5ff] scale-x-0 origin-left transition-transform group-hover:scale-x-100"></div>
              <div className="w-12 h-12 bg-gradient-to-br from-[#0465f2]/10 to-[#00e5ff]/10 rounded-xl flex items-center justify-center mb-5">
                <feature.icon className="w-6 h-6 text-[#0465f2]" />
              </div>
              <h3 className="text-lg font-semibold text-[#07172e] mb-2">{feature.title}</h3>
              <p className="text-sm text-[#64748b] leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-[5%] bg-[#f8fafc]">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold text-[#07172e] mb-3">How It Works</h2>
          <p className="text-lg text-[#64748b]">From property to investment decision in three simple steps</p>
        </div>
        
        <div className="flex flex-col md:flex-row justify-center gap-8 max-w-[1000px] mx-auto relative">
          <div className="hidden md:block absolute top-[60px] left-[18%] right-[18%] h-1 bg-gradient-to-r from-[#0465f2] to-[#00e5ff] rounded"></div>
          
          {[
            { icon: Camera, num: 1, title: 'Point at Property', desc: 'Use your camera or enter the address manually' },
            { icon: Zap, num: 2, title: 'Instant Scan', desc: 'GPS identifies the property in under 2 seconds' },
            { icon: BarChart3, num: 3, title: 'Get Analytics', desc: 'See strategies, cash flow, and ROI instantly' },
          ].map((step, idx) => (
            <div key={idx} className="flex-1 text-center relative group">
              <div className="w-[120px] h-[120px] bg-white border-4 border-[#0465f2] rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 transition-all group-hover:bg-gradient-to-br group-hover:from-[#0465f2] group-hover:to-[#00e5ff] group-hover:border-transparent group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-[#0465f2]/30">
                <span className="absolute -top-2 -right-2 w-8 h-8 bg-[#00e5ff] text-[#07172e] rounded-full flex items-center justify-center font-bold text-sm">{step.num}</span>
                <step.icon className="w-12 h-12 text-[#0465f2] group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-[#07172e] mb-2">{step.title}</h3>
              <p className="text-sm text-[#64748b] leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-[5%] bg-white">
        <div className="max-w-[1000px] mx-auto bg-gradient-to-br from-[#07172e] to-[#0d2847] rounded-[32px] p-10 lg:p-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative overflow-hidden">
          <div className="absolute top-[-50%] right-[-20%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(0,229,255,0.15)_0%,transparent_60%)] pointer-events-none"></div>
          
          <div className="relative z-10">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Ready to <span className="text-[#00e5ff]">Invest Like a Guru?</span>
            </h2>
            <p className="text-[#64748b] text-lg mb-8 leading-relaxed">
              Join thousands of investors making smarter decisions with InvestIQ. Start analyzing properties in seconds.
            </p>
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => setShowAuthModal('register')}
                className="px-6 py-3 bg-white text-[#07172e] font-semibold rounded-xl hover:-translate-y-0.5 hover:shadow-xl transition-all"
              >
                Get Started Free
              </button>
              <button className="px-6 py-3 bg-transparent text-white border-2 border-white/30 font-semibold rounded-xl hover:bg-white/10 hover:border-white/50 transition-all">
                Watch Demo
              </button>
            </div>
          </div>
          
          <div className="relative z-10 max-w-[400px] mx-auto lg:mx-0">
            <img 
              src="/images/dashboard-screenshot.png" 
              alt="InvestIQ Dashboard - Investment Analysis" 
              className="w-full rounded-2xl shadow-2xl shadow-black/30"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-[5%] bg-[#07172e] border-t border-white/5">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center flex-wrap gap-6">
          <span className="text-xl font-bold text-white/80">
            Invest<span className="text-[#0465f2]">IQ</span>
          </span>
          
          <div className="flex gap-8 flex-wrap justify-center">
            {['Features', 'Pricing', 'About', 'Contact', 'Privacy', 'Terms'].map((link) => (
              <a key={link} href="#" className="text-[#64748b] text-sm hover:text-[#00e5ff] transition-colors">{link}</a>
            ))}
          </div>
          
          <div className="text-[#64748b] text-sm">© 2025 InvestIQ. All rights reserved.</div>
        </div>
      </footer>

      {/* Strategy Info Modal */}
      {infoModalStrategy && (
        <StrategyInfoModal
          strategyId={infoModalStrategy}
          isOpen={!!infoModalStrategy}
          onClose={() => setInfoModalStrategy(null)}
        />
      )}

      {/* Animations */}
      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes scanMove {
          0%, 100% { top: 5%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 95%; opacity: 0; }
        }
        
        .animate-fadeUp {
          animation: fadeUp 0.8s ease-out both;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-scanMove {
          animation: scanMove 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
