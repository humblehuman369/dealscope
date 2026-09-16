export const LAST_PROPERTY_PATH_KEY = 'dgiq_last_property_path'
export const PRO_WELCOME_PENDING_KEY = 'dgiq_pro_welcome_pending'
export const PRO_WELCOME_SEEN_KEY = 'dgiq_pro_welcome_seen'

export function isSameOriginPath(path: string | null | undefined): path is string {
  return !!path && path.startsWith('/') && !path.startsWith('//')
}

function pathAndQuery(path: string): { pathname: string; search: string } {
  const cut = path.indexOf('?')
  if (cut === -1) return { pathname: path, search: '' }
  return { pathname: path.slice(0, cut), search: path.slice(cut + 1) }
}

export function isBareAddressPath(path: string): boolean {
  const { pathname, search } = pathAndQuery(path)
  const p = pathname.toLowerCase()
  if (p !== '/discovery' && p !== '/property' && p !== '/strategy' && !p.startsWith('/property/')) {
    return false
  }
  const params = new URLSearchParams(search)
  return !params.get('address') && !params.get('propertyId')
}

export function rememberPropertyPath(path: string): void {
  if (typeof window === 'undefined' || !isSameOriginPath(path)) return
  if (isBareAddressPath(path)) return
  const { pathname } = pathAndQuery(path)
  if (pathname !== '/discovery' && pathname !== '/property' && !pathname.startsWith('/property/')) {
    return
  }
  try {
    sessionStorage.setItem(LAST_PROPERTY_PATH_KEY, path)
  } catch {
    /* private browsing */
  }
}

export function readLastPropertyPath(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = sessionStorage.getItem(LAST_PROPERTY_PATH_KEY)
    return isSameOriginPath(value) && !isBareAddressPath(value) ? value : null
  } catch {
    return null
  }
}

/** `/` and bare discovery/property URLs are not destinations. */
export function resolveCheckoutReturnTo(returnTo?: string | null): string {
  if (isSameOriginPath(returnTo) && returnTo !== '/' && !isBareAddressPath(returnTo)) {
    return returnTo
  }
  return readLastPropertyPath() ?? '/search'
}

export function withProWelcome(path: string): string {
  const { pathname, search } = pathAndQuery(path)
  const params = new URLSearchParams(search)
  params.set('welcome', 'pro')
  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : `${pathname}?welcome=pro`
}

export function markProWelcomePending(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PRO_WELCOME_PENDING_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function consumeProWelcome(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (localStorage.getItem(PRO_WELCOME_SEEN_KEY) === '1') return false
    const pending = localStorage.getItem(PRO_WELCOME_PENDING_KEY) === '1'
    if (pending) localStorage.removeItem(PRO_WELCOME_PENDING_KEY)
    return pending
  } catch {
    return false
  }
}

export function markProWelcomeSeen(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PRO_WELCOME_SEEN_KEY, '1')
    localStorage.removeItem(PRO_WELCOME_PENDING_KEY)
  } catch {
    /* ignore */
  }
}
