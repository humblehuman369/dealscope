// Builds docs/marketing/MARKETING_DESCRIPTIONS_GUIDE.docx from the same
// approved content as MARKETING_DESCRIPTIONS_GUIDE.md.
//
// Run with: NODE_PATH=$(npm root -g) node scripts/build_marketing_descriptions_docx.js

const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  LevelFormat,
  PageBreak,
} = require("docx");

const FONT = "Arial";
const ACCENT = "0EA5E9"; // DealGapIQ sky blue
const BRAND_BLUE = "0465F2";
const TEXT_DARK = "111827";
const MUTED = "4B5563";
const BORDER_GRAY = "CCCCCC";
const SHADE_HEADER = "D9EEFA";
const SHADE_LIGHT = "F3F8FB";

const PAGE_WIDTH = 12240;
const MARGIN = 1080; // 0.75"
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 10080

// ---------- helpers ----------

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0, line: 300 },
    alignment: opts.alignment,
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italic,
        color: opts.color ?? TEXT_DARK,
        size: opts.size ?? 22, // 11pt
        font: FONT,
      }),
    ],
  });
}

function runs(parts) {
  return parts.map(
    (part) =>
      new TextRun({
        text: part.text,
        bold: part.bold,
        italics: part.italic,
        color: part.color ?? TEXT_DARK,
        size: part.size ?? 22,
        font: FONT,
      })
  );
}

function richP(parts, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0, line: 300 },
    alignment: opts.alignment,
    children: runs(parts),
  });
}

function bullet(text, opts = {}) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: opts.after ?? 80, line: 290 },
    children: runs(
      Array.isArray(text) ? text : [{ text, size: opts.size ?? 22 }]
    ),
  });
}

function quoteBlock(text, opts = {}) {
  // Indented italic paragraph with a left border to visually mark a quote.
  return new Paragraph({
    spacing: { before: opts.before ?? 80, after: opts.after ?? 160, line: 320 },
    indent: { left: 360 },
    border: {
      left: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 12 },
    },
    children: [
      new TextRun({
        text,
        italics: true,
        color: TEXT_DARK,
        size: 22,
        font: FONT,
      }),
    ],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 },
    },
    children: [
      new TextRun({
        text,
        bold: true,
        color: TEXT_DARK,
        size: 32, // 16pt
        font: FONT,
      }),
    ],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        color: BRAND_BLUE,
        size: 26, // 13pt
        font: FONT,
      }),
    ],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({
        text,
        bold: true,
        color: TEXT_DARK,
        size: 24, // 12pt
        font: FONT,
      }),
    ],
  });
}

function cell(content, opts = {}) {
  const width = opts.width;
  const shading = opts.shade
    ? { fill: opts.shade, type: ShadingType.CLEAR, color: "auto" }
    : undefined;
  const border = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: BORDER_GRAY,
  };
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    borders: {
      top: border,
      bottom: border,
      left: border,
      right: border,
    },
    children: Array.isArray(content) ? content : [content],
  });
}

function twoColTable(headerLeft, headerRight, rows, leftWidth = 4400) {
  const rightWidth = CONTENT_WIDTH - leftWidth;
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [leftWidth, rightWidth],
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell(
            new Paragraph({
              spacing: { after: 0 },
              children: [
                new TextRun({
                  text: headerLeft,
                  bold: true,
                  color: TEXT_DARK,
                  size: 22,
                  font: FONT,
                }),
              ],
            }),
            { width: leftWidth, shade: SHADE_HEADER }
          ),
          cell(
            new Paragraph({
              spacing: { after: 0 },
              children: [
                new TextRun({
                  text: headerRight,
                  bold: true,
                  color: TEXT_DARK,
                  size: 22,
                  font: FONT,
                }),
              ],
            }),
            { width: rightWidth, shade: SHADE_HEADER }
          ),
        ],
      }),
      ...rows.map(
        (r, i) =>
          new TableRow({
            children: [
              cell(p(r[0], { after: 0 }), {
                width: leftWidth,
                shade: i % 2 ? SHADE_LIGHT : undefined,
              }),
              cell(p(r[1], { after: 0 }), {
                width: rightWidth,
                shade: i % 2 ? SHADE_LIGHT : undefined,
              }),
            ],
          })
      ),
    ],
  });
}

