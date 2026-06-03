/**
 * ── regionService.js — API cho module Region ──
 *
 * 🎯 Mục đích:
 *   - Đóng gói các API call liên quan đến Region (vùng chọn trên trang vẽ)
 *   - Được workspaceStore.js gọi để load/create/update/delete regions
 *   - Được RegionPanel.jsx gọi khi người dùng thay đổi label, type, status
 *
 * 🔗 API endpoints (base: /api/v1 — Vì PageController.java dùng @RequestMapping("/api/v1")):
 *   GET    /api/v1/pages/{pageId}/regions           — Danh sách regions của 1 page
 *   POST   /api/v1/pages/{pageId}/regions            — Tạo region mới
 *   PUT    /api/v1/regions/{id}                      — Cập nhật region (label, type, toạ độ)
 *   PATCH  /api/v1/regions/{id}/status               — Đổi trạng thái region
 *   DELETE /api/v1/regions/{id}                      — Xoá region
 *   PUT    /api/v1/pages/{pageId}/regions/reorder    — Sắp xếp lại thứ tự regions
 *
 * 📌 Lưu ý:
 *   - api.js đã unwrap response.data, nên service trả về data trực tiếp
 *   - Tất cả endpoints yêu cầu authentication (JWT token tự động gắn qua interceptor)
 */

import api from './api';

const regionService = {

  /**
   * Lấy danh sách regions của 1 page.
   * Endpoint: GET /api/v1/pages/{pageId}/regions
   *
   * @param {number} pageId - ID của page
   * @returns {Promise<Array>} Mảng RegionResponse (mỗi region có id, pageId, regionType, label, x, y, width, height, color, status, sortOrder)
   */
  getByPage: async (pageId) => {
    return api.get(`/v1/pages/${pageId}/regions`);
  },

  /**
   * Tạo region mới trên page.
   * Endpoint: POST /api/v1/pages/{pageId}/regions
   *
   * @param {number} pageId - ID của page
   * @param {Object} data - { regionType, label, x, y, width, height, color }
   * @returns {Promise<Object>} RegionResponse vừa tạo
   */
  create: async (pageId, data) => {
    return api.post(`/v1/pages/${pageId}/regions`, data);
  },

  /**
   * Cập nhật thông tin region (partial update).
   * Endpoint: PUT /api/v1/regions/{id}
   *
   * @param {number} id - ID của region
   * @param {Object} data - Các field muốn cập nhật (label, regionType, x, y, width, height, color)
   * @returns {Promise<Object>} RegionResponse đã cập nhật
   */
  update: async (id, data) => {
    return api.put(`/v1/regions/${id}`, data);
  },

  /**
   * Xoá region (chỉ được xoá khi status = PENDING).
   * Endpoint: DELETE /api/v1/regions/{id}
   *
   * @param {number} id - ID của region
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    return api.delete(`/v1/regions/${id}`);
  },

  /**
   * Sắp xếp lại thứ tự regions trên page (kéo thả).
   * Endpoint: PUT /api/v1/pages/{pageId}/regions/reorder
   *
   * @param {number} pageId - ID của page
   * @param {number[]} regionIds - Mảng region IDs theo thứ tự mới
   * @returns {Promise<Array>} List<RegionResponse> đã sắp xếp
   */
  reorder: async (pageId, regionIds) => {
    return api.put(`/v1/pages/${pageId}/regions/reorder`, { regionIds });
  },
};

export default regionService;
