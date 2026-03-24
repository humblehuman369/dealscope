'use client';

import React from 'react';

const SOURCES = [
  'Zillow',
  'RentCast',
  'Redfin',
  'Realtor.com',
  'County Records',
];

export function DataSourcesSection() {
  return (
    <section className="data-section">
      <div className="data-inner">
        <div className="section-label">Powered by Real Data</div>
        <h2>Cross-Referenced from Multiple Sources</h2>
        <p className="data-sub">
          We don&apos;t guess. We aggregate, compare, and weight data from the sources investors actually trust.
        </p>

        <div className="data-sources">
          {SOURCES.map((source) => (
            <div className="data-source" key={source}>
              {source}
            </div>
          ))}
        </div>

        <p className="data-note">
          Our IQ Estimate uses a weighted algorithm across all available sources, accounting for data freshness, market coverage, and historical accuracy.
        </p>
      </div>
    </section>
  );
}

export default DataSourcesSection;
