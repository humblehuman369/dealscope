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
            className="text-white text-sm underline"
          >
            Or search by address
          </button>
        </div>
      </section>

      {/* Phone Showcase */}
      <section className="relative z-10 px-4 pt-8 pb-5 flex justify-center">
        <PhoneScannerMockup />
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

