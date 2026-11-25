import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, KeyRound, Pencil, Trash2, UserCog } from 'lucide-react'
import { apiRequest } from '../services/api'

const PAGE_SIZE = 50

export default function RegisteredStudents() {
  const [students, setStudents] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activation, setActivation] = useState(null)
  const [busyId, setBusyId] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    const loadStudents = async () => {
      try {
        const { users, total: count } = await apiRequest(
          `/admin/users?role=student&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`
        )
        if (active && users.length === 0 && page > 0) {
          setPage((current) => current - 1)
          return
        }
        if (active) setStudents(users)
        if (active) setTotal(count)
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
  }, [page])

  const refreshStudents = async () => {
    const { users, total: count } = await apiRequest(
      `/admin/users?role=student&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`
    )
    if (users.length === 0 && page > 0) {
      setPage((current) => current - 1)
      return
    }
    setStudents(users)
    setTotal(count)
  }

  const changeRole = async (student) => {
    setError('')
    setBusyId(student.id)
    try {
      await apiRequest(`/admin/users/${student.id}`, {
        method: 'PATCH',
        body: { role: 'admin' },
      })
      await refreshStudents()
    } catch (actionError) {
      setError(actionError.message || 'Unable to update this account.')
    } finally {
      setBusyId('')
    }
  }

  const issueActivation = async (student) => {
    setError('')
    setActivation(null)
    setBusyId(student.id)
    try {
      const result = await apiRequest(`/admin/users/${student.id}/activation`, { method: 'POST' })
      setActivation(result)
    } catch (actionError) {
      setError(actionError.message || 'Unable to issue an activation code.')
    } finally {
      setBusyId('')
    }
  }

  const editName = async (student) => {
    const nextName = window.prompt('Update student full name:', student.full_name || '')
    if (nextName === null || nextName.trim() === student.full_name) return
    setError('')
    setBusyId(student.id)
    try {
      await apiRequest(`/admin/users/${student.id}`, {
        method: 'PATCH',
        body: { full_name: nextName.trim() },
      })
      await refreshStudents()
    } catch (actionError) {
      setError(actionError.message || 'Unable to update this account.')
    } finally {
      setBusyId('')
    }
  }

  const deleteStudent = async (student) => {
    if (!window.confirm(`Delete the portal account for ${student.full_name || student.email}?`)) return
    setError('')
    setBusyId(student.id)
    try {
      await apiRequest(`/admin/users/${student.id}`, { method: 'DELETE' })
      setStudents((current) => current.filter((entry) => entry.id !== student.id))
      setTotal((current) => Math.max(0, current - 1))
      if (students.length === 1 && page > 0) setPage((current) => current - 1)
      if (activation?.user?.id === student.id) setActivation(null)
    } catch (actionError) {
      setError(actionError.message || 'Unable to delete this account.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="main-content p-6">
      <header className="page-header">
        <Link to="/admin" className="flex items-center gap-2 text-primary mb-4">
          <ArrowLeft size={16} /> Back to administrator dashboard
        </Link>
        <h1 className="page-title">Registered students</h1>
        <p className="page-subtitle">View student accounts, manage roles, and issue password setup or reset codes.</p>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {activation && (
        <div className="alert alert-success my-4">
          <p>One-time password setup/reset code for {activation.user.email}. It expires in {activation.expires_in_hours} hours. Share it through a secure channel; it will not be emailed.</p>
          <p className="mt-2 break-all font-mono">{activation.activation_code}</p>
          <button type="button" className="btn btn-outline btn-sm mt-2" onClick={() => setActivation(null)}>
            Hide code
          </button>
        </div>
      )}
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
        <>
          <div className="card">
            <div className="table-container">
              <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Registered</th>
                  <th>Account</th>
                  <th>Actions</th>
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
                    <td>{student.needs_activation ? 'Password setup needed' : 'Active'}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={busyId === student.id}
                          onClick={() => void editName(student)}
                        >
                          <Pencil size={15} /> Edit name
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={busyId === student.id}
                          onClick={() => void issueActivation(student)}
                        >
                          <KeyRound size={15} /> Setup/reset code
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={busyId === student.id}
                          onClick={() => void changeRole(student)}
                        >
                          <UserCog size={15} /> Promote
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          disabled={busyId === student.id}
                          onClick={() => void deleteStudent(student)}
                        >
                          <Trash2 size={15} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-sm text-secondary">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={page === 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={(page + 1) * PAGE_SIZE >= total}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
