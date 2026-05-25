import { create } from 'zustand'
import { mockTasks } from '../../shared/constants/mock-data'

/** Biến đếm ID tự tăng cho task mới */
let nextId = mockTasks.reduce((max, t) => Math.max(max, t.id), 0) + 1

/**
 * 📦 taskStore — Quản lý danh sách công việc (tasks) trong quy trình xuất bản.
 *
 * Cung cấp các thao tác:
 *   - Xem danh sách tasks
 *   - Thêm task mới (tự sinh ID, đồng bộ mockTasks)
 *   - Cập nhật trạng thái task (TODO, IN_PROGRESS, REVIEW, DONE, ...)
 */
export const useTaskStore = create((set) => ({
  /** Danh sách tất cả tasks */
  tasks: mockTasks,

  /** Thêm task mới, đồng thời push vào mockTasks để đồng bộ */
  addTask: (task) =>
    set((state) => {
      const t = { ...task, id: nextId++ }
      mockTasks.push(t)
      return { tasks: [...state.tasks, t] }
    }),

  /** Cập nhật trạng thái của một task (đồng thời cập nhật mockTasks) */
  updateTaskStatus: (taskId, status) =>
    set((state) => {
      const found = state.tasks.find(t => t.id === taskId)
      if (found) found.status = status
      return { tasks: state.tasks.map((t) => t.id === taskId ? { ...t, status } : t) }
    }),
}))
