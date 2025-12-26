import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { ThemeToggle } from '../components/ThemeToggle'

export const Landing = () => {
  const { isDark } = useTheme()
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // TODO: Handle actual authentication
    if (username && password) {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-app text-content">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="flex items-center justify-center min-h-screen">
        <div className="p-8 rounded-xl shadow-lg max-w-md w-full animate-fade-in card">
          <h1 className="text-3xl font-bold mb-2 text-center">
            {isDark ? '🎬' : '💗'} WTGT
          </h1>
          <p className="text-center mb-6 text-content-secondary">
            Watch Together, Get Together
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-2 rounded-lg border border-default bg-app text-content placeholder-content-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-2 rounded-lg border border-default bg-app text-content placeholder-content-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-2 rounded-lg border border-default bg-app text-content placeholder-content-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-lg font-semibold transition-colors hover:opacity-90 btn-primary"
            >
              {isLogin ? 'Login' : 'Register'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:text-primary-hover transition-colors"
            >
              {isLogin
                ? "Don't have an account? Register"
                : 'Already have an account? Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
