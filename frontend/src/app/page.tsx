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
  Moon,
  X
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

type StrategyId = 'ltr' | 'str' | 'brrrr' | 'flip' | 'house_hack' | 'wholesale';

const strategies: { id: StrategyId; name: string; icon: typeof Building2; color: string }[] = [
  { id: 'ltr', name: 'Long-Term Rental', icon: Building2, color: 'from-violet-500 to-purple-600' },
  { id: 'str', name: 'Short-Term Rental', icon: Home, color: 'from-cyan-500 to-blue-600' },
  { id: 'brrrr', name: 'BRRRR', icon: Repeat, color: 'from-emerald-500 to-green-600' },
  { id: 'flip', name: 'Fix & Flip', icon: Hammer, color: 'from-orange-500 to-red-500' },
  { id: 'house_hack', name: 'House Hack', icon: Users, color: 'from-blue-500 to-indigo-600' },
  { id: 'wholesale', name: 'Wholesale', icon: FileText, color: 'from-pink-500 to-rose-600' },
];

// Strategy explanations for the info modal - using JSX for rich formatting
const strategyExplanations: Record<StrategyId, { title: string; content: React.ReactNode }> = {
  ltr: {
    title: 'Long-Term Rental',
    content: (
      <>
        <p className="mb-3"><strong>Long-term rental</strong> is the classic buy-and-hold strategy that&apos;s made countless millionaires! You purchase a property, rent it out to reliable tenants on an annual lease, and watch your wealth grow on autopilot. Every month, rent checks come in while your tenants pay down your mortgage for you.</p>
        <p className="mb-2">The magic happens in three ways:</p>
        <ol className="list-decimal list-inside mb-3 space-y-1 ml-2">
          <li>Monthly cash flow puts money in your pocket. NOW!</li>
          <li>Your tenants build equity for you by paying down the loan</li>
          <li>Appreciation grows your property value over time.</li>
        </ol>
        <p>It&apos;s the perfect <strong>&quot;set it and forget it&quot;</strong> strategy—ideal for investor who want to build lasting wealth without the stress of constant management. Think of it as planting a money tree that grows stronger every year!</p>
      </>
    )
  },
  str: {
    title: 'Short-Term Rental',
    content: (
      <>
        <p className="mb-3"><strong>Short-term rental</strong> is where you turn your property into a high-revenue hospitality business using platforms like Airbnb or VRBO! Instead of one tenant paying $2,000/month, imagine multiple guests paying $150-$300 PER NIGHT! Properties in hot tourist areas or business districts can generate <strong>2-3X more revenue</strong> than traditional rentals.</p>
        <p className="mb-3">Yes, it requires more hands-on management (or a property manager), but the numbers speak for themselves. You&apos;re not just a landlord—you&apos;re running a hospitality business that can generate serious cash flow. Perfect for properties <strong>near beaches, mountains, major cities</strong>, or business hubs.</p>
        <p><strong>The best part?</strong> You can block off dates to use the property yourself for vacations!</p>
      </>
    )
  },
  brrrr: {
    title: 'BRRRR',
    content: (
      <>
        <p className="mb-3"><strong>BRRRR</strong> stands for <strong>Buy, Rehab, Rent, Refinance, Repeat</strong>—and it&apos;s the holy grail for serious investors who want to scale FAST!</p>
        <p className="mb-2">Here&apos;s how it works:</p>
        <ul className="list-disc list-inside mb-3 space-y-1 ml-2">
          <li>Buy a distressed property below market value,</li>
          <li>Rehab it to increase its worth,</li>
          <li>Rent it out to generate cash flow,</li>
          <li>Refinance based on the NEW higher value to pull out most (or ALL) of your initial investment.</li>
          <li>Repeat the process!</li>
        </ul>
        <p className="mb-3">Now you have a cash-flowing property AND you got your money back to Repeat the process! It&apos;s like having your cake and eating it too. Investors use BRRRR to build massive portfolios quickly because each deal funds the next one. The goal is &quot;infinite return&quot;—when you&apos;ve pulled out 100% of your investment but still own a property that pays you every month. Mind-blowing, right?</p>
      </>
    )
  },
  flip: {
    title: 'Fix & Flip',
    content: (
      <>
        <p className="mb-3"><strong>Fix & Flip</strong> is the <strong>fast-cash strategy</strong> where you buy a distressed property at a discount, transform it into something beautiful, and sell it for profit—sometimes in just 3-6 months!</p>
        <p className="mb-3">While other strategies build wealth slowly over time, flipping puts tens of thousands of dollars in your pocket, NOW!</p>
        <p className="mb-3">It requires more work and carries more risk, but the rewards can be exceptional. A successful flip can net you <strong>$30,000-$100,000+ in profit</strong> that you can use to fund your next deal or invest in rental properties.</p>
        <p>It&apos;s <strong>thrilling</strong>, it&apos;s <strong>fast-paced</strong>, and every successful flip proves you can spot value where others see problems! If you love HGTV and want to see big checks FAST, flipping is your game!</p>
      </>
    )
  },
  house_hack: {
    title: 'House Hacking',
    content: (
      <>
        <p className="mb-3"><strong>House hacking</strong> is the <strong>ultimate beginner</strong> strategy where your biggest expense—housing—becomes your biggest asset instead!</p>
        <p className="mb-3">You buy a duplex, triplex, or single-family home with extra bedrooms, live in one unit/room, and rent out the others. The rent from your tenants covers most or ALL of your mortgage, property taxes, and insurance.</p>
        <p className="mb-3">You&apos;re essentially <strong>living for FREE</strong> while building equity and learning the landlord game with training wheels on. Plus, you can qualify for low down payment loans (as low as 3.5% FHA or 0% VA) because it&apos;s your primary residence! It&apos;s the fastest path from &quot;paying rent&quot; to &quot;collecting rent&quot; and building wealth. This strategy has created more first-time millionaire investors than any other!</p>
      </>
    )
  },
  wholesale: {
    title: 'Wholesale',
    content: (
      <>
        <p className="mb-3"><strong>Wholesaling</strong> is how you make money in real estate with <strong>little to no money</strong> of your own!</p>
        <p className="mb-2">Here&apos;s the genius:</p>
        <ol className="list-decimal list-inside mb-3 space-y-1 ml-2">
          <li>You find deeply discounted properties (usually distressed), get them under contract,</li>
          <li>Immediately assign that contract to another investor for a fee—typically $5,000-$15,000 or more.</li>
        </ol>
        <p className="mb-3">You never actually buy the property, never deal with banks, and never risk your own capital.</p>
        <p><strong>It&apos;s pure deal-finding hustle!</strong> Your job is to be the matchmaker—connecting motivated sellers with cash buyers. While it won&apos;t build long-term wealth like rentals, it generates quick cash that you can use to fund your first rental property down payment. Many successful investors started with wholesaling to build their war chest before transitioning to buy-and-hold strategies. It&apos;s all about hustle, marketing, and building your buyer network!</p>
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
  const explanation = strategyExplanations[strategyId]
  const strategy = strategies.find(s => s.id === strategyId)
  
  if (!isOpen || !explanation || !strategy) return null
  
  // Map strategy gradient to button gradient
  const buttonGradient: Record<string, string> = {
    'from-violet-500 to-purple-600': 'from-violet-500 to-purple-600',
    'from-cyan-500 to-blue-600': 'from-cyan-500 to-blue-600',
    'from-emerald-500 to-green-600': 'from-emerald-500 to-green-600',
    'from-orange-500 to-red-500': 'from-orange-500 to-red-500',
    'from-blue-500 to-indigo-600': 'from-blue-500 to-indigo-600',
    'from-pink-500 to-rose-600': 'from-pink-500 to-rose-600',
  }
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button - top right */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
        
        {/* Content */}
        <div className="px-5 py-5 overflow-y-auto max-h-[70vh]">
          <div className="text-sm text-gray-700 leading-relaxed pr-6">
            {explanation.content}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className={`w-full py-2.5 bg-gradient-to-r ${buttonGradient[strategy.color] || 'from-teal-500 to-emerald-500'} text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity`}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  )
}

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
  const { theme, toggleTheme, mounted } = useTheme();
  const [searchAddress, setSearchAddress] = useState('');
  const [nearbyProperties, setNearbyProperties] = useState<ScanResult['property'][]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [infoModalStrategy, setInfoModalStrategy] = useState<StrategyId | null>(null);
  
  const scanner = usePropertyScan();
  const isDark = theme === 'dark';

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
    // #region agent log
    const targetUrl = `/property?address=${encodeURIComponent(searchAddress)}`;
    console.log('[DEBUG handleSearch]', { searchAddress, targetUrl });
    fetch('http://127.0.0.1:7242/ingest/250db88b-cb2f-47ab-a05c-b18e39a0f184',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:handleSearch',message:'Search button clicked',data:{searchAddress,targetUrl},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
    // #endregion
    if (searchAddress.trim()) {
      setIsNavigating(true);
      window.location.href = targetUrl;
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
    <main className={`min-h-screen transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950' 
        : 'bg-gradient-to-b from-slate-50 via-white to-teal-50/30'
    }`}>
      {/* #region agent log - DEBUG BANNER */}
      <div className="bg-yellow-400 text-black text-center py-2 text-sm font-bold">
        DEBUG: You are on {typeof window !== 'undefined' ? window.location.host : 'server'} (v2)
      </div>
      {/* #endregion */}
      {/* Theme Toggle Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${
        isDark 
          ? 'bg-slate-900/80 border-slate-700/50' 
          : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>InvestIQ</span>
          </div>
          
          {/* Theme Toggle Switch */}
          <button
            onClick={toggleTheme}
            className={`relative inline-flex items-center justify-center p-2 rounded-xl transition-colors duration-200 ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            <div className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
              isDark ? 'bg-slate-600' : 'bg-gray-300'
            }`}>
              <div 
                className={`absolute top-0.5 w-6 h-6 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
                  isDark 
                    ? 'left-[30px] bg-indigo-500' 
                    : 'left-0.5 bg-amber-400'
                }`}
              >
                {isDark ? (
                  <Moon className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-white" />
                )}
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* Hero Section with Scanner */}
      <section className="relative overflow-hidden">
        {/* Background gradient overlay */}
        <div className={`absolute inset-0 ${
          isDark 
            ? 'bg-gradient-to-b from-purple-900/20 via-transparent to-transparent' 
            : 'bg-gradient-to-b from-teal-100/40 via-transparent to-transparent'
        }`} />
        
        {/* Animated background dots */}
        <div className={`absolute inset-0 ${isDark ? 'opacity-20' : 'opacity-30'}`}>
          <div className="absolute inset-0" style={{
            backgroundImage: isDark 
              ? 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)'
              : 'radial-gradient(circle at 2px 2px, rgba(0,128,128,0.12) 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }} />
        </div>

        <div className="relative px-6 pt-12 pb-16">
          {/* Title */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h1 className={`text-4xl md:text-5xl font-bold mb-4 leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Point. Scan.
              <br />
              <span className="bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
                Analyze Instantly.
              </span>
            </h1>
            <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Aim your phone at any property to unlock investment analytics across 6 strategies in seconds.
            </p>
          </div>

          {/* Large Scan Button */}
          <div className="flex flex-col items-center mb-10">
            <button
              onClick={onSwitchMode}
              className={`group relative w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 bg-gradient-to-br from-teal-400 to-teal-600 hover:from-teal-500 hover:to-teal-700 hover:scale-105 cursor-pointer ${
                isDark ? 'shadow-2xl shadow-teal-500/40' : 'shadow-2xl shadow-teal-500/30'
              }`}
            >
              {/* Animated ping ring */}
              <div className={`absolute inset-0 rounded-full border-2 animate-ping ${
                isDark ? 'border-teal-400/50' : 'border-teal-500/40'
              }`} />
              
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
                  <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-green-400' : 'bg-green-500'}`} />
                  <span className={isDark ? 'text-green-400' : 'text-green-600'}>GPS Ready</span>
                </>
              ) : scanner.locationError ? (
                <>
                  <div className="w-2 h-2 bg-gray-500 rounded-full" />
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>GPS unavailable</span>
                </>
              ) : (
                <>
                  <div className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-amber-400' : 'bg-amber-500'}`} />
                  <span className={isDark ? 'text-amber-400' : 'text-amber-600'}>Acquiring GPS...</span>
                </>
              )}
            </div>
          </div>

          {/* OR Divider */}
          <div className="flex items-center justify-center gap-4 mb-8 max-w-md mx-auto">
            <div className={`flex-1 h-px bg-gradient-to-r from-transparent to-transparent ${
              isDark ? 'via-slate-700' : 'via-gray-300'
            }`} />
            <span className={isDark ? 'text-slate-500' : 'text-gray-400'}>or</span>
            <div className={`flex-1 h-px bg-gradient-to-r from-transparent to-transparent ${
              isDark ? 'via-slate-700' : 'via-gray-300'
            }`} />
          </div>

          {/* Search by Address */}
          <div className="max-w-md mx-auto">
            <div className={`backdrop-blur-sm rounded-2xl p-5 border transition-colors duration-300 ${
              isDark 
                ? 'bg-slate-800/50 border-slate-700/50' 
                : 'bg-white/70 border-gray-200 shadow-lg'
            }`}>
              <div className={`flex items-center gap-2 mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Search className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className="text-sm font-medium">Search by Address</span>
              </div>
              
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  placeholder="1451 SW 10 ST, Boca Raton, FL 33486"
                  className={`w-full px-4 py-3 rounded-xl mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors duration-300 ${
                    isDark 
                      ? 'bg-slate-900/80 border border-slate-600 text-white placeholder-gray-500' 
                      : 'bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400'
                  }`}
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
            <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>6 Investment Strategies</h2>
            <p className={isDark ? 'text-gray-500' : 'text-gray-500'}>Instant analytics for every approach</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {strategies.map((strategy) => {
              const Icon = strategy.icon;
              const iconColorMapDark: Record<string, string> = {
                'from-violet-500 to-purple-600': 'bg-violet-500/20 text-violet-400',
                'from-cyan-500 to-blue-600': 'bg-cyan-500/20 text-cyan-400',
                'from-emerald-500 to-green-600': 'bg-emerald-500/20 text-emerald-400',
                'from-orange-500 to-red-500': 'bg-orange-500/20 text-orange-400',
                'from-blue-500 to-indigo-600': 'bg-blue-500/20 text-blue-400',
                'from-pink-500 to-rose-600': 'bg-pink-500/20 text-pink-400',
              };
              const iconColorMapLight: Record<string, string> = {
                'from-violet-500 to-purple-600': 'bg-violet-100 text-violet-600',
                'from-cyan-500 to-blue-600': 'bg-cyan-100 text-cyan-600',
                'from-emerald-500 to-green-600': 'bg-emerald-100 text-emerald-600',
                'from-orange-500 to-red-500': 'bg-orange-100 text-orange-600',
                'from-blue-500 to-indigo-600': 'bg-blue-100 text-blue-600',
                'from-pink-500 to-rose-600': 'bg-pink-100 text-pink-600',
              };
              const iconColor = isDark 
                ? (iconColorMapDark[strategy.color] || 'bg-gray-500/20 text-gray-400')
                : (iconColorMapLight[strategy.color] || 'bg-gray-100 text-gray-600');
              
              return (
                <button
                  key={strategy.id}
                  type="button"
                  onClick={() => setInfoModalStrategy(strategy.id)}
                  className={`backdrop-blur-sm rounded-2xl p-5 border transition-all group flex flex-col items-center text-center cursor-pointer ${
                    isDark 
                      ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-500 hover:bg-slate-800/70' 
                      : 'bg-white/70 border-gray-200 hover:border-gray-300 hover:bg-white shadow-sm hover:shadow-md'
                  }`}
                  aria-label={`Learn about ${strategy.name}`}
                >
                  <div className={`w-12 h-12 rounded-xl ${iconColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{strategy.name}</h3>
                </button>
              );
            })}
          </div>
          
          {/* Strategy Info Modal */}
          {infoModalStrategy && (
            <StrategyInfoModal
              strategyId={infoModalStrategy}
              isOpen={!!infoModalStrategy}
              onClose={() => setInfoModalStrategy(null)}
            />
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className={`backdrop-blur-sm rounded-3xl p-8 border transition-colors duration-300 ${
            isDark 
              ? 'bg-slate-800/30 border-slate-700/50' 
              : 'bg-white/60 border-gray-200 shadow-lg'
          }`}>
            <h2 className={`text-2xl font-bold mb-10 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>How It Works</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-lg">
                  <Target className="w-7 h-7 text-white" />
                </div>
                <div className={`text-2xl font-bold mb-2 ${isDark ? 'text-slate-600' : 'text-gray-300'}`}>01</div>
                <h3 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Point at Property</h3>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                  Use your phone&apos;s camera to aim at any property you want to analyze
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-lg">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div className={`text-2xl font-bold mb-2 ${isDark ? 'text-slate-600' : 'text-gray-300'}`}>02</div>
                <h3 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Instant Scan</h3>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                  GPS and compass identify the exact property in under 2 seconds
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg">
                  <Home className="w-7 h-7 text-white" />
                </div>
                <div className={`text-2xl font-bold mb-2 ${isDark ? 'text-slate-600' : 'text-gray-300'}`}>03</div>
                <h3 className={`font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Get Analytics</h3>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
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
            <div className={`backdrop-blur-sm rounded-2xl p-6 border transition-colors duration-300 ${
              isDark 
                ? 'bg-slate-800/30 border-slate-700/50' 
                : 'bg-white/60 border-gray-200 shadow-lg'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Nearby Properties</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    {scanner.latitude?.toFixed(6)}, {scanner.longitude?.toFixed(6)}
                  </p>
                </div>
                <button
                  onClick={fetchNearbyProperties}
                  disabled={isLoadingNearby}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    isDark 
                      ? 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30' 
                      : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                  }`}
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
                    className={`flex items-center gap-3 p-4 rounded-xl transition-colors text-left w-full group ${
                      isDark 
                        ? 'bg-slate-700/50 hover:bg-slate-700' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isDark ? 'bg-teal-500/20' : 'bg-teal-100'
                    }`}>
                      <Home className={`w-5 h-5 ${isDark ? 'text-teal-400' : 'text-teal-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{property.address}</div>
                      <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{property.city}, {property.state} {property.zip}</div>
                    </div>
                    <ChevronRight className={`w-5 h-5 transition-colors ${
                      isDark 
                        ? 'text-slate-600 group-hover:text-slate-400' 
                        : 'text-gray-400 group-hover:text-gray-600'
                    }`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className={`px-6 py-8 mt-8 border-t transition-colors duration-300 ${
        isDark ? 'border-slate-800' : 'border-gray-200'
      }`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>InvestIQ</span>
          </div>
          <p className={`text-sm ${isDark ? 'text-gray-600' : 'text-gray-500'}`}>Real estate investment analytics</p>
        </div>
      </footer>
    </main>
  );
}
