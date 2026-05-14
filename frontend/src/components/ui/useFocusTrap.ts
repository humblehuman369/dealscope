'use client'

import { useEffect } from 'react'

/**
 * Trap keyboard focus inside a container element.
 *
 * When `active` is true and `containerRef` resolves, Tab/Shift+Tab cycle
 * focus among the container's focusable descendants — preventing focus
 * from escaping into the rest of the document while a modal/dialog/sheet
 * is open. Required for WCAG-compliant modal accessibility.
 *
 * Implementation notes:
 *   - Focus query is computed once per `active` toggle. If the modal's
 *     contents change shape mid-open and you need the new descendants
 *     trappable, re-mount the modal or toggle `active` off and on.
 *   - Listener is attached to the container, not the window, so multiple
 *     stacked modals each trap their own scope.
 *
 * Usage:
 *   const panelRef = useRef<HTMLDivElement>(null)
 *   useFocusTrap(panelRef, isOpen)
 *   return <div ref={panelRef}>...</div>
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active || !containerRef.current) return
    const el = containerRef.current
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    el.addEventListener('keydown', handler)
    return () => el.removeEventListener('keydown', handler)
  }, [containerRef, active])
}
