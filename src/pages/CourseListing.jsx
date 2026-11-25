import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'
import { Trash2, Edit3, Plus, Search } from 'lucide-react'

export default function CourseListing() {
  const { isAdmin } = useAuth()
  const [courses, setCourses] = useState([])
  const [filteredCourses, setFilteredCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [durationFilter, setDurationFilter] = useState('all')

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCourses(data || [])
      setFilteredCourses(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load courses')
      console.error('Course listing error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter courses based on search text and duration filter
  useEffect(() => {
    let filtered = courses

    // Apply search filter
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim()
      filtered = filtered.filter(
        (course) =>
          course.course_name.toLowerCase().includes(searchLower) ||
          course.trainer_name.toLowerCase().includes(searchLower)
      )
    }

    // Apply duration filter
    if (durationFilter !== 'all') {
      filtered = filtered.filter(
        (course) => course.duration.toLowerCase() === durationFilter.toLowerCase()
      )
    }

    setFilteredCourses(filtered)
  }, [courses, searchText, durationFilter])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course?')) {
      return
    }

    setDeletingId(id)
    try {
      const { error } = await supabase.from('courses').delete().eq('id', id)

      if (error) throw error

      setCourses((prev) => prev.filter((c) => c.id !== id))
      setFilteredCourses((prev) => prev.filter((c) => c.id !== id))
      setDeletingId(null)
    } catch (err) {
      setError(err.message || 'Failed to delete course')
      setDeletingId(null)
      console.error('Delete error:', err)
    }
  }

  // Get unique duration values for filter dropdown
  const durations = [
    ...new Set(courses.map((c) => c.duration).filter(Boolean)),
  ].sort()

  if (loading) {
    return (
      <div className="main-content p-6 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner" />
          <p className="text-secondary">Loading courses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="main-content p-6">
      {/* Page Header */}
      <div className="page-header mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="page-title">Course Management</h1>
            <p className="page-subtitle">
              Browse and manage all available courses
            </p>
          </div>
          {isAdmin && (
            <Link
              to="/courses/add"
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={18} /> Add Course
            </Link>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error mb-6">{error}</div>}

      {/* Search & Filter Section */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto max-w-md">
              <div className="relative w-full">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  className="form-input pl-10"
                  type="text"
                  placeholder="Search courses by name or trainer..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>

            {/* Duration Filter */}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <label className="form-label text-sm self-center sm:self-auto">
                Filter by Duration
              </label>
              <select
                className="form-select"
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value)}
              >
                <option value="all">All Durations</option>
                {durations.map((duration) => (
                  <option key={duration} value={duration}>
                    {duration}
                  </option>
                ))}
              </select>
            </div>

            {/* Results Count */}
            <div className="text-sm text-muted self-center sm:self-auto">
              {filteredCourses.length} course{
                filteredCourses.length !== 1 ? 's' : ''
              } found
            </div>
          </div>
        </div>
      </div>

      {/* Courses Table */}
      <div className="card">
        <div className="card-body">
          {filteredCourses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-secondary text-lg">No courses found.</p>
              {isAdmin && (
                <Link
                  to="/courses/add"
                  className="mt-4 btn btn-primary btn-sm"
                >
                  <Plus size={18} /> Create Your First Course
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
                    <th className="text-center">Created</th>
                    {isAdmin && <th className="text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((course) => (
                    <tr key={course.id}>
                      <td className="font-medium">{course.course_name}</td>
                      <td>{course.trainer_name}</td>
                      <td>{course.duration}</td>
                      <td className="text-center text-sm text-muted">
                        {new Date(course.created_at).toLocaleDateString()}
                      </td>
                      {isAdmin && (
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/courses/${course.id}/edit`}
                              className="btn btn-outline btn-sm"
                              title="Edit course"
                            >
                              <Edit3 size={16} />
                            </Link>
                            <button
                              onClick={() => handleDelete(course.id)}
                              disabled={deletingId === course.id}
                              className="btn btn-danger btn-sm"
                              title="Delete course"
                            >
                              {deletingId === course.id ? (
                                <div className="spinner" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
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

      {!isAdmin && (
        <div className="mt-6 alert alert-info">
          <p className="text-sm">
            You are viewing courses as a student. Contact an administrator to
            manage courses.
          </p>
        </div>
      )}
    </div>
  )
}