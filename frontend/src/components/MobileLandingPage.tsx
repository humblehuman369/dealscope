'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Camera,
  Home,
  Calendar,
  Wrench,
  RefreshCw,
  Users,
  Clock,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PhoneScannerMockup } from './PhoneScannerMockup';

interface MobileLandingPageProps {
  onPointAndScan: () => void;
}

export function MobileLandingPage({ onPointAndScan }: MobileLandingPageProps) {
  const router = useRouter();
  const { user, isAuthenticated, setShowAuthModal } = useAuth();

  const strategies = [
    { name: 'Long Rental', roi: '18%', icon: Home, featured: false },
    { name: 'Short Rental', roi: '28%', icon: Calendar, featured: false },
    { name: 'Fix & Flip', roi: '22%', icon: Wrench, featured: false },
    { name: 'BRRRR', roi: '35%', icon: RefreshCw, featured: true },
    { name: 'House Hack', roi: '25%', icon: Home, featured: false },
    { name: 'Wholesale', roi: '12%', icon: Users, featured: false },
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
        <div className="flex items-center gap-2">
          <img 
            src="/images/investiq-logo-icon.png" 
            alt="InvestIQ" 
            className="h-9 w-9 rounded-full object-cover"
          />
          <span className="text-white font-bold text-lg">
            <span className="text-brand-500">IQ</span>
          </span>
        </div>
        
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
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onPointAndScan}
            className="inline-flex items-center justify-center gap-2.5 px-9 py-4 bg-gradient-to-br from-brand-500 to-[#0876ff] rounded-full text-white font-semibold text-[15px] w-full max-w-[280px]"
            style={{ boxShadow: '0 8px 30px rgba(4, 101, 242, 0.45)' }}
          >
            <Camera className="w-5 h-5" />
            Point & Scan
          </button>
          <button
            onClick={() => router.push('/search')}
            className="text-[#8892a0] text-sm underline"
          >
            Or search by address
          </button>
        </div>
      </section>

      {/* Phone Showcase */}
      <section className="relative z-10 px-8 pt-10 pb-5 flex justify-center">
        <div className="relative py-[50px] px-[50px]">
          {/* Floating Stats */}
          <FloatingStat 
            position="top-0 left-0"
            label="ROI:"
            value="27%"
            trend="up"
          />
          
          <FloatingStat 
            position="top-0 right-0"
            label="Cash Flow:"
            value="5X"
            chart="growth"
          />
          
          <FloatingStat 
            position="bottom-10 left-0"
            label="Profit:"
            value="$81K"
            trend="up"
            chart="bars"
          />
          
          <FloatingStat 
            position="bottom-10 right-0"
            label="Cap Rate:"
            value="12%"
            trend="up"
          />

          {/* Phone Image */}
          <PhoneScannerMockup />
        </div>
      </section>

      {/* Strategies Section */}
      <section className="bg-[#f4f7fa] px-4 py-10 mt-5">
        <p className="text-center text-sm text-[#8892a0] mb-4">
          You&apos;ll see results like this:
        </p>
        
        <div className="flex flex-wrap gap-2 justify-center">
          {strategies.map((strategy, idx) => (
            <StrategyCard
              key={idx}
              name={strategy.name}
              roi={strategy.roi}
              icon={strategy.icon}
              featured={strategy.featured}
            />
          ))}
        </div>
      </section>

      {/* Features Bar */}
      <div className="flex justify-around py-8 px-5 bg-white border-t border-black/5">
        <FeatureItem icon={Camera} text="Scan on-site" />
        <FeatureItem icon={Clock} text="60 seconds" />
        <FeatureItem icon={BarChart3} text="6 strategies" />
      </div>

      {/* Footer CTA */}
      <div className="text-center py-6 px-5 pb-10 bg-white">
        <p className="text-sm text-[#8892a0]">
          Get instant recommendations for <span className="text-accent-500 font-medium">maximum profit</span>
        </p>
      </div>
    </div>
  );
}

// Floating Stat Component
interface FloatingStatProps {
  position: string;
  label: string;
  value: string;
  trend?: 'up' | 'down';
  chart?: 'bars' | 'growth';
}

function FloatingStat({ position, label, value, trend, chart }: FloatingStatProps) {
  return (
    <div className={`absolute ${position} bg-white rounded-xl p-3 shadow-lg z-20`}
      style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.2)' }}
    >
      <div className="text-[9px] font-medium text-[#8892a0] mb-0.5">{label}</div>
      <div className="text-lg font-bold text-[#07172e] flex items-baseline gap-1">
        {value}
        {trend === 'up' && <span className="text-emerald-500 text-xs">↑</span>}
      </div>
      
      {chart === 'bars' && (
        <div className="flex items-end gap-[3px] mt-1.5">
          {[8, 12, 10, 16, 20].map((h, i) => (
            <div 
              key={i}
              className="w-2 rounded-sm"
              style={{ 
                height: `${h}px`,
                background: 'linear-gradient(180deg, #00e5ff 0%, #0465f2 100%)'
              }}
            />
          ))}
        </div>
      )}
      
      {chart === 'growth' && (
        <svg viewBox="0 0 50 24" className="w-[50px] h-6 mt-1">
          <defs>
            <linearGradient id="growthGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#0465f2' }} />
              <stop offset="100%" style={{ stopColor: '#00e5ff' }} />
            </linearGradient>
            <linearGradient id="growthFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#00e5ff' }} />
              <stop offset="100%" style={{ stopColor: '#0465f2', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <path 
            d="M2 20 L10 16 L18 18 L26 12 L34 14 L42 8 L48 4" 
            stroke="url(#growthGrad)" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            fill="none"
          />
          <path 
            d="M2 20 L10 16 L18 18 L26 12 L34 14 L42 8 L48 4 L48 24 L2 24 Z" 
            fill="url(#growthFill)" 
            opacity="0.2"
          />
        </svg>
      )}
    </div>
  );
}

// Strategy Card Component
interface StrategyCardProps {
  name: string;
  roi: string;
  icon: React.ComponentType<{ className?: string }>;
  featured?: boolean;
}

function StrategyCard({ name, roi, icon: Icon, featured }: StrategyCardProps) {
  return (
    <div 
      className={`flex-[0_0_calc(33.333%-6px)] max-w-[calc(33.333%-6px)] rounded-xl p-3 text-center relative
        ${featured 
          ? 'bg-gradient-to-br from-accent-500/10 to-brand-500/10 border border-accent-500/25' 
          : 'bg-white border border-black/[0.04]'
        }`}
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
    >
      {featured && (
        <div className="absolute -top-2 -right-1 bg-accent-500 text-[#07172e] text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase">
          Best
        </div>
      )}
      
      <div 
        className={`w-8 h-8 mx-auto mb-2 rounded-[10px] flex items-center justify-center
          ${featured ? 'bg-accent-500/[0.18]' : 'bg-brand-500/10'}`}
      >
        <Icon className={`w-4 h-4 ${featured ? 'text-accent-500' : 'text-brand-500'}`} />
      </div>
      
      <div className="text-[9px] font-medium text-[#8892a0] mb-0.5">{name}</div>
      <div className={`text-xl font-bold ${featured ? 'text-accent-600' : 'text-[#07172e]'}`}>
        {roi}
      </div>
      <div className="text-[9px] text-[#8892a0]">ROI</div>
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
      <div className="w-11 h-11 bg-[#f4f7fa] rounded-xl flex items-center justify-center">
        <Icon className="w-[22px] h-[22px] text-brand-500" />
      </div>
      <span className="text-[11px] font-medium text-[#07172e]">{text}</span>
    </div>
  );
}

