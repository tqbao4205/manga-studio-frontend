/**
 * ── constants/index.js ──
 * Định nghĩa các hằng số toàn cục dùng chung trong toàn bộ ứng dụng.
 */

// ─── Thông tin ứng dụng ───

/** Tên ứng dụng, dùng ở title bar, logo, v.v. */
export const APP_NAME = 'MangaFlow'

/** Tagline hiển thị dưới logo hoặc mô tả ngắn */
export const APP_TAGLINE = 'Manga Production Management'

// ─── Vai trò (Roles) ───

/**
 * Ánh xạ role code (lưu trong DB/token) → tên hiển thị cho người dùng.
 */
export const ROLES = {
  MANGAKA: 'Mangaka',
  ASSISTANT: 'Assistant',
  TANTOU_EDITOR: 'Tantou Editor',
  EDITORIAL_BOARD: 'Editorial Board',
}

// ─── Điều hướng (Navigation) ───

/**
 * Danh sách các mục menu hiển thị ở sidebar.
 */
export const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
  { label: 'Manga Series', icon: 'BookOpen', path: '/series' },
  { label: 'Chapters', icon: 'ListTodo', path: '/series' },
  { label: 'Analytics', icon: 'TrendingUp', path: '/rankings' },
  { label: 'Settings', icon: 'Settings', path: '/profile' },
]

// ─── Màu vùng (Region Colors) ───

export const REGION_COLORS = {
  BACKGROUND: '#00d4aa',
  CHARACTER: '#dc2626',
  TEXT: '#fbbf24',
  EFFECT: '#7c3aed',
  TONE: '#2563eb',
  OTHER: '#f472b6',
}
