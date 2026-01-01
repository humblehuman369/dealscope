'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, LayoutGrid, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LongTermRentalPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, setShowAuthModal } = useAuth();

  return (
    <div className="min-h-screen bg-[#e8eef3]" style={{ fontFamily: 'Poppins, sans-serif' }}>
      {/* Load Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="bg-[#e8eef3] border-b border-[#d0d7de] py-6">
        <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/images/investiq-logo-icon.png" alt="InvestIQ" className="h-12 w-12 rounded-xl" />
            <span className="text-2xl font-bold text-navy-900">
              Invest<span className="text-brand-500">IQ</span>
            </span>
          </a>
          <nav className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-3 bg-brand-500 text-white font-bold rounded-lg hover:bg-brand-600 transition-all flex items-center gap-2"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={logout}
                  className="px-6 py-3 bg-transparent text-navy-900 font-bold rounded-lg hover:bg-black/5 transition-all"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowAuthModal('login')}
                  className="px-6 py-3 bg-transparent text-navy-900 font-bold rounded-lg hover:bg-black/5 transition-all"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setShowAuthModal('register')}
                  className="px-6 py-3 bg-brand-500 text-white font-bold rounded-lg hover:bg-brand-600 transition-all"
                >
                  Get Started
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Back Button */}
      <div className="max-w-[1280px] mx-auto px-8">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 px-6 py-3 bg-[#aab2bd] text-white font-bold rounded-lg hover:bg-[#8a929d] transition-all my-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Strategies
        </button>
      </div>

      {/* Strategy Header */}
      <div className="bg-brand-500 py-8 text-white mb-12">
        <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-center gap-6">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center flex-shrink-0">
            <Home className="w-10 h-10 text-brand-500" />
          </div>
          <h1 className="text-4xl font-extrabold">Long-Term Rental</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1280px] mx-auto px-8 pb-16">
        <div className="bg-white rounded-3xl p-12 shadow-lg mb-8">
          <h2 className="text-3xl font-bold text-navy-900 mb-6">The Classic Buy-and-Hold Strategy</h2>
          <p className="text-lg text-[#4a5568] leading-relaxed mb-6">
            <strong>Long-term rental</strong> is the classic buy-and-hold strategy that&apos;s made countless millionaires! You purchase a property, rent it out to reliable tenants on an annual lease, and watch your wealth grow over time.
          </p>

          <div className="bg-gradient-to-r from-[#e0f2fe] to-[#dbeafe] border-l-4 border-brand-500 rounded-lg p-6 my-8">
            <h3 className="text-2xl font-bold text-navy-900 mb-4">The magic happens in three ways:</h3>
            <ol className="space-y-4">
              <li className="flex items-start gap-4">
                <span className="w-8 h-8 bg-brand-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">1</span>
                <div>
                  <strong className="text-navy-900">Monthly cash flow</strong>
                  <span className="text-[#4a5568]"> puts money in your pocket NOW!</span>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="w-8 h-8 bg-brand-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">2</span>
                <div>
                  <strong className="text-navy-900">Your tenants build equity for you</strong>
                  <span className="text-[#4a5568]"> by paying down the loan</span>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="w-8 h-8 bg-brand-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">3</span>
                <div>
                  <strong className="text-navy-900">Appreciation</strong>
                  <span className="text-[#4a5568]"> grows your property value over time.</span>
                </div>
              </li>
            </ol>
          </div>

          <div className="bg-gradient-to-r from-[#cffafe] to-[#e0f2fe] border-l-4 border-[#00e5ff] rounded-lg p-6 my-8">
            <p className="text-lg text-navy-900 italic">
              It&apos;s the perfect <strong>&quot;set it and forget it&quot;</strong> strategy—ideal for investors who want to build lasting wealth.
            </p>
          </div>

          <button
            onClick={() => router.push('/')}
            className="w-full py-5 bg-brand-500 text-white text-xl font-bold rounded-full hover:bg-brand-600 transition-all"
          >
            Got it!
          </button>
        </div>

        <div className="bg-white rounded-3xl p-12 shadow-lg">
          <h2 className="text-3xl font-bold text-navy-900 mb-8">Why Choose Long-Term Rental?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8">
              <div className="text-5xl mb-4">💰</div>
              <h4 className="text-xl font-bold text-navy-900 mb-2">Steady Income</h4>
              <p className="text-[#4a5568]">Predictable monthly cash flow</p>
            </div>
            <div className="text-center p-8">
              <div className="text-5xl mb-4">📈</div>
              <h4 className="text-xl font-bold text-navy-900 mb-2">Wealth Building</h4>
              <p className="text-[#4a5568]">Equity growth over time</p>
            </div>
            <div className="text-center p-8">
              <div className="text-5xl mb-4">🏠</div>
              <h4 className="text-xl font-bold text-navy-900 mb-2">Tax Benefits</h4>
              <p className="text-[#4a5568]">Deductions and depreciation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-[#d0d7de] py-8">
        <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/investiq-logo-icon.png" alt="InvestIQ" className="h-12 w-12 rounded-xl" />
            <span className="text-xl font-bold text-navy-900">
              Invest<span className="text-brand-500">IQ</span>
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#4a5568]">© 2026 InvestIQ. All rights reserved.</p>
            <p className="text-sm font-semibold text-navy-900">Invest like a Guru!</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

