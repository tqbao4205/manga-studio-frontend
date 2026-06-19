/**
 * ── notificationStore.js — Quản lý thông báo người dùng ──
 *
 * 🎯 Mục đích:
 *   - Lưu trạng thái notification (dùng Zustand, không phải React state)
 *   - Cung cấp actions: fetchNotifications, markAsRead, markAllAsRead
 *   - Tích hợp WebSocket: addNotification khi nhận event "NOTIFICATION"
 *   - Kết nối WebSocket realtime từ backend
 *
 * 🔗 Liên kết:
 *   - notificationService.js → gọi API backend thật
 *   - authStore.js → handleWebSocketMessage gọi addNotification()
 *   - uiStore.js → show toast khi có notification mới
 *   - NotificationsPanel.jsx → đọc notifications[] để render
 *   - Topbar.jsx → đọc unreadCount để hiển thị badge
 *
 * 🧠 State flow:
 *   ┌────────────────────────────────────────────┐
 *   │ User login → WebSocket kết nối             │
 *   │   ├─ fetchUnreadCount()  → badge trên chuông│
 *   │   └─ fetchNotifications() → list trong panel│
 *   │                                            │
 *   │ Backend push "NOTIFICATION" event          │
 *   │   └─ addNotification(data)                 │
 *   │        ├─ thêm vào đầu notifications[]      │
 *   │        ├─ unreadCount++                    │
 *   │        └─ uiStore.addToast()               │
 *   │                                            │
 *   │ User click "Mark all as read"              │
 *   │   └─ markAllAsRead()                       │
 *   │        ├─ Gọi API PATCH /read-all          │
 *   │        ├─ local set all isRead = true      │
 *   │        └─ unreadCount = 0                  │
 *   └────────────────────────────────────────────┘
 */

import { create } from 'zustand'
import {
  getNotifications,
  getUnreadCount,
  markAsRead as markAsReadApi,
  markAllAsRead as markAllAsReadApi,
} from '../../services/notificationService'

