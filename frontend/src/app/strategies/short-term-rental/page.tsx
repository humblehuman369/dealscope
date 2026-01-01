'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, ArrowLeft, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ShortTermRentalPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, setShowAuthModal } = useAuth();

  return (
    <div className="min-h-screen bg-[#e8eef3]" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="bg-[#e8eef3] border-b border-[#d0d7de] py-6">
        <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/images/investiq-logo-icon.png" alt="InvestIQ" className="h-12 w-12 rounded-xl" />
            <span className="text-2xl font-bold text-[#07172e]">
              Invest<span className="text-[#0465f2]">IQ</span>
            </span>
          </a>
          <nav className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <>
                <button onClick={() => router.push('/dashboard')} className="px-6 py-3 bg-[#0465f2] text-white font-bold rounded-lg hover:bg-[#0354d1] transition-all flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" /> Dashboard
                </button>
                <button onClick={logout} className="px-6 py-3 bg-transparent text-[#07172e] font-bold rounded-lg hover:bg-black/5 transition-all">Sign Out</button>
              </>
            ) : (
              <>
                <button onClick={() => setShowAuthModal('login')} className="px-6 py-3 bg-transparent text-[#07172e] font-bold rounded-lg hover:bg-black/5 transition-all">Sign In</button>
                <button onClick={() => setShowAuthModal('register')} className="px-6 py-3 bg-[#0465f2] text-white font-bold rounded-lg hover:bg-[#0354d1] transition-all">Get Started</button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Back Button */}
      <div className="max-w-[1280px] mx-auto px-8">
        <button onClick={() => router.push('/landing2')} className="flex items-center gap-2 px-6 py-3 bg-[#aab2bd] text-white font-bold rounded-lg hover:bg-[#8a929d] transition-all my-8">
          <ArrowLeft className="w-4 h-4" /> Back to Strategies
        </button>
      </div>

      {/* Strategy Header */}
      <div className="bg-gradient-to-r from-[#0465f2] to-[#00e5ff] py-16 text-center text-white mb-12">
        <div className="max-w-[1280px] mx-auto px-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="w-12 h-12 text-[#0465f2]" />
          </div>
          <h1 className="text-5xl font-extrabold">Short-Term Rental</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1280px] mx-auto px-8 pb-16">
        <div className="bg-white rounded-3xl p-12 shadow-lg mb-8">
          <h2 className="text-3xl font-bold text-[#07172e] mb-6">The High-Revenue Hospitality Model</h2>
          <p className="text-lg text-[#4a5568] leading-relaxed mb-6">
            <strong>Short-term rental</strong> is where you turn your property into a high-revenue hospitality business using platforms like Airbnb or VRBO! Properties in hot tourist areas can generate <strong>2–3x more revenue</strong> than traditional rentals.
          </p>

          <div className="bg-gradient-to-r from-[#e0f2fe] to-[#dbeafe] border-l-4 border-[#0465f2] rounded-lg p-6 my-8">
            <h3 className="text-2xl font-bold text-[#07172e] mb-4">The best part?</h3>
            <p className="text-lg text-[#07172e]">You can block off dates to use the property yourself for vacation!</p>
          </div>

          <button onClick={() => router.push('/landing2')} className="w-full py-5 bg-gradient-to-r from-[#0465f2] to-[#00e5ff] text-white text-xl font-bold rounded-full hover:-translate-y-0.5 transition-transform">
            Got it!
          </button>
        </div>

        <div className="bg-white rounded-3xl p-12 shadow-lg">
          <h2 className="text-3xl font-bold text-[#07172e] mb-8">Why Choose Short-Term Rental?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8">
              <div className="text-5xl mb-4">💵</div>
              <h4 className="text-xl font-bold text-[#07172e] mb-2">Higher Revenue</h4>
              <p className="text-[#4a5568]">2-3x more than long-term rentals</p>
            </div>
            <div className="text-center p-8">
              <div className="text-5xl mb-4">📅</div>
              <h4 className="text-xl font-bold text-[#07172e] mb-2">Flexibility</h4>
              <p className="text-[#4a5568]">Block dates for personal use</p>
            </div>
            <div className="text-center p-8">
              <div className="text-5xl mb-4">🌴</div>
              <h4 className="text-xl font-bold text-[#07172e] mb-2">Tourism Markets</h4>
              <p className="text-[#4a5568]">Perfect for vacation destinations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-[#d0d7de] py-8">
        <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/investiq-logo-icon.png" alt="InvestIQ" className="h-12 w-12 rounded-xl" />
            <span className="text-xl font-bold text-[#07172e]">Invest<span className="text-[#0465f2]">IQ</span></span>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#4a5568]">© 2026 InvestIQ. All rights reserved.</p>
            <p className="text-sm font-semibold text-[#07172e]">Invest like a Guru!</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

