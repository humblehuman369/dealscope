# "Find a deal of a lifetime" — listicle page + Meta ad concept

> Companion to `LISTICLE_LANDING_PAGES.md`. This is the first page that
> targets a *search* phrase ("find investment property") with the *listicle*
> frame, and the first one built around Search & Discover (the map) rather
> than the address verdict alone. Two rules from the runbook bend on purpose;
> both are called out in §5.
>
> Live mockup: the "Deal of a Lifetime" artifact (HTML, both themes, real
> screenshots). Ad creative: `fb-ad-not-for-sale-1080.png`.

---

## 1. What this page is for

Most investors start with "where do I find deals?" not "is this a deal?"
The existing `/answers` pages catch the second question. Nothing catches the
first except `/markets/near-me`. This page does, and it points the search at
the one thing no listing site has: a map where you can search homes that are
**not for sale**.

**Target intent cluster** (validate volumes in Semrush when units are back):

| Phrase | Role |
|---|---|
| find investment property | primary |
| how to find investment properties | H2 / FAQ |
| investment property search | meta title |
| find real estate deals / find off market deals | body, reasons 2–4 |
| investment properties near me | related link to `/markets/near-me` (do not chase "near me" in the title, playbook §2) |
| foreclosure map / expired listings / absentee owner list | reasons 3, 4, 2 |

**Slug:** `/for/find-investment-property`
**Route decision:** stays in `/for/*` so it uses `ListicleLandingPage.tsx`
and one config entry, but ships **`indexable: true`** (see §5). It has 4
persona reasons, its FAQ is unique to the intent, and it is a search page by
design, so the promotion rule in `LISTICLE_LANDING_PAGES.md` §4 is met on
day one except the four-week traffic clause.

---

## 2. Page copy (copy of record for the config entry)

**Meta title** (67): `Find Investment Property on a Map Built for Investors | DealGapIQ`
**Meta description** (158): `Find investment property that isn't on the listing sites. Search by foreclosure, expired listing, owner tenure and absentee status, then run the address free.`

**Eyebrow:** Search & Discover · map search for investors
**H1:** Find a deal of a lifetime.
**Intro:** DealGapIQ's Search & Discover is the new investor platform. Every pin on the map is a price and a rent-to-price number, not a photo. Filter for foreclosures, expired listings, and owners who have held 20 years and don't live there. Then run the address and get the verdict free.
**Guarantee line:** Free Discovery on any address. No signup. No card. Under the hero it is followed by: "the full Search & Discover map and List Download are Pro." The claim is scoped to the verdict; never let it sit beside the map without that clause.
**CTA:** `AddressCtaForm` with `source="for:find-investment-property"`. Placeholder: "Paste any US address, city, or ZIP". A street address → `/discovery`; a city or ZIP → `/map-search` (same routing as `/answers`).
**Secondary link under the CTA:** "Or open Search & Discover and draw your own area →" → `/map-search`.

**Hero visual:** one map pin blown up (`$2.4M / 0.16% rent`, taken from the
Boynton Beach screenshot) with the one-sentence explanation of what the two
lines mean. This is the page's thesis: the pin *is* the difference. Below it,
both screenshots side by side, light and dark, with real captions (141
results / 64 results).

**Listicle H2:** 9 reasons investors hunt on Search & Discover instead of a listing site

Persona reasons (new, positions 1–4):

1. **Every pin is a number, not a photo.** Price on top, monthly rent as a percent of price underneath. Scan a whole ZIP for the strong ratios in seconds.
2. **Search homes that are not for sale.** Owner Leads flips the map to properties by owner tenure (10–20, 20–30, 30+ years), occupancy (absentee / owner-occupied) and availability (off-market / for sale). Long tenure plus absentee is where high equity and a willing seller meet.
3. **Distressed deals are the map legend.** Foreclosure, auction and pre-foreclosure as red pins; toggle any combination.
4. **Expired listings, verified live.** Expired, withdrawn, cancelled, delisted. Each candidate is checked live on the listing source and dropped if relisted or sold.

Base-pool reasons (map-specific; add these ids to `BASE_REASONS` or write them inline):

5. **Days on market, as a filter.** 30+ / 60+ / 90+ / 120+; the card carries the count.
6. **Draw your own area.** Results snap to your shape, not a ZIP boundary.
7. **Reviewed or Pass, right on the card.** Triage a neighborhood from the map.
8. **Analyze is one tap from the pin.** Same free verdict: price where it works, Deal Gap, four ways to close it.
9. **List Download (Pro).** Take the filtered set off the map.

