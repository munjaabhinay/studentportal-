import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'

export default function EditCourse() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()

  const [course, setCourse] = useState(null)
  const [courseName, setCourseName] = useState('')
  const [trainerName, setTrainerName] = useState('')
  const [duration, setDuration] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = false

  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    fetchCourse()
  }, [id])

  const fetchCourse = async () => {
    try {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setCourse(data)
      setCourseName(data.course_name || '')
      setTrainerName(data.trainer_name || '')
      setDuration(data.duration || '')
      setDescription(data.description || '')
    } catch (err) {
      setError(err.message || 'Failed to load course')
      console.error('Edit course fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!isAdmin) {
      setError('Only administrators can edit courses.')
      return
    }

    if (!courseName || !trainerName || !duration) {
      setError('Please fill in all required fields.')
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('courses')
        .update({
          course_name: courseName.trim(),
          trainer_name: trainerName.trim(),
          duration: duration.trim(),
          description: description.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error

      setSuccess('Course updated successfully!')

      setTimeout(() => {
        navigate('/courses')
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to update course')
      console.error('Edit course error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this course?')) {
      return
    }

    try {
      const { error } = await supabase.from('courses').delete().eq('id', id)

      if (error) throw error

      navigate('/courses')
    } catch (err) {
      setError(err.message || 'Failed to delete course')
      console.error('Delete error:', err)
    }
  }

  if (loading) {
    return (
      <div className="main-content p-6 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner" />
          <p className="text-secondary">Loading course...</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="main-content p-6">
        <div className="card">
          <div className="card-body text-center py-12">
            <h2 className="text-xl font-semibold text-danger mb-2">
              Course Not Found
            </h2>
            <p className="text-secondary">The requested course does not exist.</p>
            <Link to="/courses" className="mt-4 btn btn-primary btn-sm">
              <ArrowLeft size={16} /> Back to Courses
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="main-content p-6">
        <div className="card">
          <div className="card-body text-center py-12">
            <h2 className="text-xl font-semibold text-danger mb-2">
              Access Denied
            </h2>
            <p className="text-secondary">
              Only administrators can edit courses.
            </p>
            <Link
              to="/courses"
              className="mt-4 btn btn-primary btn-sm"
            >
              <ArrowLeft size={16} /> Back to Courses
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="main-content p-6">
      <div className="page-header mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              to="/courses"
              className="flex items-center gap-2 text-primary hover:text-primary-dark mb-4"
            >
              <ArrowLeft size={16} /> Back to Courses
            </Link>
            <h1 className="page-title">Edit Course</h1>
            <p className="page-subtitle">
              Update course details for <span className="font-medium">{course.course_name}</span>
            </p>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}
      {success && <div className="alert alert-success mb-4">{success}</div>}

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <div className="form-group">
              <label className="form-label">Course Name <span className="text-danger">*</span></label>
              <input
                className="form-input"
                type="text"
                placeholder="Course name"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Trainer Name <span className="text-danger">*</span></label>
              <input
                className="form-input"
                type="text"
                placeholder="Trainer name"
                value={trainerName}
                onChange={(e) => setTrainerName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Duration <span className="text-danger">*</span></label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. 3 months"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                placeholder="Course description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={saving}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="spinner" />
                    Saving...
                  </span>
                ) : (
                  <>
                    <Save size={18} /> Save Changes
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="btn btn-danger"
                disabled={saving}
              >
                <Trash2 size={18} /> Delete
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}