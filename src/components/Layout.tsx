import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LayoutDashboard, Users, PhoneCall, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Layout() {
  const { user, signOut } = useAuth()

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5 mr-3" /> },
    { name: 'Customers', path: '/customers', icon: <Users className="w-5 h-5 mr-3" /> },
    { name: 'Call Logs', path: '/calls', icon: <PhoneCall className="w-5 h-5 mr-3" /> },
  ]

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3 shadow-md shadow-indigo-500/20">
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          </div>
          <span className="font-bold text-lg tracking-tight">Voice Agent</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`
              }
            >
              {item.icon}
              <span className="font-medium text-sm">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 mt-auto">
          <div className="px-4 py-3 mb-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Account</p>
            <p className="text-sm font-medium truncate">{user?.email}</p>
          </div>
          <Button 
            variant="ghost" 
            className="w-full flex justify-start text-slate-400 hover:text-red-400 hover:bg-red-400/10"
            onClick={signOut}
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span className="font-medium">Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950">
        <div className="h-16 flex items-center px-8 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm z-10 hidden sm:flex">
          {/* Top header area for breadcrumbs or user profile if needed */}
        </div>
        <div className="flex-1 overflow-y-auto p-8 relative">
           <Outlet />
        </div>
      </main>
    </div>
  )
}
