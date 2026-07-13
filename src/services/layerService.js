/**
 * ── layerService.js — API cho module Layer ──
 *
 * 🎯 Mục đích:
 *   - Đóng gói các API call liên quan đến Layer (lớp ảnh trong trang vẽ)
 *   - Được workspaceStore.js gọi để load/create/update/delete/reorder layers
 *   - Được LayerPanel.jsx gọi khi người dùng upload ảnh, đổi tên, kéo thả
 *
 * 🔗 API endpoints (base: /api/v1 — LayerController.java dùng @RequestMapping("/api/v1")):
 *   GET    /api/v1/pages/{pageId}/layers              — Danh sách layers của 1 page
 *   GET    /api/v1/layers/{id}                        — Chi tiết 1 layer
 *   POST   /api/v1/pages/{pageId}/layers              — Tạo layer mới (multipart: file + JSON)
 *   PUT    /api/v1/layers/{id}                        — Cập nhật layer properties
 *   DELETE /api/v1/layers/{id}                        — Xoá layer
 *   PUT    /api/v1/layers/{id}/reorder                — Thay đổi sortOrder (drag & drop)
 *
 * 📌 Lưu ý:
 *   - POST /layers nhận multipart/form-data (vì upload file ảnh kèm metadata)
 *   - PUT /layers/{id} là JSON thuần (chỉ cập nhật properties)
 *   - api.js đã unwrap response.data
 */

import api, { UPLOAD_TIMEOUT } from './api';

const layerService = {

  /**
   * Lấy danh sách layers của 1 page (sắp xếp theo sortOrder tăng dần).
   * Endpoint: GET /api/v1/pages/{pageId}/layers
   *
   * @param {number} pageId - ID của page
   * @returns {Promise<Array>} Mảng LayerResponse (id, pageId, label, fileUrl, thumbnailUrl, sortOrder, opacity, visible, blendMode, locked, createdBy, createdAt)
   */
  getByPage: async (pageId) => {
    return api.get(`/v1/pages/${pageId}/layers`);
  },

  /**
   * Lấy chi tiết 1 layer theo ID.
   * Endpoint: GET /api/v1/layers/{id}
   *
   * @param {number} id - ID của layer
   * @returns {Promise<Object>} LayerResponse
   */
  getById: async (id) => {
    return api.get(`/v1/layers/${id}`);
  },

  /**
   * Tạo layer mới trên page (upload file ảnh + metadata).
   * Endpoint: POST /api/v1/pages/{pageId}/layers
   *
   * ⚠️ Gửi multipart/form-data vì có file upload.
   *    FormData gồm:
   *      - file: File ảnh (required)
   *      - label: string (tên layer)
   *      - opacity: number (0-1, mặc định 1)
   *      - blendMode: string (normal | multiply | screen | ...)
   *      - sortOrder: number
   *
   * @param {number} pageId - ID của page
   * @param {FormData} formData - FormData chứa file + metadata
   * @returns {Promise<Object>} LayerResponse vừa tạo
   */
  create: async (pageId, formData) => {
    return api.post(`/v1/pages/${pageId}/layers`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    });
  },

  /**
   * Cập nhật properties của layer (partial update bằng JSON).
   * Endpoint: PUT /api/v1/layers/{id}
   *
   * @param {number} id - ID của layer
   * @param {Object} data - { label?, opacity?, visible?, blendMode?, locked? }
   * @returns {Promise<Object>} LayerResponse đã cập nhật
   */
  update: async (id, data) => {
    return api.put(`/v1/layers/${id}`, data);
  },

  /**
   * Xoá layer (xoá khỏi DB và Cloudinary).
   * Endpoint: DELETE /api/v1/layers/{id}
   *
   * @param {number} id - ID của layer
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    return api.delete(`/v1/layers/${id}`);
  },

  /**
   * Thay đổi sortOrder của layer (dùng khi kéo thả sắp xếp).
   * Endpoint: PUT /api/v1/layers/{id}/reorder
   *
   * Backend dùng @RequestParam, gửi sortOrder qua query string.
   *
   * @param {number} id - ID của layer
   * @param {number} sortOrder - Thứ tự mới (0 = dưới cùng)
   * @returns {Promise<Object>} LayerResponse đã cập nhật sortOrder
   */
  reorder: async (id, sortOrder) => {
    return api.put(`/v1/layers/${id}/reorder?sortOrder=${sortOrder}`);
  },
};

export default layerService;
