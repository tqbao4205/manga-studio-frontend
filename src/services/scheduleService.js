/**
 * ── scheduleService.js — API cho module Schedule (Lịch xuất bản) ──
 *
 * 🎯 Mục đích:
 *   - Đóng gói các API call liên quan đến lịch xuất bản (Publication Schedule)
 *   - Được scheduleStore.js và SchedulePage.jsx gọi đến
 *   - Tuân thủ đúng pattern của seriesService.js / taskService.js
 *
 * 🔗 API endpoints (Backend: ScheduleController.java):
 *   GET    /api/schedules?status=&search=&page=&size=   — Danh sách schedules (phân trang)
 *   GET    /api/schedules/{id}                          — Chi tiết 1 schedule
 *   POST   /api/series/{seriesId}/schedule              — Tạo lịch mới cho series
 *   PUT    /api/schedules/{id}                          — Cập nhật cấu hình schedule
 *   PATCH  /api/schedules/{id}/status                   — Đổi trạng thái (ACTIVE/PAUSED/COMPLETED)
 *   PATCH  /api/schedules/{id}/reset-miss               — Reset missCount về 0
 *   DELETE /api/schedules/{id}                          — Xoá schedule
 *
 * 📦 Dữ liệu Schedule (ScheduleResponse — backend DTO):
 *   {
 *     id: number,                    // ID tự tăng
 *     seriesId: number,              // FK → series
 *     seriesTitle: string,           // Tên series (denormalized)
 *     scheduleType: "WEEKLY"|"MONTHLY", // Loại lịch
 *     dayOfWeek: number|null,        // Thứ trong tuần (1=Mon..7=Sun), chỉ dùng khi WEEKLY
 *     dayOfMonth: number|null,       // Ngày trong tháng (1..31), chỉ dùng khi MONTHLY
 *     startDate: string,             // Ngày bắt đầu lịch (YYYY-MM-DD)
 *     nextChapterNumber: number,     // Chapter tiếp theo cần publish
 *     missCount: number,             // Số lần trễ liên tiếp
 *     status: "ACTIVE"|"PAUSED"|"COMPLETED", // Trạng thái lịch
 *     createdAt: string,             // Ngày tạo
 *     updatedAt: string,             // Ngày cập nhật gần nhất
 *   }
 *
 * 🔐 Xác thực:
 *   - Api instance (api.js) tự động gắn JWT token từ localStorage
 *   - Service này KHÔNG cần xử lý auth
 *
 * 🧠 Luồng gọi:
 *   SchedulePage (useEffect) → scheduleStore.fetchAll() → scheduleService.getAll()
 *                                                         → api.get('/schedules')
 *                                                         → Axios interceptor gắn token
 *                                                         → Backend trả về Page<ScheduleResponse>
 */

import api from './api';

