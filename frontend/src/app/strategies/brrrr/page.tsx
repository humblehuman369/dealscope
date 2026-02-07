'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, ArrowLeft, LayoutGrid } from 'lucide-react';
import { useSession, useLogout } from '@/hooks/useSession';
import { useAuthModal } from '@/hooks/useAuthModal';

export default function BRRRRPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useSession();
  const { openAuthModal } = useAuthModal();
  const logoutMutation = useLogout();

  const steps = [
    { num: 1, title: 'Buy', desc: 'Purchase a distressed property below market value' },
    { num: 2, title: 'Rehab', desc: 'Transform it into something beautiful' },
    { num: 3, title: 'Rent', desc: 'Place quality tenants for steady cash flow' },
    { num: 4, title: 'Refinance', desc: 'Pull your capital back out at the new higher value' },
    { num: 5, title: 'Repeat', desc: 'Use that capital to do it all over again!' },
  ];

  return (
    <div className="min-h-screen bg-[#e8eef3]" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="bg-[#e8eef3] border-b border-[#d0d7de] py-6">
        <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-brand-500 to-blue-700 shadow-lg shadow-brand-500/30" />
              <img src="/images/investiq-logo-icon.png" alt="InvestIQ" className="relative h-12 w-12 rounded-full object-cover" style={{ boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), 0 4px 12px rgba(14, 99, 246, 0.25)' }} />
            </div>
            <span className="text-2xl font-bold text-navy-900 tracking-tight">Invest<span className="text-brand-500">IQ</span></span>
          </a>
          <nav className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <>
                <button onClick={() => router.push('/dashboard')} className="px-6 py-3 bg-brand-500 text-white font-bold rounded-lg hover:bg-brand-600 transition-all flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" /> Dashboard
                </button>
                <button onClick={() => logoutMutation.mutate()} className="px-6 py-3 bg-transparent text-navy-900 font-bold rounded-lg hover:bg-black/5 transition-all">Sign Out</button>
              </>
            ) : (
              <>
                <button onClick={() => openAuthModal('login')} className="px-6 py-3 bg-transparent text-navy-900 font-bold rounded-lg hover:bg-black/5 transition-all">Sign In</button>
                <button onClick={() => openAuthModal('register')} className="px-6 py-3 bg-brand-500 text-white font-bold rounded-lg hover:bg-brand-600 transition-all">Get Started</button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Back Button */}
      <div className="max-w-[1280px] mx-auto px-8">
        <button onClick={() => router.push('/')} className="flex items-center gap-2 px-6 py-3 bg-[#aab2bd] text-white font-bold rounded-lg hover:bg-[#8a929d] transition-all my-8">
          <ArrowLeft className="w-4 h-4" /> Back to Strategies
        </button>
      </div>

      {/* Strategy Header */}
      <div className="bg-brand-500 py-8 text-white mb-12">
        <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-center gap-6">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-10 h-10 text-brand-500" />
          </div>
          <h1 className="text-4xl font-extrabold">BRRRR</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1280px] mx-auto px-8 pb-16">
        <div className="bg-white rounded-3xl p-12 shadow-lg mb-8">
          <h2 className="text-3xl font-bold text-navy-900 mb-6">Buy, Rehab, Rent, Refinance, Repeat</h2>
          <p className="text-lg text-[#4a5568] leading-relaxed mb-6">
            <strong>BRRRR</strong> stands for Buy, Rehab, Rent, Refinance, Repeat—and it&apos;s the holy grail for serious investors who want to scale FAST!
          </p>

          <div className="bg-gradient-to-r from-[#e0f2fe] to-[#dbeafe] border-l-4 border-brand-500 rounded-lg p-6 my-8">
            <h3 className="text-2xl font-bold text-navy-900 mb-4">The goal is &quot;infinite return&quot;</h3>
            <p className="text-lg text-navy-900">When you&apos;ve pulled out 100% of your investment but still own a property that pays you every month.</p>
          </div>

          <h3 className="text-2xl font-bold text-navy-900 mb-6">The BRRRR Process:</h3>
          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.num} className="bg-gradient-to-r from-[#f0f9ff] to-[#e0f2fe] rounded-xl p-6 flex items-start gap-6">
                <div className="w-12 h-12 bg-gradient-brand-teal text-white rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0">
                  {step.num}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-navy-900 mb-1">{step.title}</h4>
                  <p className="text-[#4a5568]">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => router.push('/')} className="w-full py-5 bg-brand-500 text-white text-xl font-bold rounded-full hover:bg-brand-600 transition-all mt-8">
            Got it!
          </button>
        </div>

        <div className="bg-white rounded-3xl p-12 shadow-lg">
          <h2 className="text-3xl font-bold text-navy-900 mb-8">Why BRRRR Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8">
              <div className="text-5xl mb-4">♻️</div>
              <h4 className="text-xl font-bold text-navy-900 mb-2">Recycle Capital</h4>
              <p className="text-[#4a5568]">Reuse the same money repeatedly</p>
            </div>
            <div className="text-center p-8">
              <div className="text-5xl mb-4">📊</div>
              <h4 className="text-xl font-bold text-navy-900 mb-2">Build Equity Fast</h4>
              <p className="text-[#4a5568]">Force appreciation through rehab</p>
            </div>
            <div className="text-center p-8">
              <div className="text-5xl mb-4">🚀</div>
              <h4 className="text-xl font-bold text-navy-900 mb-2">Scale Quickly</h4>
              <p className="text-[#4a5568]">Build a portfolio in months, not years</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-[#d0d7de] py-8">
        <div className="max-w-[1280px] mx-auto px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/investiq-logo-icon.png" alt="InvestIQ" className="h-12 w-12 rounded-xl" />
            <span className="text-xl font-bold text-navy-900">Invest<span className="text-brand-500">IQ</span></span>
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

