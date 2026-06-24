/**
 * ── taskStore.js — State quản lý Task (kết nối API thật) ──
 *
 * 🎯 Mục đích:
 *   - Quản lý tasks, submissions, attachments cho workspace
 *   - Các async actions gọi API qua taskService
 *   - Tasks được lưu theo region (tasksByRegion) để dễ filter
 *
 * 📌 Luồng dữ liệu:
 *   ┌──────────────┐     ┌──────────┐     ┌─────────────┐
 *   │ RegionPanel  │────→│ taskStore│────→│ taskService │
 *   │ (chọn region)│←────│ (async)  │←────│ (Axios)     │
 *   └──────────────┘     └──────────┘     └─────────────┘
 *
 * 📌 State structure:
 *   - tasksByRegion: { [regionId]: Task[] }  — Tasks theo region
 *   - currentTaskId: number|null             — Task đang xem chi tiết
 *   - currentSubmissions: Submission[]        — Submissions của task hiện tại
 *   - isLoading, isSubmitting                — Loading states
 */

import { create } from 'zustand';
import taskService from '../../services/taskService';

export const useTaskStore = create((set, get) => ({

  // ═══════════════════════════════════════════
  //  STATE
  // ═══════════════════════════════════════════

  /** Map regionId → tasks[] — tasks của từng region */
  tasksByRegion: {},

  /** Task đang được chọn/xem chi tiết */
  currentTaskId: null,

  /** Submissions của task hiện tại (gọi từ loadSubmissions) */
  currentSubmissions: [],

  /** Đang load tasks từ API */
  isLoading: false,

  /** Đang submit/review (để disable nút) */
  isSubmitting: false,

  // ═══════════════════════════════════════════
  //  PURE STATE ACTIONS
  // ═══════════════════════════════════════════

  /**
   * Chọn task để xem chi tiết (không gọi API).
   * @param {number|null} taskId
   */
  selectTask: (taskId) => set({ currentTaskId: taskId }),

  // ═══════════════════════════════════════════
  //  TASKS — ASYNC ACTIONS
  // ═══════════════════════════════════════════

  /**
   * Load tasks của 1 region.
   * Endpoint: GET /api/regions/{regionId}/tasks
   *
   * @param {number} regionId - ID của region
   */
  loadTasks: async (regionId) => {
    set({ isLoading: true });
    try {
      const tasks = await taskService.getByRegion(regionId);
      set((s) => ({
        tasksByRegion: { ...s.tasksByRegion, [regionId]: tasks || [] },
        isLoading: false,
      }));
    } catch (err) {
      console.error('[taskStore] loadTasks failed:', err);
      set({ isLoading: false });
    }
  },

  /**
   * Tạo task mới (MANGAKA assign task cho ASSISTANT).
   * Endpoint: POST /api/regions/{regionId}/tasks
   *
   * @param {number} regionId - ID của region
   * @param {Object} data - { title, description, notes, priority, dueDate, regionType, assistantId, pageImageUrl, referenceImageUrl }
   */
  createTask: async (regionId, data) => {
    try {
      await taskService.create(regionId, data);
      await get().loadTasks(regionId);
    } catch (err) {
      console.error('[taskStore] createTask failed:', err);
      throw err;
    }
  },

  /**
   * Tạo task cho nhiều regions bằng endpoint chuẩn theo từng region.
   * Endpoint: POST /api/regions/{regionId}/tasks
   *
   * @param {number[]} regionIds - Mảng IDs của regions
   * @param {Object} data - { title, description, notes, priority, dueDate, assistantId }
   */
  createTasksForRegions: async (regionIds, data) => {
    try {
      await Promise.all(regionIds.map((id) => taskService.create(id, data)));
      await Promise.all(regionIds.map((id) => get().loadTasks(id)));
    } catch (err) {
      console.error('[taskStore] createTasksForRegions failed:', err);
      throw err;
    }
  },

  /**
   * Cập nhật trạng thái task.
   * Endpoint: PATCH /api/tasks/{id}/status
   *
   * @param {number} taskId - ID của task
   * @param {string} status - TODO | IN_PROGRESS | REVISE
   */
  updateTaskStatus: async (taskId, status) => {
    try {
      const updated = await taskService.updateStatus(taskId, status);
      // Cập nhật local state
      set((s) => {
        const newMap = { ...s.tasksByRegion };
        Object.keys(newMap).forEach((regionId) => {
          newMap[regionId] = newMap[regionId].map((t) =>
            t.id === taskId ? { ...t, ...updated } : t,
          );
        });
        return { tasksByRegion: newMap };
      });
    } catch (err) {
      console.error('[taskStore] updateTaskStatus failed:', err);
    }
  },

  /**
   * Xoá task (chỉ khi TODO).
   * Endpoint: DELETE /api/tasks/{id}
   *
   * @param {number} taskId - ID của task
   */
  deleteTask: async (taskId) => {
    try {
      await taskService.delete(taskId);
      // Xoá khỏi local state
      set((s) => {
        const newMap = { ...s.tasksByRegion };
        Object.keys(newMap).forEach((regionId) => {
          newMap[regionId] = newMap[regionId].filter(
            (t) => t.id !== taskId,
          );
        });
        return { tasksByRegion: newMap };
      });
    } catch (err) {
      console.error('[taskStore] deleteTask failed:', err);
    }
  },

  // ═══════════════════════════════════════════
  //  SUBMISSIONS — ASYNC ACTIONS
  // ═══════════════════════════════════════════

  /**
   * Load lịch sử submissions của 1 task.
   * Endpoint: GET /api/tasks/{taskId}/submissions
   *
   * @param {number} taskId - ID của task
   */
  loadSubmissions: async (taskId) => {
    try {
      const submissions = await taskService.getSubmissions(taskId);
      set({ currentSubmissions: submissions || [] });
    } catch (err) {
      console.error('[taskStore] loadSubmissions failed:', err);
    }
  },

  /**
   * ASSISTANT nộp bài (upload ảnh kết quả + ghi chú).
   * Endpoint: POST /api/tasks/{taskId}/submissions (multipart)
   *
   * @param {number} taskId - ID của task
   * @param {FormData} formData - FormData chứa resultImage + sourceFile + note
   */
  submitTask: async (taskId, formData) => {
    set({ isSubmitting: true });
    try {
      const submission = await taskService.submit(taskId, formData);
      // Cập nhật local status của task thành SUBMITTED
      set((s) => {
        const newMap = { ...s.tasksByRegion };
        Object.keys(newMap).forEach((regionId) => {
          newMap[regionId] = newMap[regionId].map((t) =>
            t.id === taskId ? { ...t, status: 'SUBMITTED' } : t,
          );
        });
        return { tasksByRegion: newMap };
      });
      // Reload submissions
      await get().loadSubmissions(taskId);
      set({ isSubmitting: false });
      return submission;
    } catch (err) {
      console.error('[taskStore] submitTask failed:', err);
      set({ isSubmitting: false });
      throw err;
    }
  },

  /**
   * MANGAKA duyệt bài (APPROVED hoặc yêu cầu revision).
   * Endpoint: PATCH /api/submissions/{id}/status
   *
   * @param {number} submissionId - ID của submission
   * @param {string} status - APPROVED | REVISION_REQUIRED
   * @param {string} [note] - Ghi chú cho ASSISTANT
   */
  reviewSubmission: async (submissionId, status, note) => {
    set({ isSubmitting: true });
    try {
      const updated = await taskService.reviewSubmission(
        submissionId,
        status,
        note,
      );
      // Cập nhật local submissions list
      set((s) => ({
        currentSubmissions: s.currentSubmissions.map((sub) =>
          sub.id === submissionId ? { ...sub, ...updated } : sub,
        ),
        isSubmitting: false,
      }));
      return updated;
    } catch (err) {
      console.error('[taskStore] reviewSubmission failed:', err);
      set({ isSubmitting: false });
      return null;
    }
  },

  // ═══════════════════════════════════════════
  //  ATTACHMENTS — ASYNC ACTIONS
  // ═══════════════════════════════════════════

  /**
   * Đính kèm file tham khảo vào task (MANGAKA gửi tài liệu cho ASSISTANT).
   * Endpoint: POST /api/tasks/{taskId}/attachments (multipart)
   *
   * @param {number} taskId - ID của task
   * @param {FormData} formData - FormData chứa file
   */
  addAttachment: async (taskId, formData) => {
    try {
      await taskService.addAttachment(taskId, formData);
    } catch (err) {
      console.error('[taskStore] addAttachment failed:', err);
    }
  },

  // ═══════════════════════════════════════════
  //  RESET
  // ═══════════════════════════════════════════

  reset: () =>
    set({
      tasksByRegion: {},
      currentTaskId: null,
      currentSubmissions: [],
      isLoading: false,
      isSubmitting: false,
    }),
}));
