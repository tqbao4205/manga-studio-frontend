/**
 * ─────────────────────────────────────────────
 *  api.js — Axios instance & Interceptors
 * ─────────────────────────────────────────────
 *
 * 🎯 Mục đích:
 *   - Tạo một axios instance dùng chung CHO TOÀN BỘ ứng dụng
 *   - Tự động gắn JWT token vào mọi request (nếu có)
 *   - Tự động xử lý lỗi 401 (Unauthorized) — logout nếu token hết hạn
 *   - Chuẩn hoá cách gọi API: không cần lặp lại baseURL hay header ở mỗi file
 *
 * 🔗 Liên kết:
 *   - Vite config (vite.config.js) đã proxy /api → http://localhost:8080
 *     → axios chỉ cần gọi '/api/auth/login' là tự động đến đúng backend
 *   - authStore.js sẽ dùng instance này để gọi login/register/me
 *   - Các service khác (seriesService, pageService, ...) cũng dùng chung instance này
 *
 * 🧠 Luồng hoạt động:
 *   ┌──────────────────────────────────────────────────┐
 *   │ 1. Gọi API: axios.get('/api/series')              │
 *   │ 2. REQUEST interceptor: gắn token vào header      │
 *   │ 3. Gửi request đến backend                        │
 *   │ 4. RESPONSE interceptor: kiểm tra lỗi             │
 *   │    - 401 → tự động logout + redirect về /login    │
 *   │    - Lỗi khác → reject Promise với message rõ ràng│
 *   └──────────────────────────────────────────────────┘
 */

import axios from 'axios';

// ────────────────────────────────────────────────
//  ⚙️ 1. Khởi tạo axios instance
// ────────────────────────────────────────────────
/**
 * baseURL: '/api'
 * - Vì vite.config.js đã proxy /api → http://localhost:8080
 * - Nên khi gọi axios.get('/api/auth/me') → thực tế gọi http://localhost:8080/api/auth/me
 *
 * timeout: 15s — nếu backend không phản hồi trong 15 giây thì request bị huỷ
 * headers: mặc định gửi JSON
 *
 * UPLOAD_TIMEOUT: timeout riêng cho multipart/form-data (upload file lên Cloudinary)
 * - Upload 5 ảnh batch có thể mất 20-60s tuỳ dung lượng
 * - Dùng hằng này trong config của các request upload file
 */
export const UPLOAD_TIMEOUT = 120000;

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ────────────────────────────────────────────────
//  2. REQUEST interceptor — Tự động gắn JWT token
// ────────────────────────────────────────────────
/**
 * Chức năng:
 *   - Trước mỗi request, kiểm tra localStorage có accessToken không
 *   - Nếu có → gắn vào header: Authorization: Bearer <token>
 *   - Nếu không → gửi request bình thường (dùng cho login/register)
 *
 * Lý do dùng localStorage thay vì Zustand:
 *   - localStorage tồn tại xuyên suốt (kể cả khi refresh page)
 *   - Zustand state bị mất khi reload → không đáng tin cậy
 *   - authStore sẽ đồng bộ: khi login → lưu cả state + localStorage
 */
api.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage (nếu có)
    const token = localStorage.getItem('accessToken');

    // Nếu token tồn tại, gắn vào header Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // Lỗi trong quá trình tạo request (hiếm khi xảy ra)
    return Promise.reject(error);
  }
);

// ────────────────────────────────────────────────
//  3. RESPONSE interceptor — Xử lý lỗi tập trung
// ────────────────────────────────────────────────
/**
 * Chức năng:
 *   - Khi nhận response từ backend, kiểm tra nếu có lỗi
 *   - 401 Unauthorized → token hết hạn/không hợp lệ → tự động logout
 *   - Các lỗi khác → trích xuất message từ backend để component hiển thị
 *
 * Response từ backend có format (theo GlobalExceptionHandler.java):
 *   { status: 401, error: "Unauthorized", message: "Invalid credentials", timestamp: "..." }
 */
api.interceptors.response.use(
  (response) => {
    // Blob response → trả về full response để lấy headers (Content-Disposition, filename)
    if (response.config.responseType === 'blob') {
      return response;
    }
    // Request thành công (status 2xx) → trả về data luôn
    // Giúp component gọi API không cần .then(res => res.data)
    return response.data;
  },
  (error) => {
    // ─── Xử lý các trường hợp lỗi ───

    // TH1: Backend trả về lỗi (có response)
    if (error.response) {
      const { status, data } = error.response;

      // Nếu backend trả về data.message (format chuẩn của AppException)
      const message = data?.message || getDefaultMessage(status);

      // 401 — Token hết hạn hoặc sai credentials
      if (status === 401) {
        // Xoá token cũ khỏi localStorage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');

        // Redirect sang /login (nếu chưa ở đó)
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }

      // 403 — Forbidden (không có quyền)
      // 404 — Not Found
      // 409 — Conflict (email đã tồn tại, ...)
      // 500 — Internal Server Error

      // Trả về lỗi với message cụ thể
      return Promise.reject(new Error(message));
    }

    // TH2: Không có response (mạng lỗi, timeout, ...)
    if (error.request) {
      return Promise.reject(new Error('Cannot connect to server. Please check your network connection.'));
    }

    // TH3: Lỗi khác
    return Promise.reject(error);
  }
);

// ────────────────────────────────────────────────
//  4. Hàm phụ — Map status code → message mặc định
// ────────────────────────────────────────────────
function getDefaultMessage(status) {
  const messages = {
    400: 'Please check the information you entered',
    401: 'Session expired. Please log in again.',
    403: 'You do not have permission to perform this action',
    404: 'The page or item you requested was not found',
    409: 'This information already exists in our system',
    500: 'Server error. Please try again later.',
  };
  return messages[status] || 'An unknown error occurred';
}

export default api;
