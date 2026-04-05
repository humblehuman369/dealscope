export type ThemeMode = 'dark' | 'light'

type ThemeValue<T extends string = string> = {
  dark: T
  light: T
}

export const semanticTokens = {
  surface: {
    base: { dark: '#000000', light: '#EAEEF3' },
    section: { dark: '#060B14', light: '#F1F4F8' },
    card: { dark: '#0C1220', light: '#FFFFFF' },
    cardHover: { dark: '#101828', light: '#F5F7FA' },
    elevated: { dark: '#101828', light: '#F8FAFC' },
    input: { dark: '#0C1220', light: '#FFFFFF' },
    overlay: { dark: 'rgba(0,0,0,0.8)', light: 'rgba(0,0,0,0.5)' },
  },
  text: {
    heading: { dark: '#F1F5F9', light: '#000000' },
    body: { dark: '#CBD5E1', light: '#1E293B' },
    secondary: { dark: '#94A3B8', light: '#334155' },
    label: { dark: '#7C8CA0', light: '#475569' },
    muted: { dark: '#64748B', light: '#64748B' },
    inverse: { dark: '#000000', light: '#FFFFFF' },
    link: { dark: '#0EA5E9', light: '#0284C7' },
  },
  accent: {
    brandBlue: { dark: '#0465f2', light: '#0052CC' },
    sky: { dark: '#0EA5E9', light: '#0284C7' },
    skyLight: { dark: '#38bdf8', light: '#0EA5E9' },
    brandGradientFrom: { dark: '#0465f2', light: '#0052CC' },
    brandGradientTo: { dark: '#0EA5E9', light: '#0284C7' },
  },
  status: {
    positive: { dark: '#34d399', light: '#059669' },
    warning: { dark: '#fbbf24', light: '#D97706' },
    negative: { dark: '#f87171', light: '#DC2626' },
    info: { dark: '#38bdf8', light: '#0284C7' },
    incomeValue: { dark: '#FACC15', light: '#A16207' },
  },
  strategy: {
    ltr: { dark: '#0465f2', light: '#0344A6' },
    str: { dark: '#8b5cf6', light: '#6D28D9' },
    brrrr: { dark: '#f97316', light: '#C2410C' },
    fixAndFlip: { dark: '#ec4899', light: '#BE185D' },
    houseHack: { dark: '#0EA5E9', light: '#0369A1' },
    wholesale: { dark: '#84cc16', light: '#4D7C0F' },
  },
  border: {
    subtle: { dark: 'rgba(14,165,233,0.25)', light: '#D5DBE4' },
    default: { dark: '#334155', light: '#B8C4CE' },
    strong: { dark: '#475569', light: '#8896A6' },
    focus: { dark: '#0EA5E9', light: '#0284C7' },
  },
  shadow: {
    card: { dark: '0 0 20px rgba(14,165,233,0.15)', light: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' },
    cardHover: { dark: '0 0 30px rgba(14,165,233,0.25)', light: '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)' },
    dropdown: { dark: '0 4px 12px rgba(0,0,0,0.5)', light: '0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.06)' },
  },
  chart: {
    grid: { dark: '#1E293B', light: '#D5DBE4' },
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

