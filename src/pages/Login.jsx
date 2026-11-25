import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, AlertCircle, ChevronRight, KeyRound } from 'lucide-react'

function getErrorMessage(error, action) {
  if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
    return 'Too many attempts. Wait before trying again; requests are not retried automatically.'
  }
  if (error?.code === 'registration_unavailable') {
    return error.message
  }
  if (error?.code === 'invalid_credentials') {
    return 'Email or password is incorrect.'
  }
  if (error?.code === 'activation_failed') {
    return 'The activation code or account details are invalid or expired. Ask an administrator for a new code.'
  }
  if (error?.code === 'api_unavailable') {
    return error.message
  }
  if (error?.message === 'Full name is required.' || error?.message === 'Passwords do not match.') {
    return error.message
  }
  return action === 'signup'
    ? 'Unable to create the account. Check your details and try again.'
    : action === 'activate'
      ? 'Unable to activate the account. Check the activation details and try again.'
      : 'Unable to sign in. Check your credentials and try again.'
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [activationCode, setActivationCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [mode, setMode] = useState('login')
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const submittingRef = useRef(false)

  const { signIn, signUp, activateAccount } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submittingRef.current) return

    setError(null)
    const action = mode
    if (action === 'signup' && !fullName.trim()) {
      setError({ message: 'Full name is required.' })
      return
    }
    if (action !== 'login' && password !== confirmPassword) {
      setError({ message: 'Passwords do not match.' })
      return
    }

    submittingRef.current = true
    setIsLoading(true)
    try {
      const result = action === 'login'
        ? await signIn(email, password)
        : action === 'signup'
          ? await signUp(email, password, fullName.trim())
          : await activateAccount(email, activationCode.trim(), password)

      if (result.error) {
        setError(result.error)
        return
      }

      const user = result.data.user
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', {
        state: action === 'signup'
          ? { success: 'Account created successfully.' }
          : action === 'activate'
            ? { success: 'Account activated successfully.' }
            : undefined,
      })
    } catch (submitError) {
      setError(submitError)
    } finally {
      submittingRef.current = false
      setIsLoading(false)
    }
  }

  const changeMode = (nextMode) => {
    if (isLoading) return
    setError(null)
    setMode(nextMode)
  }

  const heading = mode === 'login'
    ? 'Welcome back. Please sign in to your account.'
    : mode === 'signup'
      ? 'Create a new student account to get started.'
      : 'Enter the one-time code provided by an administrator.'

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
          <p className="login-description">{heading}</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <div>
              <p>{getErrorMessage(error, mode)}</p>
              {error.code && (
                <p className="mt-1 text-xs">Error code: {error.code}</p>
              )}
              {error.status && (
                <p className="mt-1 text-xs">HTTP status: {error.status}</p>
              )}
            </div>
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
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                maxLength={120}
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
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              maxLength={254}
              required
            />
          </div>

          {mode === 'activate' && (
            <div className="form-group">
              <div className="flex items-center gap-2">
                <KeyRound size={18} className="text-muted" />
                <label className="form-label">One-time activation or reset code</label>
              </div>
              <input
                className="form-input"
                type="text"
                value={activationCode}
                onChange={(event) => setActivationCode(event.target.value)}
                autoComplete="off"
                required
              />
            </div>
          )}

          <div className="form-group">
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-muted" />
              <label className="form-label">{mode === 'activate' ? 'New Password' : 'Password'}</label>
            </div>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={8}
              maxLength={72}
            />
          </div>

          {mode !== 'login' && (
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
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="spinner" />
                {mode === 'login' ? 'Signing in...' : mode === 'signup' ? 'Creating account...' : 'Activating account...'}
              </span>
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Activate Account'}
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center space-y-2">
          {mode !== 'login' && (
            <p className="text-sm text-secondary">
              {mode === 'signup' ? 'Already have an account?' : 'Already activated your account?'}{' '}
              <button
                type="button"
                onClick={() => changeMode('login')}
                disabled={isLoading}
                className="text-primary font-medium hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
          {mode !== 'signup' && (
            <p className="text-sm text-secondary">
              {mode === 'login' ? "Don't have an account?" : 'Need a new account?'}{' '}
              <button
                type="button"
                onClick={() => changeMode('signup')}
                disabled={isLoading}
                className="text-primary font-medium hover:underline"
              >
                Sign up
              </button>
            </p>
          )}
          {mode !== 'activate' && (
            <p className="text-sm text-secondary">
              Existing account activation or password reset?{' '}
              <button
                type="button"
                onClick={() => changeMode('activate')}
                disabled={isLoading}
                className="text-primary font-medium hover:underline"
              >
                Enter a code
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
