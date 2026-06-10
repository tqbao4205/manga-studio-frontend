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
 *   POST  /api/v1/pages/{id}/merge                   — Merge layers thành 1 ảnh
 *   POST  /api/v1/pages/{id}/flatten                 — Flatten: merge + replace + xoá layers
 *   PUT   /api/v1/chapters/{chapterId}/pages/reorder — Sắp xếp pages
 *   PUT   /api/v1/pages/{id}/status                  — Cập nhật trạng thái page
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
   * Merge tất cả visible layers của page thành 1 ảnh composite.
   * Endpoint: POST /api/v1/pages/{id}/merge
   *
   * @param {number} pageId - ID của page
   * @returns {Promise<Object>} { finalImageUrl: string }
   */
  merge: async (pageId) => {
    return api.post(`/v1/pages/${pageId}/merge`);
  },

  /**
   * Flatten page: merge layers vào ảnh nền, ghi đè originalImageUrl, xoá toàn bộ layers.
   * Endpoint: POST /api/v1/pages/{id}/flatten
   *
   * @param {number} pageId - ID của page
   * @returns {Promise<Object>} PageResponse (originalImageUrl đã update)
   */
  flatten: async (pageId) => {
    return api.post(`/v1/pages/${pageId}/flatten`, null, { timeout: 180000 });
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

  /**
   * Cập nhật trạng thái page (VD: đánh dấu COMPLETED).
   * Endpoint: PUT /api/v1/pages/{id}/status
   *
   * @param {number} pageId - ID của page
   * @param {string} status - Trạng thái mới (VD: 'COMPLETED')
   * @returns {Promise<Object>} PageResponse
   */
  updateStatus: async (pageId, status) => {
    return api.put(`/v1/pages/${pageId}/status`, { status });
  },
};

export default pageService;
