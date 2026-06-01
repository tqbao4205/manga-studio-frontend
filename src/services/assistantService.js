/**
 * ── assistantService.js — API cho module Invitation ASSISTANT ──
 *
 * 🎯 Mục đích:
 *   - Đóng gói các API call liên quan đến mời ASSISTANT vào series
 *   - Được NewSeriesPage, SeriesDetailPage, InvitationsPage gọi đến
 *
 * 🔗 API endpoints:
 *   GET   /api/users/assistants                        — Danh sách user ASSISTANT
 *   POST  /api/series/{seriesId}/assistants/invite     — Mời assistant
 *   GET   /api/series/{seriesId}/assistants            — List ACCEPTED
 *   DELETE /api/series/{seriesId}/assistants/{id}      — Xoá assistant
 *   GET   /api/assistants/invitations                  — Lời mời PENDING
 *   PATCH /api/assistants/invitations/{id}             — Accept/reject
 */

import api from './api';

const assistantService = {

  /**
   * Tìm kiếm user có role ASSISTANT.
   * Endpoint: GET /api/users/assistants?search=...
   *
   * @param {string} [search] - Từ khoá tìm theo tên (optional)
   * @returns {Promise<Array>} List<UserDTO>
   */
  getAssistants: async (search) => {
    const params = search ? { search } : {};
    return api.get('/users/assistants', { params });
  },

  /**
   * MANGAKA gửi lời mời cho ASSISTANT.
   * Endpoint: POST /api/series/{seriesId}/assistants/invite
   *
   * @param {number} seriesId - ID của series
   * @param {number} assistantId - ID của ASSISTANT
   * @returns {Promise<Object>} SeriesAssistantResponse
   */
  invite: async (seriesId, assistantId) => {
    return api.post(`/series/${seriesId}/assistants/invite`, { assistantId });
  },

  /**
   * Lấy danh sách ASSISTANT đã ACCEPTED trong series.
   * Endpoint: GET /api/series/{seriesId}/assistants
   *
   * @param {number} seriesId - ID của series
   * @returns {Promise<Array>} List<SeriesAssistantResponse>
   */
  getBySeries: async (seriesId) => {
    return api.get(`/series/${seriesId}/assistants`);
  },

  /**
   * MANGAKA xoá ASSISTANT khỏi series.
   * Endpoint: DELETE /api/series/{seriesId}/assistants/{assistantId}
   *
   * @param {number} seriesId - ID của series
   * @param {number} assistantId - ID của ASSISTANT
   * @returns {Promise<void>}
   */
  remove: async (seriesId, assistantId) => {
    return api.delete(`/series/${seriesId}/assistants/${assistantId}`);
  },

  /**
   * ASSISTANT xem danh sách lời mời đang chờ.
   * Endpoint: GET /api/assistants/invitations
   *
   * @returns {Promise<Array>} List<SeriesAssistantResponse> (PENDING)
   */
  getMyInvitations: async () => {
    return api.get('/assistants/invitations');
  },

  /**
   * ASSISTANT phản hồi lời mời (ACCEPTED / REJECTED).
   * Endpoint: PATCH /api/assistants/invitations/{invitationId}
   *
   * @param {number} invitationId - ID của lời mời
   * @param {string} status - "ACCEPTED" hoặc "REJECTED"
   * @returns {Promise<Object>} SeriesAssistantResponse
   */
  respondToInvitation: async (invitationId, status) => {
    return api.patch(`/assistants/invitations/${invitationId}`, { status });
  },
};

export default assistantService;
