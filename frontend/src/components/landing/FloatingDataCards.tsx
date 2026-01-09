'use client';

import React from 'react';

export function FloatingDataCards() {
  return (
    <div className="floating-cards">
      <div className="float-card float-card-1">
        <div className="float-card-value">$847/mo</div>
        <div className="float-card-label">Cash Flow</div>
      </div>
      <div className="float-card float-card-2">
        <div className="float-card-value">12.4%</div>
        <div className="float-card-label">Cash-on-Cash</div>
      </div>
      <div className="float-card float-card-3">
        <div className="float-card-value">A+</div>
        <div className="float-card-label">Deal Grade</div>
      </div>
    </div>
  );
}
