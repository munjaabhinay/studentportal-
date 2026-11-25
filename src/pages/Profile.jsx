import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { User, Mail, ShieldCheck, LogOut, Clock } from 'lucide-react'

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    await signOut()
    navigate('/login')
    setLoading(false)
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