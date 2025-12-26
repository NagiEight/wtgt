import { useState } from 'react'
import { useTheme } from '../hooks/useTheme'
import { Layout } from '../components/Layout'

export const Settings = () => {
  const { isDark, toggleTheme } = useTheme()
  const [username, setUsername] = useState('YourUsername')
  const [email, setEmail] = useState('user@example.com')
  const [notifications, setNotifications] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle'
  )

  const handleSave = async () => {
    setSaveStatus('saving')
    // TODO: Save to backend
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  return (
    <Layout title="Settings">
      <div className="max-w-2xl space-y-6">
        {/* Profile Section */}
        <div className="p-6 rounded-xl border border-default card">
          <h2 className="text-2xl font-bold mb-6">Profile</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-default bg-app text-content placeholder-content-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-default bg-app text-content placeholder-content-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Theme Section */}
        <div className="p-6 rounded-xl border border-default card">
          <h2 className="text-2xl font-bold mb-6">Appearance</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-sm text-content-secondary">
                  Current: {isDark ? 'Dark Mode' : 'Light Mode'}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="px-6 py-2 rounded-lg font-semibold transition-colors btn-primary"
              >
                {isDark ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
              </button>
            </div>

            <div className="p-4 rounded-lg bg-hover">
              <div className="grid grid-cols-2 gap-4">
                {/* Dark Mode Preview */}
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isDark
                      ? 'border-primary bg-app'
                      : 'border-default'
                  }`}
                >
                  <div className="text-2xl mb-2">🎬</div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-xs opacity-75">Black & Cyan</p>
                </div>

                {/* Light Mode Preview */}
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    !isDark
                      ? 'border-primary bg-app'
                      : 'border-default'
                  }`}
                >
                  <div className="text-2xl mb-2">💗</div>
                  <p className="font-medium">Light Mode</p>
                  <p className="text-xs opacity-75">Pink & White</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="p-6 rounded-xl border border-default card">
          <h2 className="text-2xl font-bold mb-6">Notifications</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notifications Enabled</p>
              <p className="text-sm text-content-secondary">
                Receive alerts for room updates
              </p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                notifications
                  ? 'bg-primary'
                  : 'bg-border'
              }`}
            >
              <div
                className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-transform ${
                  notifications ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-lg font-semibold transition-colors btn-primary"
        >
          {saveStatus === 'saving'
            ? 'Saving...'
            : saveStatus === 'saved'
              ? '✓ Saved'
              : 'Save Changes'}
        </button>
      </div>
    </Layout>
  )
}
