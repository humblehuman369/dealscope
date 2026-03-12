import { ThemeMode, ThemePreference } from './constants'

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ThemeMode {
  if (preference === 'system') {
    return systemPrefersDark ? 'dark' : 'light'
  }

  return preference
}

