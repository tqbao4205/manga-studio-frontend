/**
 * ─────────────────────────────────────────────
 *  seriesService.js — API cho module Series
 * ─────────────────────────────────────────────
 *
 * 🎯 Mục đích:
 *   - Đóng gói TẤT CẢ các API call liên quan đến Series, Chapter, Page
 *   - Các hàm trong file này được seriesStore.js và các page gọi đến
 *   - Mỗi hàm tương ứng với một endpoint backend đã định nghĩa trong:
 *       SeriesController.java, ChapterController.java, PageController.java
 *
 * 🔗 Liên kết:
 *   - seriesStore.js → gọi các hàm trong file này
 *   - api.js → xử lý gắn token + lỗi tập trung
 *
 * 📋 Các API:
 *   ┌────────────────────────┬──────────────────────────────────┬──────────┐
 *   │ Chức năng              │ Endpoint                        │ Method   │
 *   ├────────────────────────┼─────────────────────────────────┼──────────┤
 *   │ Danh sách series       │ /api/series                     │ GET      │
 *   │ Chi tiết series        │ /api/series/{id}                │ GET      │
 *   │ Tạo series             │ /api/series                     │ POST     │
 *   │ Cập nhật series        │ /api/series/{id}                │ PUT      │
 *   │ Xoá series             │ /api/series/{id}                │ DELETE   │
 *   │ Gửi duyệt series       │ /api/series/{id}/submit         │ POST     │
 *   │ Duyệt series           │ /api/series/{id}/approve        │ POST     │
 *   │ Từ chối series         │ /api/series/{id}/reject         │ POST     │
 *   │ Đổi trạng thái series  │ /api/series/{id}/status         │ PATCH    │
 *   │ Chapters của series    │ /api/series/{seriesId}/chapters │ GET      │
 *   │ Chi tiết chapter       │ /api/chapters/{id}              │ GET      │
 *   │ Tạo chapter            │ /api/series/{seriesId}/chapters │ POST     │
 *   │ Sửa chapter            │ /api/chapters/{id}              │ PUT      │
 *   │ Xoá chapter            │ /api/chapters/{id}              │ DELETE   │
 *   │ Pages của chapter      │ /api/v1/chapters/{chapterId}/pages │ GET   │
 *   └────────────────────────┴──────────────────────────────────┴──────────┘
 */

import api from './api';

/**
 * seriesService: Object chứa tất cả hàm tương tác với API Series/Chapter/Page
 *
 * Cách dùng trong store/component:
 *   import seriesService from '../services/seriesService';
 *   const data = await seriesService.getAll({ status: 'ONGOING' });
 *
 * Lưu ý:
 *   - api.js interceptor đã xử lý: trả thẳng data, reject với message
 *   - Nên không cần try/catch ở service — để store/component xử lý
 */
