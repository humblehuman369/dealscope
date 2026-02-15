# DealGapIQ Design System - Cursor Prompt

Use this document when prompting Cursor to style DealGapIQ components.

---

## Tailwind Config Extension

Add these to your `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      navy: { DEFAULT: '#0A1628', light: '#0F172A' },
      teal: { DEFAULT: '#0891B2', light: '#06B6D4', dark: '#0E7490' },
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
      // Note: Use 'teal' for positive values, NOT 'success' green
    },
    fontFamily: {
      sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
    },
    borderRadius: {
      'xl': '12px',
      '2xl': '16px', 
      'pill': '40px',
    },
  }
}
```

---

## Global CSS

```css
/* Tabular numerals for all financial data */
.num { font-variant-numeric: tabular-nums; }

/* Section labels */
.section-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
```

---

## Color Rules (IMPORTANT)

| Purpose | Color | Class |
|---------|-------|-------|
| Positive values (profit, met targets) | Teal | `text-teal` |
| Negative values (loss, expenses) | Red | `text-danger` or `text-red-500` |
| Neutral values | Navy | `text-navy` |
| Labels/secondary text | Gray | `text-surface-500` |
| Backgrounds | Light gray | `bg-surface-50` or `bg-surface-100` |

**DO NOT use green for positive values. Always use teal.**

---

## Component Patterns

### Card
```jsx
<div className="bg-white rounded-xl shadow-sm border border-surface-100 p-5">
  {/* content */}
</div>

// Active/selected card
<div className="bg-white rounded-xl shadow-sm ring-2 ring-teal/20 p-5">
  {/* content */}
</div>
```

### Section Label
```jsx
<div className="text-[10px] font-semibold text-teal uppercase tracking-wide">
  IQ VERDICT: LONG-TERM RENTAL
</div>

<div className="text-[10px] font-semibold text-navy uppercase tracking-wide">
  RETURNS VS TARGETS
</div>

<div className="text-[10px] font-semibold text-surface-500 uppercase tracking-wide">
  ANNUAL PROFIT
</div>
```

### KPI Metric Pill
```jsx
// Teal (positive/primary values)
<div className="rounded-lg p-3 text-center bg-teal/15">
  <div className="text-[8px] font-semibold text-surface-500 uppercase tracking-wide">
    ANNUAL PROFIT
  </div>
  <div className="text-sm font-bold text-teal num">+$31,849</div>
</div>

// Navy (neutral values)
<div className="rounded-lg p-3 text-center bg-navy/10">
  <div className="text-[8px] font-semibold text-surface-500 uppercase tracking-wide">
    CASH NEEDED
  </div>
  <div className="text-sm font-bold text-navy num">$166,428</div>
</div>

// Neutral gray
<div className="rounded-lg p-3 text-center bg-surface-100">
  <div className="text-[8px] font-semibold text-surface-500 uppercase tracking-wide">
    CAP RATE
  </div>
  <div className="text-sm font-bold text-navy num">10.8%</div>
</div>

// Negative (loss)
<div className="rounded-lg p-3 text-center bg-red-500/10">
  <div className="text-[8px] font-semibold text-surface-500 uppercase tracking-wide">
    LOSS
  </div>
  <div className="text-sm font-bold text-red-500 num">-$5,200</div>
</div>
```

### Summary Box
```jsx
// Default
<div className="rounded-xl border px-4 py-3 bg-surface-50 border-surface-200">
  <div className="text-[10px] font-semibold text-surface-500 uppercase tracking-wide mb-0.5">
    MONTHLY PAYMENT
  </div>
  <div className="text-lg font-bold text-navy num">$3,850</div>
</div>

// Positive (teal)
<div className="rounded-xl border px-4 py-3 bg-teal/10 border-teal/20">
  <div className="text-[10px] font-semibold text-surface-500 uppercase tracking-wide mb-0.5">
    TOTAL CASH REQUIRED
  </div>
  <div className="text-lg font-bold text-teal num">$166,428</div>
</div>

// Negative (red)
<div className="rounded-xl border px-4 py-3 bg-red-500/10 border-red-500/20">
  <div className="text-[10px] font-semibold text-surface-500 uppercase tracking-wide mb-0.5">
    TOTAL EXPENSES
  </div>
  <div className="text-lg font-bold text-red-500 num">$23,456</div>
</div>
```

### Data Row
```jsx
// Standard
<div className="flex items-center justify-between py-2.5 border-b border-surface-100">
  <span className="text-sm text-surface-500">Purchase Price</span>
  <span className="text-sm font-semibold text-navy num">$723,600</span>
</div>

// With target comparison
<div className="flex items-center justify-between py-2.5 border-b border-surface-100">
  <span className="text-sm text-surface-500">Cap Rate</span>
  <div className="flex items-center gap-2">
    <span className="text-sm font-semibold text-teal num">10.8%</span>
    <span className="text-[10px] text-surface-400">/ 8%</span>
  </div>
</div>

// Negative value
<div className="flex items-center justify-between py-2.5 border-b border-surface-100">
  <span className="text-sm text-surface-500">Operating Expenses</span>
  <span className="text-sm font-semibold text-red-500 num">−$23,456</span>
</div>
```

