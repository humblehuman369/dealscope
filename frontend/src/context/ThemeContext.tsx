'use client'

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { ThemeMode, ThemePreference } from '@/lib/theme/constants'
import { readStoredThemePreference, writeStoredThemePreference } from '@/lib/theme/storage'
import { resolveTheme } from '@/lib/theme/resolveTheme'
import { resolveThemeTokens } from '@/theme/semantic-tokens'

interface ThemeContextType {
  theme: ThemeMode
  preference: ThemePreference
  toggleTheme: () => void
  setPreference: (preference: ThemePreference) => void
  setTheme: (preference: ThemePreference) => void
  mounted: boolean
  tokens: ReturnType<typeof resolveThemeTokens>
}

const MEDIA_QUERY = '(prefers-color-scheme: dark)'
const SYSTEM_DEFAULT: ThemePreference = 'system'

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(SYSTEM_DEFAULT)
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(MEDIA_QUERY)
    const storedPreference = readStoredThemePreference()
    const nextPreference = storedPreference ?? SYSTEM_DEFAULT
    const nextTheme = resolveTheme(nextPreference, mediaQuery.matches)

    setPreferenceState(nextPreference)
    setTheme(nextTheme)
    setMounted(true)

    const root = document.documentElement
    root.setAttribute('data-theme', nextTheme)
    root.classList.toggle('dark', nextTheme === 'dark')
    root.style.colorScheme = nextTheme
  }, [])

  useEffect(() => {
    if (!mounted) return

    const mediaQuery = window.matchMedia(MEDIA_QUERY)
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (preference !== 'system') return
      setTheme(event.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [preference, mounted])

  useEffect(() => {
    if (!mounted) return
    writeStoredThemePreference(preference)
  }, [preference, mounted])

  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
  }, [theme, mounted])

  const setPreference = (nextPreference: ThemePreference) => {
    const systemPrefersDark = window.matchMedia(MEDIA_QUERY).matches
    setPreferenceState(nextPreference)
    setTheme(resolveTheme(nextPreference, systemPrefersDark))
  }

  const toggleTheme = () => {
    setPreference(theme === 'dark' ? 'light' : 'dark')
  }

  const tokens = useMemo(() => resolveThemeTokens(theme), [theme])

  return (
    <ThemeContext.Provider value={{ theme, preference, toggleTheme, setPreference, setTheme: setPreference, mounted, tokens }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}


