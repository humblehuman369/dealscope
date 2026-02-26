'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search,
  MapPin,
  Loader2,
  Sun,
  Moon
} from 'lucide-react';
import { useSession, useLogout } from '@/hooks/useSession';
import { useAuthModal } from '@/hooks/useAuthModal';
import { useTheme } from '@/context/ThemeContext';
import { PhoneScannerMockup } from './PhoneScannerMockup';

interface LandingPageProps {
  onPointAndScan: () => void;
}

// Strategy data with emoji icons
const strategies = [
  { name: 'Long-Term Rental', roi: '18%', icon: '🏠', color: '#0465f2', bgColor: 'rgba(4,101,242,0.15)' },
  { name: 'Short-Term Rental', roi: '28%', icon: '🏨', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.15)' },
  { name: 'Fix & Flip', roi: '22%', icon: '🔨', color: '#ec4899', bgColor: 'rgba(236,72,153,0.15)' },
  { name: 'BRRRR', roi: '25%', icon: '🔄', color: '#f97316', bgColor: 'rgba(249,115,22,0.15)' },
  { name: 'House Hack', roi: '31%', icon: '🏡', color: '#0EA5E9', bgColor: 'rgba(14,165,233,0.15)' },
  { name: 'Wholesale', roi: '$12K', icon: '📋', color: '#84cc16', bgColor: 'rgba(132,204,22,0.15)', isProfit: true },
];