const scheduleService = {

  /**
   * Lấy danh sách lịch xuất bản (có filter + phân trang).
   * Endpoint: GET /api/schedules
   *
   * ⚙️ Cách dùng ở store:
   *   const data = await scheduleService.getAll({
   *     page: 0,
   *     size: 10,
   *     status: 'ACTIVE',
   *     search: 'Shadow',
   *   });
   *
   * @param {Object} params - Các tham số filter (không bắt buộc)
   * @param {string}  [params.status]    - Lọc theo trạng thái (ACTIVE, PAUSED, COMPLETED)
   * @param {string}  [params.search]    - Tìm kiếm theo tên series
   * @param {number}  [params.page]      - Số trang (0-indexed)
   * @param {number}  [params.size]      - Số bản ghi mỗi trang
   * @param {string}  [params.sort]      - Sắp xếp (VD: "createdAt,desc")
   * @returns {Promise<Object>} Page<ScheduleResponse>
   *   {
   *     content: ScheduleResponse[],  // Mảng schedules
   *     totalElements: number,        // Tổng số bản ghi
   *     totalPages: number,           // Tổng số trang
   *     number: number,               // Trang hiện tại
   *     size: number,                 // Kích thước trang
   *   }
   */
  getAll: async (params = {}) => {
    // Xây dựng query object — chỉ gửi params có giá trị
    const query = {};
    if (params.status && params.status !== 'ALL') query.status = params.status;
    if (params.search) query.search = params.search;
    if (params.page != null) query.page = params.page;
    if (params.size != null) query.size = params.size;
    if (params.sort) query.sort = params.sort;

    // Gửi request GET → /api/schedules?status=ACTIVE&page=0&size=10
    return api.get('/schedules', { params: query });
  },

  /**
   * Lấy chi tiết 1 lịch xuất bản theo ID.
   * Endpoint: GET /api/schedules/{id}
   *
   * @param {number} id - ID của schedule
   * @returns {Promise<Object>} ScheduleResponse
   */
  getById: async (id) => {
    return api.get(`/schedules/${id}`);
  },

  /**
   * Tạo lịch xuất bản mới cho series.
   * Endpoint: POST /api/series/{seriesId}/schedule
   *
   * Backend yêu cầu body:
   *   { scheduleType, dayOfWeek?, dayOfMonth?, startDate }
   *
   * WEEKLY  → cần scheduleType="WEEKLY" + dayOfWeek (1..7)
   * MONTHLY → cần scheduleType="MONTHLY" + dayOfMonth (1..31)
   *
   * @param {number} seriesId - ID của series cần tạo lịch
   * @param {Object} data     - Dữ liệu schedule
   * @param {string} data.scheduleType  - "WEEKLY" hoặc "MONTHLY"
   * @param {number} [data.dayOfWeek]   - Thứ trong tuần (1=Mon..7=Sun), bắt buộc nếu WEEKLY
   * @param {number} [data.dayOfMonth]  - Ngày trong tháng (1..31), bắt buộc nếu MONTHLY
   * @param {string} data.startDate     - Ngày bắt đầu (YYYY-MM-DD)
   * @returns {Promise<Object>} ScheduleResponse (đã tạo)
   */
  create: async (seriesId, data) => {
    return api.post(`/series/${seriesId}/schedule`, data);
  },

  /**
   * Cập nhật cấu hình lịch xuất bản.
   * Endpoint: PUT /api/schedules/{id}
   *
   * Backend yêu cầu body giống CreateScheduleRequest:
   *   { scheduleType, dayOfWeek?, dayOfMonth?, startDate }
   *
   * @param {number} id       - ID của schedule cần sửa
   * @param {Object} updates  - Cấu hình mới
   * @param {string} updates.scheduleType  - "WEEKLY" hoặc "MONTHLY"
   * @param {number} [updates.dayOfWeek]   - Thứ trong tuần (bắt buộc nếu WEEKLY)
   * @param {number} [updates.dayOfMonth]  - Ngày trong tháng (bắt buộc nếu MONTHLY)
   * @param {string} updates.startDate     - Ngày bắt đầu mới
   * @returns {Promise<Object>} ScheduleResponse (đã cập nhật)
   */
  update: async (id, updates) => {
    return api.put(`/schedules/${id}`, updates);
  },

  /**
   * Đổi trạng thái của lịch xuất bản.
   * Endpoint: PATCH /api/schedules/{id}/status
   *
   * Các trạng thái backend hỗ trợ:
   *   "PAUSED"   → Tạm dừng (cron job bỏ qua)
   *   "ACTIVE"   → Tiếp tục (RESUME)
   *   "COMPLETED" → Kết thúc (không thể đảo ngược)
   *
   * @param {number} id     - ID của schedule
   * @param {Object} body   - { status: string }
   * @param {string} body.status - Trạng thái mới (ACTIVE | PAUSED | COMPLETED)
   * @returns {Promise<Object>} ScheduleResponse (đã cập nhật)
   */
  updateStatus: async (id, body) => {
    return api.patch(`/schedules/${id}/status`, body);
  },

  /**
   * Reset missCount về 0.
   * Endpoint: PATCH /api/schedules/{id}/reset-miss
   *
   * Dùng khi EDITORIAL_BOARD muốn cho mangaka cơ hội sau khi bị trễ.
   *
   * @param {number} id - ID của schedule
   * @returns {Promise<Object>} ScheduleResponse (missCount đã reset)
   */
  resetMissCount: async (id) => {
    return api.patch(`/schedules/${id}/reset-miss`);
  },

  /**
   * Xoá lịch xuất bản theo ID.
   * Endpoint: DELETE /api/schedules/{id}
   *
   * @param {number} id - ID của schedule cần xoá
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    return api.delete(`/schedules/${id}`);
  },

  /**
   * Chạy thủ công auto-publish (test/demo).
   * Endpoint: POST /api/schedules/test-auto-publish
   *
   * Dùng để test không cần chờ cron job 8h sáng.
   * Chỉ EDITORIAL_BOARD / CHIEF_EDITOR mới gọi được.
   *
   * @returns {Promise<Object>} { message: string }
   */
  triggerAutoPublish: async () => {
    return api.post('/schedules/test-auto-publish');
  },
};

export default scheduleService;
