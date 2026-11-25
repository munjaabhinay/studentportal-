import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, AlertCircle, ChevronRight } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [mode, setMode] = useState('login') // 'login' or 'signup'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { data, error: err } = await signIn(email, password)
        if (err) {
          setError(/email not confirmed|email_not_confirmed/i.test(err)
            ? 'Unable to sign in. Check your credentials and account status, or contact an administrator.'
            : err)
        } else if (data) {
          navigate(data.profile?.role === 'admin' ? '/admin' : '/dashboard')
        }
      } else {
        if (!fullName.trim()) {
          setError('Full name is required for sign up.')
          return
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.')
          return
        }

        const { data, error: err } = await signUp(email, password, fullName.trim())
        if (err) {
          setError(/rate limit|too many requests|429/i.test(err)
            ? 'Signup is temporarily rate-limited by Supabase. Wait before trying again and avoid repeated submissions. If this continues, ask the project administrator to check Supabase Authentication rate limits and email provider settings.'
            : err)
        } else if (data?.session) {
          navigate(data.profile?.role === 'admin' ? '/admin' : '/dashboard', {
            state: { success: 'Account created successfully.' },
          })
        } else {
          setError('Supabase created the account but did not start a session. Check the authentication settings, then try signing in or contact an administrator.')
        }
      }
    } catch (submitError) {
      setError(submitError.message || 'Unable to complete your request.')
    } finally {
      setLoading(false)
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
          <div className="alert alert-error">
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
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={6}
            />
          </div>

          {mode === 'signup' && (
            <div className="form-group">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-muted" />
                <label className="form-label">Confirm password</label>
              </div>
              <input
                className="form-input"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>
          )}

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