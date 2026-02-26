'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useSession, useLogout } from '@/hooks/useSession';
import { useAuthModal } from '@/hooks/useAuthModal';

/* ───────────────── Property Context (from active analysis) ───────────────── */

interface PropertyContext {
  address?: string;
  price?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
}

function usePropertyContext(): PropertyContext | null {
  const [ctx, setCtx] = useState<PropertyContext | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('dealMakerOverrides');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      // Require at minimum a price to consider this a valid context
      if (parsed.price) {
        setCtx({
          address: parsed.address || undefined,
          price: parsed.price,
          beds: parsed.beds,
          baths: parsed.baths,
          sqft: parsed.sqft,
        });
      }
    } catch {
      // Ignore parse errors
    }
  }, []);
  return ctx;
}

function PropertyContextCard({
  strategyName,
  accentColor,
  ctx,
}: {
  strategyName: string;
  accentColor: string;
  ctx: PropertyContext;
}) {
  const address = ctx.address || 'Your Property';
  const price = ctx.price ? `$${ctx.price.toLocaleString()}` : '—';
  const details = [
    ctx.beds ? `${ctx.beds} bed` : null,
    ctx.baths ? `${ctx.baths} bath` : null,
    ctx.sqft ? `${ctx.sqft.toLocaleString()} sqft` : null,
  ].filter(Boolean).join(' · ');

  const addressEncoded = encodeURIComponent(address);

  return (
    <div
      style={{
        background: `${accentColor}08`,
        border: `1px solid ${accentColor}20`,
        borderRadius: 16,
        padding: '2rem',
        marginBottom: '1.5rem',
      }}
    >
      <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: accentColor, margin: '0 0 0.75rem' }}>
        Active Analysis
      </p>
      <h3 style={{ fontWeight: 700, fontSize: '1.25rem', color: '#F1F5F9', margin: '0 0 0.25rem' }}>
        How {address.split(',')[0]} performs as a {strategyName}
      </h3>
      <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: '0 0 1.25rem' }}>
        {details ? `${details} · ` : ''}Listed at {price}
      </p>
      <Link
        href={`/verdict?address=${addressEncoded}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.5rem',
          background: accentColor,
          color: '#000',
          fontWeight: 700,
          fontSize: '0.875rem',
          borderRadius: 10,
          textDecoration: 'none',
        }}
      >
        Run Full Analysis
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
      </Link>
    </div>
  );
}

/* ───────────────── Types ───────────────── */

interface StrategyBenefit {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface StrategyPageLayoutProps {
  name: string;
  tagline: string;
  accentColor: string;
  icon: React.ReactNode;
  headline: string;
  children: React.ReactNode;
  benefits: StrategyBenefit[];
  benefitsHeadline: string;
}

/* ───────────────── Helper Components ───────────────── */

export function Callout({
  title,
  children,
  accentColor,
}: {
  title?: string;
  children: React.ReactNode;
  accentColor: string;
}) {
  return (
    <div
      style={{
        background: `${accentColor}0A`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 10,
        padding: '1.5rem',
        margin: '1.5rem 0',
      }}
    >
      {title && (
        <h3
          style={{
            fontWeight: 700,
            fontSize: '1.25rem',
            color: '#F1F5F9',
            margin: '0 0 0.5rem',
          }}
        >
          {title}
        </h3>
      )}
      <div style={{ color: '#CBD5E1', fontSize: '1.0625rem', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        color: '#CBD5E1',
        fontSize: '1.0625rem',
        lineHeight: 1.75,
        margin: '0 0 1rem',
      }}
    >
      {children}
    </p>
  );
}

export function StepItem({
  num,
  title,
  description,
  accentColor,
}: {
  num: number;
  title: string;
  description: string;
  accentColor: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
        padding: '1.25rem',
        background: `${accentColor}06`,
        borderRadius: 12,
        border: `1px solid ${accentColor}12`,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: accentColor,
          color: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '1rem',
          flexShrink: 0,
        }}
      >
        {num}
      </div>
      <div>
        <h4
          style={{
            fontWeight: 700,
            fontSize: '1.0625rem',
            color: '#F1F5F9',
            margin: '0 0 0.25rem',
          }}
        >
          {title}
        </h4>
        <p style={{ color: '#94A3B8', fontSize: '0.9375rem', margin: 0, lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
    </div>
  );
}

/* ───────────────── Main Layout ───────────────── */

export function StrategyPageLayout({
  name,
  tagline,
  accentColor,
  icon,
  headline,
  children,
  benefits,
  benefitsHeadline,
}: StrategyPageLayoutProps) {
  const { user, isAuthenticated } = useSession();
  const { openAuthModal } = useAuthModal();
  const logoutMutation = useLogout();
  const propertyCtx = usePropertyContext();

  return (
    <div
      style={{
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        background: '#000',
        minHeight: '100vh',
        color: '#CBD5E1',
      }}
    >
      {/* Font: Inter is self-hosted via next/font in layout.tsx */}

      {/* Responsive styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .strat-benefits-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 1.5rem;
            }
            @media (max-width: 768px) {
              .strat-benefits-grid { grid-template-columns: repeat(2, 1fr); }
              .strat-hero-title { font-size: 2rem !important; }
              .strat-content-card { padding: 2rem !important; }
            }
            @media (max-width: 480px) {
              .strat-benefits-grid { grid-template-columns: 1fr; }
              .strat-hero-title { font-size: 1.75rem !important; }
              .strat-content-card { padding: 1.5rem !important; }
              .strat-nav-actions { gap: 0.375rem !important; }
              .strat-nav-actions button, .strat-nav-actions a {
                padding: 0.5rem 0.75rem !important;
                font-size: 0.8125rem !important;
              }
            }
          `,
        }}
      />

      {/* ── Header ── */}
      <header
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '1rem 0',
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            padding: '0 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '1.375rem',
                fontWeight: 700,
                color: '#F1F5F9',
                letterSpacing: '-0.02em',
              }}
            >
              DealGap<span style={{ color: '#0EA5E9' }}>IQ</span>
            </span>
          </Link>
          <nav className="strat-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isAuthenticated && user ? (
              <>
                <Link
                  href="/search"
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: '#38bdf8',
                    color: '#000',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    borderRadius: 8,
                    textDecoration: 'none',
                  }}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => logoutMutation.mutate()}
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: 'transparent',
                    color: '#94A3B8',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => openAuthModal('login')}
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: 'transparent',
                    color: '#94A3B8',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: '#38bdf8',
                    color: '#000',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  Get Started
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── Back Link ── */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem 2rem 0' }}>
        <Link
          href="/#strategies"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#64748B',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} />
          Back to Strategies
        </Link>
      </div>

      {/* ── Strategy Hero ── */}
      <div
        style={{
          background: `radial-gradient(ellipse at top center, ${accentColor}12 0%, transparent 60%)`,
          padding: '3rem 0 2rem',
        }}
      >
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 2rem', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: 16,
              background: `${accentColor}12`,
              border: `1px solid ${accentColor}25`,
              color: accentColor,
              marginBottom: '1.5rem',
            }}
          >
            {icon}
          </div>
          <h1
            className="strat-hero-title"
            style={{
              fontWeight: 700,
              fontSize: '2.5rem',
              color: '#F1F5F9',
              letterSpacing: '-0.025em',
              margin: '0 0 0.5rem',
              lineHeight: 1.2,
            }}
          >
            {name}
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '1.125rem', margin: 0 }}>{tagline}</p>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 2rem 4rem' }}>
        {/* Primary Content Card */}
        <div
          className="strat-content-card"
          style={{
            background: '#0C1220',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16,
            padding: '2.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <h2
            style={{
              fontWeight: 700,
              fontSize: '1.75rem',
              color: '#F1F5F9',
              letterSpacing: '-0.02em',
              margin: '0 0 1rem',
            }}
          >
            {headline}
          </h2>

          {children}

          {/* CTA */}
          <Link
            href="/?action=analyze"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '1rem 2rem',
              background: '#38bdf8',
              color: '#000',
              fontWeight: 700,
              fontSize: '1rem',
              borderRadius: 10,
              textDecoration: 'none',
              marginTop: '2rem',
            }}
          >
            Start Analyzing Properties
          </Link>
        </div>

        {/* Property Context — shown when user arrived from an active analysis */}
        {propertyCtx && (
          <PropertyContextCard strategyName={name} accentColor={accentColor} ctx={propertyCtx} />
        )}

        {/* Benefits Card */}
        <div
          className="strat-content-card"
          style={{
            background: '#0C1220',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16,
            padding: '2.5rem',
          }}
        >
          <h2
            style={{
              fontWeight: 700,
              fontSize: '1.75rem',
              color: '#F1F5F9',
              letterSpacing: '-0.02em',
              margin: '0 0 2rem',
              textAlign: 'center',
            }}
          >
            {benefitsHeadline}
          </h2>
          <div className="strat-benefits-grid">
            {benefits.map((b, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: `${accentColor}12`,
                    color: accentColor,
                    marginBottom: '1rem',
                  }}
                >
                  {b.icon}
                </div>
                <h4
                  style={{
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: '#F1F5F9',
                    margin: '0 0 0.375rem',
                  }}
                >
                  {b.title}
                </h4>
                <p style={{ color: '#94A3B8', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                  {b.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '2rem 0',
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: '0 auto',
            padding: '0 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              color: '#F1F5F9',
              letterSpacing: '-0.02em',
            }}
          >
            DealGap<span style={{ color: '#0EA5E9' }}>IQ</span>
          </span>
          <p style={{ color: '#64748B', fontSize: '0.8125rem', margin: 0 }}>
            &copy; 2026 DealGapIQ. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
