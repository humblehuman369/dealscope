# Mobile-to-Frontend Parity Audit Report — DealGapIQ

**Audit date:** 2026-02-28  
**Scope:** Every page and component; mobile < 640px vs desktop 1024px+  
**Design reference:** Pure black #000, teal #0EA5E9, DM Sans / Space Mono, card glow, 320–1440px verification.

---

## Severity legend

- **Broken:** Layout or functionality fails on mobile; content inaccessible or unreadable.
- **Degraded:** Content visible but cramped, overlapping, or poor touch targets.
- **Cosmetic:** Minor spacing, font size, or visual polish.

---

## BROKEN

| Page | Component / Path | Issue | Suggested fix |
|------|------------------|--------|----------------|
| Homepage | `DealGapIQHomepage.tsx` | Nav is always horizontal (Product, Pricing, Login). On &lt; 640px links can overflow or wrap; audit requires hamburger + dropdown. | Add hamburger menu below 640px; collapse nav links into a dropdown/sheet. |
| Homepage | `dealgapiq-homepage.css` | Responsive grids use `max-width: 768px`; audit defines mobile as &lt; 640px. Proof bar, cost-inner, etc. stay multi-column below 640px. | Add `@media (max-width: 639px)` overrides: proof-bar 1-col or 2-col; ensure steps/verdict/numbers/strategy/cost stack at 640px. |
| Homepage | `DealGapIQHomepage.tsx` | Hero address bar: at narrow widths the inline flex (input + button) can overflow or squash the button. | CSS already stacks at 768px; add 640px rule so form stacks (flex-direction column, full-width button) below sm. |
| Verdict | `app/verdict/page.tsx` | Price threshold cards use `text-[9px]` and `text-[8px]` for labels/subs — audit: no text smaller than 12px on mobile. | Use `text-xs` (12px) minimum for labels/subs on mobile; keep smaller only at `sm:` and up. |
| App header | `AppHeader.tsx` | Property bar expanded details: `grid-cols-5` (Beds, Baths, Sqft, Price, Status) is very tight at 320–375px; values can overlap or truncate. | Below `sm:` use grid-cols-2 or single column with stacked rows so each stat has space. |

---

## DEGRADED

| Page | Component / Path | Issue | Suggested fix |
|------|------------------|--------|----------------|
| Homepage | `DealGapIQHomepage.tsx` | Nav padding and height are fixed; no mobile-specific tap area. Audit: min 44px touch targets. | Ensure hamburger and CTA buttons have min-height 44px / min tap area 44×44 on mobile. |
| Verdict | `app/verdict/page.tsx` | Three price cards (Wholesale, Target Buy, Income Value) in a single flex row; on narrow screens text can shrink or wrap awkwardly. | Below `sm:` stack cards vertically or use horizontal scroll with snap; ensure labels and values stay ≥ 12px. |
| Verdict | `app/verdict/page.tsx` | Price scale bar legend: `flex justify-between` with three items can squeeze labels at &lt; 375px. | Allow legend to wrap or use smaller font at base; ensure no horizontal overflow. |
| Strategy worksheets | `worksheet.css` | `.worksheet-layout-2col` collapses at 1024px (lg). Below that, sidebar becomes 2-col grid then 1-col at 639px — matches audit. | Confirm sticky header offset so no content is hidden behind sticky elements on mobile. |
| Strategy worksheets | Worksheet sections | Inputs and sliders: audit requires min 44px tap targets for sliders and controls. | Audit slider thumbs and checkbox/toggle tap areas; add min-height/min touch area where needed. |
| Property profile | `PropertyDetailsClient` / listing info | Price metrics and details in multi-column layouts may not stack cleanly on mobile. | Ensure price metrics (List, Zestimate, Income Value) stack vertically below `sm:`; full-width cards. |
| Sale / Rent comps | `PriceCheckerIQScreen.tsx` / comp cards | Comp cards and controls row (Select All, Weights) need to reflow; checkbox tap target ≥ 44px. | Full-width comp cards below `sm:`; ensure checkbox hit area ≥ 44px; controls wrap or scroll. |
| Billing | `billing/page.tsx` | Plan cards and value anchor: audit says stack vertically (Pro first), full-width, teal glow on Pro. | Verify plan cards stack below `sm:`; CTA button full-width min 48px height; trust row wraps 2×2. |
| Login / Register | `LoginContent.tsx` | Form and nav use fixed padding (e.g. 40px); on very narrow screens horizontal padding should not exceed ~16px. | Use responsive padding (e.g. px-4 below sm, px-10 at sm+); input min-height 48px. |