const seriesService = {

  // ════════════════════════════════════════════════════════════════
  //  1. GET ALL — Lấy danh sách series (có filter + phân trang)
  // ════════════════════════════════════════════════════════════════
  /**
   * Gọi API lấy danh sách series.
   *
   * Endpoint backend: GET /api/series
   * Controller: SeriesController.getAll()
   * Service: SeriesService.getAll() — dùng Specification để filter động
   *
   * @param {Object} params - Các tham số filter
   * @param {string} [params.status] - Lọc theo trạng thái (ONGOING, DRAFT,...)
   * @param {string} [params.genre]  - Lọc theo thể loại (ACTION, FANTASY,...)
   * @param {string} [params.search] - Tìm kiếm theo tên series
   * @param {number} [params.page]   - Số trang (bắt đầu từ 0)
   * @param {number} [params.size]   - Số lượng mỗi trang
   * @param {string} [params.sort]   - Sắp xếp (UPDATED_AT_DESC, TITLE_ASC,...)
   *
   * @returns {Promise<Object>} Response từ backend chứa:
   *   {
   *     content: [...],     // Mảng các SeriesResponse
   *     page: 0,            // Trang hiện tại
   *     size: 20,           // Kích thước trang
   *     totalElements: 100, // Tổng số bản ghi
   *     totalPages: 5       // Tổng số trang
   *   }
   *
   * Giải thích:
   *   - Nếu status/genre là 'ALL' thì bỏ qua (backend filter = null → không filter)
   *   - Object.keys để build query params động, chỉ gửi params có giá trị
   *   - api.get tự động gắn query params vào URL: /api/series?status=ONGOING&page=0
   */
  getAll: async (params = {}) => {
    // Xây dựng object query chỉ chứa params có giá trị
    // Tránh gửi 'ALL' lên backend (backend không hiểu 'ALL')
    const query = {};
    if (params.status && params.status !== 'ALL') query.status = params.status;
    if (params.genre && params.genre !== 'ALL') query.genre = params.genre;
    if (params.search) query.search = params.search;
    if (params.page != null) query.page = params.page;
    if (params.size != null) query.size = params.size;
    if (params.sort) query.sort = params.sort;

    // Gọi GET /api/series?status=...&genre=...&search=...&page=...&size=...&sort=...
    return api.get('/series', { params: query });
  },

  // ════════════════════════════════════════════════════════════════
  //  2. GET BY ID — Lấy chi tiết 1 series
  // ════════════════════════════════════════════════════════════════
  /**
   * Endpoint backend: GET /api/series/{id}
   *
   * @param {number} id - ID của series cần lấy
   * @returns {Promise<Object>} SeriesResponse — chi tiết series (kèm mangaka, tantouEditor)
   */
  getById: async (id) => {
    return api.get(`/series/${id}`);
  },

  // ════════════════════════════════════════════════════════════════
  //  3. GET CHAPTERS BY SERIES — Danh sách chapters của 1 series
  // ════════════════════════════════════════════════════════════════
  /**
   * Endpoint backend: GET /api/series/{seriesId}/chapters
   * Controller: ChapterController.getChaptersBySeries()
   *
   * @param {number} seriesId - ID của series
   * @returns {Promise<Array>} Mảng ChapterResponse — danh sách chapters
   *
   * Lưu ý:
   *   - Backend trả về List<ChapterResponse> (không pagination)
   *   - Chapters được sắp xếp theo chapterNumber tăng dần
   */
  getChaptersBySeries: async (seriesId) => {
    return api.get(`/series/${seriesId}/chapters`);
  },

  // ════════════════════════════════════════════════════════════════
  //  4. CREATE — Tạo series mới (kèm upload ảnh bìa)
  // ════════════════════════════════════════════════════════════════
  /**
   * Endpoint backend: POST /api/series (consumes = MULTIPART_FORM_DATA)
   *
   * @param {FormData} formData - Form data chứa:
   *   - "series": JSON string của SeriesRequest
   *   - "file": File ảnh bìa (image/*)
   *
   * @returns {Promise<Object>} SeriesResponse — series vừa tạo
   *
   * Giải thích:
   *   - Backend dùng @RequestPart("series") để nhận JSON
   *   - Dùng @RequestParam("file") để nhận file ảnh
   *   - Phải set header Content-Type = multipart/form-data
   *     để browser tự động tạo boundary trong request
   */
  create: async (formData) => {
    return api.post('/series', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ════════════════════════════════════════════════════════════════
  //  5. UPDATE — Cập nhật series (có thể kèm ảnh bìa mới)
  // ════════════════════════════════════════════════════════════════
  /**
   * Endpoint backend: PUT /api/series/{id} (consumes = MULTIPART_FORM_DATA)
   *
   * @param {number} id - ID của series cần sửa
   * @param {FormData} formData - Form data chứa:
   *   - "series": JSON string (null-safe update — field null giữ nguyên)
   *   - "file": File ảnh bìa mới (optional)
   *
   * @returns {Promise<Object>} SeriesResponse — series sau khi cập nhật
   */
  update: async (id, formData) => {
    return api.put(`/series/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ════════════════════════════════════════════════════════════════
  //  6. DELETE — Xoá series (chỉ DRAFT)
  // ════════════════════════════════════════════════════════════════
  delete: async (id) => {
    return api.delete(`/series/${id}`);
  },

  // ════════════════════════════════════════════════════════════════
  //  7. SUBMIT FOR APPROVAL — Gửi series lên chờ duyệt
  // ════════════════════════════════════════════════════════════════
  /**
   * Chuyển series từ DRAFT → PENDING_APPROVAL
   * Chỉ MANGAKA (chủ sở hữu) mới gọi được
   */
  submitForApproval: async (id) => {
    return api.post(`/series/${id}/submit`);
  },

  // ════════════════════════════════════════════════════════════════
  //  8. APPROVE — Duyệt series (EDITORIAL_BOARD)
  // ════════════════════════════════════════════════════════════════
  /**
   * Duyệt series + gán Tantou Editor
   * Chỉ EDITORIAL_BOARD mới gọi được
   *
   * @param {number} id - ID series
   * @param {Object} request - { tantouEditorId: number }
   */
  approve: async (id, request) => {
    return api.post(`/series/${id}/approve`, request);
  },

  // ════════════════════════════════════════════════════════════════
  //  9. REJECT — Từ chối series (quay về DRAFT)
  // ════════════════════════════════════════════════════════════════
  reject: async (id, request) => {
    return api.post(`/series/${id}/reject`, request);
  },

  // ════════════════════════════════════════════════════════════════
  //  10. UPDATE STATUS — Đổi trạng thái series
  // ════════════════════════════════════════════════════════════════
  /**
   * EDITORIAL_BOARD đổi trạng thái: ONGOING, HIATUS, CANCELLED, COMPLETED
   *
   * @param {number} id - ID series
   * @param {Object} request - { status: "ONGOING" | "HIATUS" | ... }
   */
  updateStatus: async (id, request) => {
    return api.patch(`/series/${id}/status`, request);
  },

  // ════════════════════════════════════════════════════════════════
  //  11. GET CHAPTER BY ID — Chi tiết chapter
  // ════════════════════════════════════════════════════════════════
  getChapterById: async (id) => {
    return api.get(`/chapters/${id}`);
  },

  // ════════════════════════════════════════════════════════════════
  //  12. CREATE CHAPTER — Tạo chapter mới
  // ════════════════════════════════════════════════════════════════
  /**
   * Chỉ MANGAKA (chủ sở hữu series) mới tạo được
   *
   * @param {number} seriesId - ID của series
   * @param {Object} data - { chapterNumber, title, pageCount, deadline }
   */
  createChapter: async (seriesId, data) => {
    return api.post(`/series/${seriesId}/chapters`, data);
  },

  // ════════════════════════════════════════════════════════════════
  //  13. UPDATE CHAPTER — Cập nhật chapter
  // ════════════════════════════════════════════════════════════════
  updateChapter: async (id, data) => {
    return api.put(`/chapters/${id}`, data);
  },

  // ════════════════════════════════════════════════════════════════
  //  14. DELETE CHAPTER — Xoá chapter (chỉ DRAFT)
  // ════════════════════════════════════════════════════════════════
  deleteChapter: async (id) => {
    return api.delete(`/chapters/${id}`);
  },

  // ════════════════════════════════════════════════════════════════
  //  15. GET PAGES BY CHAPTER — Danh sách pages của chapter
  // ════════════════════════════════════════════════════════════════
  /**
   * Endpoint backend: GET /api/v1/chapters/{chapterId}/pages
   * Lưu ý: PageController dùng @RequestMapping("/api/v1") khác với Series/Chapter
   *
   * @param {number} chapterId - ID của chapter
   * @returns {Promise<Array>} Mảng PageResponse — danh sách pages
   */
  getPagesByChapter: async (chapterId) => {
    return api.get(`/v1/chapters/${chapterId}/pages`);
  },
};

export default seriesService;