// ---------- content ----------

const children = [];

// Cover / title
children.push(
  new Paragraph({
    spacing: { before: 0, after: 80 },
    children: [
      new TextRun({
        text: "DealGap",
        bold: true,
        color: BRAND_BLUE,
        size: 28,
        font: FONT,
      }),
      new TextRun({
        text: "IQ",
        bold: true,
        color: ACCENT,
        size: 28,
        font: FONT,
      }),
    ],
  })
);
children.push(
  new Paragraph({
    spacing: { before: 0, after: 120 },
    children: [
      new TextRun({
        text: "Marketing Descriptions Guide",
        bold: true,
        color: TEXT_DARK,
        size: 44, // 22pt
        font: FONT,
      }),
    ],
  })
);
children.push(
  new Paragraph({
    spacing: { after: 320 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 6 },
    },
    children: [
      new TextRun({
        text: "Vetted reference for taglines, bios, pitches, services, benefits, and approved phrases.",
        italics: true,
        color: MUTED,
        size: 22,
        font: FONT,
      }),
    ],
  })
);

children.push(
  richP(
    [
      { text: "Purpose. ", bold: true },
      {
        text: "A vetted reference of approved descriptions, taglines, bios, pitches, and phrases for DealGapIQ marketing across all channels. Pull directly from this document when writing ads, social posts, press releases, partnership decks, podcast intros, or any external-facing copy.",
      },
    ],
    { after: 120 }
  )
);
children.push(
  richP(
    [
      { text: "Source of truth. ", bold: true },
      {
        text: "Distilled and approved from docs/marketing/MARKETING_GUIDE.md (April 2026). Update this document alongside any pricing, feature, or positioning change.",
      },
    ],
    { after: 240 }
  )
);

// 1. Primary Tagline
children.push(h1("1. Primary Tagline"));
children.push(
  new Paragraph({
    spacing: { before: 80, after: 200 },
    indent: { left: 360 },
    border: {
      left: { style: BorderStyle.SINGLE, size: 24, color: ACCENT, space: 12 },
    },
    children: [
      new TextRun({
        text: "“Not a listing site. A deal decision engine.”",
        bold: true,
        color: TEXT_DARK,
        size: 32, // 16pt
        font: FONT,
      }),
    ],
  })
);

children.push(h2("Approved Alternative Taglines"));
children.push(
  twoColTable(
    "Tagline",
    "Best Used For",
    [
      [
        "See every property through an investor’s lens.",
        "Hero headlines, broad brand campaigns",
      ],
      ["Stop browsing. Start calculating.", "Behavioral CTAs, retargeting"],
      [
        "Every property has a Deal Gap. Only DealGapIQ measures it.",
        "Differentiation, brand awareness",
      ],
      [
        "Know your number before you make the offer.",
        "Pricing pages, conversion",
      ],
      [
        "Real analytics for real estate investors.",
        "SEO, generic positioning",
      ],
      [
        "The only question that matters: “Is this actually a deal?”",
        "Educational, podcast intros",
      ],
    ],
    5040
  )
);

// 2. Company Bios
children.push(h1("2. Company Bios"));
children.push(
  p(
    "Use the version that matches the channel and word budget. All three are interchangeable in claims and tone — the longer ones simply add more detail.",
    { after: 200 }
  )
);

children.push(h2("2.1 Short Bio (≈50 words)"));
children.push(
  p("For social profiles, directory listings, sponsorship blurbs, brief intros.", {
    italic: true,
    color: MUTED,
    after: 100,
  })
);
children.push(
  quoteBlock(
    "DealGapIQ is a real estate investment analytics platform that tells you whether any U.S. residential property is actually a deal. Enter an address; in 60 seconds get a full investment verdict, the breakeven price, the target buy price, and the percentage gap from asking — across six investment strategies."
  )
);

