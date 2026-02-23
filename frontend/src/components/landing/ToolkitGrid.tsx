'use client';

const tools = [
  { name: 'Scan', core: true, desc: 'The field companion. Scan any property from your smartphone. Data pulls instantly and syncs to desktop.' },
  { name: 'Verdict', core: true, desc: 'Set your \u201CBuy Box\u201D criteria (e.g., 12% CoC Return). Every property gets a PASS, MARGINAL, or BUY verdict.' },
  { name: 'Comps', core: true, desc: 'Three numbers that define your deal: Income Value, Target Buy, and Deal Gap. The analysis that powers everything else.' },
  { name: 'Strategy', core: false, desc: 'Run Flip, BRRRR, Wholesale, and Long-Term Rental models simultaneously on any property.' },
  { name: 'Report', core: false, desc: 'Lender-ready PDF reports and downloadable Excel proformas. Share with partners, lenders, or your investment team.' },
  { name: 'Pipeline', core: false, desc: 'Save deals, track offers, and compare opportunities side-by-side from underwriting to close.' },
];

export function ToolkitGrid() {
  return (
    <section className="sec" id="toolkit">
      <div className="sec-title">When a Deal Passes the Screen, Everything You Need Is Ready.</div>
      <div className="sec-sub">Go deep with investor-grade tools built for confident decision-making.</div>
      <div className="tool-grid">
        {tools.map((tool) => (
          <div key={tool.name} className={`card-sm tool-card${tool.core ? ' primary' : ''}`}>
            <div className="tool-name">
              {tool.name}
              {tool.core && <span className="tool-badge">Core</span>}
            </div>
            <div className="tool-desc">{tool.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
