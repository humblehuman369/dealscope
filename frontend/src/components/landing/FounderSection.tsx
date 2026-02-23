'use client';

interface FounderSectionProps {
  photoSrc?: string;
}

export function FounderSection({ photoSrc }: FounderSectionProps) {
  return (
    <section className="founder-section">
      <div className="label">Who Built This</div>
      <div className="sec-title">
        From the founder of Foreclosure.com — institutional-grade intelligence,
        now in every investor&apos;s hands.
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
        </div>
        <div className="founder-stats">
          <div className="founder-stat">
            <div className="founder-stat-num">35+</div>
            <div className="founder-stat-label">Years in RE Data</div>
          </div>
          <div className="founder-stat">
            <div className="founder-stat-num">80+</div>
            <div className="founder-stat-label">Companies</div>
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