children.push(h2("2.2 Medium Bio (≈150 words)"));
children.push(
  p("For About sections, partnership pages, podcast guest intros, press releases.", {
    italic: true,
    color: MUTED,
    after: 100,
  })
);
children.push(
  quoteBlock(
    "DealGapIQ is a real estate investment analytics platform built for one purpose: answering the only question that matters to an investor — “Is this actually a deal?” Enter any U.S. residential address and in 60 seconds receive a complete verdict, including Market Value, Income Value (the breakeven ceiling), Target Buy (your goal-price), and the Deal Gap — the percentage distance between the asking price and where the deal actually works for you."
  )
);
children.push(
  quoteBlock(
    "Every property is analyzed against six investment strategies simultaneously: long-term rental, short-term rental, BRRRR, fix-and-flip, house hack, and wholesale. Data is aggregated from five sources — Zillow, RentCast, Redfin, Realtor.com, and county records — into a single multi-source IQ Estimate, with every assumption visible and editable. Founded by Brad Geisen, founder of Foreclosure.com and builder of HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac."
  )
);

children.push(h2("2.3 Long Bio (≈400 words)"));
children.push(
  p("For press kits, founder profiles, formal partnerships, investor decks, conference programs.", {
    italic: true,
    color: MUTED,
    after: 100,
  })
);
children.push(
  quoteBlock(
    "DealGapIQ is a real estate investment analytics platform that turns any U.S. residential address into a complete, decision-grade investment analysis in under a minute. Where listing sites like Zillow, Redfin, and Realtor.com are designed for homebuyers — curated photos, agent remarks, and Zestimates built for homeowners — DealGapIQ is built exclusively for the investor’s question: Does this property cash flow, and at what price does it become a good deal?"
  )
);
children.push(
  quoteBlock(
    "Every analysis produces three price thresholds and the metric that holds them together. Market Value anchors the analysis to comparable sales. Income Value is the breakeven ceiling — the maximum price an investor can pay before monthly cash flow turns negative — a number no other platform calculates. Target Buy is the exact price at which the property delivers the investor’s desired return. The Deal Gap, DealGapIQ’s signature metric, expresses the percentage distance between the asking price and the Target Buy, giving every investor a universal language for deal quality across markets, strategies, and price points."
  )
);
children.push(
  quoteBlock(
    "Each property is analyzed simultaneously against six investment strategies: long-term rental, short-term rental, BRRRR, fix-and-flip, house hack, and wholesale. The proprietary IQ Estimate cross-references valuation and rental data from Zillow, RentCast, Redfin, Realtor.com, and county records, applying outlier filtering and full source transparency. Every input — financing terms, rehab budget, rental income, vacancy, expenses — is visible and editable, with metrics recalculating in real time. Outputs include lender-ready PDF reports, full Excel proformas with 10-year projections and amortization schedules, URAR-style comparable-sales appraisal reports, and wholesale Letters of Intent."
  )
);
children.push(
  quoteBlock(
    "DealGapIQ is available on the web at dealgapiq.com and as native iOS and Android apps featuring Point & Scan — identify and analyze any property just by pointing a phone at it. The platform was founded by Brad Geisen, who spent more than 35 years in real estate data, founding Foreclosure.com, building HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac, and supporting more than 80 organizations through GSE partnerships spanning three decades. Operated by DealGapIQ, the platform runs a freemium model: three free analyses per month with no credit card required, and a Pro tier at $39.99/month or $349.99/year for unlimited analysis and the full underwriting toolkit."
  )
);

children.push(new Paragraph({ children: [new PageBreak()] }));

// 3. Top Ten Elevator Pitches
children.push(h1("3. Top Ten Elevator Pitches"));
children.push(
  p(
    "Each pitch is a 30–60 second spoken version optimized for a different audience or hook. Use the one that fits the conversation.",
    { after: 200 }
  )
);

