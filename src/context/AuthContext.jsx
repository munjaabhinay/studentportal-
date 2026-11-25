import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseReady } from '../services/supabase'

const AuthContext = createContext(null)

const normalizeAuthError = (error) => ({
  code: error?.code ?? null,
  status: error?.status ?? null,
  message: error?.message || 'The authentication request failed.',
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    return { data, error }
  }

  useEffect(() => {
    if (!isSupabaseReady()) {
      setLoading(false)
      return
    }

    let active = true
    let initialized = false
    let currentUserId = null

    const syncSession = (session) => {
      const nextUser = session?.user ?? null
      if (initialized && nextUser?.id === currentUserId) {
        setUser(nextUser)
        return
      }

      initialized = true
      currentUserId = nextUser?.id ?? null
      setUser(nextUser)
      setProfile(null)
      setProfileError('')

      if (!nextUser) {
        setLoading(false)
        return
      }

      setLoading(true)
      void fetchProfile(nextUser.id).then(({ data, error }) => {
        if (!active || currentUserId !== nextUser.id) return
        setProfile(data)
        setProfileError(
          error?.message ||
            (data ? '' : 'Your account profile was not found. Contact an administrator.')
        )
        setLoading(false)
      }).catch((error) => {
        if (!active || currentUserId !== nextUser.id) return
        setProfileError(error.message || 'Unable to load your account profile.')
        setLoading(false)
      })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => syncSession(session)
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // Sign up with email and password
  const signUp = async (email, password, fullName) => {
    if (!isSupabaseReady()) {
      return {
        data: null,
        error: {
          code: 'supabase_not_configured',
          status: null,
          message: 'Supabase is not configured. Please contact an administrator.',
        },
      }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) throw error
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return {
          data: null,
          error: {
            code: null,
            status: null,
            message: 'An account may already exist or signup could not be completed. Try signing in, or try again later.',
          },
        }
      }
      let nextProfile = null
      if (data.session?.user) {
        setUser(data.session.user)
        const { data: fetchedProfile, error: profileFetchError } = await fetchProfile(data.session.user.id)
        nextProfile = fetchedProfile
        setProfile(nextProfile)
        setProfileError(
          profileFetchError?.message ||
            (nextProfile ? '' : 'Your account profile was not found. Contact an administrator.')
        )
      }
      return { data: { ...data, profile: nextProfile }, error: null }
    } catch (error) {
      return { data: null, error: normalizeAuthError(error) }
    }
  }

  // Sign in with email and password
  const signIn = async (email, password) => {
    if (!isSupabaseReady()) {
      return {
        data: null,
        error: {
          code: 'supabase_not_configured',
          status: null,
          message: 'Supabase is not configured. Please contact an administrator.',
        },
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      if (data.user) {
        setUser(data.user)
        const { data: nextProfile, error: profileFetchError } = await fetchProfile(data.user.id)
        setProfile(nextProfile)
        setProfileError(
          profileFetchError?.message ||
            (nextProfile ? '' : 'Your account profile was not found. Contact an administrator.')
        )
        return { data: { ...data, profile: nextProfile }, error: null }
      }
      return { data, error: null }
    } catch (error) {
      return { data: null, error: normalizeAuthError(error) }
    }
  }

  // Sign out
  const signOut = async () => {
    if (!isSupabaseReady()) {
      setUser(null)
      setProfile(null)
      return
    }

    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error('Sign out error:', error.message)
    }
  }

  const value = {
    user,
    profile,
    isAdmin: profile?.role === 'admin',
    isStudent: profile?.role === 'student',
    profileError,
    loading,
    signUp,
    signIn,
    signOut,
    isSupabaseReady,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use authentication context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}