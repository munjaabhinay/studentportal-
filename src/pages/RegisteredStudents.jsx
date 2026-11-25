import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../services/supabase'

export default function RegisteredStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const loadStudents = async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('profiles')
          .select('id, full_name, email, created_at')
          .eq('role', 'student')
          .order('created_at', { ascending: false })

        if (queryError) throw queryError
        if (active) setStudents(data || [])
      } catch (queryError) {
        if (active) setError(queryError.message || 'Unable to load registered students.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadStudents()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="main-content p-6">
      <header className="page-header">
        <Link to="/admin" className="flex items-center gap-2 text-primary mb-4">
          <ArrowLeft size={16} /> Back to administrator dashboard
        </Link>
        <h1 className="page-title">Registered students</h1>
        <p className="page-subtitle">Student accounts only. Administrator roles are managed through Supabase.</p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <div className="flex items-center gap-3 text-secondary">
          <div className="spinner" />
          Loading registered students...
        </div>
      ) : students.length === 0 ? (
        <div className="card">
          <div className="card-body text-center text-secondary">No student accounts found.</div>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.full_name || 'Name not provided'}</td>
                    <td>{student.email || 'Email unavailable'}</td>
                    <td>
                      {student.created_at
                        ? new Date(student.created_at).toLocaleDateString()
                        : 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
