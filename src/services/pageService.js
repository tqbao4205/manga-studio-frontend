/**
 * ── pageService.js — API cho module Page ──
 *
 * 🎯 Mục đích:
 *   - Đóng gói các API call liên quan đến Page (trang vẽ)
 *   - Được ChapterDetailPage và workspace gọi đến
 *
 * 🔗 API endpoints:
 *   GET   /api/v1/chapters/{chapterId}/pages         — Danh sách pages
 *   POST  /api/v1/chapters/{chapterId}/pages/batch   — Upload nhiều pages
 *   DELETE /api/v1/pages/{id}                        — Xoá page
 *   PUT   /api/v1/chapters/{chapterId}/pages/reorder — Sắp xếp pages
 */

import api from './api';

const pageService = {

  /**
   * Lấy danh sách pages của 1 chapter.
   * Endpoint: GET /api/v1/chapters/{chapterId}/pages
   *
   * @param {number} chapterId - ID của chapter
   * @returns {Promise<Array>} Mảng PageResponse
   */
  getByChapter: async (chapterId) => {
    return api.get(`/v1/chapters/${chapterId}/pages`);
  },

  /**
   * Upload nhiều page cùng lúc.
   * Endpoint: POST /api/v1/chapters/{chapterId}/pages/batch
   *
   * @param {number} chapterId - ID của chapter
   * @param {FormData} formData - FormData chứa field "files"
   * @returns {Promise<Array>} Mảng PageResponse đã tạo
   */
  uploadBatch: async (chapterId, formData) => {
    return api.post(`/v1/chapters/${chapterId}/pages/batch`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Xoá 1 page.
   * Endpoint: DELETE /api/v1/pages/{id}
   *
   * @param {number} pageId - ID của page
   * @returns {Promise<void>}
   */
  delete: async (pageId) => {
    return api.delete(`/v1/pages/${pageId}`);
  },

  /**
   * Sắp xếp lại thứ tự pages (kéo thả).
   * Endpoint: PUT /api/v1/chapters/{chapterId}/pages/reorder
   *
   * @param {number} chapterId - ID của chapter
   * @param {number[]} pageIds - Mảng page IDs theo thứ tự mới
   * @returns {Promise<Array>} List<PageResponse> đã sắp xếp
   */
  reorder: async (chapterId, pageIds) => {
    return api.put(`/v1/chapters/${chapterId}/pages/reorder`, { pageIds });
  },
};

export default pageService;
