'use client';

import React from 'react';

interface MiniStrategy {
  name: string;
  tag: string;
  value: string;
  valueLabel: string;
  color: string;
  active?: boolean;
}

const miniStrategies: MiniStrategy[] = [
  { name: 'Long-Term Rental', tag: 'Best for this property', value: '12.4%', valueLabel: 'ROI', color: '#0465f2', active: true },
  { name: 'Short-Term Rental', tag: 'High seasonal demand', value: '18.2%', valueLabel: 'ROI', color: '#8b5cf6' },
  { name: 'BRRRR', tag: 'Scale potential', value: '∞', valueLabel: 'ROI', color: '#f97316' },
  { name: 'Fix & Flip', tag: 'Quick turnaround', value: '$62K', valueLabel: 'Profit', color: '#ec4899' },
];

export function AnimatedPhoneMockup() {
  return (
    <div className="phone-mockup">
      <div className="phone-screen">
        {/* Phone Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="text-[0.95rem] font-bold text-white">
            Invest<span className="text-electric-cyan">IQ</span>
          </div>
          <div className="w-7 h-7 bg-white/[0.08] rounded-full flex items-center justify-center text-[0.7rem]">
            ☀️
          </div>
        </div>

        {/* Property Card */}
        <div className="property-card">
          <div className="property-image">
            <div className="property-scan-overlay">
              <div className="property-scan-line" />
            </div>
            <div className="property-image-house">
              <svg viewBox="0 0 24 24" className="w-12 h-12 stroke-electric-cyan/60 stroke-[1.5] fill-none">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
              </svg>
            </div>
          </div>
          <div className="text-[0.75rem] font-semibold text-white mb-0.5">1247 Maple Grove Dr</div>
          <div className="text-[0.6rem] text-gray-600">4 bd • 3 ba • 2,450 sqft • $485,000</div>
        </div>

        {/* Metrics Row */}
        <div className="flex gap-1.5 mb-3">
          <MetricCard value="$847" label="Cash Flow" />
          <MetricCard value="12.4%" label="CoC ROI" />
          <MetricCard value="6.8%" label="Cap Rate" />
        </div>

        {/* Mini Strategies */}
        <div className="flex flex-col gap-1.5">
          {miniStrategies.map((strategy, idx) => (
            <MiniStrategyCard key={idx} {...strategy} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-[10px] py-2.5 px-2 text-center">
      <div className="text-[0.85rem] font-extrabold text-electric-cyan mb-0.5">{value}</div>
      <div className="text-[0.55rem] text-gray-600 uppercase tracking-[0.3px]">{label}</div>
    </div>
  );
}

function MiniStrategyCard({ name, tag, value, valueLabel, color, active }: MiniStrategy) {
  return (
    <div className={`flex items-center gap-2.5 p-2.5 rounded-[10px] border transition-all ${
      active 
        ? 'bg-electric-cyan/[0.08] border-electric-cyan/25' 
        : 'bg-white/[0.03] border-white/[0.06]'
    }`}>
      <div 
        className="w-1 h-7 rounded-sm"
        style={{ background: color }}
      />
      <div className="flex-1">
        <div className="text-[0.7rem] font-semibold text-white">{name}</div>
        <div className="text-[0.55rem] text-gray-600">{tag}</div>
      </div>
      <div className="text-right">
        <div className="text-[0.75rem] font-bold" style={{ color }}>{value}</div>
        <div className="text-[0.5rem] text-gray-600">{valueLabel}</div>
      </div>
    </div>
  );
}
