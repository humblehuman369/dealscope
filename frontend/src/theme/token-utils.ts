import { resolveThemeTokens, ThemeMode } from './semantic-tokens'

function tokenPathToCssVar(path: string): string {
  return `--${path.replace(/\./g, '-')}`
}

export function flattenTokensToCssVars(tokensForOneTheme: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tokensForOneTheme).map(([path, value]) => [tokenPathToCssVar(path), value]),
  )
}

export function getThemeCssVars(mode: ThemeMode): Record<string, string> {
  return flattenTokensToCssVars(resolveThemeTokens(mode))
}

