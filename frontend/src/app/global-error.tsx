'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/browser'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Global Error Boundary
 *
 * This catches errors in the root layout itself.
 * It must define its own <html> and <body> tags because the root layout
 * is replaced when this error boundary is triggered.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      Sentry.captureException(error)
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('Global application error:', error)
    }
  }, [error])

  return (
    <html lang="en">
      <body className="bg-[var(--surface-base)] text-[var(--text-body)] min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md">
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl shadow-lg p-8 text-center">
            {/* Error Icon */}
            <div
              style={{
                width: '4rem',
                height: '4rem',
                margin: '0 auto 1.5rem',
                borderRadius: '50%',
                backgroundColor: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            {/* Error Title */}
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#1e293b',
                marginBottom: '0.5rem',
              }}
            >
              Something went wrong
            </h1>

            {/* Error Message */}
            <p
              style={{
                color: '#64748b',
                marginBottom: '1.5rem',
                lineHeight: 1.5,
              }}
            >
              We encountered an unexpected error. We apologize for the inconvenience.
            </p>

            {/* Error Details (development only) */}
            {process.env.NODE_ENV === 'development' && error.message && (
              <div
                style={{
                  marginBottom: '1.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '0.5rem',
                  textAlign: 'left',
                }}
              >
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    color: '#475569',
                    wordBreak: 'break-all',
                    margin: 0,
                  }}
                >
                  {error.message}
                </p>
                {error.digest && (
                  <p
                    style={{
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      color: '#94a3b8',
                      marginTop: '0.25rem',
                      margin: '0.25rem 0 0 0',
                    }}
                  >
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <button
                onClick={reset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1rem',
                  backgroundColor: 'var(--accent-sky)',
                  color: '#ffffff',
                  fontWeight: 500,
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0284c7')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-sky)')}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                Try Again
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error replaces the entire HTML shell; next/link is unavailable */}
              <a
                href="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1rem',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  fontWeight: 500,
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  textDecoration: 'none',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9,22 9,12 15,12 15,22" />
                </svg>
                Return Home
              </a>
            </div>
          </div>

          {/* Help Text */}
          <p
            style={{
              textAlign: 'center',
              fontSize: '0.75rem',
              color: '#94a3b8',
              marginTop: '1rem',
            }}
          >
            If this problem persists, please contact support.
          </p>
        </div>
      </body>
    </html>
  )
}
