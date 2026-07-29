'use client'

import { directoryBaseStyles, directoryTokens } from './directoryStyles'

const BAR = { background: directoryTokens.surfaceElevated, borderRadius: 999 } as const

/** Placeholder cards shown while a directory page is in flight. */
export function DirectoryCardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="dgiq-directory-card"
          style={{ ...directoryBaseStyles.card, minHeight: 280, opacity: 0.55 }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 10, background: directoryTokens.surfaceElevated, marginBottom: 16 }} />
          <div style={{ ...BAR, height: 16, width: '60%', marginBottom: 10 }} />
          <div style={{ ...BAR, height: 12, width: '40%', marginBottom: 20 }} />
          <div style={{ height: 64, background: directoryTokens.surfaceElevated, borderRadius: 8, marginBottom: 16 }} />
          <div style={{ height: 44, background: directoryTokens.surfaceElevated, borderRadius: 8 }} />
        </div>
      ))}
    </>
  )
}