**Compare strip** (the "two lenses" from `MARKETING_GUIDE.md` §5.3, map edition):
listing-site map = for-sale only, price + photo, beds/baths/pool, homeowner
estimate. Search & Discover = for-sale + off-market + distressed + expired on
one map, price + rent ratio, tenure/occupancy/DOM/distress filters, free
verdict on any pin.

**Offer block H2:** Pick a pin. Run the address. Know what to offer.
**Offer body:** The verdict is free with no account: the price where the property works, the Deal Gap to the asking price, and four offer structures with the script for each. A free account saves your properties. Pro opens the full map and the downloads. *(Limits and prices render from `planFeatures.ts`.)*

**FAQ** (five, emitted as `FAQPage`):
- Where do I find investment properties that aren't on the listing sites? → Owner Leads + Off-market; Distressed; Expired.
- What does the percentage on each pin mean? → rent ÷ price, ZIP-level screen, tap Analyze for the real number.
- Is the map free? → verdict free; full map and List Download are Pro; limits on the pricing page.
- Is this investment advice? → No. We analyze. You decide.
- Does it cover my market? → any US address; STR may read "unavailable"; *every property has more leverage than the asking price suggests.*

**Related:** `/answers/is-this-a-good-investment-property`, `/markets/near-me`, `/answers/what-should-i-offer-on-this-house`.
**Footer sign-off:** Google Deal Gap IQ. Know what to offer.

---

## 3. Facebook / Meta ad concept: "Not For Sale"

**The idea.** Every real estate ad on Facebook shows a house. Ours shows a
map pin that says **NOT FOR SALE** in the same orange every listing app uses
for a price. The viewer's brain reads "price pin," then reads the words, and
stops. That one-second contradiction is the whole ad. It only works for us
because only our map can search homes that aren't listed.

**Creative (primary, 1:1 and 4:5):** the dark-mode Delray Beach map as the
ground, dimmed. One oversized orange pin: `NOT FOR SALE` / `Owner 27 yrs ·
Absentee`. Headline over the bottom third: *The best deal on this map isn't
listed.* Pill: *Run any address free. No signup.* (describes the click, not the map) Real product screenshot,
no stock, no arrows, per `POSITIONING.md` §4. File: `fb-ad-not-for-sale-1080.png`.

