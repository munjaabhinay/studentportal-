import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CourseListing from './pages/CourseListing'
import AddCourse from './pages/AddCourse'
import EditCourse from './pages/EditCourse'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'
import AdminDashboard from './pages/AdminDashboard'
import RegisteredStudents from './pages/RegisteredStudents'

// Layout
import MainLayout from './layouts/MainLayout'

// ProtectedRoute: redirects to login if not authenticated
function ProtectedRoute({ children }) {
  const { user, profileError, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-secondary">
          <div className="spinner" />
          Loading your account...
        </div>
      </div>
    )
  }

  if (profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card max-w-lg">
          <div className="card-body text-center">
            <h1 className="text-xl font-semibold text-danger mb-2">
              Portal service unavailable
            </h1>
            <p className="text-secondary mb-4">{profileError}</p>
            <button className="btn btn-outline" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-secondary">
          <div className="spinner" />
          Checking administrator access...
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="main-content p-6">
        <div className="card">
          <div className="card-body text-center">
            <h1 className="text-xl font-semibold text-danger mb-2">Access denied</h1>
            <p className="text-secondary">
              This page is available to administrators only.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return children
}

function HomeRedirect() {
  const { user, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-secondary">
          <div className="spinner" />
          Loading your account...
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<HomeRedirect />} />

        {/* Protected routes (require authentication) */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="admin/students"
            element={
              <AdminRoute>
                <RegisteredStudents />
              </AdminRoute>
            }
          />
          <Route path="courses" element={<CourseListing />} />
          <Route
            path="courses/add"
            element={
              <AdminRoute>
                <AddCourse />
              </AdminRoute>
            }
          />
          <Route
            path="courses/:id/edit"
            element={
              <AdminRoute>
                <EditCourse />
              </AdminRoute>
            }
          />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}

export default App