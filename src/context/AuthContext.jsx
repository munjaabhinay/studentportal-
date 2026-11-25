import { createContext, useContext, useEffect, useState } from 'react'
import { apiRequest } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    apiRequest('/me', { signal: controller.signal })
      .then(({ user: currentUser }) => {
        if (!active) return
        setUser(currentUser)
        setProfileError('')
      })
      .catch((error) => {
        if (active && error?.status !== 401 && error?.code !== 'aborted') {
          setProfileError(error?.message || 'Unable to load your account.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  const signUp = async (email, password, fullName) => {
    try {
      const data = await apiRequest('/register', {
        method: 'POST',
        body: { email, password, full_name: fullName },
      })
      setUser(data.user)
      setProfileError('')
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signIn = async (email, password) => {
    try {
      const data = await apiRequest('/login', {
        method: 'POST',
        body: { email, password },
      })
      setUser(data.user)
      setProfileError('')
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const activateAccount = async (email, activationCode, password) => {
    try {
      const data = await apiRequest('/activate', {
        method: 'POST',
        body: { email, activation_code: activationCode, password },
      })
      setUser(data.user)
      setProfileError('')
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      await apiRequest('/logout', { method: 'POST' })
      setUser(null)
      setProfileError('')
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const updateProfile = async (fullName) => {
    try {
      const data = await apiRequest('/me', {
        method: 'PATCH',
        body: { full_name: fullName },
      })
      setUser(data.user)
      return { data: data.user, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const value = {
    user,
    profile: user,
    isAdmin: user?.role === 'admin',
    isStudent: user?.role === 'student',
    profileError,
    loading,
    signUp,
    signIn,
    activateAccount,
    signOut,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
