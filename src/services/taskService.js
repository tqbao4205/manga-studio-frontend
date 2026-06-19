/**
 * ── taskService.js — API cho module Task ──
 *
 * 🎯 Mục đích:
 *   - Đóng gói các API call liên quan đến Task, Submission, Attachment
 *   - Được taskStore.js gọi để CRUD tasks, submit bài, review
 *   - Được TaskPanel.jsx gọi khi assign, submit, approve/reject
 *
 * 🔗 API endpoints (base: /api — KHÔNG có v1, vì TaskController.java dùng @RequestMapping("/api")):
 *   === TASKS ===
 *   GET    /api/tasks                                — Danh sách tasks (có filter, pagination)
 *   GET    /api/tasks/{id}                           — Chi tiết task (kèm submissions + attachments)
 *   GET    /api/regions/{regionId}/tasks             — Tasks của 1 region
 *   POST   /api/regions/{regionId}/tasks             — Tạo task mới
 *   PUT    /api/tasks/{id}                           — Cập nhật task
 *   PATCH  /api/tasks/{id}/status                    — Đổi trạng thái task
 *   DELETE /api/tasks/{id}                           — Xoá task
 *
 *   === SUBMISSIONS ===
 *   GET    /api/tasks/{taskId}/submissions           — Lịch sử submissions của task
   * POST   /api/tasks/{taskId}/submissions           — Submit (multipart)
 *   PATCH  /api/submissions/{id}/status              — Duyệt bài (APPROVED/REVISION_REQUIRED)
 *
 *   === ATTACHMENTS ===
 *   POST   /api/tasks/{taskId}/attachments           — Đính kèm file tham khảo (multipart)
 *   DELETE /api/attachments/{id}                     — Xoá file đính kèm
 *
 * 📌 Lưu ý:
 *   - TaskController KHÔNG dùng /api/v1 — khác với Page/Layer/Region
 *   - POST submissions và POST attachments dùng multipart/form-data (có upload file)
 *   - Các GET endpoints có hỗ trợ filter params (status, assignedTo, priority, ...)
 */

import api from './api';

