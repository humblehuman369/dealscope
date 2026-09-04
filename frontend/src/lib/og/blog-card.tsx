import fs from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'

/**
 * Social-card renderer for blog URLs. Runs server-side through Satori, which
 * has no access to CSS variables, so brand colors are fixed here on purpose
 * (registered in docs/theme-surface-exceptions.md alongside the PDF renderer).
 */
export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

const COLORS = {
  background: '#050A14',
  panel: '#0C1220',
  border: '#1E293B',
  heading: '#F8FAFC',
  body: '#CBD5E1',
  muted: '#7C8CA0',
  accent: '#0FA4E9',
}

let logoCache: string | null = null

async function loadLogo(): Promise<string | null> {
  if (logoCache) return logoCache
  try {
    const file = await fs.readFile(
      path.join(process.cwd(), 'public', 'brand', 'Logo', 'Transparent', 'DealGapIQ_Logo_OnDark.png'),
    )
    logoCache = `data:image/png;base64,${file.toString('base64')}`
    return logoCache
  } catch {
    return null
  }
}

function clamp(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`
}

export type BlogCardProps = {
  title: string
  eyebrow?: string
  footer?: string
  author?: string
  readTime?: string
}

export async function renderBlogCard({ title, eyebrow, footer, author, readTime }: BlogCardProps) {
  const logo = await loadLogo()
  const titleSize = title.length > 70 ? 52 : title.length > 40 ? 60 : 72

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: `radial-gradient(ellipse at top left, rgba(15,164,233,0.22), transparent 55%), ${COLORS.background}`,
          color: COLORS.heading,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" width={220} height={62} style={{ objectFit: 'contain' }} />
          ) : (
            <div style={{ fontSize: 32, fontWeight: 700 }}>DealGapIQ</div>
          )}
          {eyebrow && (
            <div
              style={{
                display: 'flex',
                padding: '10px 18px',
                borderRadius: 999,
                border: `1px solid ${COLORS.border}`,
                background: COLORS.panel,
                color: COLORS.accent,
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {eyebrow}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: titleSize, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.5 }}>
            {clamp(title, 110)}
          </div>
          {(author || readTime) && (
            <div style={{ display: 'flex', gap: 16, fontSize: 24, color: COLORS.body }}>
              {author && <span>By {author}</span>}
              {author && readTime && <span style={{ color: COLORS.muted }}>·</span>}
              {readTime && <span>{readTime}</span>}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 24,
            borderTop: `1px solid ${COLORS.border}`,
            fontSize: 22,
            color: COLORS.muted,
          }}
        >
          <span>{footer ?? 'dealgapiq.com/blog'}</span>
          <span style={{ color: COLORS.accent, fontWeight: 700 }}>The price tag isn&apos;t the deal. The structure is.</span>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  )
}
