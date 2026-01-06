# InvestIQ Design System

This document outlines the design tokens and component classes available throughout the InvestIQ application.

---

## 🎨 Brand Colors

### Primary Brand Blue (`brand-*`)
The main brand color used for primary actions, links, and accents.

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-50` | `#e6f0fe` | Light backgrounds |
| `brand-100` | `#cce1fd` | Hover states |
| `brand-500` | `#0465f2` | **Primary brand color** |
| `brand-600` | `#0354d1` | Hover/pressed states |
| `brand-900` | `#01216e` | Dark text on light bg |

**Example:**
```jsx
<button className="bg-brand-500 hover:bg-brand-600 text-white">
  Get Started
</button>
```

### Accent Teal (`accent-*`) - Theme-Aware
Secondary accent color for highlights, gradients, and special elements.
**Uses CSS variables for automatic dark/light mode switching.**

| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| `--color-teal` | `#00e5ff` (Electric Cyan) | `#007ea7` (Pacific Teal) | **Primary accent** |
| `accent-500` | `#00e5ff` | Use `text-teal` class | Dark mode fallback |
| `accent-light` | N/A | `#007ea7` | Light mode specific |

**Theme-Aware Usage (Recommended):**
```jsx
// Use text-teal, bg-teal, border-teal for automatic theme switching
<div className="text-teal font-bold">Theme-aware teal text</div>
<div className="bg-teal text-navy-900">Theme-aware teal background</div>
<div className="border-teal border-2">Theme-aware teal border</div>
<div className="bg-gradient-brand-teal">Theme-aware gradient</div>
```

**Legacy Example:**
```jsx
<div className="bg-accent-500 text-navy-900">
  60 Seconds to Analysis
</div>
```

### Navy (`navy-*`)
Dark color palette for text and backgrounds.

| Token | Hex | Usage |
|-------|-----|-------|
| `navy-50` | `#e8eef3` | **Light background** |
| `navy-800` | `#0b2236` | Dark cards |
| `navy-900` | `#07172e` | **Primary dark/text** |

### Neutral Grays (`neutral-*`)
For text, borders, and backgrounds.

| Token | Hex | Usage |
|-------|-----|-------|
| `neutral-100` | `#f3f4f6` | Light backgrounds |
| `neutral-300` | `#d1d5db` | **Borders** |
| `neutral-500` | `#6b7280` | **Body text gray** |
| `neutral-700` | `#374151` | Dark mode borders |

### Status Colors

| Type | Token | Hex |
|------|-------|-----|
| Success | `success-500` | `#22c55e` |
| Warning | `warning-500` | `#f59e0b` |
| Danger | `danger-500` | `#ef4444` |

---

## 🔤 Typography

### Font Families

| Token | Fonts | Usage |
|-------|-------|-------|
| `font-sans` | Poppins, system-ui | **Primary font** |
| `font-display` | Poppins | Headlines |
| `font-mono` | Poppins | Numbers, metrics |

**Example:**
```jsx
<h1 className="font-display font-bold text-4xl">
  Analyze Real Estate
</h1>
<code className="font-mono">$1,200/mo</code>
```

### Display Sizes

| Class | Size | Usage |
|-------|------|-------|
| `text-display-xl` | 4.5rem | Hero headlines |
| `text-display-lg` | 3.75rem | Large headlines |
| `text-display-md` | 3rem | Section titles |
| `text-display-sm` | 2.25rem | Subsections |

---

## 🧱 Component Classes

### Buttons

| Class | Description |
|-------|-------------|
| `btn-primary` | Blue filled button |
| `btn-secondary` | White/outlined button |
| `btn-ghost` | Transparent button |
| `btn-accent` | Cyan accent button |
| `btn-gradient` | Blue-to-cyan gradient |
| `btn-sm` | Small size modifier |
| `btn-lg` | Large size modifier |

**Example:**
```jsx
<button className="btn-primary">Get Started</button>
<button className="btn-secondary">Learn More</button>
<button className="btn-primary btn-lg">Big Action</button>
```

### Cards

| Class | Description |
|-------|-------------|
| `card` | Base card with shadow |
| `card-hover` | Card with hover effect |
| `card-interactive` | Clickable card with lift |

**Example:**
```jsx
<div className="card p-6">
  <h3>Strategy Card</h3>
</div>

<div className="card-interactive p-6">
  <h3>Clickable Card</h3>
</div>
```

### Inputs

| Class | Description |
|-------|-------------|
| `input` | Standard input field |
| `input-lg` | Large input field |

**Example:**
```jsx
<input className="input" placeholder="Enter address..." />
<input className="input-lg" placeholder="Search properties..." />
```

