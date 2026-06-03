/**
 * ── commentService.js — API cho module Comment / Annotation ──
 *
 * 🎯 Mục đích:
 *   - Đóng gói các API call liên quan đến Comment (bình luận/đánh dấu trên page)
 *   - Được workspaceStore và các component trong workspace gọi đến
 *
 * 🔗 API endpoints (Backend: CommentController.java):
 *   GET    /api/v1/pages/{pageId}/comments          — DS comment gốc + replies
 *   GET    /api/v1/comments/{id}                    — Chi tiết 1 comment + replies
 *   POST   /api/v1/pages/{pageId}/comments          — Tạo comment mới (annotation hoặc reply)
 *   POST   /api/v1/comments/{parentId}/replies      — Reply vào 1 comment
 *   PUT    /api/v1/comments/{id}                    — Sửa nội dung comment
 *   DELETE /api/v1/comments/{id}                    — Xoá comment + replies con
 *   PATCH  /api/v1/comments/{id}/status             — Đổi trạng thái (ACTIVE <-> RESOLVED)
 *
 * 📌 Pattern:
 *   - Giống pageService.js, assistantService.js
 *   - Mỗi method là 1 async function gọi axios instance (api)
 *   - api.get/post/put/patch/delete tự động:
 *       + Gắn JWT token (interceptor)
 *       + Unwrap response.data (interceptor)
 *       + Xử lý lỗi 401 (tự động logout)
 *   - Không cần try/catch ở đây — để store hoặc component xử lý
 *
 * 📌 Base URL:
 *   axios.defaults.baseURL = '/api' (config trong api.js)
 *   Vite proxy /api -> http://localhost:8080
 *   → Gọi api.get('/v1/pages/1/comments') thực tế = GET http://localhost:8080/api/v1/pages/1/comments
 */

import api from './api';

