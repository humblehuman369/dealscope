'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Default to light mode - dark mode is disabled for now
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // Always use light mode - ignore localStorage
  useEffect(() => {
    setThemeState('light')
    setMounted(true)
  }, [])

  // Ensure dark class is never on the html element
  useEffect(() => {
    if (!mounted) return
    
    const root = document.documentElement
    // Always remove dark class - light mode only
    root.classList.remove('dark')
  }, [mounted])

  // Theme toggle is disabled - always returns light
  const toggleTheme = () => {
    // No-op: dark mode is disabled
  }

  const setTheme = (newTheme: Theme) => {
    // No-op: dark mode is disabled, always stay on light
  }

  // Always render children - don't block rendering
  // The mounted flag is exposed so components can handle hydration mismatch if needed
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, mounted }}>
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


