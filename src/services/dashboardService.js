/**
 * ── dashboardService.js — API cho module Dashboard ──
 *
 * 🎯 Mục đích:
 *   - Đóng gói các API call liên quan đến Dashboard
 *   - Backend tự trả DTO theo role nên FE không cần switch case
 *
 * 🔗 API endpoints (base: /api, backend dùng /api/v1/dashboard):
 *   GET  /api/v1/dashboard/stats          — Stats theo role (khác nhau tuỳ MANGAKA / ASSISTANT / TANTOU_EDITOR / EDITORIAL_BOARD)
 *   GET  /api/v1/dashboard/activity-feed  — Activity feed (MANGAKA)
 *   GET  /api/v1/dashboard/earnings       — Thu nhập theo tuần/tháng (ASSISTANT) ⚠️ MISSING — cần backend implement
 *   GET  /api/v1/dashboard/late-studios   — Danh sách studios trễ deadline (TANTOU_EDITOR) ⚠️ MISSING — cần backend implement
 *
 * 📦 Response theo role:
 *
 *   MANGAKA → stats:
 *     { activeSeries, ongoingChapters, pendingTasks, submissionsToReview,
 *       upcomingDeadlines: [{chapterId, title, deadline, daysLeft}],
 *       currentRank, rankTrend }
 *
 *   ASSISTANT → stats:
 *     { myTasks, inProgress, todo, done,
 *       assignedSeries: [{id, title, status}] }
 *
 *   TANTOU_EDITOR → stats:
 *     { assignedSeries, chaptersInReview, pendingComments,
 *       assignedSeriesList: [...],
 *       chaptersInReviewList: [{id, chapterNumber, title, seriesTitle, submittedAt, pageCount}],
 *       publicationQueue: [...],
 *       lateStudiosAlert: [{authorName, seriesTitle, chapterTitle, chapterNumber, progressPercent, deadline, daysLeft}] }
 *       ⚠️ lateStudiosAlert: cần backend thêm field này vào TANTOU_EDITOR stats response
 *
 *   EDITORIAL_BOARD → stats:
 *     { totalActiveSeries, proposalsPending, chaptersPending,
 *       atRiskSeries: [...], upcomingMeetings: [...] }
 *
 * ⚠️ API MISSING — cần backend developer implement:
 *   1. GET /api/v1/dashboard/earnings
 *      → Response: [{ label: "W1", amount: 35000, taskCount: 12, period: "2026-W26" }]
 *      → Chỉ dành cho ASSISTANT, trả về thu nhập thực tế từ task đã APPROVED, nhóm theo tuần/tháng
 *
 *   2. Thêm field `lateStudiosAlert` vào TANTOU_EDITOR stats response:
 *      → lateStudiosAlert: [{ authorId, authorName, seriesId, seriesTitle, chapterId, chapterTitle,
 *                             chapterNumber, progressPercent, deadline, daysLeft }]
 *      → Điều kiện: progressPercent < 50 AND daysLeft <= 3
 *
 *   3. Thêm field `revisionNote` vào TaskResponse (GET /api/tasks/{id}) cho ASSISTANT:
 *      → revisionNote: string — lời nhắn sửa lỗi của Mangaka khi reject submission
 *      → Lấy từ submission gần nhất có status = REVISION_REQUIRED
 */

import api from './api';
import { logApiCall } from '../shared/utils/telemetry';

const dashboardService = {
  /**
   * Lấy stats dashboard theo role hiện tại của user.
   * Backend tự detect role từ JWT và trả về DTO phù hợp.
   * Endpoint: GET /api/v1/dashboard/stats
   *
   * @returns {Promise<Object>} Stats DTO tuỳ theo role
   */
  getStats: async () => {
    logApiCall('dashboard', 'getStats');
    return api.get('/v1/dashboard/stats');
  },

  /**
   * Lấy activity feed cho Mangaka.
   * Endpoint: GET /api/v1/dashboard/activity-feed
   *
   * @returns {Promise<Array>} Mảng activity items
   */
  getActivityFeed: async () => {
    logApiCall('dashboard', 'getActivityFeed');
    return api.get('/v1/dashboard/activity-feed');
  },

  /**
   * ⚠️ MISSING API — cần backend developer implement.
   * Lấy thu nhập của ASSISTANT theo tuần/tháng, chỉ tính task đã APPROVED.
   * Endpoint: GET /api/v1/dashboard/earnings
   *
   * Expected response format:
   * [
   *   { label: "W1", amount: 35000, taskCount: 12, period: "2026-W24" },
   *   { label: "W2", amount: 42000, taskCount: 15, period: "2026-W25" },
   *   { label: "W3", amount: 25500, taskCount: 8,  period: "2026-W26" },
   *   { label: "W4", amount: 40000, taskCount: 14, period: "2026-W27" },
   * ]
   *
   * @param {{ groupBy?: 'week'|'month' }} [params]
   * @returns {Promise<Array>} Mảng earnings data
   */
  getEarnings: async (params = { groupBy: 'week' }) => {
    logApiCall('dashboard', 'getEarnings', params);
    return api.get('/v1/dashboard/earnings', { params });
  },

  /**
   * ⚠️ MISSING API — cần backend developer implement (hoặc thêm vào stats TANTOU_EDITOR).
   * Lấy danh sách studios trễ deadline cho TANTOU_EDITOR.
   * Endpoint: GET /api/v1/dashboard/late-studios
   *
   * Điều kiện lọc (backend thực hiện):
   *   - progressPercent < 50
   *   - daysLeft <= 3
   *
   * Expected response format:
   * [
   *   {
   *     authorId: 1, authorName: "Y. Sato", displayName: "Studio Kuro",
   *     seriesId: 5, seriesTitle: "Neon Genesis Tokyo",
   *     chapterId: 42, chapterTitle: "Chapter 42", chapterNumber: 42,
   *     progressPercent: 35,
   *     deadline: "2026-06-28", daysLeft: 2
   *   }
   * ]
   *
   * @returns {Promise<Array>} Mảng late studios
   */
  getLateStudios: async () => {
    logApiCall('dashboard', 'getLateStudios');
    return api.get('/v1/dashboard/late-studios');
  },

  /**
   * Gửi thông báo đôn đốc (nudge) tới tác giả trễ deadline.
   * Endpoint: POST /api/v1/dashboard/nudge/{authorId}
   *
   * ⚠️ MISSING API — cần backend developer implement.
   * Backend sẽ gửi notification realtime + email tới authorId.
   *
   * @param {number} authorId - ID của tác giả cần đôn đốc
   * @param {{ chapterId: number, message?: string }} payload
   * @returns {Promise<void>}
   */
  nudgeAuthor: async (authorId, payload) => {
    logApiCall('dashboard', 'nudgeAuthor', { authorId });
    return api.post(`/v1/dashboard/nudge/${authorId}`, payload);
  },

  /**
   * Lấy lịch sử AT_RISK / ONGOING theo tuần cho At-Risk Trend chart.
   * Endpoint: GET /api/v1/dashboard/at-risk-history?groupBy=week
   *
   * Response: [{ week: 'W-3', period: '2026-W25', atRisk: 3, ongoing: 12 }]
   *
   * @param {{ groupBy?: 'week' }} [params]
   * @returns {Promise<Array>} Mảng at-risk trend data
   */
  getAtRiskHistory: async (params = { groupBy: 'week' }) => {
    logApiCall('dashboard', 'getAtRiskHistory', params);
    return api.get('/v1/dashboard/at-risk-history', { params });
  },
};

export default dashboardService;
