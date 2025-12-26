'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, TrendingUp, Building2, Repeat, Hammer, Users, FileText, Home,
  Sparkles, ChevronRight, ArrowRight, Target,
  DollarSign, PiggyBank, BarChart3, LineChart, Percent, Award, Zap
} from 'lucide-react'

const strategies = [
  { id: 'ltr', name: 'Long-Term Rental', description: 'Steady monthly cash flow with buy-and-hold', icon: Building2, color: 'violet' },
  { id: 'str', name: 'Short-Term Rental', description: 'Airbnb/VRBO for maximum revenue', icon: Home, color: 'cyan' },
  { id: 'brrrr', name: 'BRRRR', description: 'Buy, Rehab, Rent, Refinance, Repeat', icon: Repeat, color: 'emerald' },
  { id: 'flip', name: 'Fix & Flip', description: 'Renovate and sell for quick profit', icon: Hammer, color: 'orange' },
  { id: 'house_hack', name: 'House Hacking', description: 'Live in one unit, rent the rest', icon: Users, color: 'blue' },
  { id: 'wholesale', name: 'Wholesale', description: 'Assign contracts without ownership', icon: FileText, color: 'pink' },
]

const features = [
  { icon: BarChart3, title: '10-Year Projections', description: 'Visualize wealth accumulation over time', color: 'violet' },
  { icon: LineChart, title: 'Interactive Charts', description: 'Cash flow, equity, and appreciation graphs', color: 'cyan' },
  { icon: Award, title: 'Deal Score', description: 'Single 1-100 rating for quick evaluation', color: 'emerald' },
  { icon: Zap, title: 'What-If Analysis', description: 'Test scenarios with adjustable sliders', color: 'orange' },
]

export default function SearchPage() {
  const [address, setAddress] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const router = useRouter()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[DEBUG search/page] handleSearch called', { address });
    if (!address.trim()) {
      console.log('[DEBUG search/page] Empty address, skipping');
      return
    }
    setIsSearching(true)
    console.log('[DEBUG search/page] Navigating to property page', { address });
    // Use window.location for reliable navigation
    window.location.href = `/property?address=${encodeURIComponent(address)}`
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      {/* Hero Section */}
      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4 leading-tight">
            Analyze Any Property<br />
            <span className="bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
              in Seconds
            </span>
          </h1>
          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto font-light">
            Get instant investment analytics across 6 strategies. Make data-driven decisions with confidence.
          </p>

          {/* Search Card */}
          <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-3 max-w-2xl mx-auto">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={1.5} />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter property address..."
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-200 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !address.trim()}
                className="px-8 py-4 bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500 text-white font-semibold rounded-2xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
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
            <a
              href="/compare"
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-violet-500 transition-colors"
            >
              <BarChart3 className="w-4 h-4" strokeWidth={1.5} />
              Compare properties
            </a>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-12 mt-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-800">6</div>
              <div className="text-sm text-gray-400 font-light">Strategies</div>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-800">&lt;3s</div>
              <div className="text-sm text-gray-400 font-light">Analysis</div>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-800">140M+</div>
              <div className="text-sm text-gray-400 font-light">Properties</div>
            </div>
          </div>
        </div>
      </section>

      {/* Strategies Section */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Six Investment Strategies</h2>
            <p className="text-gray-400 font-light">Find the approach that fits your goals</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategies.map((strategy) => {
              const Icon = strategy.icon
              const colorClasses: Record<string, string> = {
                violet: 'bg-violet-50 text-violet-500',
                cyan: 'bg-cyan-50 text-cyan-500',
                emerald: 'bg-emerald-50 text-emerald-500',
                orange: 'bg-orange-50 text-orange-500',
                blue: 'bg-blue-50 text-blue-500',
                pink: 'bg-pink-50 text-pink-500',
              }
              return (
                <div key={strategy.id} className="bg-white rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow cursor-pointer group">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${colorClasses[strategy.color]} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-800">{strategy.name}</h3>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-sm text-gray-400 font-light">{strategy.description}</p>
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
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Powerful Analytics</h2>
            <p className="text-gray-400 font-light">Everything you need to make informed decisions</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, i) => {
              const Icon = feature.icon
              const colorClasses: Record<string, string> = {
                violet: 'from-violet-500 to-purple-600',
                cyan: 'from-cyan-500 to-blue-600',
                emerald: 'from-emerald-500 to-green-600',
                orange: 'from-orange-500 to-red-500',
              }
              return (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow text-center">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[feature.color]} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-400 font-light">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500 rounded-3xl p-10 text-center text-white shadow-xl">
            <h2 className="text-3xl font-bold mb-3">Ready to Analyze?</h2>
            <p className="text-white/80 mb-8 font-light">Enter any US property address and get instant investment analytics.</p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-8 py-4 bg-white text-gray-800 font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
            >
              Search Property
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