const taskService = {

  // ═══════════════════════════════════════
  //  TASKS
  // ═══════════════════════════════════════

  /**
   * Lấy danh sách tasks với filter & phân trang.
   * Endpoint: GET /api/tasks
   *
   * @param {Object} [params] - { status?, assignedTo?, priority?, regionId?, page?, size? }
   * @returns {Promise<Object>} { content: TaskResponse[], page, size, totalElements, totalPages }
   */
  getAll: async (params) => {
    return api.get('/tasks', { params });
  },

  /**
   * Lấy chi tiết 1 task (kèm submissions + attachments).
   * Endpoint: GET /api/tasks/{id}
   *
   * @param {number} id - ID của task
   * @returns {Promise<Object>} TaskResponse (có submissions[] + attachments[])
   */
  getById: async (id) => {
    return api.get(`/tasks/${id}`);
  },

  /**
   * Lấy danh sách tasks của 1 region.
   * Endpoint: GET /api/regions/{regionId}/tasks
   *
   * @param {number} regionId - ID của region
   * @returns {Promise<Array>} Mảng TaskResponse
   */
  getByRegion: async (regionId) => {
    return api.get(`/regions/${regionId}/tasks`);
  },

  /**
   * Tạo task mới cho 1 region (MANGAKA assign cho ASSISTANT).
   * Endpoint: POST /api/regions/{regionId}/tasks
   *
   * Body mẫu:
   * {
   *   title: "Castle Background — Page 1",
   *   description: "...",
   *   notes: "...",
   *   priority: "HIGH",
   *   dueDate: "2026-06-10",
   *   regionType: "BACKGROUND",
   *   assistantId: 2,
   *   pageImageUrl: "...",
   *   referenceImageUrl: "..."
   * }
   *
   * @param {number} regionId - ID của region
   * @param {Object} data - TaskCreateRequest
   * @returns {Promise<Object>} TaskResponse vừa tạo (status = TODO)
   */
  create: async (regionId, data) => {
    return api.post(`/regions/${regionId}/tasks`, data);
  },

  /**
   * Tạo 1 task mới cho nhiều regions.
   * Endpoint: POST /api/tasks/batch
   *
   * Body: { regionIds: [...], title, description, notes, ... }
   *
   * @param {number[]} regionIds - Mảng IDs của regions
   * @param {Object} data - TaskCreateRequest (không bao gồm regionIds)
   * @returns {Promise<Object>} TaskResponse vừa tạo
   */
  createBatch: async (regionIds, data) => {
    return api.post('/tasks/batch', { regionIds, ...data });
  },

  /**
   * Cập nhật thông tin task (chỉ khi TODO hoặc REVISE).
   * Endpoint: PUT /api/tasks/{id}
   *
   * @param {number} id - ID của task
   * @param {Object} data - Các field muốn cập nhật
   * @returns {Promise<Object>} TaskResponse đã cập nhật
   */
  update: async (id, data) => {
    return api.put(`/tasks/${id}`, data);
  },

  /**
   * Thay đổi trạng thái task.
   * Endpoint: PATCH /api/tasks/{id}/status
   *
   * Chuyển đổi hợp lệ:
    *   TODO → IN_PROGRESS (ASSISTANT accepts)
    *   REVISE → IN_PROGRESS (ASSISTANT retries)
   *
   * @param {number} id - ID của task
   * @param {string} status - Trạng thái mới (TODO | IN_PROGRESS | REVISE)
   * @returns {Promise<Object>} TaskResponse đã cập nhật status
   */
  updateStatus: async (id, status) => {
    return api.patch(`/tasks/${id}/status`, { status });
  },

  /**
   * Xoá task (chỉ khi status = TODO).
   * Endpoint: DELETE /api/tasks/{id}
   *
   * @param {number} id - ID của task
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    return api.delete(`/tasks/${id}`);
  },

  // ═══════════════════════════════════════
  //  SUBMISSIONS
  // ═══════════════════════════════════════

  /**
   * Lấy lịch sử submissions của 1 task (mới nhất trước).
   * Endpoint: GET /api/tasks/{taskId}/submissions
   *
   * @param {number} taskId - ID của task
   * @returns {Promise<Array>} Mảng SubmissionResponse
   */
  getSubmissions: async (taskId) => {
    return api.get(`/tasks/${taskId}/submissions`);
  },

  /**
   * ASSISTANT nộp bài cho task.
   * Endpoint: POST /api/tasks/{taskId}/submissions
   *
   * ⚠️ Gửi multipart/form-data vì có upload file ảnh.
   *    FormData gồm:
   *      - resultImage: File ảnh kết quả (required)
   *      - sourceFile: File nguồn (optional, .psd/.clip)
   *      - note: string (ghi chú cho MANAGA)
   *
   * @param {number} taskId - ID của task
   * @param {FormData} formData - FormData chứa resultImage + sourceFile + note
   * @returns {Promise<Object>} SubmissionResponse (status = SUBMITTED)
   */
  submit: async (taskId, formData) => {
    return api.post(`/tasks/${taskId}/submissions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },

  /**
   * MANGAKA duyệt bài submission (APPROVED hoặc yêu cầu sửa).
   * Endpoint: PATCH /api/submissions/{id}/status
   *
   * @param {number} submissionId - ID của submission
   * @param {string} status - APPROVED | REVISION_REQUIRED
   * @param {string} [note] - Ghi chú cho ASSISTANT (bắt buộc nếu REVISION_REQUIRED)
   * @returns {Promise<Object>} SubmissionResponse đã cập nhật
   */
  reviewSubmission: async (submissionId, status, note) => {
    return api.patch(`/submissions/${submissionId}/status`, { status, note });
  },

  // ═══════════════════════════════════════
  //  ATTACHMENTS
  // ═══════════════════════════════════════

  /**
   * Đính kèm file tham khảo vào task (MANGAKA gửi tài liệu cho ASSISTANT).
   * Endpoint: POST /api/tasks/{taskId}/attachments
   *
   * ⚠️ Gửi multipart/form-data.
   *    FormData: { file: File }
   *
   * @param {number} taskId - ID của task
   * @param {FormData} formData - FormData chứa file
   * @returns {Promise<Object>} AttachmentResponse
   */
  addAttachment: async (taskId, formData) => {
    return api.post(`/tasks/${taskId}/attachments`, formData, {
      timeout: 120000,
    });
  },

  /**
   * Xoá file đính kèm.
   * Endpoint: DELETE /api/attachments/{id}
   *
   * @param {number} id - ID của attachment
   * @returns {Promise<void>}
   */
  deleteAttachment: async (id) => {
    return api.delete(`/attachments/${id}`);
  },
};

export default taskService;
