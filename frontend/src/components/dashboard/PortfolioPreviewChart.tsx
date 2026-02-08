'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { TrendingUp, Lock } from 'lucide-react'

const PREVIEW = [
  { month: 'Jan', value: 12000 }, { month: 'Feb', value: 14500 },
  { month: 'Mar', value: 13200 }, { month: 'Apr', value: 16800 },
  { month: 'May', value: 19200 }, { month: 'Jun', value: 18400 },
  { month: 'Jul', value: 22500 }, { month: 'Aug', value: 24800 },
  { month: 'Sep', value: 23100 }, { month: 'Oct', value: 26700 },
  { month: 'Nov', value: 28900 }, { month: 'Dec', value: 31200 },
]

export function PortfolioPreviewChart() {
  return (
    <div className="bg-white dark:bg-navy-900 rounded-xl border border-slate-200 dark:border-navy-700 p-5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Portfolio Performance</h2>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />Coming Soon
        </span>
      </div>
      <div className="relative h-48">
        <div className="absolute inset-0 opacity-40 dark:opacity-30">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={PREVIEW}>
              <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} /><stop offset="95%" stopColor="#0d9488" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <Area type="monotone" dataKey="value" stroke="#0d9488" fill="url(#grad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-[2px]">
          <div className="bg-white/80 dark:bg-navy-900/80 rounded-xl px-6 py-4 text-center border border-slate-200 dark:border-navy-700 shadow-sm">
            <Lock className="w-5 h-5 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Portfolio Analytics</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Track your portfolio value, cash flow, and returns over time</p>
          </div>
        </div>
      </div>
    </div>
  )
}