**Video version (15 s, the runbook's preferred format):** screen recording of
the map. Second 0–2: a normal for-sale map, orange pins. Second 2–5: cursor
turns on Owner Leads → Absentee → Off-market; the map redraws to green pins.
Caption: "These homes aren't for sale." Second 5–9: cursor turns on 30+ yrs
tenure; pins thin out. Caption: "Owner 30 years. Doesn't live there." Second
9–13: click a pin → Analyze → verdict card with the Deal Gap. Second 13–15:
end card, guarantee line, logo. Captions on, no voice needed.

**Campaign placement:** campaign `for-listicles`, new ad set
`find-investment-property` at $20/day, same rules as §5 of the runbook. It
can launch beside `wholesalers` and `creative-finance-buyers` or replace
whichever of those is killed first. Interest stack: Real estate investing,
BiggerPockets, Foreclosure, Landlord, Rental property, Driving for dollars,
Wholesaling. Age 25–64, US, Advantage+ placements, landing-page views first.

Three ads, headline ≤40 characters, description `Free Discovery on any address. No signup. No card.`, CTA **Learn more**:

**Hook A — `find-investment-property-hookA`**
Headline: `The best deal here isn't for sale` (33)
Primary text:
> The best deal on this map isn't listed.
>
> Search & Discover shows homes by how long the owner has held them, whether they live there, and whether the home is on the market at all. Turn on Absentee and 30+ years and you are looking at a list no listing site can make. Pick a pin, run the address, get the verdict free.

URL: `https://dealgapiq.com/for/find-investment-property?utm_source=meta&utm_medium=paid_social&utm_campaign=find-investment-property&utm_content=hookA`

**Hook B — `find-investment-property-hookB`**
Headline: `Every pin is a number, not a photo` (34)
Primary text:
> 9 reasons investors hunt on Search & Discover instead of a listing site
>
> Every pin on the map is a price and a rent-to-price number, not a photo. Filter for foreclosures, expired listings, and owners who have held 20 years and don't live there. Then run the address and get the verdict free.

URL: `…&utm_content=hookB`

**Hook C — control (identical to the other ad sets)**
Headline: `Free Discovery on any address. No signup.` (39)
Primary text: `Paste any US address. In 15 seconds you get the price where the deal works, the Deal Gap to the asking price, and four ways to close it. Free. No account. No card.`
URL: `…&utm_content=hookC`

**Variant creatives for hook rotation when frequency passes 3:**
- Pin reads `EXPIRED · 120 DOM` / headline *They tried to sell. Nobody called back.*
- Pin reads `PRE-FORECLOSURE` / headline *The red pins are the whole map.*
- Pin reads `0.71% rent` next to a `0.16% rent` pin / headline *One of these cash flows. The map tells you which.*

**Measurement:** ad set name = slug = `ft_utm_campaign`. Add a `DR-C
for/find-investment-property` funnel and the page appears in DR-F
automatically. Because this page is also indexable, break DR-C down by
`ft_utm_medium` so organic search sessions do not inflate the paid verdict
rate.

---

## 4. Config sketch (`persona-pages.ts`)

```ts
{
  slug: 'find-investment-property',
  persona: 'deal-hunter',
  indexable: true,                       // see §5
  title: 'Find Investment Property on a Map Built for Investors | DealGapIQ',
  description: 'Find investment property that isn\'t on the listing sites. Search by foreclosure, expired listing, owner tenure and absentee status, then run the address free.',
  h1: 'Find a deal of a lifetime.',
  listicleHeading: '9 reasons investors hunt on Search & Discover instead of a listing site',
  intro: '…§2 intro…',
  personaReasons: ['pin-is-a-number', 'not-for-sale', 'distressed-legend', 'expired-verified'],
  reasonIds: ['map-dom-filter', 'draw-area', 'review-pass', 'analyze-from-pin', 'list-download-pro'],
  offer: { heading: 'Pick a pin. Run the address. Know what to offer.', body: '…' },
  faq: [ /* five items from §2 */ ],
  relatedAnswers: ['is-this-a-good-investment-property', 'what-should-i-offer-on-this-house'],
  relatedPaths: ['/markets/near-me'],
}
```

The five map reasons are new ids for `BASE_REASONS`; the config test will
fail until they exist. The H1 has no leading integer, so either relax the
"leading integer equals reason count" invariant for entries that carry a
separate `listicleHeading`, or move the count into the H1 (`9 reasons…`)
and use "Find a deal of a lifetime" as the eyebrow. Your call; the artifact
shows the first option.

---

## 5. Where this bends the runbook (decide before shipping)

1. **Indexable `/for` page.** The runbook says `/for/*` is noindex and search
   goes to `/answers`. This page has a distinct problem ("where do I find
   deals?") that no `/answers` page covers, four persona-specific reasons and
   a unique FAQ, so it meets §4's promotion bar. Alternative: build it as
   `/answers/find-investment-property` and send Meta traffic there. Either
   way, one page, both channels, one `utm_campaign`.
2. **"Discover" in the product name.** The copy rule bans "discover /
   explore" as verbs. "Search & Discover" is a proper noun here, and
   "Discovery" is already the product's word for the free verdict. Verbs in
   the copy stay investor verbs (hunt, run, pick, filter). If the feature's
   official name is still "Map Search," swap it globally; nothing else moves.
3. **Map Search is Pro** in the April guide. The page never says the map is
   free; it says the *verdict* is free and the *full* map is Pro. Confirm
   which map features a logged-out or free user can actually touch (the
   screenshots show "Log in", so the map appears reachable without an
   account) and adjust reason 9 and the FAQ answer to match.
4. **"$2.4M / 0.16% rent" and "Owner 27 yrs · Absentee."** The pin figures
   are real (Boynton Beach screenshot). The "27 yrs" on the ad creative is
   illustrative. Replace it with a real pin from the product before the ad
   runs, so every number in the ad is one the product produced.
5. **Headline count.** "9 reasons" is literal: four persona + five base.
   If a reason is cut, the number changes.

**Truth checklist pass:** no typed prices; Pro label on List Download; no
competitor names in the ad copy ("listing site" only); no "trusted by N";
no advice language; "every property has more leverage…" used, "every
property is a deal" not used; STR "unavailable" caveat present.
