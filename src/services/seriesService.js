/**
 * ── seriesService.js — API cho module Series ──
 *
 * 🎯 Mục đích:
 *   - Đóng gói các API call liên quan đến Series (CRUD + workflow)
 *   - Được seriesStore.js và các page gọi đến
 *
 * 🔗 API endpoints:
 *   GET    /api/series               — Danh sách series (filter + phân trang)
 *   GET    /api/series/{id}          — Chi tiết series
 *   POST   /api/series               — Tạo series (multipart)
 *   PUT    /api/series/{id}          — Cập nhật series (multipart)
 *   DELETE /api/series/{id}          — Xoá series (chỉ DRAFT)
 *   POST   /api/series/{id}/submit   — Gửi duyệt
 *   POST   /api/series/{id}/approve  — Duyệt series
 *   POST   /api/series/{id}/reject   — Từ chối
 *   PATCH  /api/series/{id}/status   — Đổi trạng thái
 */

import api from './api';

const seriesService = {

  /**
   * Lấy danh sách series (có filter + phân trang).
   * Endpoint: GET /api/series
   *
   * @param {Object} params - { status, genre, search, page, size, sort }
   * @returns {Promise<Object>} Page<SeriesResponse>
   */
  getAll: async (params = {}) => {
    const query = {};
    if (params.status && params.status !== 'ALL') query.status = params.status;
    if (params.genre && params.genre !== 'ALL') query.genre = params.genre;
    if (params.search) query.search = params.search;
    if (params.page != null) query.page = params.page;
    if (params.size != null) query.size = params.size;
    if (params.sort) query.sort = params.sort;

    return api.get('/series', { params: query });
  },

  /**
   * Lấy chi tiết 1 series theo ID.
   * Endpoint: GET /api/series/{id}
   *
   * @param {number} id - ID của series
   * @returns {Promise<Object>} SeriesResponse
   */
  getById: async (id) => {
    return api.get(`/series/${id}`);
  },

  /**
   * Tạo series mới (kèm upload ảnh bìa).
   * Endpoint: POST /api/series (multipart/form-data)
   *
   * @param {FormData} formData - FormData chứa "series" (JSON) + "file" (ảnh)
   * @returns {Promise<Object>} SeriesResponse
   */
  create: async (formData) => {
    return api.post('/series', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Cập nhật series (có thể kèm ảnh bìa mới).
   * Endpoint: PUT /api/series/{id} (multipart/form-data)
   *
   * @param {number} id - ID của series
   * @param {FormData} formData - FormData chứa "series" (JSON) + "file" (optional)
   * @returns {Promise<Object>} SeriesResponse
   */
  update: async (id, formData) => {
    return api.put(`/series/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Xoá series (chỉ DRAFT).
   * Endpoint: DELETE /api/series/{id}
   *
   * @param {number} id - ID của series
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    return api.delete(`/series/${id}`);
  },

  /**
   * Gửi series lên chờ duyệt (DRAFT → PENDING_APPROVAL).
   * Endpoint: POST /api/series/{id}/submit
   *
   * @param {number} id - ID của series
   * @returns {Promise<Object>} SeriesResponse
   */
  submitForApproval: async (id) => {
    return api.post(`/series/${id}/submit`);
  },

  /**
   * Duyệt series (PENDING_APPROVAL → ONGOING) + gán Tantou Editor.
   * Endpoint: POST /api/series/{id}/approve
   *
   * @param {number} id - ID của series
   * @param {Object} request - { tantouEditorId: number }
   * @returns {Promise<Object>} SeriesResponse
   */
  approve: async (id, request) => {
    return api.post(`/series/${id}/approve`, request);
  },

  /**
   * Từ chối series (PENDING_APPROVAL → DRAFT).
   * Endpoint: POST /api/series/{id}/reject
   *
   * @param {number} id - ID của series
   * @param {Object} request - { notes: string }
   * @returns {Promise<Object>} SeriesResponse
   */
  reject: async (id, request) => {
    return api.post(`/series/${id}/reject`, request);
  },

  /**
   * Đổi trạng thái series (ONGOING, HIATUS, CANCELLED, COMPLETED).
   * Endpoint: PATCH /api/series/{id}/status
   *
   * @param {number} id - ID của series
   * @param {Object} request - { status: "ONGOING" | "HIATUS" | ... }
   * @returns {Promise<Object>} SeriesResponse
   */
  updateStatus: async (id, request) => {
    return api.patch(`/series/${id}/status`, request);
  },

  // ═══════════════════════════════════════════════
  //  TANTOU — Mời / Xem / Xoá / Phản hồi
  // ═══════════════════════════════════════════════

  /**
   * MANGAKA gửi lời mời TANTOU_EDITOR vào series.
   * POST /api/series/{seriesId}/tantou/invite
   * Body: { tantouId }
   */
  inviteTantou: async (seriesId, tantouId) => {
    return api.post(`/series/${seriesId}/tantou/invite`, { tantouId });
  },

  /**
   * Xem danh sách lời mời tantou của series.
   * GET /api/series/{seriesId}/tantou/invitations
   */
  getTantouInvitations: async (seriesId) => {
    return api.get(`/series/${seriesId}/tantou/invitations`);
  },

  /**
   * MANGAKA / EB xoá l?i m?i tantou kh?i series.
   * DELETE /api/series/{seriesId}/tantou/{tantouId}
   */
  removeTantouInvitation: async (seriesId, tantouId) => {
    return api.delete(`/series/${seriesId}/tantou/${tantouId}`);
  },

  /**
   * TANTOU_EDITOR xem danh sách l?i m?i PENDING c?a mình.
   * GET /api/tantou/invitations
   */
  getMyTantouInvitations: async () => {
    return api.get('/tantou/invitations');
  },

  /**
   * TANTOU_EDITOR ph?n h?i l?i m?i (ACCEPTED / REJECTED).
   * PATCH /api/tantou/invitations/{invitationId}
   * Body: { status }
   */
  respondTantouInvitation: async (invitationId, status) => {
    return api.patch(`/tantou/invitations/${invitationId}`, { status });
  },

  // ═══════════════════════════════════════════════
  //  SERIES WORKFLOW — Submit / Approve / Reject
  // ═══════════════════════════════════════════════

  /**
   * MANGAKA submit series cho tantou review.
   * DRAFT → PENDING_TANTOU
   * POST /api/series/{seriesId}/submit
   */
  submitTantou: async (seriesId) => {
    return api.post(`/series/${seriesId}/submit`);
  },

  /**
   * TANTOU_EDITOR duy?t series.
   * PENDING_TANTOU → PENDING_BOARD_VOTE
   * POST /api/series/{seriesId}/tantou/approve
   */
  tantouApprove: async (seriesId) => {
    return api.post(`/series/${seriesId}/tantou/approve`);
  },

  /**
   * TANTOU_EDITOR từ chối series.
   * PENDING_TANTOU → DRAFT
   * POST /api/series/{seriesId}/tantou/reject
   * Body: { reason }
   */
  tantouReject: async (seriesId) => {
    return api.post(`/series/${seriesId}/tantou/reject`);
  },
};

export default seriesService;
