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
      // ==========================================
      colors: {
        // Primary Brand Blue
        brand: {
          50: '#e6f0fe',
          100: '#cce1fd',
          200: '#99c3fb',
          300: '#66a5f9',
          400: '#3387f7',
          500: '#0465f2',  // Primary brand blue
          600: '#0354d1',
          700: '#0243b0',
          800: '#02328f',
          900: '#01216e',
          950: '#011047',
        },
        // Accent Cyan
        accent: {
          50: '#e6fcff',
          100: '#ccf9ff',
          200: '#99f3ff',
          300: '#66edff',
          400: '#33e7ff',
          500: '#00e5ff',  // Primary accent cyan
          600: '#00b8cc',
          700: '#008a99',
          800: '#005c66',
          900: '#002e33',
        },
        // Navy (for text and dark backgrounds)
        navy: {
          50: '#e8eef3',   // Light background
          100: '#d1dde7',
          200: '#a3bbcf',
          300: '#7599b7',
          400: '#47779f',
          500: '#1a5587',
          600: '#15446c',
          700: '#103351',
          800: '#0b2236',
          900: '#07172e',  // Primary dark navy
          950: '#030b17',
        },
        // Neutral Grays (consistent with brand)
        neutral: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',  // Border color
          400: '#9ca3af',
          500: '#6b7280',  // Text gray
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        // Status Colors
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#22c55e',  // Primary success green
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Forest Green (for positive indicators/sliders)
        forest: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#059669',  // Primary forest green
          600: '#047857',
          700: '#065f46',
          800: '#064e3b',
          900: '#022c22',
        },
        // Crimson Red (for negative indicators/sliders)
        crimson: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#dc2626',  // Primary crimson red
          600: '#b91c1c',
          700: '#991b1b',
          800: '#7f1d1d',
          900: '#450a0a',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',  // Primary warning amber
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',  // Primary danger red
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
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
      },
      // ==========================================
      // INVESTIQ DESIGN SYSTEM - Typography
      // ==========================================
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
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
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'brand': '0 4px 14px 0 rgba(4, 101, 242, 0.25)',
        'brand-lg': '0 10px 40px 0 rgba(4, 101, 242, 0.3)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'glow-cyan': '0 0 20px rgba(0, 229, 255, 0.5)',
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
      },
      // ==========================================
      // INVESTIQ DESIGN SYSTEM - Gradients (via backgroundImage)
      // ==========================================
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #0465f2 0%, #00e5ff 100%)',
        'gradient-brand-vertical': 'linear-gradient(180deg, #0465f2 0%, #00e5ff 100%)',
        'gradient-dark': 'linear-gradient(135deg, #07172e 0%, #1f2937 100%)',
        'gradient-light': 'linear-gradient(135deg, #e8eef3 0%, #f9fafb 100%)',
      },
    },
  },
  plugins: [],
}