export function MobileLandingPage({ onPointAndScan }: LandingPageProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useSession();
  const { openAuthModal } = useAuthModal();
  const logoutMutation = useLogout();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleAnalyze = async () => {
    if (!searchAddress.trim()) return;
    setIsSearching(true);
    try {
      // Use new IQ Verdict flow
      await router.push(`/analyzing?address=${encodeURIComponent(searchAddress.trim())}`);
    } catch {
      // Navigation failed - user can retry
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className={`min-h-screen overflow-x-hidden transition-colors duration-300 ${
      isDark ? 'bg-[#07172e] text-[#e1e8ed]' : 'bg-[#f8fafc] text-gray-900'
    }`}>
      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-5 py-3 lg:px-12 lg:py-5 max-w-7xl mx-auto">
        <div className={`text-xl lg:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
          DealGap<span className={isDark ? 'text-accent-500' : 'text-accent-light'}>IQ</span>
        </div>
        
        <div className="flex items-center gap-3 lg:gap-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              isDark 
                ? 'bg-white/10 hover:bg-white/15' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-accent-500" />
            ) : (
              <Moon className="w-4 h-4 text-gray-600" />
            )}
          </button>

          {isAuthenticated && user ? (
            <>
              <button
                onClick={() => router.push('/search')}
                className={`text-sm font-medium transition-colors ${
                  isDark 
                    ? 'text-white/70 hover:text-white' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => logoutMutation.mutate()}
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
                onClick={() => openAuthModal('login')}
                className={`text-sm font-medium transition-colors ${
                  isDark 
                    ? 'text-white/70 hover:text-white' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => openAuthModal('register')}
                className="hidden lg:block px-5 py-2.5 bg-brand-500 text-white font-semibold rounded-xl hover:bg-brand-600 transition-colors"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-5 pt-6 lg:pt-16 text-center max-w-4xl mx-auto">
        <h1 className={`font-bold text-[28px] lg:text-[52px] leading-[1.2] mb-1 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          Know the Real Return
        </h1>
        <p className={`text-[28px] lg:text-[52px] leading-[1.2] mb-2 font-semibold italic ${isDark ? 'text-accent-500' : 'text-accent-light'}`}>
          Before You Buy
        </p>
        <p className={`text-sm font-semibold tracking-[0.2em] uppercase ${isDark ? 'text-accent-500' : 'text-accent-light'}`}>
          Point. Scan. Know.
        </p>
      </section>

      {/* Scanner Section */}
      <section className="relative z-10 px-4 pt-6 lg:pt-8 pb-5 flex flex-col items-center max-w-2xl mx-auto">
        <PhoneScannerMockup 
          isDark={isDark} 
          onScanPress={onPointAndScan}
          onAddressPress={() => setShowSearchBar(!showSearchBar)}
        />
        
        {/* Address Search Dropdown */}
        {showSearchBar && (
          <div 
            className={`w-full max-w-[460px] mt-4 p-4 rounded-2xl border animate-in slide-in-from-top-2 duration-200 ${
              isDark 
                ? 'bg-white/[0.08] border-white/10' 
                : 'bg-white border-gray-200 shadow-lg'
            }`}
            style={{ backdropFilter: isDark ? 'blur(12px)' : undefined }}
          >
            <div className={`flex items-center gap-2 rounded-xl px-4 py-3 border ${
              isDark 
                ? 'bg-white/10 border-white/10' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <MapPin className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-accent-500' : 'text-accent-light'}`} />
              <input
                type="text"
                placeholder="Enter property address..."
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                className={`flex-1 bg-transparent text-sm outline-none ${
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
              className={`w-full mt-3 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
                ${searchAddress.trim() 
                  ? `text-white shadow-lg` 
                  : isDark 
                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              style={searchAddress.trim() ? {
                background: isDark 
                  ? 'linear-gradient(135deg, #0097a7 0%, #0EA5E9 100%)'
                  : 'linear-gradient(135deg, #0EA5E9 0%, #0097a7 100%)',
                boxShadow: '0 4px 20px rgba(0, 151, 167, 0.4)'
              } : undefined}
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
      </section>

      {/* Strategy Section */}
      <section 
        className="relative px-5 py-8 lg:py-12 mt-4"
        style={{ 
          background: isDark 
            ? 'linear-gradient(180deg, #0a1628 0%, #07172e 50%, #061324 100%)' 
            : 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)'
        }}
      >
        {/* Section Header */}
        <div className="flex justify-between items-center mb-4 max-w-4xl mx-auto">
          <h2 className={`text-lg lg:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            See Your <span className={isDark ? 'text-accent-500' : 'text-accent-light'}>Profit Potential</span>
          </h2>
          <span className={`text-sm font-semibold cursor-pointer ${isDark ? 'text-accent-500' : 'text-accent-light'}`}>
            All 6 →
          </span>
        </div>

        {/* Strategy Cards - Horizontal Scroll */}
        <div 
          className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {strategies.map((strategy, idx) => (
            <StrategyCard
              key={idx}
              name={strategy.name}
              roi={strategy.roi}
              icon={strategy.icon}
              color={strategy.color}
              bgColor={strategy.bgColor}
              isProfit={strategy.isProfit}
              isDark={isDark}
            />
          ))}
        </div>

        {/* Stats Row */}
        <div className={`flex justify-between py-5 mt-6 border-t border-b max-w-4xl mx-auto ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <div className="text-center flex-1">
            <div className={`text-xl lg:text-2xl font-bold ${isDark ? 'text-accent-500' : 'text-accent-light'}`}>10K+</div>
            <div className={`text-[11px] lg:text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Analyzed</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-xl lg:text-2xl font-bold text-emerald-500">$2.4M</div>
            <div className={`text-[11px] lg:text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Profit Found</div>
          </div>
          <div className="text-center flex-1">
            <div className={`text-xl lg:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>60s</div>
            <div className={`text-[11px] lg:text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Avg. Analysis</div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-6 max-w-xl mx-auto">
          <button
            onClick={onPointAndScan}
            className="w-full py-4 rounded-xl font-bold text-base text-white"
            style={{
              background: isDark 
                ? 'linear-gradient(135deg, #0097a7 0%, #0EA5E9 100%)'
                : 'linear-gradient(135deg, #0EA5E9 0%, #0097a7 100%)',
              boxShadow: '0 8px 32px rgba(0, 151, 167, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
            }}
          >
            Start Analyzing Now
          </button>
          <p className={`text-center text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            Free • No credit card required
          </p>
        </div>
      </section>

      {/* Bottom Nav (Mobile Style) */}
      <nav 
        className={`flex justify-around py-3 px-5 ${isDark ? 'bg-[#061324]' : 'bg-white'}`}
        style={{ 
          borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(7,23,46,0.06)'
        }}
      >
        <NavItem icon="🏠" label="Home" active isDark={isDark} />
        <NavItem icon="📊" label="Dashboard" isDark={isDark} />
        <NavItem icon="📷" label="Scan" isDark={isDark} />
        <NavItem icon="🕐" label="History" isDark={isDark} />
        <NavItem icon="📁" label="Portfolio" isDark={isDark} />
      </nav>

      {/* Footer */}
      <footer className={`py-6 text-center ${isDark ? 'bg-[#061324]' : 'bg-white'}`}>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          © 2026 DealGapIQ. All rights reserved.
        </p>
        <p className={`text-sm font-semibold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Invest like a Guru!
        </p>
      </footer>
    </div>
  );
}

// Strategy Card Component
interface StrategyCardProps {
  name: string;
  icon: string;
  roi: string;
  color: string;
  bgColor: string;
  isProfit?: boolean;
  isDark: boolean;
}

function StrategyCard({ name, icon, roi, color, bgColor, isProfit, isDark }: StrategyCardProps) {
  return (
    <div 
      className={`flex-shrink-0 w-[130px] p-4 rounded-2xl transition-transform hover:scale-105 cursor-pointer ${
        isDark 
          ? 'bg-white/[0.04] border border-white/[0.06]' 
          : 'bg-white border border-gray-100 shadow-sm'
      }`}
      style={{ scrollSnapAlign: 'start' }}
    >
      {/* Icon */}
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-xl"
        style={{ background: bgColor }}
      >
        {icon}
      </div>
      
      {/* Name */}
      <div className={`text-[11px] font-medium mb-2 leading-tight ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {name}
      </div>
      
      {/* ROI */}
      <div className="text-2xl font-bold" style={{ color }}>
        {roi}
      </div>
      
      {/* Label */}
      <div className={`text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
        {isProfit ? 'Est. Profit' : 'Est. ROI'}
      </div>
    </div>
  );
}

// Nav Item Component
interface NavItemProps {
  icon: string;
  label: string;
  active?: boolean;
  isDark: boolean;
}

function NavItem({ icon, label, active, isDark }: NavItemProps) {
  return (
    <div className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
      active 
        ? isDark ? 'text-accent-500' : 'text-brand-500'
        : isDark ? 'text-gray-600' : 'text-gray-400'
    }`}>
      <span className="text-lg">{icon}</span>
      <span className="text-[10px] font-semibold">{label}</span>
    </div>
  );
}
