import { useNavigate } from 'react-router-dom'

export const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-app text-content">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-2xl font-semibold">Page Not Found</p>
        <p className="text-lg text-content-secondary">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3 rounded-lg font-semibold transition-colors btn-primary"
        >
          Go Home
        </button>
      </div>
    </div>
  )
}
