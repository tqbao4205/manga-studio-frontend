import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '../../utils'
import { useAuthStore } from '../../../app/stores/authStore'
import { APP_NAME } from '../../constants'

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
  { label: 'Manga Series', icon: 'book_2', path: '/series' },
  { label: 'Chapters', icon: 'list_alt', path: '/chapters' },
  { label: 'Analytics', icon: 'analytics', path: '/rankings' },
]

export function Sidebar({ collapsed }) {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  const isActive = (path) => {
    if (path === '/series') return location.pathname.startsWith('/series')
    return location.pathname === path
  }

  return (
    <aside className={cn(
      'h-full border-r border-outline-variant bg-surface flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden z-30',
      collapsed ? 'w-0' : 'w-[280px] shadow-[2px_0_20px_rgba(0,0,0,0.4)]',
    )}>
      <div className="flex items-center h-16 gap-3 px-6 shrink-0">
        <div className="size-8 text-primary shrink-0">
          <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z"></path>
          </svg>
        </div>
        <span className="text-xl font-bold tracking-tight text-white font-geist whitespace-nowrap">
          {APP_NAME}
        </span>
      </div>

      <nav className="flex-1 px-3 space-y-1 mt-2">
        {navItems.map((item) => {
          const active = isActive(item.path)
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:text-white transition-all rounded-xl hover:bg-surface-container',
                active && 'active-nav',
              )}
            >
              <span
                className="material-symbols-outlined text-xl shrink-0"
                style={active && item.icon === 'book_2' ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-outline-variant py-3 px-3">
        <NavLink
          to="/profile"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:text-white transition-all rounded-xl hover:bg-surface-container',
            location.pathname === '/profile' && 'active-nav',
          )}
        >
          <span className="material-symbols-outlined text-xl shrink-0">settings</span>
          <span className="font-medium text-sm whitespace-nowrap">Settings</span>
        </NavLink>

        {user ? (
          <div className="flex items-center gap-3 px-3 py-2 mt-1">
            <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden shrink-0">
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary bg-surface-container-highest">
                {user.displayName?.[0] || '?'}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white whitespace-nowrap">{user.displayName}</span>
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold whitespace-nowrap">
                {user.role.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2 mt-1">
            <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">?</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white whitespace-nowrap">Guest</span>
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold whitespace-nowrap">Not logged in</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