const pitches = [
  [
    "Pitch 1 — The Deal Gap Concept (signature pitch)",
    "Every property has a Deal Gap — the percentage distance between what a seller is asking and what the property is actually worth as an investment. Most investors never measure it. DealGapIQ does — in 60 seconds, across six strategies, with every assumption editable. We turn real estate from a search game into a decision system.",
  ],
  [
    "Pitch 2 — The Lens Shift (paradigm-driven)",
    "Zillow shows you what a property is worth to a homeowner. DealGapIQ shows you what it’s worth to an investor — and those are two very different numbers. Enter any address. In 60 seconds, see the breakeven price, the target buy price, and the gap from asking, across six investment strategies.",
  ],
  [
    "Pitch 3 — The Speed Pitch (for active investors)",
    "Forty-five minutes on a custom spreadsheet, or 60 seconds on DealGapIQ — same rigor. We aggregate data from five sources, model six investment strategies, and give you a verdict, not a data dump. If you’re analyzing more than three deals a month, this is the tool that pays for itself.",
  ],
  [
    "Pitch 4 — The Verdict Pitch (decision-led)",
    "DealGapIQ isn’t a listing site. It’s a decision engine. Type in an address; we tell you the price at which the deal works, the price at which it breaks even, and how far the seller is from either one. You get a verdict in 60 seconds — pursue, pass, or negotiate.",
  ],
  [
    "Pitch 5 — The Risk-Reduction Pitch (for first-time investors)",
    "One bad real estate deal can cost you years. DealGapIQ tells you in 60 seconds — before you tour, before you offer — whether the numbers actually work. Three free analyses a month, no credit card required, and plain-language explanations so you can learn underwriting on real properties.",
  ],
  [
    "Pitch 6 — The Income Value Pitch (unique-feature angle)",
    "There’s a number no other platform calculates: the maximum price you can pay for a property before it starts losing money every month. We call it Income Value — the breakeven ceiling. Knowing exactly where that line sits, before you tour a property, saves you from chasing bad deals.",
  ],
  [
    "Pitch 7 — The Transparency Pitch (for skeptics and pros)",
    "Most real estate calculators are black boxes — you don’t know what assumptions are baked in. DealGapIQ is the opposite. Five data sources, every assumption visible, every input editable. If you disagree with a number, change it and watch the verdict update in real time. Yours to trust because nothing is hidden.",
  ],
  [
    "Pitch 8 — The Founder Authority Pitch (credibility-led)",
    "DealGapIQ was built by Brad Geisen — the same person who founded Foreclosure.com and built HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac. Thirty-five years in real estate data. The platform brings institutional-grade investment analysis — Deal Gap, Income Value, multi-source valuation — to every individual investor.",
  ],
  [
    "Pitch 9 — The Multi-Strategy Pitch (for portfolio builders)",
    "Most investors lock into one strategy and only model that one. DealGapIQ analyzes every property against six strategies at once — long-term rental, short-term rental, BRRRR, fix-and-flip, house hack, and wholesale — so the property tells you which strategy works best, not the other way around.",
  ],
  [
    "Pitch 10 — The Mobile / Field Pitch (Point & Scan story)",
    "You’re driving a neighborhood and you spot a property with potential — what now? Open DealGapIQ, point your phone, tap once. We identify the address and run a full investment analysis on the spot. Opportunities don’t wait until you’re back at your desk. Now your analysis doesn’t either.",
  ],
];

pitches.forEach(([title, body]) => {
  children.push(h3(title));
  children.push(quoteBlock(body));
});

children.push(new Paragraph({ children: [new PageBreak()] }));

// 4. Key Services
children.push(h1("4. Key Services"));
children.push(
  p(
    "The complete service catalog, organized for use in feature lists, partnership decks, and integration overviews.",
    { after: 200 }
  )
);

children.push(h2("Analysis"));
children.push(
  bullet([
    { text: "VerdictIQ — ", bold: true },
    {
      text: "Instant investment verdict for any U.S. residential address: deal score, Deal Gap, Market Value, Income Value, Target Buy, seller motivation, and plain-language guidance.",
    },
  ])
);
children.push(
  bullet([
    { text: "StrategyIQ — ", bold: true },
    {
      text: "Strategy-by-strategy financial deep-dive across all six investment models, with full income, expense, and investor-benchmark breakdowns.",
    },
  ])
);

