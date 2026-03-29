'use client';

import React from 'react';
import Image from 'next/image';

export function HowItWorksSection() {
  return (
    <section className="how">
      <div className="how-inner">
        <div className="section-label">How It Works</div>
        <h2>Two Steps. Zero Wasted Time.</h2>
        <p className="how-sub">
          Most investors waste hours on properties that never pencil out.
          DealGapIQ separates the filter from the toolkit — so you only go deep on deals worth pursuing.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
          <Image
            src="/images/how-it-works-steps.png"
            alt="Step 1: The Verdict — instant deal analysis. Step 2: The Strategy — professional-grade tools."
            width={1024}
            height={861}
            style={{ width: '100%', maxWidth: '900px', height: 'auto', borderRadius: '12px' }}
            priority
          />
        </div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
