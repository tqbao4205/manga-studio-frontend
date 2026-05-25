import { create } from 'zustand'
import { mockSchedules } from '../../shared/constants/mock-data'

/** Biến đếm ID tự tăng cho schedule mới (dựa trên max ID có sẵn) */
let nextId = mockSchedules.reduce((max, s) => Math.max(max, s.id), 0) + 1

/**
 * 📦 scheduleStore — Quản lý danh sách lịch trình ấn phẩm (schedule/release calendar).
 *
 * Cung cấp các thao tác CRUD cơ bản:
 *   - Xem danh sách schedules
 *   - Thêm schedule mới (tự sinh ID)
 *   - Xoá schedule theo ID
 */
export const useScheduleStore = create((set) => ({
  /** Danh sách lịch trình hiện tại */
  schedules: mockSchedules,

  /** Thêm một schedule mới với ID tự động tăng */
  addSchedule: (schedule) =>
    set((state) => ({
      schedules: [...state.schedules, { ...schedule, id: nextId++ }],
    })),

  /** Xoá schedule theo ID */
  removeSchedule: (id) =>
    set((state) => ({
      schedules: state.schedules.filter((s) => s.id !== id),
    })),
}))
