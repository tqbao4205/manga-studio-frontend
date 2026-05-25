import { create } from 'zustand'

/** Biến đếm ID cho toast (tự tăng mỗi khi thêm toast) */
let toastId = 0

/**
 * 📦 uiStore (src/app/stores/uiStore.js) — Quản lý trạng thái giao diện người dùng (UI).
 *
 * Các chức năng:
 *   - Sidebar thu gọn/mở rộng
 *   - Modal động (hiện/ẩn theo ID)
 *   - Toast notification (thêm/xoá/tự động ẩn sau 5 giây)
 */
export const useUIStore = create((set) => ({
  /** Trạng thái sidebar: true = thu gọn, false = mở rộng */
  sidebarCollapsed: false,

  /** ID của modal đang mở (null = không có modal nào) */
  activeModal: null,

  /** Danh sách toast notification đang hiển thị */
  toasts: [],

  /** Bật/tắt trạng thái thu gọn sidebar */
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  /** Hiển thị modal theo ID */
  showModal: (modalId) => set({ activeModal: modalId }),

  /** Ẩn modal hiện tại */
  hideModal: () => set({ activeModal: null }),

  /**
   * Thêm toast notification mới.
   * Toast tự động bị xoá sau 5 giây qua setTimeout.
   * Có thể xoá thủ công trước hạn bằng removeToast.
   */
  addToast: (toast) => {
    const id = String(++toastId)
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 5000)
  },

  /** Xoá toast theo ID (dùng khi người dùng đóng thủ công) */
  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))