### Badges

| Class | Description |
|-------|-------------|
| `badge-brand` | Blue badge |
| `badge-accent` | Cyan badge |
| `badge-success` | Green badge |
| `badge-warning` | Amber badge |
| `badge-danger` | Red badge |
| `badge-neutral` | Gray badge |

### Section Helpers

| Class | Description |
|-------|-------------|
| `section-title` | Large section heading |
| `section-divider` | Blue underline bar |
| `section-subtitle` | Gray subtitle text |
| `container-brand` | Max-width container |

**Example:**
```jsx
<section className="py-20">
  <div className="container-brand">
    <h2 className="section-title">6 Strategies</h2>
    <div className="section-divider"></div>
    <p className="section-subtitle">One property. Six strategies.</p>
  </div>
</section>
```

---

## 🌈 Gradients & Effects

### Background Gradients

| Class | Description |
|-------|-------------|
| `bg-gradient-brand` | Blue to cyan (135°) |
| `bg-gradient-brand-vertical` | Blue to cyan (vertical) |
| `bg-gradient-dark` | Navy gradient |
| `bg-gradient-light` | Light gray gradient |

### Text Gradient

```jsx
<span className="text-gradient">InvestIQ</span>
```

### Shadows

| Class | Description |
|-------|-------------|
| `shadow-brand` | Blue-tinted shadow |
| `shadow-brand-lg` | Large brand shadow |
| `shadow-card` | Subtle card shadow |
| `shadow-card-hover` | Elevated card shadow |
| `shadow-glow-cyan` | Cyan glow effect |
| `shadow-glow-blue` | Blue glow effect |

---

## ✨ Animations

| Class | Duration | Description |
|-------|----------|-------------|
| `animate-float-slow` | 6s | Slow floating |
| `animate-float-medium` | 5s | Medium floating |
| `animate-float-fast` | 4s | Fast floating |
| `animate-ping-slow` | 2s | Slow pulse |
| `animate-fade-in` | 0.5s | Fade in |
| `animate-slide-up` | 0.5s | Slide up |
| `animate-slide-in-right` | 0.3s | Slide from right |

---

## 🌙 Dark Mode

All components automatically support dark mode via the `dark:` prefix:

```jsx
<div className="bg-white dark:bg-navy-900 text-navy-900 dark:text-white">
  Content adapts to theme
</div>
```

Dark mode is toggled via the `dark` class on the `<html>` element.

---

## 📱 Mobile Utilities

| Class | Description |
|-------|-------------|
| `pt-safe` | Safe area top padding |
| `pb-safe` | Safe area bottom padding |
| `scrollbar-hide` | Hide scrollbar |

---

## 🔄 Migration Guide

### Old → New Color Mapping

| Old Class | New Class (Theme-Aware) |
|-----------|-----------|
| `bg-[#0465f2]` | `bg-brand-500` |
| `text-[#07172e]` | `text-navy-900` |
| `text-[#6b7280]` | `text-neutral-500` |
| `bg-[#e8eef3]` | `bg-navy-50` |
| `border-[#d1d5db]` | `border-neutral-300` |
| `bg-[#00e5ff]` | `bg-teal` (theme-aware) |
| `text-[#00e5ff]` | `text-teal` (theme-aware) |
| `border-[#00e5ff]` | `border-teal` (theme-aware) |
| `dark:text-[#00e5ff]` | `text-teal` (auto switches) |
| `bg-teal-600` | `bg-brand-500` |
| `from-teal-500 to-cyan-600` | `bg-gradient-brand-teal` (theme-aware) |

### Teal Color Reference
- **Dark Mode**: `#00e5ff` (Electric Cyan)
- **Light Mode**: `#007ea7` (Pacific Teal)

### Old → New Button Mapping

| Old | New |
|-----|-----|
| Custom inline styles | `btn-primary` |
| `bg-teal-600 text-white...` | `btn-primary` |
| `bg-white border...` | `btn-secondary` |

---

## Quick Reference

```jsx
// Primary action button
<button className="btn-primary">Get Started</button>

// Card with hover
<div className="card-hover p-6">...</div>

// Section layout
<section className="bg-navy-50 py-20">
  <div className="container-brand">
    <h2 className="section-title text-center">Title</h2>
    <div className="section-divider mx-auto"></div>
  </div>
</section>

// Brand gradient text
<span className="text-gradient font-bold">InvestIQ</span>

// Metric display
<div className="metric-card">
  <p className="metric-value">12.5%</p>
  <p className="metric-label">ROI</p>
</div>
```

