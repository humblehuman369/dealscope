/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ==========================================
      // DEALGAPIQ DESIGN SYSTEM — Dark Fintech
      // Style Guide v2.0 — February 2026
      //
      // Palette philosophy:
      //   Size and weight carry hierarchy, not visibility.
      //   Color carries meaning, not decoration.
      //   Every accent maps to a concept so the investor's
      //   eye learns the system within seconds.
      // ==========================================
      colors: {
        // ---- Base surfaces (true-black → deep navy) ----
        base: {
          DEFAULT: '#000000',     // Page background
          card: '#0C1220',        // Card / surface
          panel: '#101828',       // Elevated panels
          'panel-hover': '#152238',
        },

        // ---- Four-tier Slate text hierarchy ----
        //  All readable, no faint greys.
        slate: {
          heading: '#F1F5F9',     // Tier 1 – headings / near-white
          body: '#CBD5E1',        // Tier 2 – body text
          secondary: '#94A3B8',   // Tier 3 – secondary / dimmed
          label: '#7C8CA0',       // Tier 4 – smallest labels (WCAG AA ≥ 4.5:1 on #0C1220)
        },

        // ---- Five semantic accent colors ----
        sky: {
          DEFAULT: '#38bdf8',     // Primary actions & key data
          deep: '#0EA5E9',
          dim: 'rgba(56,189,248,0.10)',
        },
        teal: {
          DEFAULT: '#0EA5E9',     // Unified accent — sky blue
          deep: '#0EA5E9',
          dim: 'rgba(14,165,233,0.10)',
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0EA5E9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        gold: {
          DEFAULT: '#fbbf24',     // Caution & scores
          dim: 'rgba(251,191,36,0.10)',
        },
        red: {
          DEFAULT: '#f87171',     // Negatives & losses
          dim: 'rgba(248,113,113,0.10)',
        },
        green: {
          DEFAULT: '#34d399',     // Income & success states
          dim: 'rgba(52,211,153,0.10)',
        },
        purple: {
          DEFAULT: '#a78bfa',
          dim: 'rgba(167,139,250,0.10)',
        },

        // ---- Border system ----
        border: {
          DEFAULT: 'rgba(255,255,255,0.07)',
          light: 'rgba(255,255,255,0.12)',
        },

        // ---- Legacy / compatibility aliases ----
        navy: {
          DEFAULT: '#0A1628',
          light: '#0F172A',
          50: '#e8eef3',
          100: '#d1dde7',
          200: '#a3bbcf',
          300: '#7599b7',
          400: '#47779f',
          500: '#1a5587',
          600: '#15446c',
          700: '#103351',
          800: '#0b2236',
          900: '#0A1628',
          950: '#030b17',
        },
        surface: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
        },
        success: '#34d399',
        warning: '#fbbf24',
        danger: '#f87171',
        brand: {
          50: '#e6f0fe',
          100: '#cce1fd',
          200: '#99c3fb',
          300: '#66a5f9',
          400: '#3387f7',
          500: '#0465f2',
          600: '#0354d1',
          700: '#0243b0',
          800: '#02328f',
          900: '#01216e',
          950: '#011047',
        },
        primary: {
          50: '#e6f0fe',
          100: '#cce1fd',
          200: '#99c3fb',
          300: '#66a5f9',
          400: '#3387f7',
          500: '#0465f2',
          600: '#0354d1',
          700: '#0243b0',
          800: '#02328f',
          900: '#01216e',
        },
        accent: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0EA5E9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          light: '#0EA5E9',
        },
        forest: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#059669',
          600: '#047857',
          700: '#065f46',
          800: '#064e3b',
          900: '#022c22',
        },
        crimson: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#dc2626',
          600: '#b91c1c',
          700: '#991b1b',
          800: '#7f1d1d',
          900: '#450a0a',
        },
        neutral: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
      },

      // ==========================================
      // Typography — Inter single-family system
      //
      //  Headlines: 700 weight
      //  Body:      400 weight
      //  Financial: 600 weight + tabular-nums
      //  Logo only: Source Sans 3
      //  No monospace — weight and color create
      //  the data/prose distinction.
      // ==========================================
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-inter)', 'Inter', '-apple-system', 'sans-serif'],
        logo: ['var(--font-source-sans)', '"Source Sans 3"', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
        'display-sm': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
      },

      // ==========================================
      // Spacing & Layout
      // ==========================================
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '1.5rem',
        '4xl': '2rem',
        'pill': '40px',
      },
      boxShadow: {
        'brand': '0 4px 14px 0 rgba(4, 101, 242, 0.25)',
        'brand-lg': '0 10px 40px 0 rgba(4, 101, 242, 0.3)',
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'card-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'card-dark': '0 32px 64px -16px rgba(0, 0, 0, 0.5)',
        'glow-sky': '0 0 24px rgba(56, 189, 248, 0.2)',
        'glow-sky-lg': '0 0 36px rgba(56, 189, 248, 0.35)',
        'glow-teal': '0 0 20px rgba(14, 165, 233, 0.3)',
        'glow-cyan': '0 0 20px rgba(14, 165, 233, 0.5)',
        'glow-blue': '0 0 20px rgba(4, 101, 242, 0.5)',
      },

      // ==========================================
      // Animations
      // ==========================================
      animation: {
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'float-medium': 'float-medium 5s ease-in-out infinite',
        'float-fast': 'float-fast 4s ease-in-out infinite',
        'ping-slow': 'ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'target-glow': 'target-glow 3s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'score-fill': 'score-fill 1s ease-out forwards',
        'marker-slide': 'marker-slide 0.5s ease-out',
        'expand-collapse': 'expand-collapse 0.3s ease-in-out',
      },
      keyframes: {
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'float-medium': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        'float-fast': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'ping-slow': {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'target-glow': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.02)', opacity: '0.8' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'score-fill': {
          '0%': { strokeDashoffset: '100%' },
          '100%': { strokeDashoffset: '0%' },
        },
        'marker-slide': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'expand-collapse': {
          '0%': { maxHeight: '0', opacity: '0' },
          '100%': { maxHeight: '2000px', opacity: '1' },
        },
      },

      // ==========================================
      // Background gradients
      // ==========================================
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #0465f2 0%, #38bdf8 100%)',
        'gradient-brand-vertical': 'linear-gradient(180deg, #0465f2 0%, #38bdf8 100%)',
        'gradient-hero': 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(12,18,32,0.6) 0%, #000 100%)',
        'gradient-dark': 'linear-gradient(135deg, #07172e 0%, #1f2937 100%)',
        'gradient-teal': 'linear-gradient(135deg, #0EA5E9 0%, #0284c7 100%)',
        'gradient-sky': 'linear-gradient(135deg, #38bdf8 0%, #0EA5E9 100%)',
      },
    },
  },
  plugins: [],
}
