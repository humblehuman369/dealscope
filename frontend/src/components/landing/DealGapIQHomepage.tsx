'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthModal } from '@/hooks/useAuthModal';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import type { AddressComponents, PlaceMetadata } from '@/components/AddressAutocomplete';
import { SearchPropertyModal } from '@/components/SearchPropertyModal';
import { canonicalizeAddressForIdentity, isLikelyFullAddress, classifySearchInput, classifyPlaceTypes } from '@/utils/addressIdentity';
import './dealgapiq-homepage.css';
import { DataSourcesSection } from './DataSourcesSection';
import { HowItWorksSection } from './HowItWorksSection';

// ── Check icon SVG ──
const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: "var(--accent-sky)", flexShrink: 0 }}>
    <polyline points="2 8 6 12 14 4" />
  </svg>
);

// ── Fade-in on scroll wrapper ──
const FadeIn = ({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.12 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ── Divider ──
const DivE = () => (
  <div style={{
    width: "100%", height: 1,
    background: "linear-gradient(90deg, var(--accent-sky), var(--status-positive), var(--status-warning), var(--status-negative))",
    boxShadow: "var(--shadow-card)",
  }} />
);

// ── Card wrappers ──
const cardSmStyle: React.CSSProperties = {
  background: "var(--surface-base)",
  border: "1px solid var(--border-default)",
  boxShadow: "var(--shadow-card)",
  borderRadius: 12,
  transition: "border-color 0.3s, box-shadow 0.3s",
};

const cardLgStyle: React.CSSProperties = {
  background: "var(--surface-base)",
  border: "1px solid var(--border-default)",
  boxShadow: "var(--shadow-card-hover)",
  borderRadius: 16,
  transition: "border-color 0.3s, box-shadow 0.3s",
};

// ── Styles object ──
const s = {
  teal: "var(--accent-sky)",
  success: "var(--status-positive)",
  warning: "var(--status-warning)",
  danger: "var(--status-negative)",
  muted: "var(--text-body)",
  mutedDim: "var(--text-label)",
  fontBody: "var(--font-dm-sans), 'DM Sans', sans-serif",
  fontData: "var(--font-space-mono), 'Space Mono', monospace",
  fontLogo: "var(--font-source-sans), 'Source Sans 3', sans-serif",
};

// ── Eyebrow component ──
const Eyebrow = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    fontFamily: s.fontBody, fontSize: "clamp(12px, 1.35vw, 15px)", fontWeight: 600,
    letterSpacing: "0.10em", textTransform: "uppercase" as const,
    color: s.teal, marginBottom: 76, ...style,
  }}>
    {children}
  </div>
);

// ── Brand name ──
const BrandName = () => (
  <strong>DealGap<span style={{ color: s.teal }}>IQ</span></strong>
);

// ── Trust check item ──
const TrustCheck = ({ text }: { text: string }) => (
  <span style={{ fontFamily: s.fontBody, fontSize: 13, color: s.muted, display: "flex", alignItems: "center", gap: 5 }}>
    <CheckIcon /> {text}
  </span>
);

// ── Auth query-param handler (opens modal on ?auth=login etc.) ──
function AuthParamHandler() {
  const { openAuthModal } = useAuthModal();
  const searchParams = useSearchParams();

  useEffect(() => {
    const authParam = searchParams.get('auth');
    if (authParam === 'login' || authParam === 'required') {
      openAuthModal('login');
    } else if (authParam === 'register') {
      openAuthModal('register');
    }
  }, [searchParams, openAuthModal]);

  return null;
}

// ══════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════

interface DealGapIQHomepageProps {
  onPointAndScan?: () => void;
}