children.push(h2("Underwriting Tools"));
children.push(
  bullet([
    { text: "DealMakerIQ — ", bold: true },
    {
      text: "Interactive assumption editor. Adjust purchase price, financing, rehab, rent, vacancy, expenses; every metric recalculates in real time across all six strategies.",
    },
  ])
);
children.push(
  bullet([
    { text: "PriceCheckerIQ / Appraiser — ", bold: true },
    {
      text: "Comp-based valuation tool with line-item adjustments, weighted similarity scoring, and downloadable URAR-style (Form 1004) appraisal reports.",
    },
  ])
);
children.push(
  bullet([
    { text: "Rehab Estimator — ", bold: true },
    {
      text: "Quick and detailed rehab cost modeling with regional adjustments for labor, materials, and permits.",
    },
  ])
);
children.push(
  bullet([
    { text: "Map Search — ", bold: true },
    {
      text: "Interactive property map with investment metrics overlaid through the investor lens.",
    },
  ])
);

children.push(h2("Outputs"));
children.push(
  bullet([
    { text: "Lender-ready PDF reports — ", bold: true },
    { text: "Full property analysis with financial projections and strategy detail." },
  ])
);
children.push(
  bullet([
    { text: "Excel proforma exports — ", bold: true },
    {
      text: "Cash flow projections, amortization schedules, 10-year projections, sensitivity analysis, per-strategy sheets.",
    },
  ])
);
children.push(
  bullet([
    { text: "Letter of Intent (Wholesale) — ", bold: true },
    { text: "Auto-generated wholesale LOI directly from the analysis." },
  ])
);
children.push(
  bullet([
    { text: "Strategy-specific worksheets — ", bold: true },
    { text: "Downloadable per-strategy documents." },
  ])
);

children.push(h2("Pipeline"));
children.push(
  bullet([
    { text: "DealVaultIQ — ", bold: true },
    { text: "Saved-deal pipeline for tracking and revisiting analyses." },
  ])
);
children.push(
  bullet([
    { text: "Side-by-Side Comparison — ", bold: true },
    { text: "Compare multiple properties head-to-head with standardized metrics." },
  ])
);
children.push(
  bullet([
    { text: "Search History — ", bold: true },
    { text: "Full record of every analyzed property." },
  ])
);

children.push(h2("Mobile"));
children.push(
  bullet([
    { text: "Native iOS and Android apps — ", bold: true },
    { text: "Full platform on App Store and Google Play." },
  ])
);
children.push(
  bullet([
    { text: "Point & Scan — ", bold: true },
    {
      text: "Point your phone at a property; DealGapIQ identifies the address and runs a full analysis instantly.",
    },
  ])
);

children.push(h2("Data"));
children.push(
  bullet([
    { text: "IQ Estimate — ", bold: true },
    {
      text: "Proprietary multi-source blended valuation cross-referencing Zillow, RentCast, Redfin, Realtor.com, and county records with outlier filtering and full source transparency.",
    },
  ])
);

children.push(new Paragraph({ children: [new PageBreak()] }));

// 5. Key Benefits
children.push(h1("5. Key Benefits"));
children.push(
  p(
    "Outcome-led benefits — useful for ad copy, landing pages, and sales conversations. Lead with the benefit, not the feature.",
    { after: 200 }
  )
);

