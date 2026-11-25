import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { User, Mail, ShieldCheck, LogOut, Clock, Save } from 'lucide-react'

export default function Profile() {
  const { user, profile, signOut, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setFullName(profile?.full_name || '')
  }, [profile?.full_name])

  const handleSignOut = async () => {
    setLoading(true)
    const result = await signOut()
    if (result.error) {
      setError(result.error.message || 'Unable to sign out. Please try again.')
    } else {
      navigate('/login')
    }
    setLoading(false)
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    const result = await updateProfile(fullName.trim())
    if (result.error) {
      setError(result.error.message || 'Unable to update your profile.')
    } else {
      setSuccess('Profile updated successfully.')
    }
    setSaving(false)
  }

  return (
    <div className="main-content p-6">
      <div className="page-header mb-6">
        <h1 className="page-title">User Profile</h1>
        <p className="page-subtitle">
          Manage your account information and settings
        </p>
      </div>

      <div className="max-w-2xl">
        {error && <div className="alert alert-error mb-4">{error}</div>}
        {success && <div className="alert alert-success mb-4">{success}</div>}

        {/* Profile Card */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="profile-avatar" style={{ width: 64, height: 64, fontSize: '1.5rem' }}>
                  {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{profile?.full_name || user?.email}</h2>
                  <p className="text-muted">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`badge ${profile?.role === 'admin' ? 'badge-admin' : 'badge-student'}`}>
                  {profile?.role?.toUpperCase() || 'USER'}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border-color">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-muted">Full Name</p>
                    <p className="font-medium">{profile?.full_name || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-muted">Email Address</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center text-info">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-muted">Account Role</p>
                    <p className="font-medium capitalize">{profile?.role || 'user'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-muted">Member Since</p>
                    <p className="font-medium">
                      {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-6">
          <div className="card-header">
            <h3 className="font-semibold text-primary">Update profile</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="form-group">
                <label className="form-label" htmlFor="profile-full-name">Full Name</label>
                <input
                  id="profile-full-name"
                  className="form-input"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  minLength={1}
                  maxLength={120}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><div className="spinner" /> Saving...</> : <><Save size={18} /> Save changes</>}
              </button>
            </form>
          </div>
        </div>

        {/* Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-primary">Account Actions</h3>
          </div>
          <div className="card-body">
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="btn btn-danger flex items-center gap-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner" />
                  Signing out...
                </span>
              ) : (
                <>
                  <LogOut size={18} /> Sign Out
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}