### Slider Input
```jsx
<div className="py-3">
  <div className="flex items-center justify-between mb-2">
    <label className="text-sm text-surface-500">Down Payment</label>
    <div className="text-right">
      <span className="text-sm font-semibold text-navy num">20.0%</span>
      <span className="text-xs text-surface-400 ml-1.5 num">$144,720</span>
    </div>
  </div>
  <div className="relative">
    <div className="h-1.5 bg-surface-200 rounded-full">
      <div className="h-full bg-teal rounded-full" style={{ width: '20%' }} />
    </div>
    <input 
      type="range" 
      className="absolute inset-0 w-full h-6 -top-2 opacity-0 cursor-pointer"
    />
  </div>
</div>
```

Slider thumb CSS:
```css
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #0891B2; /* teal */
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  cursor: pointer;
}
```

### Button - Primary
```jsx
<button className="px-6 py-3 bg-teal hover:bg-teal-dark text-white text-sm font-semibold rounded-lg transition-colors">
  Primary Button
</button>
```

### Button - Secondary (Pill CTA)
```jsx
<button className="w-full py-3 px-4 bg-teal/10 hover:bg-teal/20 text-navy border border-teal/20 text-sm font-bold rounded-full transition-colors">
  Continue to Financing →
</button>
```

### Button - Toggle Group
```jsx
<div className="flex items-center bg-surface-100 rounded-lg p-1">
  <button className="px-4 py-2 text-xs font-semibold rounded-md bg-teal text-white">
    Guided
  </button>
  <button className="px-4 py-2 text-xs font-semibold rounded-md text-surface-500 hover:text-surface-700">
    Expand All
  </button>
</div>
```

### Accordion Section
```jsx
// Closed
<div className="bg-white rounded-xl shadow-sm border border-surface-100 overflow-hidden">
  <button className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-surface-50">
    <div className="flex items-center gap-3">
      <span className="text-teal">{/* icon */}</span>
      <span className="text-sm font-semibold text-navy">Purchase</span>
    </div>
    <ChevronDownIcon className="w-4 h-4 text-surface-400" />
  </button>
</div>

// Open (active)
<div className="bg-white rounded-xl shadow-sm ring-2 ring-teal/20 overflow-hidden">
  <button className="w-full flex items-center justify-between px-4 py-3.5 text-left">
    <div className="flex items-center gap-3">
      <span className="text-teal">{/* icon */}</span>
      <span className="text-sm font-semibold text-navy">Purchase</span>
    </div>
    <ChevronDownIcon className="w-4 h-4 text-surface-400 rotate-180" />
  </button>
  <div className="px-4 pb-4 pt-1 border-t border-surface-100">
    {/* content */}
  </div>
</div>
```

### Progress Indicator
```jsx
<div className="flex items-center gap-2">
  {/* Complete */}
  <div className="w-5 h-5 rounded-full bg-teal flex items-center justify-center text-white">
    <CheckIcon className="w-3 h-3" />
  </div>
  
  {/* Connector - complete */}
  <div className="flex-1 h-0.5 bg-teal/50" />
  
  {/* Active */}
  <div className="w-5 h-5 rounded-full bg-teal ring-4 ring-teal/20" />
  
  {/* Connector - incomplete */}
  <div className="flex-1 h-0.5 bg-surface-200" />
  
  {/* Incomplete */}
  <div className="w-5 h-5 rounded-full bg-surface-200" />
</div>
```

### IQ Verdict Card
```jsx
<div className="bg-white rounded-xl shadow-sm overflow-hidden">
  <div className="p-5 bg-gradient-to-b from-teal/10 to-teal/[0.02]">
    <div className="text-[10px] font-semibold text-teal uppercase tracking-wide mb-3">
      IQ VERDICT: LONG-TERM RENTAL
    </div>
    <div className="flex items-center gap-4 bg-white rounded-full px-5 py-3 shadow-sm mb-3">
      <span className="text-3xl font-extrabold text-teal num">100</span>
      <div>
        <div className="text-base font-bold text-navy">Strong Investment</div>
        <div className="text-xs text-surface-500">Deal Score</div>
      </div>
    </div>
    <p className="text-sm text-surface-500 text-center">
      Excellent potential with solid returns
    </p>
  </div>
</div>
```

---

## Transformation Rules

When converting existing components:

1. **Replace all green colors with teal** (`text-green-*` → `text-teal`, `bg-green-*` → `bg-teal/*`)
2. **Use `num` class on all financial values** for tabular numerals
3. **Section labels:** 10px, semibold, uppercase, tracking-wide
4. **Cards:** rounded-xl (12px), shadow-sm, border-surface-100
5. **Active states:** ring-2 ring-teal/20 instead of border changes
6. **Buttons:** rounded-lg for standard, rounded-full for pill CTAs
7. **Spacing:** Use py-2.5 for data rows, p-5 for card padding
8. **Text hierarchy:**
   - Labels: text-sm text-surface-500
   - Values: text-sm font-semibold text-navy num
   - Headings: text-base or text-lg font-bold text-navy

---

## Example Prompt for Cursor

```
Refactor this component to match the DealGapIQ design system:

- Use teal (#0891B2) for positive values, not green
- Add `num` class to all financial numbers
- Use rounded-xl (12px) for cards
- Section labels: text-[10px] font-semibold uppercase tracking-wide
- Data rows: py-2.5, text-sm, border-b border-surface-100
- Summary boxes: rounded-xl border px-4 py-3, bg-teal/10 for positive

[paste component code here]
```

---

## File References

For full implementation examples, see:
- `investiq-blended-desktop.html` - Complete worksheet implementation
- `investiq-style-guide.html` - Visual reference
- `INVESTIQ-STYLE-GUIDE.md` - Full documentation
