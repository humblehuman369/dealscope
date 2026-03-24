'use client';

interface FounderSectionProps {
  photoSrc?: string;
  title?: React.ReactNode;
  titleStyle?: React.CSSProperties;
}

export function FounderSection({ photoSrc, title, titleStyle }: FounderSectionProps) {
  return (
    <section className="founder-section">
      <div className="label">Who Built This</div>
      <div className="sec-title" style={titleStyle}>
        {title ?? (
          <>
            From the founder of Foreclosure.com — institutional-grade intelligence,
            now in every investor&apos;s hands.
          </>
        )}
      </div>
      <div className="card-lg founder-card">
        <div className="founder-top-bar"></div>
        <div className="founder-inner">
          {photoSrc ? (
            <div className="founder-photo">
              <img src={photoSrc} alt="Brad Geisen" />
            </div>
          ) : (
            <div className="founder-photo-fallback">BG</div>
          )}
          <div className="founder-identity">
            <div className="founder-name">Brad Geisen</div>
            <div className="founder-title">
              Founder &amp; CEO,{' '}
              <strong>
                DealGap<span className="brand-iq">IQ</span>
              </strong>
            </div>
          </div>
        </div>
        <div className="founder-body">
          <div className="founder-bio">
            <p>
              Over two decades ago, Fannie Mae discovered that Brad&apos;s
              proprietary data platform knew more about their portfolio than
              their own internal infrastructure — and commissioned him to build{' '}
              <strong>HomePath.com</strong>. He went on to build{' '}
              <strong>HomeSteps.com</strong> for Freddie Mac, establishing a
              trusted technology partnership with both GSEs that has lasted 30+
              years.
            </p>
            <p>
              <strong>
                DealGap<span className="brand-iq">IQ</span>
              </strong>{' '}
              takes that same institutional-grade analytical rigor — the kind
              previously available only to large institutions and government
              agencies — and puts it in the hands of every individual investor.
            </p>
          </div>
          <div className="founder-creds">
            <div className="founder-cred highlight">
              <span className="founder-cred-dot"></span>
              <span>Founded Foreclosure.com</span>
            </div>
            <div className="founder-cred highlight">
              <span className="founder-cred-dot"></span>
              <span>Built HomePath.com for Fannie Mae</span>
            </div>
            <div className="founder-cred highlight">
              <span className="founder-cred-dot"></span>
              <span>Built HomeSteps.com for Freddie Mac</span>
            </div>
            <div className="founder-cred highlight">
              <span className="founder-cred-dot"></span>
              <span>30+ Year GSE Partnership</span>
            </div>
            <div className="founder-cred highlight">
              <span className="founder-cred-dot"></span>
              <span>1991 HUD Public/Private Partnership</span>
            </div>
          </div>
          <a href="https://www.linkedin.com/in/bradgeisen" target="_blank" rel="noopener noreferrer" className="founder-linkedin" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 13, color: "var(--accent-sky)", textDecoration: "none" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            View LinkedIn Profile
          </a>
        </div>
        <div className="founder-stats">
          <div className="founder-stat">
            <div className="founder-stat-num">35+</div>
            <div className="founder-stat-label">Years in RE Data</div>
          </div>
          <div className="founder-stat">
            <div className="founder-stat-num">80+</div>
            <div className="founder-stat-label">Companies Served</div>
          </div>
          <div className="founder-stat">
            <div className="founder-stat-num">30+</div>
            <div className="founder-stat-label">Year GSE Partnership</div>
          </div>
          <div className="founder-stat">
            <div className="founder-stat-num">500+</div>
            <div className="founder-stat-label">Projects Built</div>
          </div>
        </div>
      </div>
    </section>
  );
}
