import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark'

/**
 * Hook for managing theme switching using data-theme attribute
 * The html element's data-theme attribute controls all CSS variables
 * Uses localStorage for persistence
 */
export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    const initialTheme = stored || 'dark'
    
    setTheme(initialTheme)
    applyTheme(initialTheme)
    setMounted(true)
  }, [])

  const applyTheme = (newTheme: Theme) => {
    const html = document.documentElement
    // Set data-theme attribute instead of classes
    html.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    applyTheme(newTheme)
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return {
      theme: 'dark',
      isDark: true,
      toggleTheme: () => {},
    }
  }

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
  }
}

