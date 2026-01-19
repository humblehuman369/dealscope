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
      // INVESTIQ DESIGN SYSTEM - Brand Colors
      // Style Guide v1.0 - January 2026
      // ==========================================
      colors: {
        // Deep Navy - Primary dark color for headings and emphasis
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
          900: '#0A1628',  // Primary dark navy
          950: '#030b17',
        },
        // Pacific Teal - Primary accent for positive values and CTAs
        teal: {
          DEFAULT: '#0891B2',
          light: '#06B6D4',
          dark: '#0E7490',
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06B6D4',  // Teal Light
          600: '#0891B2',  // Pacific Teal (DEFAULT)
          700: '#0E7490',  // Teal Dark
          800: '#155e75',
          900: '#164e63',
        },
        // Electric Cyan - Accent on dark backgrounds
        cyan: {
          electric: '#00D4FF',
          DEFAULT: '#00D4FF',
        },
        // Surface palette (Slate-based for neutrals)
        surface: {
          50: '#F8FAFC',   // Page backgrounds
          100: '#F1F5F9',  // Card hover, subtle backgrounds
          200: '#E2E8F0',  // Borders, dividers, slider tracks
          300: '#CBD5E1',  // Disabled states
          400: '#94A3B8',  // Placeholder text, icons
          500: '#64748B',  // Secondary text
          600: '#475569',  // Body text
          700: '#334155',  // Strong text
          800: '#1E293B',  // Near-black elements
        },
        // Semantic Colors
        success: '#10B981',  // Reserved for extreme emphasis only
        warning: '#F59E0B',  // Amber for caution
        danger: '#EF4444',   // Red for negative values and errors
        // Primary Brand Blue (kept for compatibility)
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
        // Legacy aliases for backward compatibility
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
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
          800: '#155e75',
          900: '#164e63',
          light: '#06B6D4',
        },
        // Forest Green (legacy - use teal for positive indicators)
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
        // Crimson Red (legacy - use danger for negative)
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
        // Neutral Grays
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
      // INVESTIQ DESIGN SYSTEM - Typography
      // ==========================================
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Inter', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // Display sizes for hero sections
        'display-xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
        'display-sm': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
      },
      // ==========================================
      // INVESTIQ DESIGN SYSTEM - Spacing & Layout
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
        // InvestIQ Card Shadows
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'card-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        // Glow effects
        'glow-cyan': '0 0 20px rgba(0, 229, 255, 0.5)',
        'glow-teal': '0 0 20px rgba(8, 145, 178, 0.3)',
        'glow-blue': '0 0 20px rgba(4, 101, 242, 0.5)',
      },
      // ==========================================
      // INVESTIQ DESIGN SYSTEM - Animations
      // ==========================================
      animation: {
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'float-medium': 'float-medium 5s ease-in-out infinite',
        'float-fast': 'float-fast 4s ease-in-out infinite',
        'ping-slow': 'ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        // Analytics component animations
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
        // Analytics-specific keyframes
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
      // INVESTIQ DESIGN SYSTEM - Gradients (via backgroundImage)
      // Note: For theme-aware gradients, use CSS class bg-gradient-brand-teal
      // ==========================================
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #0465f2 0%, #00e5ff 100%)',  // Dark mode
        'gradient-brand-light': 'linear-gradient(135deg, #0465f2 0%, #007ea7 100%)',  // Light mode
        'gradient-brand-vertical': 'linear-gradient(180deg, #0465f2 0%, #00e5ff 100%)',
        'gradient-dark': 'linear-gradient(135deg, #07172e 0%, #1f2937 100%)',
        'gradient-light': 'linear-gradient(135deg, #e8eef3 0%, #f9fafb 100%)',
      },
    },
  },
  plugins: [],
}
