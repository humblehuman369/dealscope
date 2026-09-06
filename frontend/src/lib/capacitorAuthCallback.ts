/**
 * Parse Capacitor OAuth / magic-link URLs and complete the native token exchange.
 *
 * The backend redirects to `dealgapiq://auth/callback?code=…` (one-time code).
 * Tokens are never accepted from the URL.
 */

export type ParsedCapacitorAuthUrl =
  | { type: 'magic'; token: string | null; next: string | null }
  | { type: 'oauth-error'; error: string }
  | { type: 'oauth-code'; code: string }
  | { type: 'ignored' }

export type OAuthExchangeTokens = {
  access_token: string
  refresh_token?: string
}

export function parseCapacitorAuthUrl(url: string): ParsedCapacitorAuthUrl {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { type: 'ignored' }
  }

  const isMagicPath =
    parsed.pathname === '/auth/magic' ||
    (parsed.protocol === 'dealgapiq:' && parsed.hostname === 'auth' && parsed.pathname === '/magic')
  if (isMagicPath) {
    return {
      type: 'magic',
      token: parsed.searchParams.get('token'),
      next: parsed.searchParams.get('next'),
    }
  }

  const isOauthCallback =
    parsed.protocol === 'dealgapiq:' && parsed.hostname === 'auth' && parsed.pathname === '/callback'
  if (!isOauthCallback) {
    return { type: 'ignored' }
  }

  const error = parsed.searchParams.get('error')
  if (error) {
    return { type: 'oauth-error', error }
  }

  const code = parsed.searchParams.get('code')
  if (code) {
    return { type: 'oauth-code', code }
  }

  return { type: 'ignored' }
}

export async function exchangeCapacitorOauthCode(
  code: string,
  exchange: (code: string) => Promise<OAuthExchangeTokens>,
): Promise<OAuthExchangeTokens> {
  return exchange(code)
}
