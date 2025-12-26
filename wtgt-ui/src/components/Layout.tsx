import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { ThemeToggle } from './ThemeToggle'

interface LayoutProps {
  children: ReactNode
  title?: string
}

export const Layout = ({ children, title }: LayoutProps) => {
  const { isDark } = useTheme()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-app text-content">
      {/* Header */}
      <header className="border-b border-default bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-2xl font-bold hover:opacity-80 transition-opacity"
          >
            {isDark ? '🎬' : '💗'} WTGT
          </button>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => navigate('/settings')}
              className="px-4 py-2 rounded-lg transition-colors text-primary hover:text-primary-hover"
            >
              Settings
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {title && <h1 className="text-3xl font-bold mb-6">{title}</h1>}
        {children}
      </main>
    </div>
  )
}
