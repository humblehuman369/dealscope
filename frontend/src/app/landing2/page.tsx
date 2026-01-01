'use client';

import React from 'react';
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
  Download
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Landing2Page() {
  const router = useRouter();
  const { user, isAuthenticated, logout, setShowAuthModal } = useAuth();

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Load Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="bg-[#e8eef3] border-b border-[#d1d5db]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <a href="/" className="flex items-center gap-3">
              <img 
                src="/images/investiq-logo-icon.png" 
                alt="InvestIQ" 
                className="w-12 h-12 rounded-xl"
              />
              <span className="text-2xl font-bold text-[#07172e]">
                Invest<span className="text-[#0465f2]">IQ</span>
              </span>
            </a>
            
            <nav className="flex items-center gap-4">
              {isAuthenticated && user ? (
                <>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-3 bg-[#0465f2] text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Dashboard
                  </button>
                  <button
                    onClick={logout}
                    className="px-6 py-3 bg-transparent text-[#07172e] font-bold rounded-xl hover:bg-black/5 transition-all"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowAuthModal('login')}
                    className="px-6 py-3 bg-transparent text-[#07172e] font-bold rounded-xl hover:bg-black/5 transition-all"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setShowAuthModal('register')}
                    className="px-6 py-3 h-12 bg-[#0465f2] text-white font-bold rounded-xl hover:opacity-90 transition-all"
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
      <section className="bg-[#e8eef3] py-16 pb-24 overflow-hidden">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#07172e] leading-tight mb-6">
              Analyze Investment Real Estate<br />
              in <span className="text-[#0465f2]">60</span> seconds!
            </h1>
            <p className="text-xl md:text-2xl text-[#6b7280] font-medium">
              Point & Scan or simply input address
            </p>
          </div>

          {/* Phone Mockup Container */}
          <div className="relative max-w-5xl mx-auto min-h-[600px] flex items-center justify-center">
            
            {/* Floating Card: ROI - Top Left */}
            <div className="absolute left-0 top-12 bg-white rounded-2xl shadow-xl p-6 w-56 z-10 animate-float-slow">
              <p className="text-sm text-[#6b7280] font-semibold mb-2">Estimated ROI:</p>
              <div className="flex items-center gap-2 text-4xl font-bold text-[#07172e]">
                <span>12.5%</span>
                <svg width="28" height="28" fill="none" stroke="#22c55e" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
                </svg>
              </div>
            </div>

            {/* Floating Card: Cash Flow - Top Right */}
            <div className="absolute right-0 top-8 bg-white rounded-2xl shadow-xl p-6 w-56 z-10 animate-float-medium">
              <p className="text-sm text-[#6b7280] font-semibold mb-2">Cash Flow:</p>
              <p className="text-4xl font-bold text-[#07172e] mb-2">$1,200/mo</p>
              <svg viewBox="0 0 200 60" className="w-full h-16">
                <path d="M 0,50 Q 50,30 100,35 T 200,20" fill="none" stroke="#0465f2" strokeWidth="3"/>
                <rect x="160" y="10" width="8" height="30" fill="#0465f2"/>
              </svg>
            </div>

            {/* Phone Frame */}
            <div className="relative w-[320px] h-[640px] bg-black rounded-[3rem] p-3 shadow-2xl z-20">
              {/* Phone Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-black rounded-b-3xl z-30"></div>
              
              {/* Phone Screen */}
              <div className="relative w-full h-full bg-[#1f2937] rounded-[2.5rem] overflow-hidden">
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
                    <div className="relative w-64 h-64">
                      {/* Animated Circles */}
                      <div className="absolute inset-0 border-4 border-[#00e5ff] rounded-full animate-ping-slow opacity-75"></div>
                      <div className="absolute inset-4 border-4 border-[#00e5ff] rounded-full opacity-60"></div>
                      <div className="absolute inset-8 border-4 border-[#00e5ff] rounded-full opacity-40"></div>
                      
                      {/* Crosshair */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 border-4 border-[#00e5ff] rounded-full bg-[#00e5ff]/20 backdrop-blur-sm flex items-center justify-center">
                          <div className="w-2 h-2 bg-[#00e5ff] rounded-full"></div>
                        </div>
                      </div>
                    </div>

                    {/* Property Info Card */}
                    <div className="absolute bottom-24 left-6 right-6 bg-[#1f2937]/90 backdrop-blur-xl rounded-2xl p-4 text-white">
                      <p className="text-xs text-gray-400 mb-1">Property Located</p>
                      <p className="text-sm font-semibold mb-3">123 Main Street, Anytown</p>
                      <div className="flex gap-2">
                        <button className="flex-1 py-2 px-4 bg-[#00e5ff] text-black font-bold rounded-lg text-sm">
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
                      <button className="w-20 h-20 bg-[#00e5ff] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.5)]" aria-label="Capture">
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
            <div className="absolute left-12 bottom-16 bg-white rounded-2xl shadow-xl p-6 w-56 z-10 animate-float-fast">
              <p className="text-sm text-[#6b7280] font-semibold mb-2">Property Value:</p>
              <p className="text-4xl font-bold text-[#07172e] mb-3">62.5%</p>
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#00e5ff] to-[#0465f2]" style={{ width: '62.5%' }}></div>
              </div>
              <div className="flex justify-between text-xs text-[#6b7280] mt-1">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>

            {/* Floating Card: Cap Rate - Bottom Right */}
            <div className="absolute right-12 bottom-20 bg-white rounded-2xl shadow-xl p-6 w-56 z-10 animate-float-medium" style={{ animationDelay: '0.5s' }}>
              <p className="text-sm text-[#6b7280] font-semibold mb-2">Cap Rate:</p>
              <p className="text-4xl font-bold text-[#07172e] mb-2">6.8%</p>
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="absolute left-0 top-0 h-full rounded-full bg-[#0465f2]" style={{ width: '68%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tagline Section */}
      <section className="bg-white py-12">
        <div className="max-w-4xl mx-auto px-4 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 h-1 bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent"></div>
            <div className="bg-[#00e5ff] text-black py-4 px-8 font-bold text-lg md:text-xl" style={{ clipPath: 'polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)' }}>
              &quot;The fastest path from address to investable decision.&quot;
            </div>
            <div className="flex-1 h-1 bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent"></div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex-1 h-1 bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent"></div>
            <div className="bg-[#00e5ff] text-black py-4 px-8 font-bold text-lg md:text-xl" style={{ clipPath: 'polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)' }}>
              &quot;The only tool that delivers institutional-grade analytics on-the-go.&quot;
            </div>
            <div className="flex-1 h-1 bg-gradient-to-r from-transparent via-[#00e5ff] to-transparent"></div>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="bg-[#0465f2] text-white py-20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-6xl font-bold text-[#00e5ff] mb-2">60</div>
              <div className="text-xl font-semibold">Seconds to Analysis</div>
            </div>
            <div>
              <div className="text-6xl font-bold text-[#00e5ff] mb-2">6</div>
              <div className="text-xl font-semibold">Investment Strategies</div>
            </div>
            <div>
              <div className="text-6xl font-bold text-[#00e5ff] mb-2">100%</div>
              <div className="text-xl font-semibold">Data-Driven Intelligence</div>
            </div>
          </div>
        </div>
      </section>

      {/* Strategies Section */}
      <section className="bg-white py-20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-[#07172e] mb-4">6 Investment Strategies</h2>
            <div className="h-1 w-24 bg-[#0465f2] mx-auto mb-6"></div>
            <p className="text-xl text-[#6b7280]">One property. Six strategies. Unlimited potential.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Home, name: 'Long-Term Rental' },
              { icon: TrendingUp, name: 'Short-Term Rental' },
              { icon: DollarSign, name: 'BRRRR' },
              { icon: BarChart3, name: 'Fix & Flip' },
              { icon: Users, name: 'House Hack' },
              { icon: Repeat, name: 'Wholesale' },
            ].map((strategy, idx) => (
              <div 
                key={idx}
                className="bg-white border-2 border-[#d1d5db] rounded-xl p-6 transition-all hover:border-[#0465f2] hover:shadow-lg cursor-pointer group flex items-center gap-4"
              >
                <strategy.icon className="w-10 h-10 text-[#0465f2] flex-shrink-0 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold text-[#07172e]">{strategy.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Section */}
      <section className="bg-[#e8eef3] py-20">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-[#07172e] mb-4">Data-Driven Investment Decisions</h2>
            <div className="h-1 w-24 bg-[#0465f2] mx-auto"></div>
          </div>
          
          <div className="text-center mt-8">
            <p className="text-2xl font-bold text-[#07172e] mb-6">Are you ready to profit?</p>
            <button
              onClick={() => setShowAuthModal('register')}
              className="px-12 py-4 h-16 bg-[#0465f2] text-white font-bold text-lg rounded-xl hover:opacity-90 transition-all"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#d1d5db] py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img 
                src="/images/investiq-logo-icon.png" 
                alt="InvestIQ" 
                className="w-12 h-12 rounded-xl"
              />
              <span className="text-xl font-bold text-[#07172e]">
                Invest<span className="text-[#0465f2]">IQ</span>
              </span>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-[#6b7280]">© 2026 InvestIQ. All rights reserved.</p>
              <p className="text-sm font-semibold text-[#07172e] mt-1">Invest like a Guru!</p>
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

