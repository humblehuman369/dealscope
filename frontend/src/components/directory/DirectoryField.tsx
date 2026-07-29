'use client'

import type { ReactNode } from 'react'

import { directoryBaseStyles, directoryTokens } from './directoryStyles'

export interface DirectoryFieldHint {
  /** Wire to the control's aria-describedby so the hint is announced. */
  id: string
  text: string
  tone: 'neutral' | 'error'
}

export function DirectoryField({
  label,
  controlId,
  icon,
  hint,
  children,
}: {
  label: string
  /** Must match the `id` on the input or select passed as children. */
  controlId: string
  icon?: ReactNode
  hint?: DirectoryFieldHint | null
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={controlId} style={directoryBaseStyles.fieldLabel}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {icon && <span style={directoryBaseStyles.fieldIcon}>{icon}</span>}
        {children}
      </div>
      {hint && (
        <div
          id={hint.id}
          role="status"
          style={{
            ...directoryBaseStyles.fieldHint,
            color: hint.tone === 'error' ? 'var(--status-negative)' : directoryTokens.accent,
          }}
        >
          {hint.text}
        </div>
      )}
    </div>
  )
}