const benefits = [
  ["Decide in 60 seconds.", "Replace 45-minute spreadsheets with a complete verdict in under a minute."],
  ["See the breakeven ceiling.", "Income Value tells you the maximum price before monthly cash flow turns negative — a number no other platform shows."],
  ["Know your offer price.", "Target Buy gives you the exact price at which a property delivers your desired return."],
  ["Measure the Deal Gap.", "A single percentage that translates deal quality across markets, strategies, and price points."],
  ["Six strategies in one view.", "Long-term rental, short-term rental, BRRRR, fix-and-flip, house hack, and wholesale — analyzed simultaneously, so the property tells you which strategy fits."],
  ["Trust the data.", "Multi-source IQ Estimate cross-references Zillow, RentCast, Redfin, Realtor.com, and county records with outlier filtering and full source transparency."],
  ["Edit every assumption.", "No black box. Disagree with a number? Change it and watch the verdict update."],
  ["Output what closes deals.", "Lender-ready PDFs, full Excel proformas, URAR-style comp reports, and wholesale LOIs."],
  ["Analyze in the field.", "Point & Scan turns any phone into a property analysis tool — at open houses, driving for dollars, anywhere a deal catches your eye."],
  ["Start free.", "Three analyses per month with no credit card required."],
  ["Scale without commitment.", "Pro is $39.99/month or $349.99/year (save 27%), with a 7-day full-access trial and two-click cancellation."],
];

benefits.forEach(([head, body]) => {
  children.push(
    bullet([
      { text: head + " ", bold: true },
      { text: body },
    ])
  );
});

children.push(new Paragraph({ children: [new PageBreak()] }));

// 6. Marketing Phrase Bank
children.push(h1("6. Marketing Phrase Bank"));
children.push(
  p(
    "Approved phrases for direct copy reuse across channels. Pull, adapt, and combine — voice and claims have already been vetted.",
    { after: 200 }
  )
);

children.push(h2("6.1 Manifesto Lines"));
[
  "You’re not asking “do I love this kitchen?” You’re asking “does this property cash flow?”",
  "Most investors analyze deals. Professional investors eliminate bad deals fast.",
  "Real estate sites market properties. We analyze them.",
  "Numbers over narratives. Decisions over browsing. Speed over spreadsheets.",
  "Opportunities don’t wait until you get back to your desk. Now, neither does your analysis.",
  "Once you see it, you’ll never analyze real estate the old way again.",
].forEach((q) => children.push(quoteBlock(q)));

children.push(h2("6.2 Headline Variants"));
[
  "See Every Property Through an Investor’s Lens.",
  "Is That Property a Good Deal? Find Out in 60 Seconds.",
  "Stop Browsing Like a Buyer. Start Thinking Like an Investor.",
  "Know Your Number Before You Make the Offer.",
  "The 3 Numbers Every Investor Needs Before Making an Offer.",
  "The Deal Gap — The Metric Zillow Won’t Show You.",
  "Every Property Has a Deal Gap. Only DealGapIQ Measures It.",
  "One bad deal costs thousands. DealGapIQ Pro costs $39.99/mo.",
].forEach((line) => children.push(bullet(line)));

children.push(h2("6.3 Trust & Microcopy"));
[
  "No credit card required.",
  "3 free analyses per month.",
  "Cancel anytime in 2 clicks. No retention tricks.",
  "7-day free trial on Pro. Full access.",
  "Cross-referenced from 5 data sources.",
  "Every assumption editable.",
  "Your deal flow is yours alone — never shared, never sold.",
].forEach((line) => children.push(bullet(line)));

children.push(h2("6.4 Compliance Lines"));
children.push(
  p("Always pair with promotional copy where applicable.", {
    italic: true,
    color: MUTED,
    after: 120,
  })
);
[
  "Professional use only. Not a lender.",
  "Analytics tool, not financial advice.",
  "Not a licensed appraisal. (Appraiser / comp tool only)",
  "Never promise specific or guaranteed returns.",
].forEach((line) => children.push(bullet(line)));

children.push(h2("6.5 Proof Points"));
children.push(
  p("Weave into copy whenever possible.", {
    italic: true,
    color: MUTED,
    after: 120,
  })
);
[
  "5 data sources cross-referenced for every analysis.",
  "6 investment strategies analyzed simultaneously.",
  "60 seconds from address to full verdict.",
  "35+ years of real estate data leadership behind the product.",
  "80+ organizations served by the founder’s prior work.",
  "30+ year GSE partnership track record.",
  "Built HomePath.com (Fannie Mae) and HomeSteps.com (Freddie Mac).",
].forEach((line) => children.push(bullet(line)));

