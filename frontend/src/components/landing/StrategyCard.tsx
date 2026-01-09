'use client';

import React from 'react';
import { Strategy } from './types';

interface StrategyCardProps {
  strategy: Strategy;
}

export function StrategyCard({ strategy }: StrategyCardProps) {
  const isScale = strategy.statValue === '∞';
  
  return (
    <div className={`strategy-card ${strategy.id}`}>
      <div className="strategy-card-header">
        <div className="strategy-name">{strategy.name}</div>
        <div className="strategy-stat">
          {isScale ? (
            <>
              <div className="strategy-stat-value">
                <svg 
                  className="growth-icon" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke={strategy.color}
                  strokeWidth="2"
                >
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
              <div className="strategy-stat-label">{strategy.statLabel}</div>
            </>
          ) : (
            <>
              <div className="strategy-stat-value" style={{ color: strategy.color }}>
                {strategy.statValue}
              </div>
              <div className="strategy-stat-label">{strategy.statLabel}</div>
            </>
          )}
        </div>
      </div>
      <div className="strategy-tagline">{strategy.tagline}</div>
      <div className="strategy-description">{strategy.description}</div>
    </div>
  );
}