---

## COSMETIC

| Page | Component / Path | Issue | Suggested fix |
|------|------------------|--------|----------------|
| Homepage | `DealGapIQHomepage.tsx` | Section padding is fixed (e.g. 24px); audit suggests min 16px, consistent card padding. | Ensure no section uses padding &lt; 16px on mobile. |
| Homepage | Founder / stats | Founder stats grid: audit wants 2×2 on mobile. | Ensure founder credential pills wrap to 2×2 or single column below 640px. |
| Verdict | VerdictScoreCard / narrative | Card glow and borders: audit says use :active instead of :hover on mobile for glow. | Add active state for touch (e.g. card glow on :active) where hover is used. |
| Global | `AppHeader.tsx` | Tab bar: already uses overflow-x-auto; ensure no wrapping to second line. | Confirm tab bar has -webkit-overflow-scrolling: touch and does not wrap. |
| Global | Typography | Some components use Inter; design system specifies DM Sans (body) and Space Mono (data). | Align font usage with design system where components use inline styles. |

---

## Pages verified (no critical issues found)

- **Worksheet layout:** `worksheet.css` already uses mobile-first 1-col, then 2-col sidebar at 1023px, then 2-col layout at 1024px. Breakpoints align with audit (lg = 1024px).
- **What Is It / About:** WhatIsDealGapIQ uses clamp() and responsive patterns; section padding and stacking consistent.
- **Login content:** Centered form, max-width ~480px; needs only padding and input height tweaks (degraded).

---

## Breakpoint alignment

- **Audit:** Mobile &lt; 640px, Tablet 640–1023px, Desktop 1024px+.
- **Tailwind:** `sm:` = 640px, `md:` = 768px, `lg:` = 1024px, `xl:` = 1280px.
- **Action:** Use `max-width: 639px` in custom CSS for “mobile-only” and Tailwind `sm:` for “from 640px up”. Homepage CSS currently uses 768px; add 640px rules for strict parity.

---

## Summary

| Severity | Count |
|----------|-------|
| Broken   | 5     |
| Degraded | 9     |
| Cosmetic | 5     |

---

## Fixes applied (this audit)

- **Homepage:** Hamburger menu below 640px; nav links in dropdown; 640px breakpoint in `dealgapiq-homepage.css` for hero form (stack, min-height 48px), proof bar 2×2, section padding 16px.
- **Verdict:** Price threshold cards stack vertically on mobile (`flex-col sm:flex-row`); label/sub text at least `text-xs` (12px) on mobile, smaller only at `sm:`; scale bar legend and DEAL GAP/PRICE GAP labels use `text-xs` on mobile; legend allows wrap.
- **AppHeader:** Property bar expanded details use `grid-cols-2 sm:grid-cols-5`; Search, Profile, Save, Expand/Collapse buttons have `min-w-[44px] min-h-[44px]`; tab bar has `WebkitOverflowScrolling: 'touch'`.
- **Login:** Nav uses responsive padding `px-4 sm:px-10` for mobile.

**Remaining (optional follow-up):** Billing plan card stacking verification; comps screen checkbox tap targets; worksheet slider thumb size; cosmetic :active states and font alignment.
