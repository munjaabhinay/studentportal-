import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, AlertCircle, ChevronRight } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [mode, setMode] = useState('login') // 'login' or 'signup'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (mode === 'login') {
      const { data, error: err } = await signIn(email, password)
      if (err) {
        setError(err)
      } else if (data) {
        navigate('/dashboard')
      }
    } else {
      if (!fullName.trim()) {
        setError('Full name is required for sign up.')
        return
      }
      const { data, error: err } = await signUp(email, password, fullName)
      if (err) {
        setError(err)
      } else if (data) {
        setError('Account created successfully! Please log in.', 'success')
        setMode('login')
      }
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-brand">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-2xl">🎓</span>
              CoursePortal
            </div>
          </div>
          <p className="login-description">
            {mode === 'login'
              ? 'Welcome back. Please sign in to your account.'
              : 'Create a new account to get started.'}
          </p>
        </div>

        {error && (
          <div
            className={`alert ${
              error.includes('successfully') ? 'alert-success' : 'alert-error'
            }`}
          >
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          )}

          <div className="form-group">
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-muted" />
              <label className="form-label">Email address</label>
            </div>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-muted" />
              <label className="form-label">Password</label>
            </div>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block w-full"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="spinner" />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          {mode === 'login' ? (
            <>
              <p className="text-sm text-secondary">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-primary font-medium hover:underline"
                >
                  Sign up
                </button>
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-secondary">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}