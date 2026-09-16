'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export interface VerifyCodeInputProps {
  onComplete: (code: string) => void
  pending: boolean
  error: string | null
  locked: boolean
  disabled?: boolean
}

/**
 * One 6-digit field — same pattern as MFA on the login form.
 * Auto-submits when six digits are in. Paste of a 6-digit string works.
 */
export function VerifyCodeInput({
  onComplete,
  pending,
  error,
  locked,
  disabled = false,
}: VerifyCodeInputProps): ReactNode {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const submittedRef = useRef<string | null>(null)

  const apply = (next: string) => {
    const digits = next.replace(/\D/g, '').slice(0, 6)
    setValue(digits)
    if (digits.length === 6 && submittedRef.current !== digits && !pending && !locked) {
      submittedRef.current = digits
      onComplete(digits)
    }
  }

  return (
    <div className="w-full">
      <label
        htmlFor="email-verify-code"
        style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-body)',
          marginBottom: 8,
        }}
      >
        Or type the code from the email
      </label>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          id="email-verify-code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="one-time-code"
          autoFocus
          value={value}
          onChange={(e) => apply(e.target.value)}
          disabled={pending || locked || disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'email-verify-code-error' : undefined}
          placeholder="000000"
          className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] rounded-xl focus:outline-none focus-visible:ring-2"
          style={{
            background: 'var(--surface-elevated)',
            border: `1px solid ${error ? 'var(--status-negative)' : 'var(--border-default)'}`,
            color: 'var(--text-heading)',
            fontVariantNumeric: 'tabular-nums',
            opacity: pending || locked || disabled ? 0.7 : 1,
          }}
        />
        {pending && (
          <Loader2
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
            size={18}
            style={{ color: 'var(--accent-sky)' }}
            aria-label="Verifying code"
          />
        )}
      </div>
      {error && (
        <p
          id="email-verify-code-error"
          role="alert"
          style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--status-negative)' }}
        >
          {error}
        </p>
      )}
    </div>
  )
}
