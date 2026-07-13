/**
 * ─────────────────────────────────────────────
 *  uploadService.js — API upload file lên Cloudinary
 * ─────────────────────────────────────────────
 *
 * 🎯 Mục đích:
 *   - Đóng gói các API call liên quan đến upload file (avatar, page, ...)
 *   - Upload xong → trả về URL của file trên Cloudinary
 *   - Backend tự xoá file cũ nếu có (ví dụ: avatar cũ)
 *
 * 🔗 Liên kết:
 *   - ProfilePage.jsx → gọi uploadService.uploadAvatar(file)
 *   - UploadController.java → POST /api/upload/avatar
 *
 * 📋 API có trong file này:
 *   ┌─────────────────────┬────────────────────────────┬──────────────────┐
 *   │ Chức năng           │ Endpoint                   │ Method           │
 *   ├─────────────────────┼────────────────────────────┼──────────────────┤
 *   │ Upload avatar       │ /api/upload/avatar         │ POST             │
 *   └─────────────────────┴────────────────────────────┴──────────────────┘
 */

import api, { UPLOAD_TIMEOUT } from './api';
import { compressImage } from '../shared/utils/imageCompression';

/**
 * ─────────────────────────────────────────────
 *  uploadService — Object chứa tất cả hàm upload
 * ─────────────────────────────────────────────
 */
const uploadService = {

  /**
   * ────────────────────────────────────────────
   *  1. UPLOAD AVATAR — Upload ảnh đại diện
   * ────────────────────────────────────────────
   *
   * Gọi API upload avatar lên Cloudinary.
   *
   * Endpoint backend: POST /api/upload/avatar
   * Controller: UploadController.java @PostMapping("/avatar")
   * Service: CloudinaryService.java → uploadAvatar(file, userId)
   *
   * Flow backend:
   *   1. Lấy userId từ JWT token
   *   2. Nếu user đã có avatar cũ → xoá khỏi Cloudinary
   *   3. Upload file mới với đường dẫn: manga_studio/u{userId}/profile/avatar.jpg
   *   4. Resize ảnh: c_fill, w_400, h_400
   *   5. Trả về URL công khai
   *
   * @param {File} file - File ảnh cần upload
   *                      Định dạng cho phép: JPEG, PNG, GIF, WebP
   *                      Kích thước tối đa: 5MB (đã validate ở frontend)
   * @returns {Promise<{url: string}>}
   *
   * Response thành công (status 200):
   *   {
   *     url: "https://res.cloudinary.com/dklp7kcl9/image/upload/c_fill,w_400,h_400/v1234567890/manga_studio/u1/profile/avatar.jpg"
   *   }
   *
   * Lỗi từ backend (GlobalExceptionHandler.java):
   *   400 → "File is required" — không gửi file
   *   413 → File quá lớn (backed bởi spring.servlet.multipart.max-file-size)
   *   500 → Lỗi Cloudinary (timeout, invalid signature...)
   *
   * Ghi chú:
   *   - Dùng FormData vì backend nhận @RequestParam("file") MultipartFile
   *   - Không set Content-Type thủ công — axios tự set multipart/form-data kèm boundary
   *   - Token JWT được api.js interceptor tự động gắn vào header
   */
  uploadAvatar: async (file) => {
    const compressed = await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 800 });
    const formData = new FormData();
    formData.append('file', compressed);

    const data = await api.post('/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    });

    return data;
  },
};

export default uploadService;
