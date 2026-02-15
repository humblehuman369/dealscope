# DealGapIQ Design System

## Color Semantics & Branding Rules

### Core Principle
> **Teal = DealGapIQ's Voice**  
> When users see teal/cyan, they know DealGapIQ is speaking, guiding, or presenting brand elements.

---

## Brand Colors

### Primary Brand Color: Teal/Cyan
```css
--electric-cyan: #4dd0e1;
--teal: #007ea7;
--teal-accent: #0891b2;
```

**Use for:**
- ✅ DealGapIQ logo ("IQ" portion)
- ✅ IQ's tips, guidance, and mentoring messages
- ✅ "IQ's Pro Tip" labels and icons
- ✅ IQ Welcome Modal elements
- ✅ "IQ's Playbook" section headers
- ✅ "IQ's Take" quotes and insights
- ✅ Primary CTA buttons (Scan a Property, etc.)
- ✅ Navigation elements and links
- ✅ Section borders in light mode
- ✅ Any text/element where "IQ is talking to the user"

**Never use for:**
- ❌ Strategy-specific metrics or results
- ❌ Property data values
- ❌ Strategy selection cards

---

## Strategy Colors

Each investment strategy has its own distinct color for differentiation:

| Strategy | Color | Hex | CSS Variable |
|----------|-------|-----|--------------|
| Long-Term Rental | Blue | `#0465f2` | `--strategy-ltr` |
| Short-Term Rental | Purple | `#8b5cf6` | `--strategy-str` |
| Fix & Flip | Pink | `#ec4899` | `--strategy-flip` |
| BRRRR | Orange | `#f97316` | `--strategy-brrrr` |
| Wholesale | Cyan | `#22d3ee` | `--strategy-wholesale` |
| House Hack | Green | `#22c55e` | `--strategy-househack` |

**Use for:**
- ✅ Strategy cards and selection UI
- ✅ Strategy-specific metrics and results
- ✅ Strategy page headers and accents
- ✅ Section labels within strategy pages (e.g., "IQ'S PLAYBOOK" on Fix & Flip page = pink)
- ✅ Timeline/process step indicators on strategy pages
- ✅ Performance benchmarks and gauges

---

## Semantic Color Rules

### When IQ is Speaking (Use Teal)
```
┌─────────────────────────────────────┐
│  🧠 IQ's Pro Tip                    │  ← Teal label
│                                     │
│  "Build relationships with 3-5     │
│   wholesalers who understand..."   │
│                                     │
└─────────────────────────────────────┘
     ↑ Teal left border
```

### When Showing Strategy Data (Use Strategy Color)
```
┌─────────────────────────────────────┐
│  [2] Fix & Flip                     │  ← Pink card
│                                     │
│  $47,500 Profit                     │  ← Pink accent
│  ████████░░ 85% ROI                │
│                                     │
└─────────────────────────────────────┘
```

---

## Component Color Guidelines

### Headers & Navigation
| Element | Color |
|---------|-------|
| Logo "Invest" | White |
| Logo "IQ" | Teal |
| Nav links | Gray → Teal on hover |
| Back button | Gray → White on hover |

### Buttons
| Type | Background | Text |
|------|------------|------|
| Primary CTA | Teal gradient | Dark navy |
| Secondary | Transparent | Teal border |
| Strategy-specific | Strategy color | White/dark |

### Cards & Sections
| Context | Border/Accent |
|---------|---------------|
| IQ guidance sections | Teal |
| Strategy results | Strategy color |
| Neutral info | Gray/subtle |

### Text Highlights
| Purpose | Color |
|---------|-------|
| IQ brand mentions | Teal |
| Strategy names | Strategy color |
| Important values | Strategy color or white |
| Secondary text | Gray-400 |

---

## Light Mode Considerations

In light mode, teal maintains visibility:
- Background: Teal at 10% opacity for subtle contrast
- Borders: Teal at 20% opacity
- Text: Full teal for brand elements
- Section boxes: White with teal borders

---

## Implementation Checklist

When building new components, ask:

1. **Is this IQ speaking/guiding?** → Use teal
2. **Is this strategy-specific data?** → Use strategy color
3. **Is this a primary action?** → Use teal
4. **Is this neutral UI?** → Use grays

---

## CSS Variables Reference

```css
:root {
  /* Brand - DealGapIQ Voice */
  --electric-cyan: #4dd0e1;
  --teal: #007ea7;
  --teal-accent: #0891b2;
  
  /* Strategy Colors */
  --strategy-ltr: #0465f2;      /* Long-Term Rental - Blue */
  --strategy-str: #8b5cf6;      /* Short-Term Rental - Purple */
  --strategy-flip: #ec4899;     /* Fix & Flip - Pink */
  --strategy-brrrr: #f97316;    /* BRRRR - Orange */
  --strategy-wholesale: #22d3ee; /* Wholesale - Cyan */
  --strategy-househack: #22c55e; /* House Hack - Green */
  
  /* Neutrals */
  --deep-navy: #07172e;
  --dark-bg: #0a0a12;
  --white: #ffffff;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-600: #6b7280;
}
```

---

## Examples in Practice

### ✅ Correct Usage
- "IQ's Pro Tip" → Teal label, teal left border
- Strategy card "Fix & Flip" → Pink background/border
- "DealGapIQ" in text → "Invest" white, "IQ" teal
- Primary button "Scan a Property" → Teal gradient

### ❌ Incorrect Usage
- Strategy results in teal (should be strategy color)
- IQ guidance in pink (should be teal)
- Random color mixing without semantic meaning

---

*This design system ensures users develop intuitive color recognition:*
> **"Teal means IQ is helping me. Other colors mean I'm looking at strategy-specific information."**
