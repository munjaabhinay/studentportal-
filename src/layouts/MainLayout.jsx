import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  BookOpen,
  User,
  LogOut,
  Menu,
  ChevronRight,
} from 'lucide-react'

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'Courses', icon: BookOpen, path: '/courses' },
    { name: 'Profile', icon: User, path: '/profile' },
  ]

  return (
    <div className="flex flex-col h-screen">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-left flex items-center gap-4">
          <button
            className="flex items-center gap-2 text-secondary hover:text-primary"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
            <span className="hidden sm:inline font-semibold text-primary">
              Navigation
            </span>
          </button>
          <Link to="/" className="font-bold text-xl text-primary">
            CoursePortal
          </Link>
        </div>

        <div className="navbar-right flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3">
              <div className="profile-card hidden sm:flex">
                <div className="profile-info">
                  <div className="profile-avatar">
                    {profile?.full_name?.charAt(0) || user.email?.charAt(0)}
                  </div>
                  <div className="profile-details">
                    <div className="profile-name">
                      {profile?.full_name || user.email}
                    </div>
                    <div className="profile-email">{user.email}</div>
                  </div>
                </div>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={handleSignOut}
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main content area */}
      <div className="main-layout flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`sidebar ${
            sidebarOpen ? 'open' : ''
          } hidden sm:flex flex-col`}
        >
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <BookOpen size={24} className="text-primary" />
              <span>CoursePortal</span>
            </div>
          </div>
          <nav className="sidebar-nav">
            {navItems.map((item) => {
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? 'active' : ''} flex items-center gap-3`
                  }
                >
                  <item.icon size={18} />
                  {item.name}
                  <ChevronRight size={14} className="ml-auto text-muted" />
                </NavLink>
              )
            })}
          </nav>
          <div className="sidebar-footer">
            <div className="profile-info">
              <div className="profile-avatar">
                {profile?.full_name?.charAt(0) || user.email?.charAt(0)}
              </div>
              <div className="profile-details">
                <div className="profile-name">
                  {profile?.full_name || user.email}
                </div>
                <div className="profile-email text-xs opacity-75">
                  {user.email}
                </div>
              </div>
            </div>
            <button
              className="btn btn-outline btn-block mt-3 text-sm"
              onClick={handleSignOut}
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </aside>

        {/* Page content - child routes render here via Outlet */}
        <main className="main-content w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}