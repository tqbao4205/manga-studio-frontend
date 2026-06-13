/**
 * ─────────────────────────────────────────────
 *  scheduleStore.js — State management cho Schedule
 * ─────────────────────────────────────────────
 *
 * 🎯 Mục đích:
 *   - Quản lý state toàn cục cho module Schedule (lịch xuất bản)
 *   - Cung cấp async action để gọi API backend qua scheduleService
 *   - Component SchedulePage subscribe vào store này
 *
 * 🔄 Pattern (giống seriesStore.js):
 *   - State rỗng ban đầu, gọi API để lấy dữ liệu thật
 *   - Mỗi action là một async function gọi API rồi set state
 *   - Loading / Error state cho component hiển thị trạng thái tương ứng
 *
 * 📦 State structure:
 *   ┌─────────────────┬──────────┬──────────────────────────────────┐
 *   │ State           │ Kiểu     │ Mục đích                         │
 *   ├─────────────────┼──────────┼──────────────────────────────────┤
 *   │ schedules       │ Array    │ Danh sách schedules              │
 *   │ isLoading       │ boolean  │ Đang tải danh sách?              │
 *   │ error           │ string   │ Lỗi khi tải danh sách            │
 *   │ totalElements   │ number   │ Tổng số schedules (cho pagination)│
 *   │ totalPages      │ number   │ Tổng số trang (cho pagination)   │
 *   └─────────────────┴──────────┴──────────────────────────────────┘
 *
 * 🔗 API Mapping (scheduleService.js):
 *   - fetchAll:       GET  /api/schedules?status=&page=&size=
 *   - createSchedule: POST /api/series/{seriesId}/schedule
 *   - removeSchedule: DELETE /api/schedules/{id}
 *   - updateSchedule: PUT   /api/schedules/{id}
 *   - togglePause:    PATCH /api/schedules/{id}/status
 */

import { create } from 'zustand'
import scheduleService from '../../services/scheduleService'

export const useScheduleStore = create((set, get) => ({

  // ────────────────────────────────────────────
  //  STATE — Dữ liệu
  // ────────────────────────────────────────────

  /** Danh sách lịch xuất bản hiện tại */
  schedules: [],

  /** true khi đang gọi API getAll */
  isLoading: false,

  /** message lỗi nếu API getAll thất bại */
  error: null,

  /** Tổng số schedules (hiển thị "Showing X-Y of Z") */
  totalElements: 0,

  /** Tổng số trang (cho pagination component) */
  totalPages: 0,

  // ────────────────────────────────────────────
  //  ACTIONS — Hàm gọi API + cập nhật state
  // ────────────────────────────────────────────

  /**
   * fetchAll: Lấy danh sách schedules từ backend.
   *
   * Được gọi bởi: SchedulePage (trong useEffect)
   * Gửi các params filter lên backend → GET /api/schedules
   * Thành công: Lưu content vào schedules, pagination vào totalPages
   * Thất bại: Lưu message lỗi vào error
   *
   * @param {Object} params - { status, search, page, size }
   */
  fetchAll: async (params = {}) => {
    set({ isLoading: true, error: null })

    try {
      // scheduleService.getAll trả về Page object:
      //   { content: [...], totalElements: 100, totalPages: 5, number: 0, size: 20 }
      const data = await scheduleService.getAll(params)

      set({
        schedules: data.content || [],
        totalElements: data.totalElements || 0,
        totalPages: data.totalPages || 0,
        isLoading: false,
      })
    } catch (err) {
      set({ error: err.message, isLoading: false })
    }
  },

  /**
   * createSchedule: Tạo schedule mới trên backend.
   *
   * Được gọi bởi: SchedulePage (khi submit form CreateScheduleModal)
   * Endpoint: POST /api/series/{seriesId}/schedule
   *
   * @param {number} seriesId - ID của series
   * @param {Object} data     - Body: { scheduleType, dayOfWeek?, dayOfMonth?, startDate }
   * @returns {Promise<void>}
   * @throws {Error} Ném lỗi để component xử lý (toast)
   */
  createSchedule: async (seriesId, data) => {
    try {
      await scheduleService.create(seriesId, data)
      await get().fetchAll()
    } catch (err) {
      throw err
    }
  },

  /**
   * removeSchedule: Xoá schedule trên backend và cập nhật local state.
   *
   * Được gọi bởi: SchedulePage (khi click nút delete)
   * Endpoint: DELETE /api/schedules/{id}
   *
   * @param {number} id - ID của schedule cần xoá
   */
  removeSchedule: async (id) => {
    try {
      await scheduleService.delete(id)

      set((state) => ({
        schedules: state.schedules.filter((s) => s.id !== id),
        totalElements: state.totalElements - 1,
      }))
    } catch (err) {
      console.error('[scheduleStore] removeSchedule failed:', err)
    }
  },

  /**
   * updateSchedule: Cập nhật schedule trên backend và local state.
   *
   * Được gọi bởi: SchedulePage (khi edit / pause / resume / refresh)
   * Endpoint: PUT /api/schedules/{id}
   *
   * @param {number} id      - ID của schedule
   * @param {Object} updates - Cấu hình mới: { scheduleType, dayOfWeek?, dayOfMonth?, startDate }
   */
  updateSchedule: async (id, updates) => {
    try {
      const updated = await scheduleService.update(id, updates)

      set((state) => ({
        schedules: state.schedules.map((s) =>
          s.id === id ? { ...s, ...updated } : s
        ),
      }))
    } catch (err) {
      console.error('[scheduleStore] updateSchedule failed:', err)
    }
  },

  /**
   * toggleScheduleStatus: Đổi trạng thái schedule (PAUSE / RESUME).
   *
   * Được gọi bởi: SchedulePage (khi click nút pause/resume)
   * Endpoint: PATCH /api/schedules/{id}/status
   *
   * @param {number} id      - ID của schedule
   * @param {string} status  - Trạng thái mới: "ACTIVE" | "PAUSED" | "COMPLETED"
   */
  toggleScheduleStatus: async (id, status) => {
    try {
      const updated = await scheduleService.updateStatus(id, { status })

      set((state) => ({
        schedules: state.schedules.map((s) =>
          s.id === id ? { ...s, ...updated } : s
        ),
      }))
    } catch (err) {
      console.error('[scheduleStore] toggleScheduleStatus failed:', err)
      throw err
    }
  },
}))