export const useNotificationStore = create((set, get) => ({
  // ══════════════════════════════════════════════════════════════
  //  State — Giá trị khởi tạo
  // ══════════════════════════════════════════════════════════════

  /**
   * notifications: Danh sách notification của user hiện tại.
   * Mảng các object NotificationResponse từ backend:
   *   { id, userId, type, title, message, referenceType,
   *     referenceId, isRead, createdAt }
   * Sắp xếp mới nhất lên đầu (backend đã ORDER BY created_at DESC).
   */
  notifications: [],

  /**
   * unreadCount: Số notification chưa đọc.
   * Dùng để hiển thị badge đỏ trên icon chuông ở Topbar.
   * Giá trị được đồng bộ khi:
   *   - fetchUnreadCount() — lần đầu load
   *   - markAsRead() — giảm đi 1
   *   - markAllAsRead() — set về 0
   *   - addNotification() — tăng lên 1
   */
  unreadCount: 0,

  /**
   * isLoading: true khi đang gọi API fetchNotifications().
   * Dùng để hiển thị skeleton loading trong NotificationsPanel.
   */
  isLoading: false,

  // ══════════════════════════════════════════════════════════════
  //  1. FETCH NOTIFICATIONS — Lấy danh sách từ backend
  // ══════════════════════════════════════════════════════════════

  /**
   * Gọi API GET /api/notifications.
   * Lấy toàn bộ notification của user, mới nhất lên đầu.
   *
   * Quy trình:
   *   1. Bật isLoading = true → UI hiển thị skeleton/spinner
   *   2. Gọi notificationService.getNotifications()
   *   3. Set notifications = data từ backend
   *   4. Tắt isLoading = false
   *
   * Được gọi khi:
   *   - App khởi tạo (sau login)
   *   - User mở NotificationsPanel (nếu list chưa có hoặc cũ)
   */
  fetchNotifications: async () => {
    set({ isLoading: true })
    try {
      const data = await getNotifications()
      set({ notifications: data, isLoading: false })
    } catch (error) {
      // Nếu lỗi (mạng, 401...) → tắt loading, giữ notifications cũ
      console.error('[NotificationStore] Failed to fetch:', error.message)
      set({ isLoading: false })
    }
  },

  // ══════════════════════════════════════════════════════════════
  //  2. FETCH UNREAD COUNT — Lấy số chưa đọc (cho badge)
  // ══════════════════════════════════════════════════════════════

  /**
   * Gọi API GET /api/notifications/unread-count.
   * Cập nhật unreadCount để hiển thị badge trên icon chuông.
   *
   * Response từ backend: { unreadCount: number }
   *
   * Được gọi khi:
   *   - App khởi tạo (authStore.initialize)
   *   - Sau mỗi lần đóng NotificationsPanel (đồng bộ lại)
   */
  fetchUnreadCount: async () => {
    try {
      const result = await getUnreadCount()
      // result = { unreadCount: 5 }
      set({ unreadCount: result.unreadCount })
    } catch (error) {
      console.error('[NotificationStore] Failed to fetch unread count:', error.message)
    }
  },

  // ══════════════════════════════════════════════════════════════
  //  3. MARK AS READ — Đánh dấu 1 notification đã đọc
  // ══════════════════════════════════════════════════════════════

  /**
   * Đánh dấu 1 notification cụ thể là đã đọc.
   *
   * Quy trình:
   *   1. Gọi API PATCH /api/notifications/{id}/read (backend kiểm tra ownership)
   *   2. Cập nhật local: set isRead = true trong mảng notifications
   *   3. Giảm unreadCount đi 1 (nếu > 0)
   *
   * Được gọi khi:
   *   - User click vào 1 notification trong NotificationsPanel
   *
   * @param {number} id - ID của notification cần mark as read
   */
  markAsRead: async (id) => {
    try {
      // Gọi API backend
      await markAsReadApi(id)

      // Cập nhật local state (không cần fetch lại toàn bộ)
      set((state) => ({
        // Tìm notification có id = id, set isRead = true
        // Các notification khác giữ nguyên
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        // Giảm unreadCount, nhưng không xuống dưới 0
        unreadCount: Math.max(0, state.unreadCount - 1),
      }))
    } catch (error) {
      console.error('[NotificationStore] Failed to mark as read:', error.message)
    }
  },

  // ══════════════════════════════════════════════════════════════
  //  4. MARK ALL AS READ — Đánh dấu tất cả đã đọc
  // ══════════════════════════════════════════════════════════════

  /**
   * Đánh dấu tất cả notification của user là đã đọc.
   * Dùng bulk update ở backend — chỉ mất 1 câu SQL.
   *
   * Quy trình:
   *   1. Gọi API PATCH /api/notifications/read-all
   *   2. Cập nhật local: set isRead = true cho tất cả notifications
   *   3. Set unreadCount = 0
   *
   * Được gọi khi:
   *   - User click nút "Mark all as read" trong NotificationsPanel
   */
  markAllAsRead: async () => {
    try {
      // Gọi API backend
      await markAllAsReadApi()

      // Cập nhật local state
      set((state) => ({
        // Map tất cả notification → isRead = true
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        // Đã đọc hết → unreadCount = 0
        unreadCount: 0,
      }))
    } catch (error) {
      console.error('[NotificationStore] Failed to mark all as read:', error.message)
    }
  },

  // ══════════════════════════════════════════════════════════════
  //  5. ADD NOTIFICATION — Thêm notification từ WebSocket
  // ══════════════════════════════════════════════════════════════

  /**
   * Thêm 1 notification mới vào đầu danh sách + tăng unreadCount.
   * Được gọi từ authStore.handleWebSocketMessage khi nhận "NOTIFICATION" event.
   *
   * Quy trình:
   *   1. Thêm notification vào đầu mảng (mới nhất)
   *   2. Tăng unreadCount lên 1
   *   3. Hiển thị toast notification trên góc màn hình
   *
   * Không gọi API — dữ liệu đã được backend persist trước khi push WS.
   *
   * @param {Object} notification - NotificationResponse từ backend
   *   { id, userId, type, title, message, referenceType, referenceId, isRead, createdAt }
   */
  addNotification: (notification) => {
    // Cập nhật state: thêm vào đầu mảng, tăng unreadCount
    set((state) => ({
      // unshift: thêm vào vị trí đầu tiên (mới nhất lên trên)
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }))


  },
}))