children.push(h2("6.6 Workflow Tagline — SCAN → SCREEN → STRESS-TEST → ACT"));
[
  ["SCAN", "any property — type the address or point your phone."],
  ["SCREEN", "with an instant Verdict against your Buy Box."],
  ["STRESS-TEST", "every assumption in real time."],
  ["ACT", "with lender-ready reports, comparison views, and a tracked deal pipeline."],
].forEach(([head, body]) => {
  children.push(
    bullet([
      { text: head + " ", bold: true, color: ACCENT },
      { text: body },
    ])
  );
});

children.push(h2("6.7 The Two-Lens Framing"));
children.push(p("For comparison content (carousels, landing pages, ads).", {
  italic: true,
  color: MUTED,
  after: 120,
}));
children.push(
  twoColTable(
    "The Marketing Lens (Listing Sites)",
    "The Investor Lens (DealGapIQ)",
    [
      ["Built for homebuyers and agents", "Built for residential real estate investors"],
      ["Photos that sell an emotion", "Numbers that tell the truth"],
      ["Zestimate built for homeowners", "IQ Estimate built for investors"],
      ["No rental income, no cash flow", "Full rental income, cash flow, DSCR"],
      ["Shows what a property looks like", "Shows what a property is worth"],
      ["“Do I love this kitchen?”", "“Does this property cash flow?”"],
    ],
    5040
  )
);

children.push(new Paragraph({ children: [new PageBreak()] }));

// 7. Quick-Reference Cheat Sheet
children.push(h1("7. Quick-Reference Cheat Sheet"));
children.push(p("For the moments you only need one line.", { after: 200 }));
children.push(
  twoColTable(
    "Need",
    "Use",
    [
      [
        "One-line tagline",
        "“Not a listing site. A deal decision engine.”",
      ],
      [
        "One-sentence pitch",
        "DealGapIQ tells you whether any U.S. residential property is actually a deal — in 60 seconds, across six strategies, with every assumption editable.",
      ],
      [
        "One-sentence credibility",
        "Built by Brad Geisen, founder of Foreclosure.com and builder of HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac.",
      ],
      [
        "One-sentence offer",
        "Three free analyses a month, no credit card required — Pro is $39.99/mo with a 7-day free trial.",
      ],
      [
        "One-sentence differentiator",
        "We’re the only platform that calculates the Deal Gap and Income Value — the two numbers that separate a real deal from an expensive mistake.",
      ],
    ],
    3000
  )
);

children.push(
  new Paragraph({
    spacing: { before: 480, after: 0 },
    border: {
      top: { style: BorderStyle.SINGLE, size: 6, color: BORDER_GRAY, space: 6 },
    },
    children: [
      new TextRun({
        text: "Document maintained at docs/marketing/MARKETING_DESCRIPTIONS_GUIDE.md / .docx. Source: docs/marketing/MARKETING_GUIDE.md (April 2026).",
        italics: true,
        color: MUTED,
        size: 20,
        font: FONT,
      }),
    ],
  })
);

// ---------- build ----------

const doc = new Document({
  creator: "DealGapIQ",
  title: "DealGapIQ Marketing Descriptions Guide",
  description:
    "Vetted marketing reference: tagline, bios, elevator pitches, services, benefits, and approved phrases.",
  styles: {
    default: {
      document: { run: { font: FONT, size: 22 } },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 32, bold: true, font: FONT, color: TEXT_DARK },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: BRAND_BLUE },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 24, bold: true, font: FONT, color: TEXT_DARK },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: { indent: { left: 540, hanging: 270 } },
            },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: 15840 },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      children,
    },
  ],
});

const out = path.join(
  __dirname,
  "..",
  "docs",
  "marketing",
  "MARKETING_DESCRIPTIONS_GUIDE.docx"
);

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(out, buf);
  console.log("Wrote:", out, "(" + buf.length + " bytes)");
});
