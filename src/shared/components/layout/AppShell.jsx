import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useUIStore } from '../../../app/stores/uiStore'
import { cn } from '../../utils'

export function AppShell() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <div className={cn(
        'transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
        collapsed ? 'ml-0' : 'ml-[280px]',
      )}>
        <Topbar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}