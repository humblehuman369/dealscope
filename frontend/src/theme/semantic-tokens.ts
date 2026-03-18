export type ThemeMode = 'dark' | 'light'

type ThemeValue<T extends string = string> = {
  dark: T
  light: T
}

export const semanticTokens = {
  surface: {
    base: { dark: '#000000', light: '#F0FBFF' },
    section: { dark: '#060B14', light: '#F0F9FE' },
    card: { dark: '#0C1220', light: '#FFFFFF' },
    cardHover: { dark: '#101828', light: '#F1F5F9' },
    elevated: { dark: '#101828', light: '#F1F5F9' },
    input: { dark: '#0C1220', light: '#F8FAFC' },
    overlay: { dark: 'rgba(0,0,0,0.8)', light: 'rgba(0,0,0,0.5)' },
  },
  text: {
    heading: { dark: '#F1F5F9', light: '#07172e' },
    body: { dark: '#CBD5E1', light: '#334155' },
    secondary: { dark: '#94A3B8', light: '#475569' },
    label: { dark: '#7C8CA0', light: '#64748B' },
    inverse: { dark: '#000000', light: '#FFFFFF' },
    link: { dark: '#0EA5E9', light: '#0284C7' },
  },
  accent: {
    brandBlue: { dark: '#0465f2', light: '#0455d1' },
    sky: { dark: '#0EA5E9', light: '#0284C7' },
    skyLight: { dark: '#38bdf8', light: '#0EA5E9' },
    brandGradientFrom: { dark: '#0465f2', light: '#0455d1' },
    brandGradientTo: { dark: '#0EA5E9', light: '#0284C7' },
  },
  status: {
    positive: { dark: '#34d399', light: '#059669' },
    warning: { dark: '#fbbf24', light: '#D97706' },
    negative: { dark: '#f87171', light: '#DC2626' },
    info: { dark: '#38bdf8', light: '#0284C7' },
    incomeValue: { dark: '#FACC15', light: '#CA8A04' },
  },
  strategy: {
    ltr: { dark: '#0465f2', light: '#0455d1' },
    str: { dark: '#8b5cf6', light: '#7C3AED' },
    brrrr: { dark: '#f97316', light: '#EA580C' },
    fixAndFlip: { dark: '#ec4899', light: '#DB2777' },
    houseHack: { dark: '#0EA5E9', light: '#0284C7' },
    wholesale: { dark: '#84cc16', light: '#65A30D' },
  },
  border: {
    subtle: { dark: 'rgba(14,165,233,0.25)', light: '#E2E8F0' },
    default: { dark: '#334155', light: '#CBD5E1' },
    strong: { dark: '#475569', light: '#94A3B8' },
    focus: { dark: '#0EA5E9', light: '#0284C7' },
  },
  shadow: {
    card: { dark: '0 0 20px rgba(14,165,233,0.15)', light: '0 2px 8px rgba(0,0,0,0.08)' },
    cardHover: { dark: '0 0 30px rgba(14,165,233,0.25)', light: '0 4px 16px rgba(0,0,0,0.12)' },
    dropdown: { dark: '0 4px 12px rgba(0,0,0,0.5)', light: '0 4px 12px rgba(0,0,0,0.15)' },
  },
  chart: {
    grid: { dark: '#1E293B', light: '#E2E8F0' },
    axis: { dark: '#94A3B8', light: '#64748B' },
    tooltip: { dark: '#0C1220', light: '#FFFFFF' },
    tooltipText: { dark: '#F1F5F9', light: '#07172e' },
  },
} as const

type TokenTree = typeof semanticTokens

type FlattenTokenPaths<T, Prefix extends string = ''> = {
  [K in keyof T]: T[K] extends ThemeValue
    ? `${Prefix}${Extract<K, string>}`
    : T[K] extends Record<string, unknown>
      ? FlattenTokenPaths<T[K], `${Prefix}${Extract<K, string>}.`>
      : never
}[keyof T]

export type SemanticTokenPath = FlattenTokenPaths<TokenTree>

export function resolveThemeTokens(mode: ThemeMode): Record<SemanticTokenPath, string> {
  const entries: Array<[string, string]> = []

  const walk = (node: Record<string, unknown>, path: string[]) => {
    Object.entries(node).forEach(([key, value]) => {
      const nextPath = [...path, key]
      if (value && typeof value === 'object' && 'dark' in value && 'light' in value) {
        const themeValue = value as ThemeValue
        entries.push([nextPath.join('.'), themeValue[mode]])
        return
      }

      if (value && typeof value === 'object') {
        walk(value as Record<string, unknown>, nextPath)
      }
    })
  }

  walk(semanticTokens as unknown as Record<string, unknown>, [])
  return Object.fromEntries(entries) as Record<SemanticTokenPath, string>
}

