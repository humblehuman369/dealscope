/**
 * Activation Arc Phase 3 (C2) — IQ Knowledge Base v1 content.
 *
 * Locked Q&A data for the "Ask IQ" chip on the Four Paths panel. Content
 * pulled directly from docs/feature-plans/IQ_KB_V1_CONTENT.md and reviewed
 * against the Sprint 4 doctrine: 5th-grade reading level, 4–8 sentences
 * per answer, source attribution required, no advisory voice, honest about
 * risk.
 *
 * **No freeform LLM in v1** — see ACTIVATION_ARC.md §9 (non-goals). Adding
 * questions or answers means editing this file with full review against
 * the locked rules; the chip never invents content at runtime.
 *
 * IDs are stable identifiers used by the `iq_question_viewed` telemetry
 * event so engagement can be analyzed per-question across releases.
 */

export type IQCategory =
  | 'creative_finance_intro'
  | 'objection_handling'
  | 'reading_the_seller'
  | 'tactics'

export interface IQAnswer {
  /** Stable ID — used in `iq_question_viewed` telemetry. */
  id: string
  category: IQCategory
  /** Exactly as it appears in the chip list. Keep punctuation consistent. */
  question: string
  /** 4–8 sentences, 5th-grade level. May include light markdown (bold, italics). */
  answer: string
  /** Single-line attribution rendered below the answer in the modal. */
  source: string
}

export interface IQCategoryDefinition {
  id: IQCategory
  label: string
  /** Order in which the category appears in the modal. */
  order: number
}

/**
 * Display order tracks the natural arc of a seller conversation:
 * pre-call diagnosis → introducing structures → handling objections →
 * tactics that run across the whole conversation.
 */
export const IQ_CATEGORIES: IQCategoryDefinition[] = [
  { id: 'reading_the_seller', label: 'Reading the seller', order: 1 },
  { id: 'creative_finance_intro', label: 'Bringing up creative finance', order: 2 },
  { id: 'objection_handling', label: 'Handling objections', order: 3 },
  { id: 'tactics', label: 'Tactics that work', order: 4 },
]

