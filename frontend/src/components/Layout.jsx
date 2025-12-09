import { Link, useLocation } from 'react-router-dom'
import { FiHome, FiMessageSquare, FiCheckSquare, FiCode, FiBarChart2 } from 'react-icons/fi'

/**
 * Main layout component with sidebar navigation.
 * TODO: Add user profile section
 * TODO: Add settings menu
 * TODO: Add version info
 */
function Layout({ children }) {
  const location = useLocation()

  const navItems = [
    { path: '/', icon: FiHome, label: 'Dashboard' },
    { path: '/chat', icon: FiMessageSquare, label: 'Chat' },
    { path: '/test-design', icon: FiCheckSquare, label: 'Test Design' },
    { path: '/code', icon: FiCode, label: 'Code' },
    { path: '/metrics', icon: FiBarChart2, label: 'Metrics' }
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white">
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-8">QA Agent</h1>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
        
        {/* TODO: Add version info */}
        <div className="absolute bottom-4 left-4 text-gray-500 text-sm">
          v0.1.0 - Scaffold
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

export default Layout