export function DealGapIQHomepage({ onPointAndScan }: DealGapIQHomepageProps) {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [founderImgError, setFounderImgError] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasValidAddress = isLikelyFullAddress(address);
  const hasText = address.trim().length >= 3;

  const navigateToMap = useCallback((lat: number, lng: number, zoom: number, label: string) => {
    const params = new URLSearchParams({
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
      zoom: String(zoom),
      label,
    })
    router.push(`/map-search?${params.toString()}`)
    setAddress('')
  }, [router])

  const handleSmartPlaceSelect = useCallback(
    (_formatted: string, components?: AddressComponents, meta?: PlaceMetadata) => {
      if (!meta?.placeTypes?.length) {
        if (components?.streetNumber || components?.street) {
          const addr = canonicalizeAddressForIdentity(_formatted)
          router.push(`/verdict?address=${encodeURIComponent(addr)}`)
        } else {
          router.push(`/search`)
        }
        setAddress('')
        return
      }

      const { category, zoom } = classifyPlaceTypes(meta.placeTypes)

      if (category === 'address') {
        const addr = canonicalizeAddressForIdentity(_formatted)
        router.push(`/verdict?address=${encodeURIComponent(addr)}`)
      } else if (meta.location) {
        navigateToMap(meta.location.lat, meta.location.lng, zoom, _formatted)
      } else {
        router.push(`/map-search`)
      }
      setAddress('')
    },
    [router, navigateToMap],
  )

  const handleManualSubmit = useCallback(
    async (text: string) => {
      const kind = classifySearchInput(text)

      if (kind === 'address') {
        const addr = canonicalizeAddressForIdentity(text)
        router.push(`/verdict?address=${encodeURIComponent(addr)}`)
        setAddress('')
        return
      }

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        router.push('/search')
        return
      }

      try {
        const resp = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(text)}&components=country:US&key=${apiKey}`,
        )
        const data = await resp.json()
        if (data.status === 'OK' && data.results?.[0]) {
          const result = data.results[0]
          const loc = result.geometry.location
          const types: string[] = result.types ?? []
          const { zoom } = classifyPlaceTypes(types)
          navigateToMap(loc.lat, loc.lng, kind === 'zip' ? 13 : zoom, result.formatted_address)
        } else {
          router.push('/search')
        }
      } catch {
        router.push('/search')
      }
      setAddress('')
    },
    [router, navigateToMap],
  )

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasText) return;
    handleManualSubmit(address);
  };

  const handleVideoPlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isVideoPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleVideoPause = () => setIsVideoPlaying(false);
  const handleVideoPlaying = () => setIsVideoPlaying(true);

  return (
    <div style={{ fontFamily: s.fontBody, background: "var(--surface-base)", color: "var(--text-heading)", lineHeight: 1.6, overflowX: "hidden" as const, WebkitFontSmoothing: "antialiased" }}>

      <Suspense fallback={null}>
        <AuthParamHandler />
      </Suspense>

      {/* ═══════════ HERO ═══════════ */}
      <section style={{
        minHeight: "50vh",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        padding: "105px 24px 155px",
        textAlign: "center" as const,
        position: "relative" as const,
      }}>
        {/* DealGapIQ Logo */}
        <div style={{ opacity: 0, animation: "fadeUp 0.6s 0.15s forwards", marginBottom: 8 }}>
          <h1 style={{
            fontFamily: s.fontLogo,
            fontSize: "clamp(52px, 9vw, 104px)",
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1,
            marginBottom: 12,
          }}>
            DealGap<span style={{ color: s.teal }}>IQ</span>
          </h1>
          <p style={{
            fontFamily: s.fontBody,
            fontSize: "clamp(13px, 1.8vw, 17px)",
            color: "var(--text-label)",
            letterSpacing: "0.02em",
          }}>
            Advanced real estate deal analysis made simple.
          </p>
        </div>

        {/* Intro Video */}
        <div
          className={`hero-video-wrapper${isVideoPlaying ? ' hero-video-expanded' : ''}`}
          style={{
            width: isVideoPlaying ? "100vw" : "100%",
            maxWidth: isVideoPlaying ? "none" : 640,
            marginLeft: isVideoPlaying ? "calc(-50vw + 50%)" : undefined,
            marginTop: 40,
            opacity: 0,
            animation: "fadeUp 0.6s 0.2s forwards",
            position: "relative" as const,
            borderRadius: isVideoPlaying ? 0 : 12,
            overflow: "hidden",
            boxShadow: isVideoPlaying ? "none" : "0 8px 32px rgba(0,0,0,0.4)",
            transition: "max-width 0.4s ease, width 0.4s ease, margin-left 0.4s ease, border-radius 0.4s ease, box-shadow 0.4s ease, padding 0.4s ease",
          }}
        >
          <video
            ref={videoRef}
            src="/videos/intro-to-dealgapiq.mp4"
            poster="/images/intro-video-poster.png"
            controls={isVideoPlaying}
            playsInline
            preload="metadata"
            onPlay={handleVideoPlaying}
            onPause={handleVideoPause}
            onEnded={handleVideoPause}
            style={{
              width: "100%",
              display: "block",
              borderRadius: isVideoPlaying ? 0 : 12,
              aspectRatio: "16 / 9",
              objectFit: isVideoPlaying ? "contain" : "cover",
              background: isVideoPlaying ? "#000" : "var(--surface-elevated)",
              transition: "border-radius 0.4s ease, object-fit 0.4s ease",
            }}
          />
          {!isVideoPlaying && (
            <button
              onClick={handleVideoPlay}
              aria-label="Play intro video"
              className="hero-video-play-btn"
              style={{
                position: "absolute" as const,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 72,
                height: 72,
                borderRadius: "50%",
                border: "none",
                background: "var(--accent-sky)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 24px rgba(14,165,233,0.4)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--text-inverse)" style={{ marginLeft: 3 }}>
                <polygon points="6,3 20,12 6,21" />
              </svg>
            </button>
          )}
        </div>

        {/* Main headline */}
        <h2 style={{
          fontFamily: s.fontBody,
          fontSize: "clamp(26px, 4.5vw, 48px)",
          fontWeight: 700,
          letterSpacing: -1,
          lineHeight: 1.2,
          marginTop: 56,
          marginBottom: 18,
          opacity: 0,
          animation: "fadeUp 0.6s 0.25s forwards",
        }}>
          <span style={{ color: s.teal }}>Is That Property a </span>Good Deal?
        </h2>

        {/* Subtitle */}
        <p style={{
          fontFamily: s.fontBody,
          fontSize: "clamp(15px, 2.2vw, 21px)",
          fontStyle: "italic" as const,
          color: "var(--text-label)",
          marginBottom: 56,
          opacity: 0,
          animation: "fadeUp 0.6s 0.3s forwards",
        }}>
          Know if it Is Worth Your Time – Before You Spend Hours on It.
        </p>

        {/* Pill CTA */}
        <div style={{ opacity: 0, animation: "fadeUp 0.6s 0.4s forwards", width: "100%", maxWidth: 540 }}>
          <form onSubmit={handleAnalyze} className="hero-pill-form" style={{
            display: "flex",
            alignItems: "center",
            border: "2px solid var(--accent-sky)",
            borderRadius: 999,
            padding: "6px 6px 6px 28px",
            background: "transparent",
            transition: "box-shadow 0.3s, border-color 0.3s",
          }}>
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              onPlaceSelect={handleSmartPlaceSelect}
              onManualSubmit={handleManualSubmit}
              searchMode="location"
              placeholder="Address, city, state, or zip..."
              name="address"
              aria-label="Search address, city, state, or zip"
              className="hero-pill-input"
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "clamp(14px, 2vw, 18px)",
                fontFamily: s.fontBody,
                fontWeight: 500,
                color: "var(--text-heading)",
                padding: "12px 0",
              }}
            />
            <button
              type="submit"
              disabled={!hasText}
              className="hero-pill-arrow"
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                border: "none",
                background: hasText ? "var(--accent-sky)" : "rgba(255,255,255,0.08)",
                cursor: hasText ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.3s, transform 0.15s",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={hasText ? "var(--text-inverse)" : "var(--text-label)"} style={{ marginLeft: 2 }}>
                <polygon points="6,3 20,12 6,21" />
              </svg>
            </button>
          </form>
          <p
            style={{
              marginTop: 10,
              marginBottom: 0,
              fontFamily: s.fontBody,
              fontSize: 12,
              color: "var(--text-label)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-sky)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Address suggestions as you type
          </p>
        </div>

        {/* Trust line */}
        <p style={{
          fontFamily: s.fontBody,
          fontSize: "clamp(13px, 1.6vw, 16px)",
          fontWeight: 600,
          marginTop: 38,
          paddingBottom: 30,
          opacity: 0,
          animation: "fadeUp 0.6s 0.5s forwards",
        }}>
          Built for first-time investors
          <span style={{ margin: "0 12px", color: "var(--text-label)" }}>–</span>
          <span style={{ color: s.teal }}>Trusted by experienced buyers</span>
        </p>
      </section>

      <SearchPropertyModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onScanProperty={onPointAndScan}
      />

      <DivE />

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <HowItWorksSection />

      <DivE />

      {/* ═══════════ THREE PRICE THRESHOLDS & THE GAPS ═══════════ */}
      <FadeIn>
        <section style={{ padding: "116px 24px", maxWidth: 1060, margin: "0 auto", textAlign: "center" as const }}>
          <Eyebrow style={{ marginBottom: 24 }}>Your Three Price Thresholds &amp; the Gaps</Eyebrow>
          <img
            src="/images/three-price-thresholds-and-gaps-corrected.png"
            alt="Your Three Price Thresholds and the Gaps — Deal Gap and Price Gap explained with Target Buy, Income Value, and Market Price"
            style={{ width: "100%", height: "auto", borderRadius: 12, display: "block" }}
            draggable={false}
          />
        </section>
      </FadeIn>

      <DivE />

      {/* ═══════════ COMPS & APPRAISAL ═══════════ */}
      <FadeIn style={{ background: "var(--color-teal-dim)" }}>
        <section style={{ padding: "116px 24px" }}>
          <div className="comps-inner" style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>

            {/* Comps Preview Image */}
            <img
              src="/images/comps-appraisal-preview.png"
              alt="Comp-Based Appraisal — Adjustment breakdown, match scores, comp details, and proximity map"
              style={{ width: "100%", height: "auto", borderRadius: 12 }}
              draggable={false}
            />

            {/* Text */}
            <div>
              <Eyebrow>Comp-Based Appraisal</Eyebrow>
              <h2 style={{ fontFamily: s.fontBody, fontSize: "clamp(26px, 3.8vw, 38px)", fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15, marginBottom: 14 }}>
                Price Property<br />Like a Professional
              </h2>
              <p style={{ fontFamily: s.fontBody, fontSize: 18, color: "var(--text-body)", maxWidth: 480, lineHeight: 1.5, marginBottom: 30, fontWeight: 500 }}>
                Select the comps. Review the logic. Set the value.
              </p>

              <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
                {[
                  { title: "Pick your own comps", desc: "Select from recent sales within your target radius. You control which properties inform the appraisal." },
                  { title: "See every adjustment", desc: "Size, bedrooms, bathrooms, age, lot — each adjustment is transparent and follows appraisal methodology." },
                  { title: "Know your confidence", desc: "A weighted similarity score tells you exactly how reliable the estimate is." },
                  { title: "Download a URAR-style report", desc: "Professional Form 1004 format — ready for partners, lenders, or your records." },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ marginTop: 3, flexShrink: 0 }}>
                      <CheckIcon />
                    </div>
                    <div>
                      <div style={{ fontFamily: s.fontBody, fontSize: 14, fontWeight: 600, color: "var(--text-heading)", marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontFamily: s.fontBody, fontSize: 13, color: s.muted, lineHeight: 1.55 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ marginTop: 28, fontFamily: s.fontBody, fontSize: 13, color: s.mutedDim, lineHeight: 1.6, borderTop: "1px solid rgba(14,165,233,0.08)", paddingTop: 18 }}>
                <strong style={{ color: s.teal, fontWeight: 600 }}>Not a licensed appraisal.</strong> An investor-grade comp analysis modeled after the industry standard — so you can price property with the same rigor the professionals use.
              </p>
            </div>
          </div>
        </section>
      </FadeIn>

      <DivE />

      {/* ═══════════ DATA SOURCES ═══════════ */}
      <DataSourcesSection />

      <DivE />

      {/* ═══════════ FOUNDER ═══════════ */}
      <FadeIn style={{ background: "var(--surface-base)", position: "relative" as const, overflow: "hidden" as const }}>
        {/* Grid background */}
        <div style={{
          position: "absolute" as const, inset: 0, opacity: 0.03,
          backgroundImage: "linear-gradient(rgba(14,165,233,1) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        {/* Top glow */}
        <div style={{
          position: "absolute" as const, top: "-200px", left: "50%", transform: "translateX(-50%)",
          width: "800px", height: "400px", borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(14,165,233,0.06) 0%, transparent 70%)",
          pointerEvents: "none" as const,
        }} />
        <section style={{ padding: "116px 24px", position: "relative" as const, zIndex: 1 }}>
          <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" as const }}>
            <Eyebrow>Built by an Industry Expert</Eyebrow>
            <h2 style={{ fontFamily: s.fontBody, fontSize: "clamp(26px, 3.8vw, 38px)", fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15, marginBottom: 14 }}>
              35 Years of Real Estate Data,<br />Distilled Into One Tool
            </h2>

            <div style={{ ...cardLgStyle, padding: "44px 36px", marginTop: 36, position: "relative" as const }}>
              <div style={{ position: "absolute" as const, top: -1, left: "50%", transform: "translateX(-50%)", width: 100, height: 2, background: s.teal, borderRadius: "0 0 2px 2px" }} />
              {founderImgError ? (
                <div
                  style={{
                    width: 112,
                    height: 112,
                    borderRadius: "50%",
                    border: `2px solid ${s.teal}`,
                    margin: "0 auto 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--surface-card)",
                    fontFamily: s.fontLogo,
                    fontSize: 28,
                    fontWeight: 700,
                    color: s.teal,
                    boxShadow: "0 0 20px rgba(14,165,233,0.12)",
                  }}
                >
                  BG
                </div>
              ) : (
                <img
                  src="/brad-geisen.png"
                  alt="Brad Geisen"
                  onError={() => setFounderImgError(true)}
                  style={{ width: 112, height: 112, borderRadius: "50%", border: `2px solid ${s.teal}`, margin: "0 auto 18px", display: "block", objectFit: "cover" as const, objectPosition: "50% 38%", boxShadow: "0 0 20px rgba(14,165,233,0.12)", boxSizing: "border-box" as const }}
                />
              )}
              <p style={{ fontFamily: s.fontBody, fontSize: 16, color: s.muted, lineHeight: 1.7, fontStyle: "italic", maxWidth: 580, margin: "0 auto 24px" }}>
                &ldquo;I spent 35 years building real estate data systems — HomePath.com for Fannie Mae, HomeSteps.com for Freddie Mac, and Foreclosure.com which I founded and operated for 21 years. I built <strong style={{ fontStyle: "normal" }}>DealGap<span style={{ color: s.teal }}>IQ</span></strong> because investors still don&apos;t have a fast, data-backed way to know their number before making an offer.&rdquo;
              </p>
              <div className="dgiq-founder-stats" style={{ display: "flex", flexWrap: "wrap" as const, gap: 10, justifyContent: "center" }}>
                {[
                  { num: "35+", label: "years in RE data" },
                  { num: "80+", label: "companies served" },
                  { num: "500+", label: "RE projects" },
                  { num: "30+", label: "yr GSE partnerships" },
                ].map((cred, i) => (
                  <div key={i} style={{ background: "var(--surface-base)", border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "7px 14px", fontFamily: s.fontBody, fontSize: 12, color: s.muted, display: "flex", alignItems: "center", gap: 5, boxShadow: "var(--shadow-card)" }}>
                    <span style={{ fontFamily: s.fontData, fontWeight: 700, color: "var(--text-heading)", fontSize: 12 }}>{cred.num}</span> {cred.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </FadeIn>

      <DivE />

      {/* ═══════════ INVESTOR FIT ═══════════ */}
      <FadeIn>
        <section style={{ padding: "116px 24px" }}>
          <div className="investor-fit-inner" style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            <div style={{ ...cardLgStyle, padding: "28px 24px" }}>
              <h2 style={{ fontFamily: s.fontBody, fontSize: "clamp(26px, 3.8vw, 38px)", fontWeight: 700, letterSpacing: -0.8, lineHeight: 1.15, marginBottom: 18 }}>
                Built for Aspiring and Small Portfolio Investors
              </h2>
              <h3 style={{ fontFamily: s.fontBody, fontSize: 18, fontWeight: 700, color: "var(--text-heading)", marginBottom: 12 }}>
                If you&apos;re just getting started
              </h3>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                {[
                  "Screen your first few deals in minutes instead of wrestling with spreadsheets.",
                  "Learn the numbers - cap rate, cash-on-cash, and DSCR - with plain-language explanations.",
                  "Know the highest price you can pay and still break even on your first rental.",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <CheckIcon />
                    <span style={{ fontFamily: s.fontBody, fontSize: 14, color: s.muted, lineHeight: 1.65 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...cardLgStyle, padding: "28px 24px" }}>
              <h3 style={{ fontFamily: s.fontBody, fontSize: 18, fontWeight: 700, color: "var(--text-heading)", marginBottom: 12 }}>
                If you&apos;re growing a small portfolio
              </h3>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                {[
                  "Quickly compare multiple offers per month using consistent, transparent assumptions.",
                  "Export full underwriting PDFs and Excel files for partners, lenders, and your records.",
                  "Stress-test rent, rates, and repairs before you commit to a new property.",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <CheckIcon />
                    <span style={{ fontFamily: s.fontBody, fontSize: 14, color: s.muted, lineHeight: 1.65 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </FadeIn>

      <DivE />

      {/* ═══════════ FINAL CTA ═══════════ */}
      <FadeIn style={{ background: "var(--color-teal-dim)" }}>
        <section style={{ padding: "132px 24px 120px", textAlign: "center" as const, position: "relative" as const }}>
          <div style={{ position: "absolute" as const, bottom: 0, left: "50%", transform: "translateX(-50%)", width: 480, height: 380, background: "radial-gradient(ellipse, var(--color-sky-dim) 0%, transparent 70%)", pointerEvents: "none" as const }} />

          <Eyebrow>Stop Guessing. Start Calculating.</Eyebrow>
          <h2 style={{ fontFamily: s.fontBody, fontSize: "clamp(30px, 4.2vw, 44px)", fontWeight: 700, letterSpacing: -1.2, marginBottom: 14, lineHeight: 1.15 }}>
            Every Property Has a Deal Gap.<br />Find Yours.
          </h2>
          <p style={{ fontFamily: s.fontBody, fontSize: 16, color: "var(--text-body)", maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.7 }}>
            Paste an address. See the three price thresholds, the Verdict Score, and which strategy makes it work.
          </p>

          <div style={{ maxWidth: 440, margin: "0 auto 20px" }}>
            <form onSubmit={handleAnalyze} style={{
              display: "flex", flexDirection: "column" as const, gap: 12,
              width: "100%",
            }}>
              <div style={{ position: "relative" as const }}>
                <svg style={{ position: "absolute" as const, left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" as const }} width="16" height="16" fill="none" stroke="var(--text-label)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <AddressAutocomplete
                  value={address}
                  onChange={setAddress}
                  onPlaceSelect={handleSmartPlaceSelect}
                  onManualSubmit={handleManualSubmit}
                  searchMode="location"
                  placeholder="Address, city, state, or zip..."
                  name="address"
                  aria-label="Search address, city, state, or zip"
                  className="hero-search-input"
                  style={{
                    width: "100%", boxSizing: "border-box" as const,
                    padding: "12px 14px 12px 38px", fontSize: 14, fontFamily: s.fontBody,
                    borderRadius: 8, border: "2px solid var(--border-default)",
                    background: "var(--surface-input)", color: "var(--text-heading)", outline: "none",
                  }}
                />
              </div>
            <button type="submit" className="hero-cta-btn" disabled={!hasText} style={{
                width: "100%", padding: "12px 24px",
                fontSize: 14, fontWeight: 700, fontFamily: s.fontBody,
                borderRadius: 8, border: "none",
                background: "linear-gradient(135deg, var(--accent-gradient-from) 0%, var(--accent-gradient-to) 100%)",
                color: "var(--text-inverse)", cursor: "pointer",
                boxShadow: "var(--shadow-card)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}>
                Analyze a Property Free →
              </button>
            </form>
          </div>

          <div style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 18, flexWrap: "wrap" as const }}>
            <TrustCheck text="No credit card" />
            <TrustCheck text="5 free analyses per month" />
            <TrustCheck text="Every assumption editable" />
          </div>

          <div style={{ fontFamily: s.fontBody, fontSize: 13, color: s.muted, marginTop: 14 }}>
            Free to start · Pro at <span style={{ color: "var(--text-heading)", fontWeight: 600 }}>$29/mo</span> (annual) for unlimited analyses
          </div>
        </section>
      </FadeIn>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer style={{ borderTop: "1px solid var(--border-subtle)", padding: "36px 24px", textAlign: "center" as const }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ fontFamily: s.fontLogo, fontSize: 18, fontWeight: 700, color: "var(--text-heading)", marginBottom: 6 }}>DealGap<span style={{ color: s.teal }}>IQ</span></div>
        </Link>
        <div style={{ fontFamily: s.fontBody, fontSize: 12, color: s.mutedDim, opacity: 0.6 }}>© 2025 DealGapIQ. All rights reserved.</div>
      </footer>
    </div>
  );
}

export default DealGapIQHomepage;
