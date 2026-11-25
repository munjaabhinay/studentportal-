import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'
import {
  LayoutDashboard,
  BookOpen,
  Clock,
  ArrowRight,
  Plus,
  User,
} from 'lucide-react'

export default function Dashboard() {
  const { user, profile, isAdmin } = useAuth()
  const [stats, setStats] = useState({
    totalCourses: 0,
    recentCourses: 0,
  })
  const [recentCourses, setRecentCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError('')

      // Fetch course count
      const { count: courseCount, error: courseError } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })

      if (courseError) throw courseError

      // Fetch recent courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (coursesError) throw coursesError

      setStats({
        totalCourses: courseCount || 0,
        recentCourses: coursesData?.length || 0,
      })
      setRecentCourses(coursesData || [])
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data')
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      label: 'Total Courses',
      value: stats.totalCourses,
      icon: BookOpen,
      color: 'text-primary',
    },
    {
      label: 'Recent Courses',
      value: stats.recentCourses,
      icon: Clock,
      color: 'text-success',
    },
  ]

  if (loading) {
    return (
      <div className="main-content p-6 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner" />
          <p className="text-secondary">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="main-content p-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              Welcome back, {profile?.full_name || user?.email}!
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-3">
              <Link to="/courses/add" className="btn btn-primary">
                <LayoutDashboard size={18} /> Add Course
              </Link>
            </div>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Stats Grid */}
      <div className="stats-grid mb-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className={`stat-icon ${stat.color}`}>
              <stat.icon size={32} />
            </div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h3 className="font-semibold text-primary mb-4">Quick Actions</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            to="/courses"
            className="btn btn-outline flex items-center justify-center gap-2 py-4"
          >
            <BookOpen size={20} /> View All Courses
          </Link>
          {isAdmin && (
            <Link
              to="/courses/add"
              className="btn btn-primary flex items-center justify-center gap-2 py-4"
            >
              <Plus size={20} /> Add New Course
            </Link>
          )}
          <Link
            to="/profile"
            className="btn btn-outline flex items-center justify-center gap-2 py-4"
          >
            <User size={20} /> My Profile
          </Link>
        </div>
      </div>

      {/* Recent Courses */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-primary">Recent Courses</h2>
        </div>
        <div className="card-body">
          {recentCourses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-secondary">No courses available yet.</p>
              {isAdmin && (
                <Link to="/courses/add" className="mt-4 btn btn-primary btn-sm">
                  Add Your First Course
                </Link>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Course Name</th>
                    <th>Trainer</th>
                    <th>Duration</th>
                    <th>Created</th>
                    {isAdmin && (
                      <th className="text-right">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {recentCourses.map((course) => (
                    <tr key={course.id}>
                      <td className="font-medium">{course.course_name}</td>
                      <td>{course.trainer_name}</td>
                      <td>{course.duration}</td>
                      <td className="text-sm text-muted">
                        {new Date(course.created_at).toLocaleDateString()}
                      </td>
                      {isAdmin && (
                        <td className="text-right">
                          <Link
                            to={`/courses/${course.id}/edit`}
                            className="btn btn-outline btn-sm"
                          >
                            <ArrowRight size={16} /> View
                          </Link>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}