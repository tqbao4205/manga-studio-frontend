/**
 * ── meetingService.js — API cho module Editorial Board Meetings ──
 *
 * 🎯 Mục đích:
 *   - Đóng gói các API call liên quan đến Meeting (CRUD + vote + decision)
 *   - Được editorialStore.js và các page gọi đến
 *
 * 🔗 API endpoints:
 *   GET    /api/meetings/user              — Danh sách meetings của user hiện tại
 *   GET    /api/meetings/{id}              — Chi tiết 1 meeting
 *   POST   /api/meetings                   — Tạo meeting mới (CHIEF_EDITOR)
 *   POST   /api/meetings/{id}/vote         — Bỏ phiếu (EDITORIAL_BOARD)
 *   GET    /api/meetings/{id}/votes        — Kết quả vote
 *   POST   /api/meetings/{id}/decision     — Quyết định cuối (CHIEF_EDITOR)
 *   GET    /api/criteria                   — Danh sách tiêu chí chấm điểm
 */

import api from './api';

const meetingService = {

  /**
   * Lấy danh sách meetings của user hiện tại.
   * Endpoint: GET /api/meetings/user
   *
   * @returns {Promise<Array>} List<MeetingResponse>
   */
  getForUser: async () => {
    return api.get('/meetings/user');
  },

  /**
   * Lấy chi tiết 1 meeting.
   * Endpoint: GET /api/meetings/{id}
   *
   * @param {number} id - ID của meeting
   * @returns {Promise<Object>} MeetingResponse
   */
  getById: async (id) => {
    return api.get(`/meetings/${id}`);
  },

  /**
   * Tạo meeting mới (chỉ CHIEF_EDITOR).
   * Endpoint: POST /api/meetings
   *
   * @param {Object} data - { seriesId, title, description, meetingLink, startedAt, participantIds }
   * @returns {Promise<Object>} MeetingResponse
   */
  create: async (data) => {
    return api.post('/meetings', data);
  },

  /**
   * Bỏ phiếu cho 1 meeting (chỉ EDITORIAL_BOARD).
   * Endpoint: POST /api/meetings/{id}/vote
   *
   * @param {number} meetingId
   * @param {Object} voteData - { vote: 'YES'|'NO', comment: string, scores: [{ criterionId, score }] }
   * @returns {Promise<Object>} VoteResponse
   */
  castVote: async (meetingId, voteData) => {
    return api.post(`/meetings/${meetingId}/vote`, voteData);
  },

  /**
   * Chief Editor ra quyết định cuối (APPROVED / REJECTED).
   * Endpoint: POST /api/meetings/{id}/decision
   *
   * @param {number} meetingId
   * @param {Object} data - { decision: 'APPROVED' | 'REJECTED' }
   * @returns {Promise<Object>} MeetingResponse
   */
  makeDecision: async (meetingId, data) => {
    return api.post(`/meetings/${meetingId}/decision`, data);
  },

  /**
   * Lấy danh sách tiêu chí chấm điểm đang active.
   * Endpoint: GET /api/criteria
   *
   * @returns {Promise<Array>} List<CriterionResponse>
   */
  getCriteria: async () => {
    return api.get('/criteria');
  },

  /**
   * Lấy kết quả vote của user hiện tại cho 1 meeting.
   * Endpoint: GET /api/meetings/{id}/votes
   *
   * @param {number} meetingId
   * @returns {Promise<Object>} VoteResponse { myVote, myComment, myScores, ... }
   */
  getVoteResults: async (meetingId) => {
    return api.get(`/meetings/${meetingId}/votes`);
  },
};

export default meetingService;
