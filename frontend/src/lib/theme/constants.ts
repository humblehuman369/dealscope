export const THEME_STORAGE_KEY = 'dealgapiq-theme-preference'

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const

export type ThemeMode = 'light' | 'dark'
export type ThemePreference = ThemeMode | 'system'

