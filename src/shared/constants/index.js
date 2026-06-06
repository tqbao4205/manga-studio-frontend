/**
 * ── constants/index.js ──
 * Định nghĩa các hằng số toàn cục dùng chung trong toàn bộ ứng dụng.
 *
 * 🎯 Mục đích:
 *   - Tập trung tất cả hằng số (tên app, vai trò, menu, màu sắc,...)
 *     vào một nơi duy nhất để dễ bảo trì và tránh "magic string"
 *
 * Nội dung:
 *   - APP_NAME, APP_TAGLINE → thông tin nhận diện ứng dụng
 *   - ROLES               → ánh xạ role code → tên hiển thị
 *   - NAV_ITEMS           → cấu menu điều hướng (sidebar/topbar)
 *   - REGION_COLORS       → bảng màu cho từng loại vùng (region) trên trang manga
 */

// ─── Thông tin ứng dụng ───

/** Tên ứng dụng, dùng ở title bar, logo, v.v. */
export const APP_NAME = 'MangaFlow'

/** Tagline hiển thị dưới logo hoặc mô tả ngắn */
export const APP_TAGLINE = 'Manga Production Management'

// ─── Vai trò (Roles) ───

/**
 * Ánh xạ role code (lưu trong DB/token) → tên hiển thị cho người dùng.
 *
 * Các role hiện có:
 *   MANGAKA          → tác giả (vẽ truyện)
 *   ASSISTANT        → trợ lý (hỗ trợ vẽ)
 *   TANTOU_EDITOR    → biên tập viên phụ trách (tantou)
 *   EDITORIAL_BOARD  → ban biên tập (phê duyệt xuất bản)
 */
export const ROLES = {
  MANGAKA: 'Mangaka',
  ASSISTANT: 'Assistant',
  TANTOU_EDITOR: 'Tantou Editor',
  EDITORIAL_BOARD: 'Editorial Board',
}

// ─── Điều hướng (Navigation) ───

/**
 * Danh sách các mục menu hiển thị ở sidebar/topbar.
 *
 * @type {Array<{label: string, icon: string, path: string, roles: string[]}>}
 *
 *   - label: tên hiển thị trên menu
 *   - icon:  tên icon (dùng thư viện Lucide/Feather)
 *   - path:  đường dẫn URL
 *   - roles: danh sách role được phép xem mục này ('ALL' = tất cả)
 */
export const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard', roles: ['ALL'] },
  { label: 'Series', icon: 'BookOpen', path: '/series', roles: ['ALL'] },
  { label: 'Workspace', icon: 'PenTool', path: '/workspace', roles: ['MANGAKA', 'ASSISTANT'] },
  { label: 'Publishing', icon: 'Calendar', path: '/publishing', roles: ['EDITORIAL_BOARD'] },
  { label: 'Editorial Vote', icon: 'Vote', path: '/publishing/votes', roles: ['EDITORIAL_BOARD'] },
  { label: 'Rankings', icon: 'TrendingUp', path: '/rankings', roles: ['ALL'] },
]

// ─── Màu vùng (Region Colors) ───

/**
 * Bảng màu cho từng loại region trên trang manga.
 *
 * NOTE: utils.js có getRegionTypeColor() dùng cùng bảng màu này.
 *       Khi thay đổi màu ở đây, nhớ cập nhật cả bên utils.js.
 *
 *   BACKGROUND → màu xanh lá (nền)
 *   CHARACTER  → màu đỏ    (nhân vật)
 *   TEXT       → màu vàng  (chữ/bóng thoại)
 *   EFFECT     → màu tím   (hiệu ứng)
 *   TONE       → màu xanh dương (tone/screen)
 *   OTHER      → màu hồng  (loại khác)
 */
export const REGION_COLORS = {
  BACKGROUND: '#00d4aa',
  CHARACTER: '#dc2626',
  TEXT: '#fbbf24',
  EFFECT: '#7c3aed',
  TONE: '#2563eb',
  OTHER: '#f472b6',
}
