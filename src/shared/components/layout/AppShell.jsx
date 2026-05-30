import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const STORAGE_KEY = 'mangaflow_sidebar_collapsed'

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : true
  })
  const [showTrigger, setShowTrigger] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  const toggleSidebar = () => setSidebarCollapsed((p) => !p)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface text-on-surface">
      <Sidebar collapsed={sidebarCollapsed} />
      <main className="flex-1 h-full overflow-y-auto bg-surface relative transition-all duration-300 ease-in-out min-w-0">
        <Topbar collapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} />
        <div className="px-10 py-10 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>

      {sidebarCollapsed && (
        <div
          className="fixed left-0 top-0 w-2 h-full z-40"
          onMouseEnter={() => setShowTrigger(true)}
          onMouseLeave={() => setShowTrigger(false)}
        />
      )}
      <button
        onClick={toggleSidebar}
        onMouseEnter={() => setShowTrigger(true)}
        onMouseLeave={sidebarCollapsed ? () => setShowTrigger(false) : undefined}
        className={`fixed top-1/2 -translate-y-1/2 z-50 w-7 h-14 flex items-center justify-center border border-l-0 border-outline-variant rounded-r-xl text-on-surface-variant hover:text-white hover:bg-primary hover:border-primary transition-all duration-300 ${
          sidebarCollapsed
            ? `${showTrigger ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} bg-surface-container-highest left-0`
            : 'opacity-100 pointer-events-auto bg-surface left-[280px]'
        }`}
      >
        <span className="material-symbols-outlined text-lg">
          {sidebarCollapsed ? 'chevron_right' : 'chevron_left'}
        </span>
      </button>
    </div>
  )
}
