import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useUIStore } from '../../../app/stores/uiStore'
import { cn } from '../../utils'

/**
 * ── AppShell: Bố cục tổng thể của ứng dụng ──
 *
 * Component layout chính, bao gồm:
 *   - Sidebar (thanh bên trái, có thể thu gọn)
 *   - Topbar (thanh tiêu đề phía trên)
 *   - Main content (Outlet từ React Router)
 *
 * Cách hoạt động:
 *   - Lấy trạng thái sidebarCollapsed từ uiStore để điều chỉnh margin trái
 *   - Dùng location.pathname để xác định tiêu đề trang hiện tại
 *   - Nội dung chính được render thông qua <Outlet /> (React Router nested routes)
 *
 * pageTitles:
 *   - Map đường dẫn gốc (basePath) → tiêu đề hiển thị trên Topbar
 *   - Mặc định 'MangaFlow' nếu không khớp
 */

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/series': 'Series',
  '/review': 'Review',
  '/tasks': 'Tasks',
  '/rankings': 'Rankings',
  '/publishing': 'Publishing',
  '/profile': 'Profile',
}

export function AppShell() {
  const { sidebarCollapsed: collapsed } = useUIStore()
  const location = useLocation()

  // Lấy segment đầu tiên của path để xác định tiêu đề
  const basePath = '/' + location.pathname.split('/')[1]
  const title = pageTitles[basePath] || 'MangaFlow'

  return (
    <div className="min-h-screen bg-[#fdf8f8]">
      {/* Sidebar cố định bên trái */}
      <Sidebar />

      {/* Vùng nội dung chính, margin trái thay đổi theo trạng thái sidebar */}
      <div className={cn(
        'transition-all duration-300',
        collapsed ? 'ml-16' : 'ml-60',
      )}>
        <Topbar title={title} />
        <main className="p-6 max-w-7xl mx-auto">
          {/* Render component con theo route hiện tại */}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
