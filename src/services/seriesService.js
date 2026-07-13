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

import api, { UPLOAD_TIMEOUT } from './api';
import { logApiCall } from '../shared/utils/telemetry';

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

    logApiCall('series', 'getAll', { params: query });
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
    logApiCall('series', 'getById', { id });
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
    logApiCall('series', 'create', {
      hasFile: Boolean(formData?.get?.('file')),
    });
    return api.post('/series', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
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
    logApiCall('series', 'update', {
      id,
      hasFile: Boolean(formData?.get?.('file')),
    });
    return api.put(`/series/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
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
    logApiCall('series', 'delete', { id });
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
    logApiCall('series', 'submitForApproval', { id });
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
    logApiCall('series', 'approve', { id, tantouEditorId: request?.tantouEditorId });
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
    logApiCall('series', 'reject', { id, noteLength: request?.notes?.length || 0 });
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
    logApiCall('series', 'updateStatus', { id, status: request?.status });
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
   * Lấy danh sách lời mời tantou của series.
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
  /**
   * Tìm kiếm user có role TANTOU_EDITOR.
   * GET /api/users/tantou-editors?search=...
   */
  getTantouEditors: async (search) => {
    const params = search ? { search } : {};
    return api.get('/users/tantou-editors', { params });
  },

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
  //  CHARACTER — GET / CREATE / UPDATE / DELETE
  // ═══════════════════════════════════════════════

  /**
   * L?y danh sách characters c?a 1 series.
   * GET /api/series/{seriesId}/characters
   */
  getCharacters: async (seriesId) => {
    return api.get(`/series/${seriesId}/characters`);
  },

  /**
   * L?y chi ti?t 1 character.
   * GET /api/series/{seriesId}/characters/{characterId}
   */
  getCharacter: async (seriesId, characterId) => {
    return api.get(`/series/${seriesId}/characters/${characterId}`);
  },

  /**
   * T?o character m?i (multipart: "character" JSON + "files" sketches).
   * POST /api/series/{seriesId}/characters
   */
  createCharacter: async (seriesId, formData, onProgress) => {
    return api.post(`/series/${seriesId}/characters`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
      onUploadProgress: onProgress
        ? (e) => {
            const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
            onProgress(pct);
          }
        : undefined,
    });
  },

  /**
   * T?o nhi?u characters trong 1 request (multipart: "batchRequest" JSON + "files").
   * POST /api/series/{seriesId}/characters/batch
   */
  createCharactersBatch: async (seriesId, formData, onProgress) => {
    return api.post(`/series/${seriesId}/characters/batch`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
      onUploadProgress: onProgress
        ? (e) => {
            const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
            onProgress(pct);
          }
        : undefined,
    });
  },

  /**
   * C?p nh?t character (multipart: "character" JSON + "files" optional).
   * PUT /api/series/{seriesId}/characters/{characterId}
   */
  updateCharacter: async (seriesId, characterId, formData, onProgress) => {
    return api.put(`/series/${seriesId}/characters/${characterId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
      onUploadProgress: onProgress
        ? (e) => {
            const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
            onProgress(pct);
          }
        : undefined,
    });
  },

  /**
   * Xoá character.
   * DELETE /api/series/{seriesId}/characters/{characterId}
   */
  deleteCharacter: async (seriesId, characterId) => {
    return api.delete(`/series/${seriesId}/characters/${characterId}`);
  },

  // ═══════════════════════════════════════════════
  //  STORY PROFILE — World Lore + Roadmap + Visual Refs
  // ═══════════════════════════════════════════════

  /**
   * Lấy story profile của series (world lore, roadmap, visual refs).
   * GET /api/series/{seriesId}/story-profile
   *
   * @param {number} seriesId - ID của series
   * @returns {Promise<Object>} StoryProfileResponse { worldLore, storyRoadmap, visualReferences }
   */
  getStoryProfile: async (seriesId) => {
    return api.get(`/series/${seriesId}/story-profile`);
  },

  /**
   * Lưu story profile (multipart: "storyProfile" JSON + "files" ảnh).
   * PUT /api/series/{seriesId}/story-profile
   *
   * @param {number} seriesId - ID của series
   * @param {FormData} formData
   *   - "storyProfile": Blob JSON { worldLoreContent, storyRoadmap, preservedVisualRefUrls }
   *   - "files" × N: File ảnh visual refs mới
   * @returns {Promise<Object>} StoryProfileResponse
   */
  saveStoryProfile: async (seriesId, formData, onProgress) => {
    return api.put(`/series/${seriesId}/story-profile`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
      onUploadProgress: onProgress
        ? (e) => {
            const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
            onProgress(pct);
          }
        : undefined,
    });
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
