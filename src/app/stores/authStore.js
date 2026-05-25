import { create } from 'zustand'
import { mockUsers } from '../../shared/constants/mock-data'

/**
 * 📦 authStore — Quản lý xác thực người dùng (đăng nhập/đăng xuất/thông tin phiên làm việc)
 *
 * Hiện tại đang dùng mock data để phát triển frontend.
 * TODO: Khi có backend thật, cần:
 *   - Import authService thay vì mock data
 *   - Kiểm tra accessToken trong localStorage khi app load
 *   - Gọi API thật cho login/logout
 *   - Lưu refreshToken để tự động refresh phiên
 */
export const useAuthStore = create((set) => ({
  // ── State ──────────────────────────────────────────────

  /** Người dùng hiện tại (null nếu chưa đăng nhập) */
  user: mockUsers[0],

  /** Token JWT dùng để xác thực request lên backend */
  accessToken: 'mock-token',

  /** Cờ đánh dấu trạng thái đã xác thực hay chưa */
  isAuthenticated: true,

  /** Cờ loading dùng để hiển thị spinner khi đang xử lý login */
  isLoading: false,

  // ── Actions ────────────────────────────────────────────

  /**
   * Đăng nhập bằng email và password.
   *
   * Quy trình:
   *   1. Bật isLoading để hiển thị spinner
   *   2. Gọi API backend: POST /api/v1/auth/login
   *   3. Nhận AuthResponse { accessToken, refreshToken, user }
   *   4. Lưu accessToken vào state (và localStorage để giữ phiên)
   *   5. Đặt isAuthenticated = true, isLoading = false
   *
   * TODO backend thật:
   *   const res = await authService.login(email, password)
   *   localStorage.setItem('accessToken', res.accessToken)
   *   set({ user: res.user, accessToken: res.accessToken, isAuthenticated: true, isLoading: false })
   */
  login: async (email, _password) => {
    set({ isLoading: true })
    // Mock: giả lập delay 500ms, tìm user theo email (fallback về user đầu tiên)
    await new Promise((r) => setTimeout(r, 500))
    const user = mockUsers.find((u) => u.email === email) || mockUsers[0]
    set({ user, accessToken: 'mock-token', isAuthenticated: true, isLoading: false })
  },

  /**
   * Đăng xuất: xoá thông tin user và token khỏi state.
   *
   * Quy trình:
   *   1. Gọi API backend: POST /api/v1/auth/logout (nếu cần)
   *   2. Xoá accessToken khỏi state & localStorage
   *   3. Đặt user = null, isAuthenticated = false
   *
   * TODO backend thật:
   *   await authService.logout()
   *   localStorage.removeItem('accessToken')
   */
  logout: () => {
    set({ user: null, accessToken: null, isAuthenticated: false })
  },

  /** Cập nhật thông tin user (dùng sau khi chỉnh sửa profile) */
  setUser: (user) => set({ user }),
}))
