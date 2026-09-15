'use client'

import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { DealStructuresPayload } from '@/components/iq-verdict/PathOptionCard'
import {
  buildHowThisClosesRows,
  howThisClosesParagraph,
  startHereRowId,
  type LeverTag,
} from '@/lib/leverTags'
import { V1_CARD } from '@/components/workflow/v1-style'

export interface HowThisClosesProps {
  payload: DealStructuresPayload
}

const TAG_COLOR: Record<LeverTag['tone'], string> = {
  yes: 'var(--status-positive)',
  partly: 'var(--status-warning)',
  often: 'var(--status-positive)',
  sometimes: 'var(--status-warning)',
  rarely: 'var(--status-negative)',
  decide: 'var(--text-body)',
}

function Tag({ tag }: { tag: LeverTag }) {
  return (
    <span
      className="inline-flex items-center text-[13px] leading-snug"
      style={{
        padding: '3px 10px',
        borderRadius: 9999,
        border: '1px solid var(--border-default)',
        color: TAG_COLOR[tag.tone],
        whiteSpace: 'nowrap',
      }}
    >
      {tag.text}
    </span>
  )
}

export function HowThisCloses({ payload }: HowThisClosesProps) {
  const rows = buildHowThisClosesRows(payload)
  const headingId = useId()
  const [openId, setOpenId] = useState<string | null>(() => startHereRowId(rows))

  if (rows.length === 0) return null

  const paragraph = howThisClosesParagraph(payload)

  return (
    <article
      aria-labelledby={headingId}
      className="rounded-2xl px-3 sm:px-5 py-6"
      style={V1_CARD}
    >
      <h2
        id={headingId}
        className="m-0 mb-3 text-[16px] font-semibold"
        style={{ color: 'var(--text-heading)' }}
      >
        How this closes
      </h2>
      <p
        className="m-0 mb-4 text-[15px] leading-relaxed"
        style={{ color: 'var(--text-body)' }}
      >
        {paragraph}
      </p>
      <div>
        {rows.map((row) => {
          const expanded = openId === row.id
          const panelId = `how-closes-${row.id}`
          return (
            <div
              key={row.id}
              style={
                row.startHere
                  ? {
                      background: expanded ? 'rgba(14,165,233,0.06)' : 'transparent',
                      borderRadius: 12,
                      padding: '0 12px',
                      marginTop: 6,
                      border: '1px solid color-mix(in srgb, var(--accent-sky) 25%, transparent)',
                    }
                  : { borderTop: '1px solid var(--border-default)' }
              }
            >
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpenId((prev) => (prev === row.id ? null : row.id))}
                className="flex w-full flex-wrap items-center gap-2.5 text-left min-h-11 py-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: 'transparent',
                  border: 'none',
                  paddingLeft: 0,
                  paddingRight: 0,
                  outlineColor: 'var(--accent-sky)',
                }}
              >
                <span
                  className="w-[84px] shrink-0 text-[15px] font-semibold"
                  style={{ color: row.startHere ? 'var(--accent-sky)' : 'var(--text-heading)' }}
                >
                  {row.name}
                </span>
                {row.closesTag ? <Tag tag={row.closesTag} /> : null}
                {row.confidenceTag ? <Tag tag={row.confidenceTag} /> : null}
                {row.startHere ? (
                  <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                    Start here
                  </span>
                ) : null}
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className="ml-auto shrink-0"
                  style={{
                    color: 'var(--text-secondary)',
                    transform: expanded ? 'rotate(180deg)' : 'none',
                  }}
                />
              </button>
              {expanded && row.detail ? (
                <p
                  id={panelId}
                  className="m-0 pb-3 text-[14px] leading-relaxed"
                  style={{ color: 'var(--text-secondary)', paddingLeft: 0 }}
                >
                  {row.detail}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    </article>
  )
}
