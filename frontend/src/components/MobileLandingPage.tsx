'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Camera,
  Home,
  Calendar,
  Wrench,
  RefreshCw,
  Users,
  Clock,
  BarChart3,
  Search,
  MapPin,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PhoneScannerMockup } from './PhoneScannerMockup';

interface MobileLandingPageProps {
  onPointAndScan: () => void;
}

export function MobileLandingPage({ onPointAndScan }: MobileLandingPageProps) {
  const router = useRouter();
  const { user, isAuthenticated, setShowAuthModal } = useAuth();
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleAnalyze = () => {
    if (!searchAddress.trim()) return;
    setIsSearching(true);
    // Navigate to property page with the address
    router.push(`/property/${encodeURIComponent(searchAddress.trim())}`);
  };

  const strategies = [
    { name: 'Long-Term Rental', roi: '18%', icon: Home, featured: false, multiplier: '3X', profit: '$42K' },
    { name: 'Short-Term Rental', roi: '28%', icon: Calendar, featured: false, multiplier: '5X', profit: '$68K' },
    { name: 'Fix & Flip', roi: '22%', icon: Wrench, featured: false, multiplier: '2X', profit: '$55K' },
    { name: 'BRRRR', roi: '35%', icon: RefreshCw, featured: true, multiplier: '7X', profit: '$81K' },
    { name: 'House Hack', roi: '25%', icon: Home, featured: false, multiplier: '4X', profit: '$48K' },
    { name: 'Wholesale', roi: '12%', icon: Users, featured: false, multiplier: '1.5X', profit: '$22K' },
  ];

  return (
    <div className="min-h-screen bg-[#07172e] text-[#e1e8ed] overflow-x-hidden">
      {/* Background Gradient */}
      <div 
        className="absolute top-0 left-0 right-0 h-[600px] pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 60% at 50% -20%, rgba(4, 101, 242, 0.3) 0%, transparent 60%),
            radial-gradient(ellipse 80% 50% at 100% 10%, rgba(0, 229, 255, 0.15) 0%, transparent 50%)
          `
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-5 py-4">
        <img 
          src="/images/InvestIQ Logo 3D (Dark View).png" 
          alt="InvestIQ" 
          className="h-10 object-contain"
        />
        
        {isAuthenticated && user ? (
          <button
            onClick={() => router.push('/dashboard')}
            className="px-5 py-2.5 bg-white/[0.08] border border-white/[0.15] rounded-lg text-[#e1e8ed] font-medium text-sm"
          >
            Dashboard
          </button>
        ) : (
          <button
            onClick={() => setShowAuthModal('login')}
            className="px-5 py-2.5 bg-white/[0.08] border border-white/[0.15] rounded-lg text-[#e1e8ed] font-medium text-sm"
          >
            Sign In
          </button>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-5 pt-6 text-center">
        <h1 className="font-semibold text-[28px] leading-[1.2] text-white mb-2.5 tracking-tight">
          Analyze Any Property&apos;s<br />Potential in <span className="text-accent-500">60 Seconds</span>
        </h1>
        <p className="text-sm text-[#8892a0] mb-6 leading-relaxed">
          Compare 6 investment strategies and discover your best path to profit
        </p>
        
        {/* CTA Buttons */}
        <div className="flex flex-col items-center gap-3 w-full max-w-[320px] mx-auto">
          <button
            onClick={onPointAndScan}
            className="inline-flex items-center justify-center gap-2.5 px-9 py-4 bg-gradient-to-br from-brand-500 to-[#0876ff] rounded-full text-white font-semibold text-[15px] w-full"
            style={{ boxShadow: '0 8px 30px rgba(4, 101, 242, 0.45)' }}
          >
            <Camera className="w-5 h-5" />
            Point & Scan
          </button>
          
          {/* Search by Address Toggle */}
          <button
            onClick={() => setShowSearchBar(!showSearchBar)}
            className="text-white text-sm underline flex items-center gap-1"
          >
            Or search by address
            {showSearchBar ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {/* Search Dropdown */}
          {showSearchBar && (
            <div 
              className="w-full mt-2 p-4 rounded-2xl border border-white/10 animate-in slide-in-from-top-2 duration-200"
              style={{ 
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)'
              }}
            >
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-3 border border-white/10">
                <MapPin className="w-5 h-5 text-accent-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Enter property address..."
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  className="flex-1 bg-transparent text-white placeholder-white/50 text-sm outline-none"
                  autoFocus
                />
              </div>
              <button
                onClick={handleAnalyze}
                disabled={!searchAddress.trim() || isSearching}
                className={`w-full mt-3 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
                  ${searchAddress.trim() 
                    ? 'bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-lg shadow-brand-500/30' 
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                  }`}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Analyze Property
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Phone Showcase */}
      <section className="relative z-10 px-4 pt-8 pb-5 flex justify-center">
        <PhoneScannerMockup />
      </section>

      {/* Results Section - Dark Background */}
      <section 
        className="relative px-5 py-12 mt-5"
        style={{ background: 'linear-gradient(180deg, #0a1628 0%, #07172e 50%, #061324 100%)' }}
      >
        {/* Subtle glow effect */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[150px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(0, 229, 255, 0.15) 0%, transparent 70%)' }}
        />
        
        {/* Section Header */}
        <div className="relative z-10 text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            See Your <span className="text-accent-500">Profit Potential</span>
          </h2>
          <p className="text-[#8892a0] text-sm">
            Compare 6 strategies instantly
          </p>
        </div>

        {/* Strategy Cards Grid */}
        <div className="relative z-10 grid grid-cols-2 gap-3 mb-8">
          {strategies.map((strategy, idx) => (
            <StrategyCard
              key={idx}
              name={strategy.name}
              roi={strategy.roi}
              icon={strategy.icon}
              featured={strategy.featured}
              multiplier={strategy.multiplier}
              profit={strategy.profit}
            />
          ))}
        </div>

        {/* Social Proof */}
        <div className="relative z-10 flex items-center justify-center gap-6 py-6 border-t border-white/10">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent-500">10K+</div>
            <div className="text-[11px] text-[#8892a0]">Properties Analyzed</div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">$2.4M</div>
            <div className="text-[11px] text-[#8892a0]">Profit Identified</div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-center">
            <div className="text-2xl font-bold text-white">60s</div>
            <div className="text-[11px] text-[#8892a0]">Avg Analysis</div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="relative z-10 mt-6">
          <button
            onClick={onPointAndScan}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white"
            style={{
              background: 'linear-gradient(135deg, #0465f2 0%, #00e5ff 100%)',
              boxShadow: '0 8px 32px rgba(4, 101, 242, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
            }}
          >
            Start Analyzing Now
          </button>
          <p className="text-center text-[12px] text-[#8892a0] mt-3">
            Free • No credit card required
          </p>
        </div>
      </section>

      {/* Bottom Features Bar */}
      <div 
        className="flex justify-around py-6 px-5"
        style={{ background: '#061324' }}
      >
        <FeatureItem icon={Camera} text="Point & Scan" />
        <FeatureItem icon={Clock} text="60 Seconds" />
        <FeatureItem icon={BarChart3} text="6 Strategies" />
      </div>
    </div>
  );
}

// Strategy Card Component
interface StrategyCardProps {
  name: string;
  roi: string;
  icon: React.ComponentType<{ className?: string }>;
  featured?: boolean;
  multiplier?: string;
  profit?: string;
}

function StrategyCard({ name, roi, icon: Icon, featured, multiplier, profit }: StrategyCardProps) {
  return (
    <div 
      className={`relative rounded-2xl p-4 overflow-hidden
        ${featured 
          ? 'bg-gradient-to-br from-accent-500/20 to-brand-500/20 border-2 border-accent-500/50' 
          : 'bg-white/[0.08] border border-white/10'
        }`}
      style={{ 
        boxShadow: featured 
          ? '0 8px 32px rgba(0, 229, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)' 
          : '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
      }}
    >
      {/* Featured Badge */}
      {featured && (
        <div className="absolute top-2 right-2 bg-accent-500 text-[#07172e] text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wide">
          Best ROI
        </div>
      )}

      {/* Multiplier Badge */}
      {multiplier && !featured && (
        <div className="absolute top-2 right-2 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-lg">
          {multiplier}
        </div>
      )}
      
      {/* Icon & Name Row */}
      <div className="flex items-center gap-2 mb-3">
        <div 
          className={`w-10 h-10 rounded-xl flex items-center justify-center
            ${featured ? 'bg-accent-500/30' : 'bg-brand-500/20'}`}
        >
          <Icon className={`w-5 h-5 ${featured ? 'text-accent-400' : 'text-brand-400'}`} />
        </div>
        <div className={`text-sm font-semibold ${featured ? 'text-white' : 'text-white/90'}`}>
          {name}
        </div>
      </div>
      
      {/* Metrics Row */}
      <div className="flex items-end justify-between">
        {/* ROI */}
        <div>
          <div className="text-[11px] text-[#8892a0] mb-0.5 uppercase tracking-wide">ROI</div>
          <div className={`text-3xl font-bold ${featured ? 'text-accent-400' : 'text-white'}`}>
            {roi}
          </div>
        </div>
        
        {/* Mini Growth Chart */}
        <div className="flex items-end gap-[3px] h-8">
          {[3, 5, 4, 7, 6, 9, 8, 12].map((h, i) => (
            <div 
              key={i}
              className={`w-[4px] rounded-sm ${featured ? 'bg-accent-500' : 'bg-brand-500'}`}
              style={{ 
                height: `${h * 2.5}px`,
                opacity: 0.4 + (i * 0.08)
              }}
            />
          ))}
          {/* Upward arrow */}
          <div className={`ml-1 ${featured ? 'text-accent-400' : 'text-emerald-400'}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 10V2M6 2L2 6M6 2L10 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Profit Indicator */}
      {profit && (
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-[#8892a0]">Est. Profit</span>
          <span className={`text-sm font-bold ${featured ? 'text-accent-400' : 'text-emerald-400'}`}>
            {profit}
            {featured && multiplier && (
              <span className="ml-1.5 text-[10px] bg-accent-500/30 px-1.5 py-0.5 rounded text-accent-300">
                {multiplier}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

// Feature Item Component
interface FeatureItemProps {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}

function FeatureItem({ icon: Icon, text }: FeatureItemProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-12 h-12 bg-white/[0.08] border border-white/10 rounded-xl flex items-center justify-center">
        <Icon className="w-5 h-5 text-accent-500" />
      </div>
      <span className="text-[12px] font-medium text-white/80">{text}</span>
    </div>
  );
}

