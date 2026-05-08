/**
 * Activation Arc Phase 5 (N5) — 24-hour recap email body generator.
 *
 * Pure helper that drafts the recap email after a meaningful seller call.
 * The doctrine (from IQ_KB_V1_CONTENT.md Q12 and Residential Framework §11):
 *   - Under 200 words
 *   - What was discussed, agreed verbally, still open, next step
 *   - Attorney-review line included automatically when creative finance
 *     was discussed (financing / strategy_switch / blended families)
 *   - Don't oversell
 *
 * The user reviews and edits the draft before sending — this never auto-sends.
 */

import type { DealStructure } from '@/components/iq-verdict/FourPathsPanel'

const CREATIVE_FAMILIES = new Set([
  'financing',
  'strategy_switch',
  'blended',
])

export interface RecapEmailDraft {
  subject: string
  body: string
}

export function buildRecapEmailDraft(opts: {
  structure: DealStructure
  propertyAddress?: string | null
  /** Optional one-line note the user typed describing what was discussed. */
  callNote?: string | null
}): RecapEmailDraft {
  const { structure, propertyAddress, callNote } = opts

  const isCreative = CREATIVE_FAMILIES.has(structure.family)

  const subject = propertyAddress
    ? `Following up — ${propertyAddress}`
    : 'Following up on our conversation'

  const lines: string[] = []
  lines.push('Hi,')
  lines.push('')
  lines.push(
    propertyAddress
      ? `Thanks for the conversation about ${propertyAddress}. Quick recap so we both have it in writing.`
      : 'Thanks for the conversation today. Quick recap so we both have it in writing.',
  )
  lines.push('')

  // What was discussed
  lines.push('What we discussed:')
  if (callNote && callNote.trim()) {
    lines.push(`- ${callNote.trim()}`)
  } else {
    lines.push(`- ${structure.headline}`)
    if (structure.summary) lines.push(`- ${structure.summary}`)
  }
  lines.push('')

  // Open items / next step
  lines.push('Next step:')
  lines.push("- I'll put a written offer together based on what we covered and send it over within 24–48 hours.")
  lines.push('- If anything I summarized above is off, please reply with corrections — I want us aligned before paper goes out.')
  lines.push('')

  // Attorney review when creative finance is involved
  if (isCreative) {
    lines.push(
      "One note: because the structure we discussed includes creative-finance terms, I'll have everything reviewed by a real estate attorney before signing. I'd recommend you do the same.",
    )
    lines.push('')
  }

  lines.push('Talk soon,')
  lines.push('[Your name]')

  const body = lines.join('\n')
  return { subject, body }
}
