'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Camera, 
  Search, 
  Loader2,
  MapPin,
  Zap,
  BarChart3,
  LogOut,
  LayoutGrid,
  Smartphone
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LandingPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, setShowAuthModal } = useAuth();
  const [searchAddress, setSearchAddress] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchAddress.trim()) {
      setIsNavigating(true);
      router.push(`/property?address=${encodeURIComponent(searchAddress)}`);
    }
  };

  const handlePointAndScan = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Load Poppins font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* Navigation */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-6 bg-white shadow-[0_2px_8px_rgba(7,23,46,0.08)] sticky top-0 z-50">
        <a href="/" className="flex items-center gap-3 text-2xl font-bold text-[#07172e] hover:opacity-80 transition-opacity">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="12" fill="url(#gradient)" />
            <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fontFamily="Poppins" fontSize="20" fontWeight="700" fill="white">IQ</text>
            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="48" y2="48">
                <stop stopColor="#0465f2" />
                <stop offset="1" stopColor="#00e5ff" />
              </linearGradient>
            </defs>
          </svg>
          InvestIQ
        </a>
        
        <ul className="hidden md:flex items-center gap-8">
          <li><a href="#how-it-works" className="text-[#aab2bd] text-sm font-semibold hover:text-[#0465f2] transition-colors">How It Works</a></li>
          <li><a href="#features" className="text-[#aab2bd] text-sm font-semibold hover:text-[#0465f2] transition-colors">Features</a></li>
          <li><a href="#cta" className="text-[#aab2bd] text-sm font-semibold hover:text-[#0465f2] transition-colors">Get Started</a></li>
        </ul>

        <div className="flex gap-3">
          {isAuthenticated && user ? (
            <>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2.5 bg-gradient-to-r from-[#0465f2] to-[#00e5ff] text-white font-semibold text-sm rounded-lg hover:shadow-lg hover:shadow-[#0465f2]/30 transition-all flex items-center gap-2"
              >
                <LayoutGrid className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={logout}
                className="px-4 py-2.5 bg-transparent text-[#07172e] font-semibold text-sm rounded-lg hover:bg-[#e1e8ed] transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAuthModal('register')}
              className="px-4 py-2.5 bg-[#0465f2] text-white font-semibold text-sm rounded-lg hover:bg-[#0350d4] transition-colors shadow-[0_8px_24px_rgba(4,101,242,0.3)]"
            >
              Get Started
            </button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[700px] px-6 md:px-12 py-24 bg-gradient-to-br from-[#07172e] to-[#0a2342] text-white text-center flex flex-col justify-center items-center overflow-hidden">
        {/* Decorative gradients */}
        <div className="absolute top-[-50%] right-[-10%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(4,101,242,0.15)_0%,transparent_70%)] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-5%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(0,229,255,0.1)_0%,transparent_70%)] rounded-full pointer-events-none" />
        
        <div className="relative z-10 max-w-[800px]">
          <h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold mb-6 leading-tight tracking-tight">
            Analyze Investment Real Estate in <span className="text-[#00e5ff]">60 Seconds</span>
          </h1>
          
          <div className="text-2xl md:text-[28px] font-semibold text-[#00e5ff] mb-8 uppercase tracking-wide">
            Point & Scan
          </div>
          
          <p className="text-lg md:text-xl text-[#d0d8e0] mb-4 leading-relaxed">
            The fastest path from address to investable decision.
          </p>
          
          <p className="text-base text-[#e1e8ed] mb-10">
            Or simply input address
          </p>

          {/* Address Search */}
          <form onSubmit={handleSearch} className="mb-8 max-w-lg mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#aab2bd]" />
                <input
                  type="text"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  placeholder="Enter property address..."
                  className="w-full pl-12 pr-4 py-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder-[#aab2bd] focus:outline-none focus:ring-2 focus:ring-[#00e5ff] focus:border-transparent backdrop-blur-sm"
                />
              </div>
              <button
                type="submit"
                disabled={isNavigating || !searchAddress.trim()}
                className="px-6 py-4 bg-[#0465f2] text-white font-semibold rounded-lg hover:bg-[#0350d4] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(4,101,242,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          
          <div className="flex gap-4 justify-center flex-wrap">
            <button 
              onClick={handlePointAndScan}
              className="px-8 py-4 bg-[#0465f2] text-white font-semibold rounded-lg shadow-[0_8px_24px_rgba(4,101,242,0.3)] hover:bg-[#0350d4] hover:shadow-[0_12px_32px_rgba(4,101,242,0.4)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Point & Scan Now
            </button>
            <button 
              onClick={() => document.getElementById('cta')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-transparent text-white font-semibold rounded-lg border-2 border-[#00e5ff] hover:bg-[#00e5ff] hover:text-[#07172e] hover:-translate-y-0.5 transition-all"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 md:px-12 bg-[#f8fafc]">
        <h2 className="text-3xl md:text-[42px] font-bold text-[#07172e] text-center mb-16">
          How It Works
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-[1200px] mx-auto">
          {[
            { num: '01', icon: Camera, title: 'Point at Property', desc: "Use your phone's camera to aim at any property you want to analyze" },
            { num: '02', icon: Zap, title: 'Instant Scan', desc: 'GPS and compass identify the exact property in under 2 seconds' },
            { num: '03', icon: BarChart3, title: 'Get Analytics', desc: 'Instantly see investment strategies, cash flow, and ROI projections' },
          ].map((step, idx) => (
            <div 
              key={idx} 
              className="bg-white p-8 md:p-12 rounded-xl shadow-[0_4px_12px_rgba(7,23,46,0.08)] text-center border-2 border-transparent hover:border-[#0465f2] hover:shadow-[0_12px_32px_rgba(4,101,242,0.15)] hover:-translate-y-1 transition-all group"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#0465f2] to-[#00e5ff] text-white rounded-full text-2xl font-bold mb-6">
                {step.num}
              </div>
              <h3 className="text-xl font-semibold text-[#07172e] mb-4">{step.title}</h3>
              <p className="text-[#aab2bd] text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 md:px-12 bg-white">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-[42px] font-bold text-[#07172e] mb-8 leading-tight">
              Invest Like a Guru
            </h2>
            
            <ul className="space-y-6">
              {[
                '6 Investment Strategies at Your Fingertips',
                'Instant Cash Flow Analysis',
                'ROI Projections in Seconds',
                'Compare Properties Side-by-Side',
                'Professional-Grade Analytics',
                'Confidence in Every Decision',
              ].map((feature, idx) => (
                <li key={idx} className="flex items-start gap-4 text-base text-[#07172e]">
                  <span className="text-[#00e5ff] text-xl font-bold flex-shrink-0">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-gradient-to-br from-[#07172e] to-[#0a2342] rounded-xl p-8 md:p-12 text-white min-h-[400px] flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#0465f2] to-[#00e5ff] rounded-2xl flex items-center justify-center mb-6">
              <Smartphone className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-semibold mb-4">Mobile-First Analytics</h3>
            <p className="text-[#d0d8e0] mb-8 leading-relaxed">
              Access professional investment analysis anywhere, anytime. Point, scan, decide.
            </p>
            <div className="p-6 bg-[rgba(4,101,242,0.2)] rounded-lg border-l-4 border-[#00e5ff]">
              <p className="font-semibold m-0">Ready to transform your investing?</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-20 px-6 md:px-12 bg-gradient-to-br from-[#0465f2] to-[#07172e] text-white text-center">
        <h2 className="text-3xl md:text-[42px] font-bold mb-8 leading-tight">
          Start Investing Like a Guru Today
        </h2>
        <p className="text-lg text-[#d0d8e0] mb-12 max-w-[600px] mx-auto leading-relaxed">
          InvestIQ gives you professional-grade analytics in your pocket. Make smarter investment decisions faster than ever before.
        </p>
        <button
          onClick={() => setShowAuthModal('register')}
          className="px-8 py-4 bg-[#0465f2] text-white font-semibold rounded-lg shadow-[0_8px_24px_rgba(4,101,242,0.3)] hover:bg-[#0350d4] hover:shadow-[0_12px_32px_rgba(4,101,242,0.4)] hover:-translate-y-0.5 transition-all"
        >
          Get Started Now
        </button>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 md:px-12 bg-[#07172e] text-white text-center text-sm">
        <p>
          © 2026 InvestIQ. All rights reserved. |{' '}
          <a href="#" className="text-[#00e5ff] hover:opacity-80 transition-opacity">Privacy Policy</a> |{' '}
          <a href="#" className="text-[#00e5ff] hover:opacity-80 transition-opacity">Terms of Service</a>
        </p>
      </footer>
    </div>
  );
}

