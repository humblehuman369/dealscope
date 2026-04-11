"use client"

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRegister, useLogin } from "@/hooks/useSession";
import { IS_CAPACITOR } from "@/lib/env";

// ─── Icons ───
const CheckIcon: React.FC<{ color?: string }> = ({ color = "#0EA5E9" }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="8" fill={color} fillOpacity="0.12" />
    <path d="M5 8.5L7 10.5L11 6.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EyeIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    {open ? (
      <>
        <path d="M1.5 9C1.5 9 4 4 9 4C14 4 16.5 9 16.5 9C16.5 9 14 14 9 14C4 14 1.5 9 1.5 9Z" stroke="#475569" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="9" cy="9" r="2.5" stroke="#475569" strokeWidth="1.3" />
      </>
    ) : (
      <>
        <path d="M1.5 9C1.5 9 4 4 9 4C14 4 16.5 9 16.5 9" stroke="#475569" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M3 15L15 3" stroke="#475569" strokeWidth="1.3" strokeLinecap="round" />
      </>
    )}
  </svg>
);

const ArrowIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SpinnerIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
    <circle cx="9" cy="9" r="7" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
    <path d="M9 2a7 7 0 016.9 5.8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </svg>
);

// ─── Types ───
type PlanType = "starter" | "pro";
type Step = "form" | "success";

interface FormState {
  email: string;
  password: string;
  firstName: string;
}

