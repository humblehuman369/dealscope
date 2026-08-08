# DealGapIQ — Custom Product Pages (CPP) Pack

Intent-matched App Store Custom Product Pages for Apple Search Ads conversion.
Built from the ASO keyword research in [`../copy/keywords.md`](../copy/keywords.md).

> **What CPPs change:** screenshots, app preview, promotional text  
> **What they share with the default listing:** app name, subtitle, keywords, description, icon  
> CPPs do **not** improve organic keyword ranking — they raise install conversion when traffic arrives from ASA or a unique campaign URL.

---

## The five pages

| ASC page name | Slug | ASA intent | Pack folder |
|---|---|---|---|
| Deal Gap | `deal-gap` | Core discovery (real estate deals / investment property) | [`deal-gap/`](deal-gap/) |
| Foreclosure & Auction | `foreclosure` | Distressed / off-MLS moat | [`foreclosure/`](foreclosure/) |
| Rental Cash Flow | `rental` | Buy-and-hold cash flow / ROI | [`rental/`](rental/) |
| Fix & Flip | `flip` | Flip / ARV / comps (+ BRRRR & wholesale ad groups) | [`flip/`](flip/) |
| vs Calculators | `competitor` | Competitor conquest (ASA keywords only) | [`competitor/`](competitor/) |

ASA ad-group → CPP pairing: [`asa-keyword-map.md`](asa-keyword-map.md).

---

## Regenerate screenshots

```bash
# Prerequisites
pip install Pillow
# Font is vendored at ../assets/fonts/DMSans-Variable.ttf (also used from /tmp/dm-sans-fonts/)

cd frontend/public/app-store/connect
python3 apply_screenshot_brand.py
```

This writes:

1. Default listing → `../screenshots/01–08-*.png`
2. Each CPP → `custom-product-pages/{slug}/screenshots/01–08-*.png`

All outputs are **1290 × 2796** (iPhone 6.9" Display).

---

## App Store Connect upload (manual)

1. App Store Connect → **My Apps → DealGapIQ → Product Page → Custom Product Pages → Create**
2. Create five pages using the **ASC page name** from the table above.
3. For each page, open `{slug}/copy.md` and:
   - Paste **Promotional Text**
   - Upload the eight PNGs from `{slug}/screenshots/` into the **6.9" Display** slot in numbered order (`01-` … `08-`)
4. Submit each CPP for review (Apple must approve before ads can use it).
5. After approval, copy each page’s unique URL into [`asa-keyword-map.md`](asa-keyword-map.md).
6. In Apple Search Ads, assign the matching CPP as the product page on each ad group (see the keyword map).

### Rules

- Do **not** put competitor brand names in promotional text (rejection risk). Target those brands only as ASA keywords.
- Do **not** change the shared title / subtitle / keyword field when creating CPPs — those stay on the default product page.
- Refresh promotional text every 30–60 days without a new binary.

---

## Screenshot strategy (slots 1–3)

| CPP | Slot 1 | Slot 2 | Slot 3 |
|---|---|---|---|
| Deal Gap | Deal Gap hero | Verdict three cards | DEAL / MAYBE / PASS |
| Foreclosure | Beyond the MLS | Color-coded search | Deal Gap hero |
| Rental | Cash-flow verdict | DealMaker scenarios | DEAL / MAYBE / PASS |
| Flip | Comps | DealMaker (ARV) | Verdict |
| Competitor | Decision-framed hero | DEAL / MAYBE / PASS | Beyond the MLS |

Slots 4–8 deepen with the remaining default frames (coverage, comps, DealMaker, heatmap, search) so each page still shows the full product story.
