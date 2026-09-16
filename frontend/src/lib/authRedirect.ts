export const AUTH_REDIRECT_STORAGE_KEY = 'dgiq_auth_redirect'

export function isSameOriginPath(path: string | null | undefined): path is string {
  return !!path && path.startsWith('/') && !path.startsWith('//')
}

/** Current page minus stale auth params — keeps `address=` for quota-gate signup. */
export function defaultAuthRedirect(pathname: string, search: string): string {
  const currentParams = new URLSearchParams(search)
  currentParams.delete('auth')
  currentParams.delete('redirect')
  const cleanSearch = currentParams.toString()
  return cleanSearch ? `${pathname}?${cleanSearch}` : pathname
}

export function persistAuthRedirect(path: string | null | undefined): void {
  if (typeof window === 'undefined' || !isSameOriginPath(path)) return
  try {
    sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, path)
  } catch {
    /* private browsing / quota */
  }
}

export function readAuthRedirect(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY)
    return isSameOriginPath(value) ? value : null
  } catch {
    return null
  }
}

export function clearAuthRedirect(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function consumeAuthRedirect(): string | null {
  const value = readAuthRedirect()
  if (value) clearAuthRedirect()
  return value
}

export function oauthWebStartUrl(provider: 'google' | 'apple', next?: string | null): string {
  const params = new URLSearchParams()
  if (isSameOriginPath(next)) params.set('next', next)
  const qs = params.toString()
  return qs ? `/api/v1/auth/${provider}?${qs}` : `/api/v1/auth/${provider}`
}