// ─── Input Field ───
const InputField: React.FC<{
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  rightElement?: React.ReactNode;
}> = ({ label, type = "text", value, onChange, placeholder, autoFocus, rightElement }) => {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: "16px" }}>
      <label
        style={{
          display: "block",
          fontSize: "12px",
          fontWeight: 600,
          color: "#94A3B8",
          marginBottom: "6px",
          letterSpacing: "0.03em",
          fontFamily: "inherit",
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            width: "100%",
            minHeight: "48px",
            padding: "12px 14px",
            paddingRight: rightElement ? "42px" : "14px",
            background: "#0B1120",
            border: `1px solid ${focused ? "rgba(14,165,233,0.4)" : "rgba(148,163,184,0.1)"}`,
            borderRadius: "8px",
            color: "#E2E8F0",
            fontSize: "14px",
            fontFamily: "inherit",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
            boxShadow: focused ? "0 0 0 3px rgba(14,165,233,0.08)" : "none",
            boxSizing: "border-box",
          }}
        />
        {rightElement && (
          <div
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Plan Summary Sidebar ───
const PlanSummary: React.FC<{ plan: PlanType; trialEndDate: string; annual?: boolean }> = ({
  plan,
  trialEndDate,
  annual = true,
}) => {
  const isPro = plan === "pro";
  const proPrice = annual ? "$29" : "$39";
  const proBillingNote = annual ? "Billed annually · Cancel anytime" : "Billed monthly · Cancel anytime";

  const features = isPro
    ? [
        "Unlimited property analyses",
        "Full calculation breakdown",
        "Editable inputs & stress testing",
        "Comparable rental data sources",
        "Downloadable Excel proforma",
        "DealVaultIQ pipeline & tracking",
        "Lender-ready PDF reports",
        "Side-by-side deal comparison",
      ]
    : [
        "3 property analyses per month",
        "Deal Gap + Income Value + Target Buy",
        "IQ Verdict score",
        "All 6 strategy snapshots",
        "Seller Motivation indicator",
      ];

  return (
    <div
      style={{
        background: "#0D1424",
        border: "1px solid rgba(148,163,184,0.06)",
        borderRadius: "12px",
        padding: "28px",
        width: "100%",
        maxWidth: "320px",
        height: "fit-content",
      }}
    >
      {/* Plan badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: isPro ? "rgba(14,165,233,0.08)" : "rgba(148,163,184,0.06)",
          border: `1px solid ${isPro ? "rgba(14,165,233,0.15)" : "rgba(148,163,184,0.08)"}`,
          borderRadius: "6px",
          padding: "4px 12px",
          marginBottom: "16px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: isPro ? "#0EA5E9" : "#94A3B8",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
          }}
        >
          {isPro ? "Pro Investor" : "Starter"}
        </span>
      </div>

      {/* Price */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
          <span
            style={{
              fontSize: "36px",
              fontWeight: 800,
              color: "#F1F5F9",
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            {isPro ? proPrice : "Free"}
          </span>
          {isPro && (
            <span style={{ fontSize: "14px", color: "#64748B", fontWeight: 500 }}>
              /mo
            </span>
          )}
        </div>
        {isPro && (
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "4px" }}>
            {proBillingNote}
          </div>
        )}
      </div>

      {/* Trial notice for Pro */}
      {isPro && (
        <div
          style={{
            background: "rgba(14,165,233,0.04)",
            border: "1px solid rgba(14,165,233,0.1)",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "18px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#0EA5E9", marginBottom: "4px" }}>
            7-day free trial
          </div>
          <div style={{ fontSize: "12px", color: "#94A3B8", lineHeight: 1.5 }}>
            Full Pro access until <strong style={{ color: "#CBD5E1" }}>{trialEndDate}</strong>.
            You won&apos;t be charged until then. Cancel anytime before.
          </div>
        </div>
      )}

      {/* Divider */}
      <div
        style={{
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(148,163,184,0.08), transparent)",
          margin: "0 -4px 16px",
        }}
      />

      {/* Features */}
      <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 600, marginBottom: "10px", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
        What&apos;s included
      </div>
      {features.map((f, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "5px 0",
          }}
        >
          <CheckIcon />
          <span style={{ fontSize: "12.5px", color: "#CBD5E1", lineHeight: 1.4 }}>
            {f}
          </span>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════
// INNER COMPONENT (needs useSearchParams inside Suspense)
// ═══════════════════════════════════════════════
function RegistrationInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registerMutation = useRegister();
  const loginMutation = useLogin();

  const planParam = searchParams.get("plan");
  const billingParam = searchParams.get("billing");
  const returnToParam = searchParams.get("returnTo") || searchParams.get("redirect");
  const initialPlan: PlanType = planParam === "starter" ? "starter" : "pro";
  const [isAnnual, setIsAnnual] = useState(billingParam !== "monthly");

  const getPostRegisterPath = () => {
    if (!returnToParam) return "/search";
    try {
      const decoded = decodeURIComponent(returnToParam);
      if (decoded.startsWith("/") && !decoded.startsWith("//")) return decoded;
    } catch {
      /* ignore */
    }
    return "/search";
  };

  const [plan, setPlan] = useState<PlanType>(initialPlan);
  const [step, setStep] = useState<Step>("form");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>({
    email: "",
    password: "",
    firstName: "",
  });

  const trialEndDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const handlePlanSwitch = (p: PlanType) => {
    setPlan(p);
    router.replace(`/register?plan=${p}&billing=${isAnnual ? "annual" : "monthly"}`, { scroll: false });
  };

  const handleBillingToggle = (annual: boolean) => {
    setIsAnnual(annual);
    router.replace(`/register?plan=${plan}&billing=${annual ? "annual" : "monthly"}`, { scroll: false });
  };

  const handleCreateAccount = async () => {
    setLoading(true);
    setError("");
    try {
      await registerMutation.mutateAsync({
        email: form.email,
        password: form.password,
        fullName: form.firstName,
      });

      // Auto-login after registration
      try {
        await loginMutation.mutateAsync({
          email: form.email,
          password: form.password,
        });
      } catch {
        // If auto-login fails (e.g. email verification required),
        // we still advance — the user can log in later.
      }

      setStep("success");
    } catch (err: unknown) {
      const message = (err instanceof Error ? err.message : "Registration failed. Please try again.") ?? "Unknown error";
      const safeMessage = String(message);
      setError(safeMessage);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    form.email.includes("@") &&
    form.password.length >= 8 &&
    form.firstName.trim().length >= 2;

  // ─── Render Steps ───

  const renderForm = () => (
    <div
      style={{
        background: "linear-gradient(168deg, rgba(14,165,233,0.02) 0%, #0D1424 100%)",
        border: "1px solid rgba(148,163,184,0.06)",
        borderRadius: "12px",
        padding: "36px",
        width: "100%",
        maxWidth: "420px",
      }}
    >
      <h2
        style={{
          fontSize: "22px",
          fontWeight: 800,
          color: "#F1F5F9",
          letterSpacing: "-0.025em",
          margin: "0 0 6px",
        }}
      >
        {plan === "pro" ? "Start your free trial" : "Create your account"}
      </h2>
      <p
        style={{
          fontSize: "13px",
          color: "#94A3B8",
          margin: "0 0 28px",
          lineHeight: 1.5,
        }}
      >
        {plan === "pro"
          ? `Full Pro access free until ${trialEndDate}.`
          : "Get started with 5 free analyses per month."}
      </p>

      {/* Sign in with Apple */}
      <button
        type="button"
        onClick={async () => {
          const base = typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
            ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
            : "";
          const endpoint = base ? `${base}/api/v1/auth/apple` : "/api/v1/auth/apple";
          if (IS_CAPACITOR) {
            const { Browser } = await import("@capacitor/browser");
            const mobileRedirect = encodeURIComponent("dealgapiq://auth/callback");
            await Browser.open({ url: `${endpoint}?mobile_redirect=${mobileRedirect}` });
          } else {
            window.location.href = endpoint;
          }
        }}
        style={{
          width: "100%",
          minHeight: "48px",
          padding: "11px",
          background: "#FFFFFF",
          border: "1px solid rgba(148,163,184,0.15)",
          borderRadius: "8px",
          color: "#000000",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          fontFamily: "inherit",
          marginBottom: "10px",
          transition: "background 0.2s",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="#000000">
          <path d="M11.182 0c.223 1.05-.304 2.1-.96 2.852-.66.753-1.732 1.332-2.79 1.256-.255-1.014.374-2.08.994-2.738C9.073.666 10.228.112 11.182 0zm2.725 5.348c-.147.09-2.187 1.272-2.164 3.793.027 3.013 2.647 4.013 2.68 4.026-.022.065-.418 1.432-1.38 2.836-.83 1.213-1.69 2.424-3.047 2.448-1.332.024-1.762-.79-3.286-.79-1.525 0-2 .766-3.264.814-1.31.048-2.308-1.312-3.147-2.52C1.82 13.51.39 9.912.39 6.498.39 3.555 2.312 1.985 4.196 1.958c1.285-.024 2.498.867 3.283.867.784 0 2.256-1.073 3.803-.915.648.027 2.468.262 3.637 1.97-.094.058-.012.007-.012.007l-.001-.001.001.462z"/>
        </svg>
        Sign up with Apple
      </button>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={async () => {
          const base = typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
            ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
            : "";
          const endpoint = base ? `${base}/api/v1/auth/google` : "/api/v1/auth/google";
          if (IS_CAPACITOR) {
            const { Browser } = await import("@capacitor/browser");
            const mobileRedirect = encodeURIComponent("dealgapiq://auth/callback");
            await Browser.open({ url: `${endpoint}?mobile_redirect=${mobileRedirect}` });
          } else {
            window.location.href = endpoint;
          }
        }}
        style={{
          width: "100%",
          minHeight: "48px",
          padding: "11px",
          background: "rgba(148,163,184,0.06)",
          border: "1px solid rgba(148,163,184,0.1)",
          borderRadius: "8px",
          color: "#CBD5E1",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          fontFamily: "inherit",
          marginBottom: "20px",
          transition: "background 0.2s",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M15.68 8.18c0-.57-.05-1.12-.15-1.64H8v3.1h4.3a3.68 3.68 0 01-1.6 2.42v2h2.58c1.51-1.4 2.38-3.45 2.38-5.88z" fill="#4285F4" />
          <path d="M8 16c2.16 0 3.97-.72 5.3-1.94l-2.59-2a4.84 4.84 0 01-7.22-2.54H.88v2.06A8 8 0 008 16z" fill="#34A853" />
          <path d="M3.49 9.52a4.8 4.8 0 010-3.04V4.42H.88a8 8 0 000 7.16l2.6-2.06z" fill="#FBBC05" />
          <path d="M8 3.16a4.33 4.33 0 013.07 1.2l2.3-2.3A7.72 7.72 0 008 0 8 8 0 00.88 4.42l2.6 2.06A4.77 4.77 0 018 3.16z" fill="#EA4335" />
        </svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          margin: "0 0 20px",
        }}
      >
        <div style={{ flex: 1, height: "1px", background: "rgba(148,163,184,0.08)" }} />
        <span style={{ fontSize: "11px", color: "#475569", fontWeight: 500 }}>or</span>
        <div style={{ flex: 1, height: "1px", background: "rgba(148,163,184,0.08)" }} />
      </div>

      {/* Error message */}
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.15)",
            borderRadius: "8px",
            padding: "10px 14px",
            marginBottom: "16px",
            fontSize: "13px",
            color: "#F87171",
          }}
        >
          {error}
        </div>
      )}

      {/* Form fields */}
      <InputField
        label="Full name"
        value={form.firstName}
        onChange={(v) => setForm({ ...form, firstName: v })}
        placeholder="Brad Smith"
        autoFocus
      />

      <InputField
        label="Email address"
        type="email"
        value={form.email}
        onChange={(v) => setForm({ ...form, email: v })}
        placeholder="brad@example.com"
      />

      <InputField
        label="Password"
        type={showPassword ? "text" : "password"}
        value={form.password}
        onChange={(v) => setForm({ ...form, password: v })}
        placeholder="8+ characters"
        rightElement={
          <div onClick={() => setShowPassword(!showPassword)}>
            <EyeIcon open={showPassword} />
          </div>
        }
      />

      {/* Submit */}
      <button
        onClick={handleCreateAccount}
        disabled={!isFormValid || loading}
        style={{
          width: "100%",
          minHeight: "48px",
          padding: "13px",
          border: "none",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: 700,
          cursor: isFormValid && !loading ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          fontFamily: "inherit",
          marginTop: "8px",
          transition: "all 0.3s",
          background: isFormValid
            ? "linear-gradient(135deg, #0EA5E9, #0284C7)"
            : "rgba(148,163,184,0.08)",
          color: isFormValid ? "#fff" : "#475569",
          opacity: loading ? 0.8 : 1,
        }}
      >
        {loading ? (
          <SpinnerIcon />
        ) : (
          <>
            {plan === "pro" ? "Continue" : "Create Account"} <ArrowIcon />
          </>
        )}
      </button>

      {/* Terms */}
      <p
        style={{
          fontSize: "11px",
          color: "#475569",
          textAlign: "center",
          marginTop: "16px",
          lineHeight: 1.5,
        }}
      >
        By creating an account, you agree to our{" "}
        <Link href="/terms" style={{ color: "#64748B", textDecoration: "underline" }}>
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" style={{ color: "#64748B", textDecoration: "underline" }}>
          Privacy Policy
        </Link>
        .
      </p>

      {/* Login link */}
      <p
        style={{
          fontSize: "13px",
          color: "#64748B",
          textAlign: "center",
          marginTop: "20px",
        }}
      >
        Already have an account?{" "}
        <Link href="/login" style={{ color: "#0EA5E9", textDecoration: "none", fontWeight: 600 }}>
          Log in
        </Link>
      </p>
    </div>
  );

  const renderSuccess = () => (
    <div
      style={{
        background: "linear-gradient(168deg, rgba(14,165,233,0.02) 0%, #0D1424 100%)",
        border: "1px solid rgba(14,165,233,0.15)",
        borderRadius: "12px",
        padding: "48px 36px",
        width: "100%",
        maxWidth: "420px",
        textAlign: "center",
      }}
    >
      {/* Success animation */}
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: "rgba(14,165,233,0.1)",
          border: "2px solid rgba(14,165,233,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M8 15l4 4 8-8" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h2
        style={{
          fontSize: "24px",
          fontWeight: 800,
          color: "#F1F5F9",
          letterSpacing: "-0.025em",
          margin: "0 0 8px",
        }}
      >
        You&apos;re in, {form.firstName}.
      </h2>

      <p
        style={{
          fontSize: "14px",
          color: "#94A3B8",
          lineHeight: 1.6,
          margin: "0 0 32px",
          maxWidth: "320px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {plan === "pro" ? (
          <>
            Your Pro trial is active until{" "}
            <strong style={{ color: "#CBD5E1" }}>{trialEndDate}</strong>.
            Time to find your first Deal Gap.
          </>
        ) : (
          "Your Starter account is ready. Time to find your first Deal Gap."
        )}
      </p>

      <button
        onClick={() => router.replace(getPostRegisterPath())}
        style={{
          minHeight: "48px",
          padding: "14px 32px",
          border: "none",
          borderRadius: "8px",
          fontSize: "15px",
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          fontFamily: "inherit",
          background: "linear-gradient(135deg, #0EA5E9, #0284C7)",
          color: "#fff",
        }}
      >
        {returnToParam ? "Continue" : "Analyze Your First Property"} <ArrowIcon />
      </button>

      <p style={{ fontSize: "12px", color: "#475569", marginTop: "16px" }}>
        Enter any address · 60-second analysis
      </p>
    </div>
  );

  const stepRenderers: Record<Step, () => React.ReactNode> = {
    form: renderForm,
    success: renderSuccess,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B1120",
        color: "#E2E8F0",
        fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif",
        overflowX: "hidden",
      }}
    >
      {/* Grid background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage: `
            linear-gradient(rgba(148,163,184,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ─── NAV ─── */}
        <nav
          className="px-4 sm:px-10 py-4"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            maxWidth: "1200px",
            margin: "0 auto",
            borderBottom: "1px solid rgba(148,163,184,0.06)",
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: "17px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#F1F5F9",
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            DealGap<span style={{ color: "#0EA5E9" }}>IQ</span>
          </Link>

          <Link
            href="/pricing"
            style={{
              fontSize: "12px",
              color: "#94A3B8",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Back to pricing
          </Link>
        </nav>

        {/* ─── BILLING TOGGLE + PLAN SWITCHER (form step only) ─── */}
        {step === "form" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              padding: "32px 24px 0",
            }}
          >
            {/* Monthly / Annual toggle */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0",
                background: "#0D1424",
                borderRadius: "40px",
                padding: "4px",
                border: "1px solid rgba(148,163,184,0.08)",
              }}
            >
              <button
                onClick={() => handleBillingToggle(false)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "36px",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontFamily: "inherit",
                  background: !isAnnual ? "#0EA5E9" : "transparent",
                  color: !isAnnual ? "#fff" : "#64748B",
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => handleBillingToggle(true)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "36px",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontFamily: "inherit",
                  background: isAnnual ? "#0EA5E9" : "transparent",
                  color: isAnnual ? "#fff" : "#64748B",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                Annual
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    background: isAnnual ? "rgba(255,255,255,0.22)" : "rgba(14,165,233,0.15)",
                    color: isAnnual ? "#fff" : "#0EA5E9",
                    padding: "2px 6px",
                    borderRadius: "6px",
                  }}
                >
                  SAVE 26%
                </span>
              </button>
            </div>

            {/* Plan switcher */}
            <div style={{ display: "flex", gap: "8px" }}>
              {(["starter", "pro"] as PlanType[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePlanSwitch(p)}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "6px",
                    border: `1px solid ${plan === p ? "rgba(14,165,233,0.25)" : "rgba(148,163,184,0.08)"}`,
                    background: plan === p ? "rgba(14,165,233,0.06)" : "transparent",
                    color: plan === p ? "#0EA5E9" : "#64748B",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase" as const,
                    transition: "all 0.2s",
                  }}
                >
                  {p === "starter" ? "Starter \u00B7 Free" : `Pro \u00B7 ${isAnnual ? "$29" : "$39"}/mo`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── MAIN CONTENT ─── */}
        <section
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: "32px",
            padding: "40px 24px 80px",
            maxWidth: "820px",
            margin: "0 auto",
            flexWrap: "wrap",
          }}
        >
          {/* Left: Form / Step content */}
          {stepRenderers[step]()}

          {/* Right: Plan summary (not on success) */}
          {step !== "success" && <PlanSummary plan={plan} trialEndDate={trialEndDate} annual={isAnnual} />}
        </section>

        {/* ─── FOOTER ─── */}
        <footer
          className="px-4 sm:px-10 py-6"
          style={{
            borderTop: "1px solid rgba(148,163,184,0.06)",
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "11px", color: "#475569" }}>
            &copy; 2026 DealGapIQ. Professional use only. Not a lender.
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            <Link href="/privacy" style={{ fontSize: "11px", color: "#475569", textDecoration: "none" }}>
              Privacy
            </Link>
            <Link href="/terms" style={{ fontSize: "11px", color: "#475569", textDecoration: "none" }}>
              Terms
            </Link>
            <Link href="/help" style={{ fontSize: "11px", color: "#475569", textDecoration: "none" }}>
              Support
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// EXPORTED WRAPPER (Suspense boundary for useSearchParams)
// ═══════════════════════════════════════════════
export default function RegistrationContent() {
  return (
    <Suspense fallback={null}>
      <RegistrationInner />
    </Suspense>
  );
}