export const IQ_KNOWLEDGE_BASE: IQAnswer[] = [
  // ── Reading the seller ──────────────────────────────────────────────
  {
    id: 'find-real-motivation',
    category: 'reading_the_seller',
    question: "How do I figure out the seller's real motivation?",
    answer:
      'Ask before you talk price. The most useful opener: *"What\'s prompting the move — and what\'s your ideal timeline?"* The answer almost always tells you which of four things matters most: a deadline (job, divorce, foreclosure), a cash need (debt, downpayment on their next house), an emotional reason (inherited the property, raised kids there), or post-sale plans (retirement income, 1031 exchange). Structure your offer to solve their top one or two — not all four. Most sellers will tell you their real reason if you simply ask and stay quiet long enough to listen.',
    source: 'Mastering §1.1; Residential Framework §1',
  },
  {
    id: 'four-things-before-price',
    category: 'reading_the_seller',
    question: 'What should I learn about the seller before we talk price?',
    answer:
      'Top mentors teach four dimensions to diagnose. **Timeline urgency** — are they relocating, in pre-foreclosure, paying two mortgages? **Equity position** — what do they owe, and how much do they need to walk away with? **Emotional attachment** — is this an inherited home, a long-term family property, or just an asset to them? **Post-sale plans** — where are they going, and what do they need closing day to make happen? Once you know the top one or two, you can structure an offer that solves their actual problem instead of just bidding against their list price.',
    source: 'Mastering §1.1, §6.2 (Smotherman framework)',
  },
  {
    id: 'price-vs-terms-tradeoff',
    category: 'reading_the_seller',
    question: "What's the price-vs-terms tradeoff and how do I bring it up?",
    answer:
      'It\'s the single most useful tool in real estate negotiation: price and terms are connected. If a seller wants their full asking price, you can usually get there if the terms support it — smaller down, lower rate, longer payment schedule. If they need all cash on closing day, the price has to drop because you\'re taking on more risk and bigger financing costs. Bring it up directly: *"I can pay $X if the terms are flexible. If you need all cash, my number has to be closer to $Y. Which matters more — the highest price, or the most cash on closing day?"* That single question often reframes the whole conversation.',
    source: 'Residential Framework §4',
  },

  // ── Creative finance intro ──────────────────────────────────────────
  {
    id: 'sub2-not-shady',
    category: 'creative_finance_intro',
    question: 'How do I bring up Sub2 without sounding shady?',
    answer:
      'Don\'t lead with the term *Sub2* — that\'s industry jargon and it makes sellers nervous. Describe what would happen in plain words: *"I would take over your existing mortgage payments — your loan stays in your name unless we refinance later."* Be upfront about the risks. The bank can technically demand full repayment if they discover the transfer (the due-on-sale clause), and the seller\'s loan stays on their credit report until paid off. That honesty is what builds trust. End with: *"Because of those risks, I\'d want everything in writing and reviewed by a real estate attorney before we move forward."*',
    source: 'Residential Framework §5; Mastering §5.5',
  },
  {
    id: 'seller-financing-not-salesy',
    category: 'creative_finance_intro',
    question: 'How do I introduce seller financing without sounding salesy?',
    answer:
      'Don\'t pitch it cold. Connect it to something they already said. If they mentioned wanting steady income, retirement, or not needing all the cash up front, say: *"Based on what you said about not being in a rush, here\'s an idea — what if you acted as the bank on part of this?"* Then walk through real numbers: down payment now, monthly payments at a set rate, you handle taxes and maintenance. Mention that a third-party loan servicing company handles paperwork, so they don\'t chase payments. End with a soft check-in: *"How does that sit with you?"* — make it feel like a tailored solution, not a sales script.',
    source: 'Mastering §3.3',
  },
  {
    id: 'seller-never-heard-of-this',
    category: 'creative_finance_intro',
    question: 'What if the seller has never heard of these structures?',
    answer:
      'Explain it like you\'re talking to a friend. Most people have heard of *"the seller carries the loan"* or *"owner financing"* — start there. Use a plain example: *"You\'d basically be the bank for part of the price. I\'d send you a payment every month, just like you\'d get from a CD."* Tell them a third-party loan servicing company handles everything — statements, collection, year-end tax forms. Mention that you\'d pay for a real estate attorney to draft the documents. The point is to make the unfamiliar feel safe, not to sound like an expert showing off.',
    source: 'Mastering §3.3, §5.4',
  },

  // ── Objection handling ──────────────────────────────────────────────
  {
    id: 'offer-too-low',
    category: 'objection_handling',
    question: 'What do I say when the seller says my offer is too low?',
    answer:
      'Don\'t argue. Don\'t defend the number right away. First, mirror back what they said: *"Too low?"* Then ask a question that gets to the real concern: *"Help me understand — is the issue the headline number, or is it the cash you walk away with at closing?"* That distinction matters a lot. If they need a certain amount of cash, you might reach their price by changing the structure — a small carry, a longer close. If it\'s the headline number itself, you know not to waste time on creative options. Find out what\'s actually driving the *"no"* before defending the *"yes."*',
    source: 'Mastering §5.2; Residential Framework §9',
  },
  {
    id: 'seller-wants-all-cash',
    category: 'objection_handling',
    question: 'What if the seller insists on all cash?',
    answer:
      'Reframe it as a choice, not an objection. Try: *"I get it — cash is straightforward. Here are two paths I can offer. Option 1 is cash today at $X — fast, certain, fewest contingencies. Option 2 is a higher price spread over time. Which one is closer to what you\'re trying to do?"* You\'re not pushing back on their preference; you\'re showing them the tradeoff between speed and price. Many sellers who say *"I need cash"* really mean *"I don\'t want complications."* Once they see Option 2 isn\'t actually complicated, they often consider it.',
    source: 'Mastering §3.4 (Two-Company Strategy)',
  },
  {
    id: 'another-offer-coming',
    category: 'objection_handling',
    question: 'What if they say they have another offer coming?',
    answer:
      'Don\'t compete on price right away. Try: *"That\'s good news — it means the market sees value here. What timeline is that buyer working with? Are they paying cash, or financing? Any inspection or appraisal contingencies?"* You\'re learning whether the other offer is real, and whether it\'s actually better than yours. Most competing offers in residential aren\'t apples-to-apples with a clean buyer. If the other side is financing with contingencies and a 60-day close, your faster, cleaner offer may still be the stronger one — even at a lower price.',
    source: 'Mastering §4.2 (Aikido method); Residential Framework §8',
  },

  // ── Tactics ─────────────────────────────────────────────────────────
  {
    id: 'silence-after-offer',
    category: 'tactics',
    question: 'Why should I stay silent after I make my offer?',
    answer:
      'Silence forces the other side to respond first — and their response usually contains useful information. After you state the number, count to seven internally. Don\'t justify it. Don\'t soften it. Don\'t explain how you got there. The seller will fill the silence, and what they say will tell you whether the number is workable, what they\'re really worried about, or whether they\'re going to counter. If you rush to defend the offer, you signal uncertainty and give them ammunition to push back. The discipline of the pause is worth more than any clever script.',
    source: 'Mastering §4.3 (derived from Chris Voss)',
  },
  {
    id: 'non-round-number',
    category: 'tactics',
    question: 'When should I use a non-round number?',
    answer:
      'Always — when you want to signal that the number was calculated, not pulled from the air. An offer of $437,500 lands differently than $440,000. The round number sounds like guesswork or a starting position; the precise number sounds like math. Sellers sense the difference. Use it especially on price reductions and counter-offers: *"My number is $437,500 — that\'s based on the comps, the condition, and the closing timeline."* It costs you nothing and adds credibility, because round numbers feel arbitrary while specific ones feel deliberate.',
    source: 'Mastering §5.6 (Lesix Agency framework)',
  },
  {
    id: 'recap-email-24hr',
    category: 'tactics',
    question: "What's the 24-hour recap email and why does it matter?",
    answer:
      'After every meaningful seller conversation, send a written recap within 24 hours. Cover what was discussed, what was agreed verbally, what\'s still open, and what happens next. Three reasons it matters. **Memory** — verbal agreements get forgotten; written ones don\'t. **Trust** — a clean recap signals professionalism and makes the seller comfortable continuing. **Momentum** — many deals stall because no one writes down the next step. Keep the recap short (under 200 words), don\'t oversell, and always include a line about attorney review if any creative finance was discussed.',
    source: 'Residential Framework §11; Mastering §6.3',
  },
]

/** Quick lookup: questions grouped by category, in display order. */
export function questionsByCategory(): Map<IQCategory, IQAnswer[]> {
  const map = new Map<IQCategory, IQAnswer[]>()
  for (const cat of IQ_CATEGORIES) {
    map.set(
      cat.id,
      IQ_KNOWLEDGE_BASE.filter((q) => q.category === cat.id),
    )
  }
  return map
}

/** Find a single Q&A by ID. */
export function findQuestion(id: string): IQAnswer | undefined {
  return IQ_KNOWLEDGE_BASE.find((q) => q.id === id)
}
