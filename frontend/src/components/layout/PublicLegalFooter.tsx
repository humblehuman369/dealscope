'use client'

import Link from 'next/link'

import { LEGAL_ENTITY_DBA, LEGAL_ENTITY_NAME } from '@/lib/brand'
import { shouldShowPublicLegalFooter } from '@/lib/publicLegalFooter'
import { useAppPathname } from '@/hooks/useAppNavigation'

const linkClass = 'hover:text-[var(--text-secondary)] transition-colors'

export function PublicLegalFooter() {
  const pathname = useAppPathname()
  if (!shouldShowPublicLegalFooter(pathname)) return null

  return (
    <footer
      className="border-t border-[var(--border-default)] bg-[var(--surface-base)] px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center text-xs leading-relaxed text-[var(--text-muted)]"
      role="contentinfo"
    >
      <p className="text-[var(--text-secondary)]">
        {LEGAL_ENTITY_NAME} d/b/a DealGapIQ. DealGapIQ is a trade name of {LEGAL_ENTITY_NAME}.
      </p>
      <p className="mt-1">
        <a className={linkClass} href="mailto:support@dealgapiq.com">
          support@dealgapiq.com
        </a>
        {' · '}
        <a className={linkClass} href="tel:+18663888222">
          (866) 388-8222
        </a>
      </p>
      <p className="mt-2">© {new Date().getFullYear()} {LEGAL_ENTITY_DBA}. All rights reserved.</p>
      <nav className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1" aria-label="Legal">
        <Link className={linkClass} href="/legal">
          Legal entity
        </Link>
        <Link className={linkClass} href="/privacy">
          Privacy
        </Link>
        <Link className={linkClass} href="/terms">
          Terms
        </Link>
        <Link className={linkClass} href="/disclosures">
          Disclosures
        </Link>
      </nav>
    </footer>
  )
}