const commentService = {

  // ════════════════════════════════════════════════════════════════
  //  1. GET COMMENTS BY PAGE — Lấy danh sách comments của 1 page
  // ════════════════════════════════════════════════════════════════

  /**
   * Lấy tất cả comment GỐC (parent = null) của 1 page.
   * Mỗi comment gốc kèm theo danh sách replies của nó (trong field "replies").
   *
   * 📌 Endpoint: GET /api/v1/pages/{pageId}/comments
   *
   * 📌 Request:
   *   @param {number} pageId - ID của page cần lấy comments
   *
   * 📌 Response (từ backend CommentResponse):
   *   [
   *     {
   *       id: 1,
   *       content: "Sửa thoại dòng 3",
   *       authorId: 2,
   *       authorName: "Tantou Editor A",
   *       authorAvatar: "https://...",
   *       parentId: null,           // null = comment gốc
   *       pageId: 10,
   *       status: "ACTIVE",          // hoặc "RESOLVED"
   *       posX: 150.0, posY: 200.0, // toạ độ annotation trên ảnh
   *       posWidth: 100.0, posHeight: 60.0,
   *       createdAt: "2026-06-03T10:00:00",
   *       updatedAt: "2026-06-03T10:00:00",
   *       replies: [                 // replies của comment gốc
   *         { id: 2, parentId: 1, content: "Đã sửa", ..., replies: null }
   *       ]
   *     }
   *   ]
   *
   * 📌 Quyền: isAuthenticated() — bất kỳ user nào đã login đều gọi được
   *
   * @param {number} pageId - ID của page
   * @returns {Promise<Array>} Mảng CommentResponse (gốc + replies lồng nhau)
   */
  getByPage: async (pageId) => {
    return api.get(`/v1/pages/${pageId}/comments`);
  },

  // ════════════════════════════════════════════════════════════════
  //  2. GET COMMENT BY ID — Lấy chi tiết 1 comment + replies
  // ════════════════════════════════════════════════════════════════

  /**
   * Lấy chi tiết 1 comment cụ thể, kèm danh sách replies của nó.
   *
   * 📌 Endpoint: GET /api/v1/comments/{id}
   *
   * 📌 Request:
   *   @param {number} id - ID của comment cần lấy
   *
   * 📌 Response:
   *   CommentResponse — giống cấu trúc 1 phần tử trong getByPage()
   *
   * 📌 Quyền: isAuthenticated()
   *
   * @param {number} id - ID của comment
   * @returns {Promise<Object>} CommentResponse
   */
  getById: async (id) => {
    return api.get(`/v1/comments/${id}`);
  },

  // ════════════════════════════════════════════════════════════════
  //  3. CREATE COMMENT — Tạo comment mới trên 1 page
  // ════════════════════════════════════════════════════════════════

  /**
   * Tạo comment mới trên page.
   *
   * 📌 Endpoint: POST /api/v1/pages/{pageId}/comments
   *
   * 📌 Request body (CommentRequest):
   *   @param {number} pageId - ID của page
   *   @param {Object} data - Dữ liệu comment:
   *     - content (string, required): Nội dung comment
   *     - parentId (number, optional): ID comment cha — nếu có → tạo reply
   *     - posX (number, optional): Toạ độ X trên ảnh (pixel) — chỉ cho comment gốc
   *     - posY (number, optional): Toạ độ Y trên ảnh (pixel)
   *     - posWidth (number, optional): Chiều rộng vùng đánh dấu
   *     - posHeight (number, optional): Chiều cao vùng đánh dấu
   *
   * 📌 Cách dùng:
   *   // Tạo annotation (comment gốc có toạ độ)
   *   create(1, { content: "Sửa chỗ A", posX: 150, posY: 200 })
   *
   *   // Tạo reply (dùng parentId)
   *   create(1, { content: "OK", parentId: 5 })
   *
   * 📌 Response: CommentResponse — comment vừa tạo (HTTP 201)
   *
   * 📌 Quyền: MANGAKA hoặc TANTOU_EDITOR (cho comment gốc)
   *          isAuthenticated() (cho reply — dùng endpoint riêng)
   *
   * @param {number} pageId - ID của page
   * @param {Object} data - CommentRequest
   * @returns {Promise<Object>} CommentResponse (status 201)
   */
  create: async (pageId, data) => {
    return api.post(`/v1/pages/${pageId}/comments`, data);
  },

  // ════════════════════════════════════════════════════════════════
  //  4. REPLY — Trả lời 1 comment
  // ════════════════════════════════════════════════════════════════

  /**
   * Tạo reply cho 1 comment có sẵn.
   * Khác với create() ở chỗ: parentId lấy từ URL path, pageId tự động từ comment cha.
   *
   * 📌 Endpoint: POST /api/v1/comments/{parentId}/replies
   *
   * 📌 Request:
   *   @param {number} parentId - ID của comment cha (lấy từ URL)
   *   @param {Object} data - Chỉ cần { content: "string" }
   *     (không cần parentId, pageId, toạ độ — backend tự xử lý)
   *
   * 📌 Response: CommentResponse — reply vừa tạo (HTTP 201)
   *
   * 📌 Quyền: isAuthenticated() — bất kỳ user đã login đều reply được
   *   (kể cả ASSISTANT — để thảo luận trong thread)
   *
   * @param {number} parentId - ID của comment cha
   * @param {Object} data - { content: string }
   * @returns {Promise<Object>} CommentResponse (status 201)
   */
  reply: async (parentId, data) => {
    return api.post(`/v1/comments/${parentId}/replies`, data);
  },

  // ════════════════════════════════════════════════════════════════
  //  5. UPDATE COMMENT — Cập nhật nội dung
  // ════════════════════════════════════════════════════════════════

  /**
   * Sửa nội dung comment.
   * Chỉ AUTHOR mới sửa được (backend kiểm tra ownership).
   *
   * 📌 Endpoint: PUT /api/v1/comments/{id}
   *
   * 📌 Request:
   *   @param {number} id - ID của comment cần sửa
   *   @param {Object} data - { content: "string mới" }
   *     (chỉ sửa được content, không sửa toạ độ/status — dùng các endpoint riêng)
   *
   * 📌 Response: CommentResponse — comment sau khi cập nhật
   *
   * 📌 Quyền: isAuthenticated() + ownership (chỉ chính chủ)
   *
   * @param {number} id - ID của comment
   * @param {Object} data - { content: string }
   * @returns {Promise<Object>} CommentResponse
   */
  update: async (id, data) => {
    return api.put(`/v1/comments/${id}`, data);
  },

  // ════════════════════════════════════════════════════════════════
  //  6. DELETE COMMENT — Xoá comment
  // ════════════════════════════════════════════════════════════════

  /**
   * Xoá 1 comment. Chỉ AUTHOR mới được xoá.
   * Khi xoá comment gốc → backend tự động xoá luôn tất cả replies.
   *
   * 📌 Endpoint: DELETE /api/v1/comments/{id}
   *
   * 📌 Request:
   *   @param {number} id - ID của comment cần xoá
   *
   * 📌 Response: HTTP 204 No Content (api interceptor trả về undefined/null)
   *
   * 📌 Quyền: isAuthenticated() + ownership (chỉ chính chủ)
   *
   * @param {number} id - ID của comment
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    return api.delete(`/v1/comments/${id}`);
  },

  // ════════════════════════════════════════════════════════════════
  //  7. UPDATE STATUS — Đổi trạng thái (RESOLVE / REOPEN)
  // ════════════════════════════════════════════════════════════════

  /**
   * Đổi trạng thái comment giữa ACTIVE và RESOLVED.
   *
   * 📌 Endpoint: PATCH /api/v1/comments/{id}/status
   *
   * 📌 Request:
   *   @param {number} id - ID của comment
   *   @param {string} status - "ACTIVE" (mở lại) hoặc "RESOLVED" (đã giải quyết)
   *
   * 📌 Ví dụ:
   *   updateStatus(1, "RESOLVED")  // Đánh dấu đã xử lý xong
   *   updateStatus(1, "ACTIVE")    // Mở lại để thảo luận tiếp
   *
   * 📌 Response: CommentResponse — comment sau khi đổi status
   *
   * 📌 Quyền: MANGAKA hoặc TANTOU_EDITOR
   *
   * @param {number} id - ID của comment
   * @param {string} status - "ACTIVE" | "RESOLVED"
   * @returns {Promise<Object>} CommentResponse
   */
  updateStatus: async (id, status) => {
    return api.patch(`/v1/comments/${id}/status`, { status });
  },
};

export default commentService;
