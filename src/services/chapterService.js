/**
 * ── chapterService.js — API cho module Chapter ──
 *
 * 🎯 Mục đích:
 *   - Đóng gói các API call liên quan đến Chapter
 *   - Được seriesStore.js và các page gọi đến
 *
 * 🔗 API endpoints:
 *   GET    /api/series/{seriesId}/chapters  — Danh sách chapters của series
 *   GET    /api/chapters/{id}              — Chi tiết chapter
 *   POST   /api/series/{seriesId}/chapters — Tạo chapter mới
 *   PUT    /api/chapters/{id}              — Cập nhật chapter
 *   DELETE /api/chapters/{id}              — Xoá chapter
 *   POST   /api/chapters/{id}/submit                  — Submit cho tantou review
 *   POST   /api/chapters/{id}/tantou/approve          — Tantou approve
 *   POST   /api/chapters/{id}/tantou/reject           — Tantou reject
 *   POST   /api/chapters/{id}/tantou/request-revision — Tantou yêu cầu revision
 *   POST   /api/chapters/{id}/publish                 — Tantou publish
 */

import api from './api';

const chapterService = {

  /**
   * Lấy danh sách chapters của 1 series.
   * Endpoint: GET /api/series/{seriesId}/chapters
   *
   * @param {number} seriesId - ID của series
   * @returns {Promise<Array>} Mảng ChapterResponse
   */
  getBySeries: async (seriesId) => {
    return api.get(`/series/${seriesId}/chapters`);
  },

  /**
   * Lấy chi tiết 1 chapter theo ID.
   * Endpoint: GET /api/chapters/{id}
   *
   * @param {number} id - ID của chapter
   * @returns {Promise<Object>} ChapterResponse
   */
  getById: async (id) => {
    return api.get(`/chapters/${id}`);
  },

  /**
   * Tạo chapter mới trong series.
   * Endpoint: POST /api/series/{seriesId}/chapters
   *
   * @param {number} seriesId - ID của series
   * @param {Object} data - { chapterNumber, title, pageCount, deadline }
   * @returns {Promise<Object>} ChapterResponse
   */
  create: async (seriesId, data) => {
    return api.post(`/series/${seriesId}/chapters`, data);
  },

  /**
   * Cập nhật thông tin chapter.
   * Endpoint: PUT /api/chapters/{id}
   *
   * @param {number} id - ID của chapter
   * @param {Object} data - Các field muốn cập nhật
   * @returns {Promise<Object>} ChapterResponse
   */
  update: async (id, data) => {
    return api.put(`/chapters/${id}`, data);
  },

  /**
   * Xoá chapter (chỉ DRAFT).
   * Endpoint: DELETE /api/chapters/{id}
   *
   * @param {number} id - ID của chapter
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    return api.delete(`/chapters/${id}`);
  },

  // ════════════════════════════════════════════
  //  WORKFLOW — State machine transitions
  // ════════════════════════════════════════════

  submitForReview: async (id) => {
    return api.post(`/chapters/${id}/submit`);
  },

  tantouApprove: async (id) => {
    return api.post(`/chapters/${id}/tantou/approve`);
  },

  tantouRequestRevision: async (id) => {
    return api.post(`/chapters/${id}/tantou/request-revision`);
  },

  publish: async (id) => {
    return api.post(`/chapters/${id}/publish`);
  },
};

export default chapterService;
