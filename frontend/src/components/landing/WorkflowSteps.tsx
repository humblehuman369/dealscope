'use client';

const steps = [
  {
    num: '01 — SCAN',
    title: 'Enter an address or scan a property with your phone',
    desc: 'Field-ready on your smartphone. Pull data on any property the moment it catches your eye.',
  },
  {
    num: '02 — SCREEN',
    title: 'Set your Buy Box, get an instant Verdict',
    desc: 'Define your criteria once. Every property gets a PASS, MARGINAL, or BUY verdict in seconds.',
  },
  {
    num: '03 — STRESS TEST',
    title: 'Adjust variables and see the impact in real time',
    desc: 'Condition, rehab, location, terms — change any assumption and watch the numbers shift instantly.',
  },
  {
    num: '04 — ACT',
    title: 'Generate reports, track deals, close with confidence',
    desc: 'Lender-ready PDFs, downloadable Excel proformas, side-by-side comparisons, and a full pipeline from first look to closing.',
  },
] as const;

export function WorkflowSteps() {
  return (
    <section style={{ padding: '5rem 2rem', maxWidth: 1100, margin: '0 auto' }}>
      <div className="section-label">Built for How Investors Work</div>
      <div className="section-title">
        From First Look to Confident Offer — in Four Steps.
      </div>
      <div className="section-subtitle">
        The same workflow professional investors use, automated and instant.
      </div>
      <div className="workflow-steps">
        {steps.map((step) => (
          <div key={step.num} className="wf-step">
            <div className="wf-step-num">{step.num}</div>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
