import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'
import { ArrowLeft, Plus } from 'lucide-react'

export default function AddCourse() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()

  const [courseName, setCourseName] = useState('')
  const [trainerName, setTrainerName] = useState('')
  const [duration, setDuration] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!isAdmin) {
      setError('Only administrators can add courses.')
      return
    }

    if (!courseName.trim() || !trainerName.trim() || !duration.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.from('courses').insert([
        {
          course_name: courseName.trim(),
          trainer_name: trainerName.trim(),
          duration: duration.trim(),
          description: description.trim(),
        },
      ])

      if (error) throw error

      setSuccess('Course created successfully!')
      setCourseName('')
      setTrainerName('')
      setDuration('')
      setDescription('')

      // Redirect to course listing after a short delay
      setTimeout(() => {
        navigate('/courses')
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to create course')
      console.error('Add course error:', err)
    } finally {
      setLoading(false)
    }
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
              Only administrators can add courses.
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
            <h1 className="page-title">Add New Course</h1>
            <p className="page-subtitle">
              Fill in the course details below
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
                placeholder="e.g. Web Development Fundamentals"
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
                placeholder="e.g. John Smith"
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
                placeholder="Enter a brief description of the course..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block w-full"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner" />
                  Creating...
                </span>
              ) : (
                <>
                  <Plus size={18} /> Create Course
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}