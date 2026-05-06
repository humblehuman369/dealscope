export type ThemeMode = 'dark' | 'light'

type ThemeValue<T extends string = string> = {
  dark: T
  light: T
}

export const semanticTokens = {
  surface: {
    base: { dark: '#000000', light: 'color-mix(in srgb, #0fa4e9 5%, #ffffff)' },
    section: { dark: '#060B14', light: '#ffffff' },
    card: { dark: '#000000', light: '#ffffff' },
    cardHover: { dark: '#0C1220', light: '#eef4ff' },
    elevated: { dark: '#0C1220', light: '#eef4ff' },
    input: { dark: '#0C1220', light: '#ffffff' },
    overlay: { dark: 'rgba(0,0,0,0.8)', light: 'rgba(7,23,46,0.45)' },
  },
  text: {
    heading: { dark: '#F1F5F9', light: '#18201c' },
    body: { dark: '#CBD5E1', light: '#18201c' },
    secondary: { dark: '#94A3B8', light: '#6f756d' },
    label: { dark: '#7C8CA0', light: '#6f756d' },
    muted: { dark: '#64748B', light: '#aab2bd' },
    inverse: { dark: '#000000', light: '#ffffff' },
    link: { dark: '#0FA4E9', light: '#0465f2' },
  },
  accent: {
    brandBlue: { dark: '#0465f2', light: '#0465f2' },
    sky: { dark: '#0FA4E9', light: '#0465f2' },
    skyLight: { dark: '#38bdf8', light: '#0354d1' },
    brandGradientFrom: { dark: '#0465f2', light: '#0465f2' },
    brandGradientTo: { dark: '#0FA4E9', light: '#0354d1' },
  },
  status: {
    positive: { dark: '#34d399', light: '#0465f2' },
    warning: { dark: '#fbbf24', light: '#b7791f' },
    negative: { dark: '#f87171', light: '#b42318' },
    info: { dark: '#38bdf8', light: '#0465f2' },
    incomeValue: { dark: '#FACC15', light: '#b7791f' },
  },
  strategy: {
    ltr: { dark: '#0465f2', light: '#0465f2' },
    str: { dark: '#8b5cf6', light: '#6d28d9' },
    brrrr: { dark: '#f97316', light: '#c2410c' },
    fixAndFlip: { dark: '#ec4899', light: '#be185d' },
    houseHack: { dark: '#14b8a6', light: '#0f766e' },
    wholesale: { dark: '#84cc16', light: '#4d7c0f' },
  },
  border: {
    subtle: { dark: 'rgba(15,164,233,0.25)', light: '#e1e8ed' },
    default: { dark: '#334155', light: '#aab2bd' },
    strong: { dark: '#475569', light: '#6f756d' },
    focus: { dark: '#0FA4E9', light: '#0465f2' },
  },
  shadow: {
    card: {
      dark: '0 0 20px rgba(15,164,233,0.15)',
      light: '0 1px 2px rgba(24, 32, 28, 0.04), 0 4px 12px rgba(4, 101, 242, 0.08)',
    },
    cardHover: {
      dark: '0 0 30px rgba(15,164,233,0.25)',
      light: '0 4px 16px rgba(24, 32, 28, 0.08), 0 2px 8px rgba(4, 101, 242, 0.12)',
    },
    dropdown: {
      dark: '0 4px 12px rgba(0,0,0,0.5)',
      light: '0 10px 25px rgba(24, 32, 28, 0.1), 0 4px 10px rgba(24, 32, 28, 0.06)',
    },
  },
  chart: {
    grid: { dark: '#1E293B', light: '#e1e8ed' },
    axis: { dark: '#94A3B8', light: '#6f756d' },
    tooltip: { dark: '#0C1220', light: '#07172e' },
    tooltipText: { dark: '#F1F5F9', light: '#e1e8ed' },
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
