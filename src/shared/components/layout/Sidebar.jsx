import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, PenTool, Calendar, TrendingUp, ListTodo, Vote,
  ChevronLeft, ChevronRight, MessageSquare,
} from 'lucide-react'

import { cn } from '../../utils'
import { useAuthStore } from '../../../app/stores/authStore'
import { useUIStore } from '../../../app/stores/uiStore'
import { APP_NAME } from '../../constants'

/**
 * ── navItems: Định nghĩa các mục trong sidebar ──
 *
 * Mỗi mục gồm:
 *   - label : Tên hiển thị
 *   - icon  : Component icon từ lucide-react
 *   - path  : Đường dẫn React Router
 *   - roles : Mảng role được phép xem ('ALL' nghĩa là tất cả)
 *   - accent: Màu nhấn (primary | accent-purple)
 *
 * Các mục hiện tại:
 *   - Dashboard / Series / Rankings → tất cả roles
 *   - Reviews → TANTOU_EDITOR, EDITORIAL_BOARD
 *   - Tasks → MANGAKA, ASSISTANT
 *   - Publishing / Vote Entry → EDITORIAL_BOARD
 */

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['ALL'], accent: 'primary' },
  { label: 'Series', icon: BookOpen, path: '/series', roles: ['ALL'], accent: 'primary' },
  { label: 'Reviews', icon: MessageSquare, path: '/reviews', roles: ['TANTOU_EDITOR', 'EDITORIAL_BOARD'], accent: 'accent-purple' },
  { label: 'Tasks', icon: ListTodo, path: '/tasks', roles: ['MANGAKA', 'ASSISTANT'], accent: 'primary' },
  { label: 'Publishing', icon: Calendar, path: '/publishing', roles: ['EDITORIAL_BOARD'], accent: 'accent-purple' },
  { label: 'Vote Entry', icon: Vote, path: '/publishing/votes', roles: ['EDITORIAL_BOARD'], accent: 'accent-purple' },
  { label: 'Rankings', icon: TrendingUp, path: '/rankings', roles: ['ALL'], accent: 'primary' },
]

// Ánh xạ accent → class cho thanh chỉ báo bên trái active
const accentMap = {
  primary: 'bg-primary',
  'accent-purple': 'bg-accent-purple',
}

// Ánh xạ accent → class màu icon
const iconColorMap = {
  primary: 'text-primary',
  'accent-purple': 'text-accent-purple',
}

/**
 * ── Sidebar: Thanh điều hướng bên trái ──
 *
 * Component:
 *   - Logo + tên ứng dụng ở đầu
 *   - Danh sách nav items, lọc theo role người dùng
 *   - Nút thu gọn/mở rộng ở cuối
 *
 * Trạng thái:
 *   - collapsed (thu gọn) → chỉ hiển thị icon, width = 64px
 *   - expanded (mở rộng) → hiển thị icon + label, width = 240px
 *
 * Hành vi:
 *   - Nav item đang active → thanh accent bên trái + icon màu
 *   - Hover → background nhẹ
 */

export function Sidebar() {
  const { sidebarCollapsed: collapsed, toggleSidebar } = useUIStore()
  const user = useAuthStore((s) => s.user)

  return (
    <aside
      className={cn(
        'h-screen fixed left-0 top-0 z-30 flex flex-col border-r border-primary bg-white transition-all duration-300',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Header: Logo + tên ứng dụng */}
      <div className={cn(
        'flex items-center h-16 border-b border-primary px-4',
        collapsed ? 'justify-center' : 'gap-3',
      )}>
        <div className="w-8 h-8 bg-primary flex items-center justify-center flex-shrink-0">
          <PenTool size={16} className="text-white" />
        </div>
        {!collapsed && (
          <span className="font-display text-headline-mobile text-on-surface tracking-tight">{APP_NAME}</span>
        )}
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {navItems
          // Lọc các mục phù hợp với role của user
          .filter((item) => item.roles.includes('ALL') || (user && item.roles.includes(user.role)))
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              // Render prop nhận isActive từ NavLink
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200 group relative',
                isActive
                  ? 'text-on-surface font-medium'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-black/[0.02]',
                collapsed && 'justify-center px-0',
              )}
            >
              {({ isActive }) => (
                <>
                  {/* Thanh accent bên trái khi active */}
                  {isActive && (
                    <div className={cn(
                      'absolute left-0 top-0 bottom-0 w-1',
                      accentMap[item.accent],
                    )} />
                  )}
                  {/* Icon */}
                  <item.icon
                    size={20}
                    className={cn(
                      'flex-shrink-0',
                      isActive ? iconColorMap[item.accent] : '',
                    )}
                  />
                  {/* Label (ẩn khi thu gọn) */}
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
      </nav>

      {/* Footer: Nút thu gọn/mở rộng sidebar */}
      <div className="border-t border-primary p-3">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 py-2 text-on-surface-variant hover:text-on-surface hover:bg-black/[0.02] transition-all"
        >
          {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span className="text-xs">Collapse</span></>}
        </button>
      </div>
    </aside>
  )
}
