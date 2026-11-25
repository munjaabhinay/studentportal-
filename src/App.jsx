import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './services/supabase'
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

function App() {
  const [initialized, setInitialized] = useState(false)

  // Listen for auth changes to keep session in sync
  useEffect(() => {
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