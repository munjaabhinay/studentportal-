import { Link } from 'react-router-dom'
import { AlertCircle, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md">
        <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-danger" />
        </div>

        <h1 className="text-4xl font-bold text-primary mb-2">404</h1>
        <h2 className="text-xl font-semibold text-secondary mb-4">Page Not Found</h2>
        <p className="text-muted mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <Link
          to="/dashboard"
          className="btn btn-primary flex items-center justify-center gap-2"
        >
          <Home size={18} /> Go to Dashboard
        </Link>
      </div>
    </div>
  )
}