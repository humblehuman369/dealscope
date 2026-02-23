'use client';

import React from 'react';

interface Testimonial {
  quote: string;
  initials: string;
  name: string;
  role: string;
}

const testimonials: Testimonial[] = [
  {
    quote: 'I used to spend 45 minutes per property on a spreadsheet. DealGapIQ gives me a better answer in under a minute. The Deal Gap concept alone changed how I evaluate deals.',
    initials: 'MR',
    name: 'Michael R.',
    role: 'Portfolio investor · 12 properties',
  },
  {
    quote: "The Income Value calculation is something I\u2019ve never seen anywhere else. Knowing exactly where breakeven sits \u2014 before I even tour a property \u2014 saves me from chasing bad deals.",
    initials: 'TL',
    name: 'Tamara L.',
    role: 'BRRRR investor · Denver, CO',
  },
  {
    quote: "I was skeptical of another calculator tool. But seeing the actual assumptions behind the numbers \u2014 and being able to change them \u2014 that\u2019s what convinced me to pay for Pro.",
    initials: 'JK',
    name: 'James K.',
    role: 'CPA & buy-and-hold investor',
  },
];

function renderQuote(quote: string) {
  if (quote.includes('DealGapIQ')) {
    const parts = quote.split('DealGapIQ');
    return (
      <>
        {parts[0]}
        <strong>DealGap<span className="brand-iq">IQ</span></strong>
        {parts[1]}
      </>
    );
  }
  return quote;
}

export function SocialProof() {
  return (
    <section className="social-proof">
      <div className="sp-label">What Early Users Are Saying</div>
      <div className="sp-grid">
        {testimonials.map((t, i) => (
          <div key={i} className="card-sm sp-card">
            <div className="sp-quote">&ldquo;{renderQuote(t.quote)}&rdquo;</div>
            <div className="sp-author">
              <div className="sp-avatar">{t.initials}</div>
              <div>
                <div className="sp-name">{t.name}</div>
                <div className="sp-role">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
