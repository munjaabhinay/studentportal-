import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase, isSupabaseReady } from './services/supabase'
import { AuthProvider, useAuth } from './context/AuthContext'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CourseListing from './pages/CourseListing'
import AddCourse from './pages/AddCourse'
import EditCourse from './pages/EditCourse'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'

// Layout
import MainLayout from './layouts/MainLayout'

// ProtectedRoute: redirects to login if not authenticated
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

// SupabaseNotConfigured: shows when env vars are missing
function SupabaseNotConfigured() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-body p-6 text-center">
      <div className="max-w-md">
        <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4 text-warning">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2.45l-.23-.22a.246.246 0 0 1-.354-.354l.22-.23V9.5h2.45v2.45zm.02-6.95h-2.45V6.05h2.45z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-primary mb-2">Configuration Missing</h2>
        <p className="text-secondary mb-6">
          Supabase environment variables are not configured. Please contact your administrator to set up
          <code className="bg-bg-body px-1 py-0.5 rounded text-danger">VITE_SUPABASE_URL</code> and
          <code className="bg-bg-body px-1 py-0.5 rounded text-danger">VITE_SUPABASE_ANON_KEY</code>.
        </p>
        <div className="text-left text-sm text-muted space-y-2">
          <p><strong>1.</strong> Go to your Supabase project → Settings → API</p>
          <p><strong>2.</strong> Copy "Project URL" and "anon public" key</p>
          <p><strong>3.</strong> Add them in Vercel → Settings → Environment Variables</p>
          <p><strong>4.</strong> Redeploy the project</p>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [initialized, setInitialized] = useState(false)

  // Listen for auth changes to keep session in sync
  useEffect(() => {
    if (!isSupabaseReady()) {
      setInitialized(true)
      return
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email || 'no user')
    })

    // Check for existing session on load
    supabase.auth.getSession().then(() => {
      setInitialized(true)
    })

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  if (!initialized) {
    return null
  }

  // If Supabase is not configured, show configuration message
  if (!isSupabaseReady()) {
    return <SupabaseNotConfigured />
  }

  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Protected routes (require authentication) */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="courses" element={<CourseListing />} />
          <Route path="courses/add" element={<AddCourse />} />
          <Route path="courses/:id/edit" element={<EditCourse />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}

export default App