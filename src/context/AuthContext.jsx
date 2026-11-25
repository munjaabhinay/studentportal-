import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseReady } from '../services/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching profile:', error.message)
      return null
    }
  }

  useEffect(() => {
    if (!isSupabaseReady()) {
      setLoading(false)
      return
    }

    let active = true
    let currentUserId = null

    const syncSession = (session) => {
      const nextUser = session?.user ?? null
      if (nextUser?.id === currentUserId) {
        setUser(nextUser)
        return
      }

      currentUserId = nextUser?.id ?? null
      setUser(nextUser)
      setProfile(null)

      if (!nextUser) {
        setLoading(false)
        return
      }

      setLoading(true)
      void fetchProfile(nextUser.id).then((nextProfile) => {
        if (!active || currentUserId !== nextUser.id) return
        setProfile(nextProfile)
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
      return { data: null, error: 'Supabase is not configured. Please contact administrator.' }
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
      if (data.session?.user) setUser(data.session.user)
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error.message }
    }
  }

  // Sign in with email and password
  const signIn = async (email, password) => {
    if (!isSupabaseReady()) {
      return { data: null, error: 'Supabase is not configured. Please contact administrator.' }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      if (data.user) setUser(data.user)
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error.message }
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
      const { error } = await supabase.auth.signOut()
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