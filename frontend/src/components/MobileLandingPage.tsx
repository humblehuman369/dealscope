'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Home,
  Calendar,
  Wrench,
  RefreshCw,
  Users,
  Clock,
  BarChart3,
  Search,
  MapPin,
  Camera,
  Loader2,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { PhoneScannerMockup } from './PhoneScannerMockup';

interface LandingPageProps {
  onPointAndScan: () => void;
}

// Renamed to be used for both mobile and desktop
export function MobileLandingPage({ onPointAndScan }: LandingPageProps) {
  const router = useRouter();
  const { user, isAuthenticated, setShowAuthModal, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleAnalyze = async () => {
    if (!searchAddress.trim()) return;
    setIsSearching(true);
    try {
      await router.push(`/property/${encodeURIComponent(searchAddress.trim())}`);
    } catch {
      // Navigation failed - user can retry
    } finally {
      setIsSearching(false);
    }
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
    <div className={`min-h-screen overflow-x-hidden transition-colors duration-300 ${
      isDark ? 'bg-[#07172e] text-[#e1e8ed]' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Background Gradient */}
      <div 
        className="absolute top-0 left-0 right-0 h-[600px] lg:h-[800px] pointer-events-none z-0"
        style={{
          background: isDark
            ? `
              radial-gradient(ellipse 120% 60% at 50% -20%, rgba(4, 101, 242, 0.3) 0%, transparent 60%),
              radial-gradient(ellipse 80% 50% at 100% 10%, rgba(0, 229, 255, 0.15) 0%, transparent 50%)
            `
            : `
              radial-gradient(ellipse 120% 60% at 50% -20%, rgba(4, 101, 242, 0.15) 0%, transparent 60%),
              radial-gradient(ellipse 80% 50% at 100% 10%, rgba(0, 126, 167, 0.12) 0%, transparent 50%)
            `
        }}
      />

      {/* Header - Responsive */}
      <header className="relative z-10 flex justify-between items-center px-5 py-3 lg:px-12 lg:py-5 max-w-7xl mx-auto">
        <div className={`text-xl lg:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Invest<span className="text-brand-500">IQ</span>
        </div>
        
        <div className="flex items-center gap-3 lg:gap-4">
          {/* Theme Toggle - Desktop */}
          <button
            onClick={toggleTheme}
            className={`hidden lg:flex w-10 h-10 rounded-xl items-center justify-center transition-colors ${
              isDark 
                ? 'bg-white/10 hover:bg-white/15' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-accent-light" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {isAuthenticated && user ? (
            <>
              <button
                onClick={() => router.push('/dashboard')}
                className={`text-sm lg:text-base font-medium transition-colors ${
                  isDark 
                    ? 'text-white/70 hover:text-white' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={logout}
                className={`hidden lg:block text-sm font-medium transition-colors ${
                  isDark 
                    ? 'text-white/50 hover:text-white/70' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowAuthModal('login')}
                className={`text-sm lg:text-base font-medium transition-colors ${
                  isDark 
                    ? 'text-white/70 hover:text-white' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setShowAuthModal('register')}
                className="hidden lg:block px-5 py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section - Responsive */}
      <section className="relative z-10 px-5 pt-6 lg:pt-16 text-center max-w-4xl mx-auto">
        <h1 className={`font-bold text-[28px] lg:text-[52px] leading-[1.2] mb-1 lg:mb-2 tracking-tight ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          Know the Real Return
        </h1>
        <p className={`text-[28px] lg:text-[52px] leading-[1.2] mb-3 lg:mb-6 tracking-tight font-bold italic ${isDark ? 'text-accent-500' : 'text-accent-light'}`}>
          Before You Buy
        </p>
        <p className={`text-sm lg:text-xl mb-6 lg:mb-10 leading-relaxed ${isDark ? 'text-[#8892a0]' : 'text-gray-500'}`}>
          Instantly reveal a property&apos;s real investment potential in 60 seconds.
        </p>
        
      </section>

      {/* Scanner Viewfinder with integrated CTAs - Responsive */}
      <section className="relative z-10 px-4 pt-6 lg:pt-0 pb-5 lg:pb-12 flex flex-col items-center max-w-2xl mx-auto">
        <PhoneScannerMockup 
          isDark={isDark} 
          onScanPress={onPointAndScan}
          onAddressPress={() => setShowSearchBar(!showSearchBar)}
        />
        
        {/* Address Search Dropdown */}
        {showSearchBar && (
          <div 
            className={`w-full max-w-[460px] mt-4 p-4 lg:p-5 rounded-2xl border animate-in slide-in-from-top-2 duration-200 ${
              isDark 
                ? 'bg-white/[0.08] border-white/10' 
                : 'bg-white border-gray-200 shadow-lg'
            }`}
            style={{ backdropFilter: isDark ? 'blur(12px)' : undefined }}
          >
            <div className={`flex items-center gap-2 rounded-xl px-4 py-3 lg:py-4 border ${
              isDark 
                ? 'bg-white/10 border-white/10' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <MapPin className={`w-5 h-5 lg:w-6 lg:h-6 flex-shrink-0 ${isDark ? 'text-accent-500' : 'text-accent-light'}`} />
              <input
                type="text"
                placeholder="Enter property address..."
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                className={`flex-1 bg-transparent text-sm lg:text-base outline-none ${
                  isDark 
                    ? 'text-white placeholder-white/50' 
                    : 'text-gray-900 placeholder-gray-400'
                }`}
                autoFocus
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={!searchAddress.trim() || isSearching}
              className={`w-full mt-3 py-3.5 lg:py-4 rounded-xl font-bold text-sm lg:text-base flex items-center justify-center gap-2 transition-all
                ${searchAddress.trim() 
                  ? `bg-gradient-to-r from-brand-500 ${isDark ? 'to-accent-500' : 'to-accent-light'} text-white shadow-lg shadow-brand-500/30` 
                  : isDark 
                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 lg:w-5 lg:h-5" />
                  Analyze Property
                </>
              )}
            </button>
          </div>
        )}
      </section>

      {/* Results Section - Responsive */}
      <section 
        className="relative px-5 py-12 lg:py-20 mt-5"
        style={{ 
          background: isDark 
            ? 'linear-gradient(180deg, #0a1628 0%, #07172e 50%, #061324 100%)' 
            : 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)'
        }}
      >
        {/* Subtle glow effect */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] lg:w-[500px] h-[150px] lg:h-[200px] pointer-events-none"
          style={{ 
            background: isDark 
              ? 'radial-gradient(ellipse, rgba(0, 229, 255, 0.15) 0%, transparent 70%)' 
              : 'radial-gradient(ellipse, rgba(0, 126, 167, 0.15) 0%, transparent 70%)'
          }}
        />
        
        {/* Section Header */}
        <div className="relative z-10 text-center mb-8 lg:mb-12 max-w-4xl mx-auto">
          <h2 className={`text-2xl lg:text-4xl font-bold mb-2 lg:mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            See Your <span className={isDark ? 'text-accent-500' : 'text-accent-light'}>Profit Potential</span>
          </h2>
          <p className={`text-sm lg:text-lg ${isDark ? 'text-[#8892a0]' : 'text-gray-500'}`}>
            Compare 6 strategies instantly
          </p>
        </div>

        {/* Strategy Cards Grid - 2 cols mobile, 3 cols desktop */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-5 mb-8 lg:mb-12 max-w-5xl mx-auto">
          {strategies.map((strategy, idx) => (
            <StrategyCard
              key={idx}
              name={strategy.name}
              roi={strategy.roi}
              icon={strategy.icon}
              featured={strategy.featured}
              multiplier={strategy.multiplier}
              profit={strategy.profit}
              isDark={isDark}
            />
          ))}
        </div>

        {/* Social Proof - Responsive */}
        <div className={`relative z-10 flex items-center justify-center gap-6 lg:gap-16 py-6 lg:py-10 border-t max-w-4xl mx-auto ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <div className="text-center">
            <div className={`text-2xl lg:text-4xl font-bold ${isDark ? 'text-accent-500' : 'text-accent-light'}`}>10K+</div>
            <div className={`text-[11px] lg:text-sm ${isDark ? 'text-[#8892a0]' : 'text-gray-500'}`}>Properties Analyzed</div>
          </div>
          <div className={`w-px h-10 lg:h-14 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
          <div className="text-center">
            <div className="text-2xl lg:text-4xl font-bold text-emerald-500">$2.4M</div>
            <div className={`text-[11px] lg:text-sm ${isDark ? 'text-[#8892a0]' : 'text-gray-500'}`}>Profit Identified</div>
          </div>
          <div className={`w-px h-10 lg:h-14 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
          <div className="text-center">
            <div className={`text-2xl lg:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>60s</div>
            <div className={`text-[11px] lg:text-sm ${isDark ? 'text-[#8892a0]' : 'text-gray-500'}`}>Avg Analysis</div>
          </div>
        </div>

        {/* CTA Button - Responsive */}
        <div className="relative z-10 mt-6 lg:mt-10 max-w-xl mx-auto">
          <button
            onClick={onPointAndScan}
            className="w-full py-4 lg:py-5 rounded-2xl font-bold text-lg lg:text-xl text-white"
            style={{
              background: isDark 
                ? 'linear-gradient(135deg, #0465f2 0%, #4dd0e1 100%)'
                : 'linear-gradient(135deg, #0465f2 0%, #007ea7 100%)',
              boxShadow: '0 8px 32px rgba(4, 101, 242, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
            }}
          >
            Start Analyzing Now
          </button>
          <p className={`text-center text-[12px] lg:text-sm mt-3 lg:mt-4 ${isDark ? 'text-[#8892a0]' : 'text-gray-500'}`}>
            Free • No credit card required
          </p>
        </div>
      </section>

      {/* Bottom Features Bar - Responsive */}
      <div 
        className={`flex justify-around py-6 lg:py-10 px-5 max-w-4xl mx-auto ${isDark ? 'bg-[#061324]' : 'bg-gray-100'}`}
        style={{ background: isDark ? '#061324' : '#f3f4f6' }}
      >
        <FeatureItem icon={Camera} text="Point & Scan" isDark={isDark} />
        <FeatureItem icon={Clock} text="60 Seconds" isDark={isDark} />
        <FeatureItem icon={BarChart3} text="6 Strategies" isDark={isDark} />
      </div>

      {/* Footer - Desktop only */}
      <footer className={`hidden lg:block py-8 border-t ${isDark ? 'bg-[#061324] border-white/10' : 'bg-white border-gray-200'}`}>
        <div className="max-w-5xl mx-auto px-8 flex items-center justify-between">
          <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Invest<span className="text-brand-500">IQ</span>
          </div>
          <div className="text-center">
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>© 2026 InvestIQ. All rights reserved.</p>
            <p className={`text-sm font-semibold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Invest like a Guru!</p>
          </div>
          <div className="w-24" /> {/* Spacer for alignment */}
        </div>
      </footer>
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
  isDark: boolean;
}

function StrategyCard({ name, roi, icon: Icon, featured, multiplier, profit, isDark }: StrategyCardProps) {
  return (
    <div 
      className={`relative rounded-2xl p-4 lg:p-5 overflow-hidden transition-all hover:scale-[1.02] cursor-pointer
        ${featured 
          ? `bg-gradient-to-br ${isDark ? 'from-accent-500/20' : 'from-accent-light/20'} to-brand-500/20 border-2 ${isDark ? 'border-accent-500/50' : 'border-accent-light/50'}` 
          : isDark 
            ? 'bg-white/[0.08] border border-white/10 hover:bg-white/[0.12]' 
            : 'bg-white border border-gray-200 shadow-sm hover:shadow-lg'
        }`}
      style={{ 
        boxShadow: featured 
          ? isDark 
            ? '0 8px 32px rgba(0, 229, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
            : '0 8px 32px rgba(0, 126, 167, 0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
          : isDark 
            ? '0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
            : undefined
      }}
    >
      {/* Featured Badge */}
      {featured && (
        <div className={`absolute top-2 right-2 lg:top-3 lg:right-3 text-[#07172e] text-[10px] lg:text-xs font-bold px-2 py-1 rounded-lg uppercase tracking-wide ${isDark ? 'bg-accent-500' : 'bg-accent-light'}`}>
          Best ROI
        </div>
      )}

      {/* Multiplier Badge */}
      {multiplier && !featured && (
        <div className={`absolute top-2 right-2 lg:top-3 lg:right-3 text-[10px] lg:text-xs font-bold px-2 py-1 rounded-lg ${
          isDark 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : 'bg-emerald-50 text-emerald-600'
        }`}>
          {multiplier}
        </div>
      )}
      
      {/* Icon & Name Row */}
      <div className="flex items-center gap-2 lg:gap-3 mb-3 lg:mb-4">
        <div 
          className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center
            ${featured 
              ? isDark ? 'bg-accent-500/30' : 'bg-accent-light/30'
              : isDark 
                ? 'bg-brand-500/20' 
                : 'bg-brand-50'
            }`}
        >
          <Icon className={`w-5 h-5 lg:w-6 lg:h-6 ${featured ? (isDark ? 'text-accent-400' : 'text-accent-light') : 'text-brand-500'}`} />
        </div>
        <div className={`text-sm lg:text-base font-semibold ${
          featured 
            ? 'text-white' 
            : isDark 
              ? 'text-white/90' 
              : 'text-gray-900'
        }`}>
          {name}
        </div>
      </div>
      
      {/* Metrics Row */}
      <div className="flex items-end justify-between">
        {/* ROI */}
        <div>
          <div className={`text-[11px] lg:text-xs mb-0.5 uppercase tracking-wide ${
            isDark ? 'text-[#8892a0]' : 'text-gray-500'
          }`}>ROI</div>
          <div className={`text-3xl lg:text-4xl font-bold ${
            featured 
              ? isDark ? 'text-accent-400' : 'text-accent-light'
              : isDark 
                ? 'text-white' 
                : 'text-gray-900'
          }`}>
            {roi}
          </div>
        </div>
        
        {/* Mini Growth Chart */}
        <div className="flex items-end gap-[3px] lg:gap-1 h-8 lg:h-10">
          {[3, 5, 4, 7, 6, 9, 8, 12].map((h, i) => (
            <div 
              key={i}
              className={`w-[4px] lg:w-[5px] rounded-sm ${featured ? (isDark ? 'bg-accent-500' : 'bg-accent-light') : 'bg-brand-500'}`}
              style={{ 
                height: `${h * 2.5}px`,
                opacity: 0.4 + (i * 0.08)
              }}
            />
          ))}
          {/* Upward arrow */}
          <div className={`ml-1 ${featured ? (isDark ? 'text-accent-400' : 'text-accent-light') : 'text-emerald-500'}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="lg:w-4 lg:h-4">
              <path d="M6 10V2M6 2L2 6M6 2L10 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Profit Indicator */}
      {profit && (
        <div className={`mt-3 lg:mt-4 pt-3 lg:pt-4 border-t flex items-center justify-between ${
          isDark ? 'border-white/10' : 'border-gray-100'
        }`}>
          <span className={`text-[11px] lg:text-sm ${isDark ? 'text-[#8892a0]' : 'text-gray-500'}`}>Est. Profit</span>
          <span className={`text-sm lg:text-base font-bold ${featured ? (isDark ? 'text-accent-400' : 'text-accent-light') : 'text-emerald-500'}`}>
            {profit}
            {featured && multiplier && (
              <span className={`ml-1.5 text-[10px] lg:text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-accent-500/30 text-accent-300' : 'bg-accent-light/30 text-accent-light'}`}>
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
  isDark: boolean;
}

function FeatureItem({ icon: Icon, text, isDark }: FeatureItemProps) {
  return (
    <div className="flex flex-col items-center gap-2 lg:gap-3">
      <div className={`w-12 h-12 lg:w-16 lg:h-16 rounded-xl lg:rounded-2xl flex items-center justify-center ${
        isDark 
          ? 'bg-white/[0.08] border border-white/10' 
          : 'bg-white border border-gray-200 shadow-sm'
      }`}>
        <Icon className={`w-5 h-5 lg:w-7 lg:h-7 ${isDark ? 'text-accent-500' : 'text-accent-light'}`} />
      </div>
      <span className={`text-[12px] lg:text-sm font-medium ${isDark ? 'text-white/80' : 'text-gray-600'}`}>{text}</span>
    </div>
  );
}
