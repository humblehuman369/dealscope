'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Search, Building2, Home, Repeat, Hammer, Users, FileText,
  BarChart3, LineChart, Award, Zap, ArrowRight, ChevronRight
} from 'lucide-react'

const strategies = [
  { id: 'ltr', name: 'Long-Term Rental', description: 'Steady monthly cash flow with buy-and-hold', icon: Building2, color: '#0465f2' },
  { id: 'str', name: 'Short-Term Rental', description: 'Airbnb/VRBO for maximum revenue', icon: Home, color: '#8b5cf6' },
  { id: 'brrrr', name: 'BRRRR', description: 'Buy, Rehab, Rent, Refinance, Repeat', icon: Repeat, color: '#f97316' },
  { id: 'flip', name: 'Fix & Flip', description: 'Renovate and sell for quick profit', icon: Hammer, color: '#ec4899' },
  { id: 'house_hack', name: 'House Hacking', description: 'Live in one unit, rent the rest', icon: Users, color: '#14b8a6' },
  { id: 'wholesale', name: 'Wholesale', description: 'Assign contracts without ownership', icon: FileText, color: '#84cc16' },
]

const features = [
  { icon: BarChart3, title: '10-Year Projections', description: 'Visualize wealth accumulation over time', color: '#8b5cf6' },
  { icon: LineChart, title: 'Interactive Charts', description: 'Cash flow, equity, and appreciation graphs', color: '#4dd0e1' },
  { icon: Award, title: 'Deal Score', description: 'Single 1-100 rating for quick evaluation', color: '#10b981' },
  { icon: Zap, title: 'What-If Analysis', description: 'Test scenarios with adjustable sliders', color: '#f97316' },
]

export default function SearchPage() {
  const [address, setAddress] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address.trim()) return
    setIsSearching(true)
    router.push(`/property?address=${encodeURIComponent(address)}`)
  }

  return (
    <div className="min-h-screen bg-[#0a0a12]">
      {/* Header */}
      <header className="px-6 py-4 border-b border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white">
            Invest<span className="text-[#4dd0e1]">IQ</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/#strategies" className="text-gray-400 hover:text-white transition-colors text-sm">Strategies</Link>
            <Link href="/#features" className="text-gray-400 hover:text-white transition-colors text-sm">Features</Link>
            <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors text-sm">Pricing</Link>
          </nav>
          <div className="flex items-center gap-3">
            <button className="text-gray-300 hover:text-white text-sm font-medium transition-colors">Sign In</button>
            <button className="px-4 py-2 bg-[#4dd0e1] text-[#07172e] text-sm font-semibold rounded-lg hover:bg-[#3bc4d5] transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Analyze Any Property<br />
            <span className="text-[#4dd0e1]">in Seconds</span>
          </h1>
          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
            Get instant investment analytics across 6 strategies. Make data-driven decisions with confidence.
          </p>

          {/* Search Card */}
          <div className="bg-[#0d1829] rounded-2xl p-2 max-w-2xl mx-auto border border-white/5">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" strokeWidth={1.5} />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter property address..."
                  className="w-full pl-12 pr-4 py-4 bg-[#07172e] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#4dd0e1]/50 transition-all border border-white/5"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !address.trim()}
                className="px-8 py-4 bg-[#4dd0e1] text-[#07172e] font-semibold rounded-xl hover:bg-[#3bc4d5] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isSearching ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing
                  </span>
                ) : (
                  <>Analyze</>
                )}
              </button>
            </form>
          </div>

          {/* Quick Links */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <Link
              href="/compare"
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#4dd0e1] transition-colors"
            >
              <BarChart3 className="w-4 h-4" strokeWidth={1.5} />
              Compare properties
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-12 mt-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">6</div>
              <div className="text-sm text-gray-500">Strategies</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold text-white">&lt;3s</div>
              <div className="text-sm text-gray-500">Analysis</div>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold text-white">140M+</div>
              <div className="text-sm text-gray-500">Properties</div>
            </div>
          </div>
        </div>
      </section>

      {/* Strategies Section */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-white mb-2">Six Investment Strategies</h2>
            <p className="text-gray-500">Find the approach that fits your goals</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategies.map((strategy) => {
              const Icon = strategy.icon
              return (
                <div 
                  key={strategy.id} 
                  className="bg-[#0d1829] rounded-2xl p-5 border border-white/5 hover:border-[#4dd0e1]/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${strategy.color}15` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: strategy.color }} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-white">{strategy.name}</h3>
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[#4dd0e1] group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-sm text-gray-500">{strategy.description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-white mb-2">Powerful Analytics</h2>
            <p className="text-gray-500">Everything you need to make informed decisions</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, i) => {
              const Icon = feature.icon
              return (
                <div 
                  key={i} 
                  className="bg-[#0d1829] rounded-2xl p-6 border border-white/5 text-center hover:border-[#4dd0e1]/30 transition-all"
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: `${feature.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: feature.color }} strokeWidth={1.5} />
                  </div>
                  <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-500">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-[#007ea7] to-[#4dd0e1] rounded-3xl p-10 text-center">
            <h2 className="text-3xl font-bold text-white mb-3">Ready to Analyze?</h2>
            <p className="text-white/80 mb-8">Enter any US property address and get instant investment analytics.</p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-8 py-4 bg-white text-[#07172e] font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 mx-auto"
            >
              Search Property
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          © 2026 InvestIQ. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
