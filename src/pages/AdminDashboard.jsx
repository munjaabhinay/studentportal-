import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Users, ArrowRight } from 'lucide-react'
import { apiRequest } from '../services/api'

export default function AdminDashboard() {
  const location = useLocation()
  const [stats, setStats] = useState({ courses: 0, students: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const loadStats = async () => {
      try {
        const result = await apiRequest('/admin/stats')
        if (active) {
          setStats(result)
        }
      } catch (loadError) {
        if (active) setError(loadError.message || 'Unable to load administrator dashboard.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadStats()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="main-content p-6">
      {location.state?.success && (
        <div className="alert alert-success">{location.state.success}</div>
      )}
      <header className="page-header">
        <h1 className="page-title">Administrator dashboard</h1>
        <p className="page-subtitle">Manage portal courses and review registered students.</p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-3 text-secondary">
          <div className="spinner" />
          Loading administrator data...
        </div>
      ) : (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon text-primary"><BookOpen size={32} /></div>
            <div className="stat-label">Courses</div>
            <div className="stat-value">{stats.courses}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon text-success"><Users size={32} /></div>
            <div className="stat-label">Registered students</div>
            <div className="stat-value">{stats.students}</div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Link to="/courses" className="btn btn-outline">
          <BookOpen size={18} /> Manage courses <ArrowRight size={16} />
        </Link>
        <Link to="/admin/students" className="btn btn-primary">
          <Users size={18} /> View registered students <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}
