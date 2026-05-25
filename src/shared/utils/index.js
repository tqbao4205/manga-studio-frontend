/**
 * ── utils/index.js ──
 * Tập hợp các hàm tiện ích dùng chung trong toàn bộ ứng dụng.
 *
 * 🎯 Mục đích:
 *   - Gom các hàm xử lý dùng nhiều lần (định dạng ngày, màu sắc,...)
 *     tránh lặp code ở nhiều component
 *
 * Các nhóm chức năng:
 *   1. cn()              → gộp class name Tailwind (clsx + tailwind-merge)
 *   2. formatDate()       → định dạng ngày theo locale en-US
 *   3. formatRelativeTime() → hiển thị thời gian dạng "vừa xong", "5m trước",...
 *   4. getStatusColor()   → lấy màu theo trạng thái (status)
 *   5. getPeriodLabel()   → tính nhãn tuần (ISO week) từ ngày
 *   6. getPriorityColor() → lấy màu theo mức ưu tiên (priority)
 *   7. getRegionTypeColor() → lấy màu theo loại vùng (region type)
 *   8. getRankColor()     → lấy màu theo hạng (tier S/A/B/C/D)
 */

import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * cn — Gộp nhiều class name, loại bỏ xung đột Tailwind.
 *
 * @param  {...any} inputs - Class name, object, mảng (theo chuẩn clsx)
 * @returns {string}       - Chuỗi class name đã được gộp và tối ưu
 *
 * Giải thích: clsx xử lý conditional classes, twMerge loại bỏ
 * các class Tailwind xung đột (vd: 'px-4 px-6' → chỉ giữ 'px-6').
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * formatDate — Định dạng ngày tháng theo dạng "MMM dd, yyyy".
 *
 * @param {string|Date} date    - Ngày cần format (chuỗi ISO hoặc Date object)
 * @param {Object}      options - Tuỳ chọn bổ sung cho Intl.DateTimeFormat
 * @returns {string}            - Chuỗi ngày đã format
 *
 * Ví dụ: formatDate('2026-05-22') → "May 22, 2026"
 */
export function formatDate(date, options) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  }).format(new Date(date))
}

/**
 * formatRelativeTime — Hiển thị thời gian tương đối (relative time).
 *
 * @param {string|Date} date - Ngày gốc cần so sánh
 * @returns {string}         - Chuỗi như "just now", "5m ago", "3h ago", "2d ago"
 *
 * Luồng xử lý:
 *   1. Tính chênh lệch giữa bây giờ và thời điểm target (milliseconds)
 *   2. Đổi ra phút → giờ → ngày
 *   3. Trả về chuỗi tương ứng với khoảng thời gian
 *   4. Nếu >= 7 ngày → gọi formatDate() để hiển thị ngày cụ thể
 */
export function formatRelativeTime(date) {
  const now = new Date()
  const target = new Date(date)
  const diffMs = now.getTime() - target.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(date)
}

/**
 * getStatusColor — Trả về mã màu (hex) tương ứng với trạng thái.
 *
 * @param {string} status - Mã trạng thái (vd: 'ONGOING', 'DRAFT', 'REJECTED')
 * @returns {string}      - Mã màu hex (#rrggbb)
 *
 * Bảng màu phân loại:
 *   Xanh lá (#16a34a) — trạng thái hoàn thành/tích cực
 *   Vàng   (#f59e0b) — cần chú ý (at risk)
 *   Tím    (#7c3aed) — đang chờ review/phê duyệt
 *   Cam    (#ea580c) — đang chờ xử lý
 *   Xanh dương (#2563eb) — đang tiến hành / đã lên lịch
 *   Xám    (#6b7280) — tạm ngưng / bản nháp
 *   Đỏ     (#dc2626) — bị từ chối / huỷ
 *   Mặc định: xám (#6b7280)
 */
export function getStatusColor(status) {
  const map = {
    TODO: '#ea580c',
    ACTIVE: '#16a34a',
    DONE: '#16a34a',
    APPROVED: '#16a34a',
    PUBLISHED: '#16a34a',
    COMPLETED: '#16a34a',
    PENDING_BOARD_APPROVAL: '#ea580c',
    PENDING: '#ea580c',
    IN_PROGRESS: '#2563eb',
    IN_REVIEW: '#7c3aed',
    SUBMITTED: '#7c3aed',
    REVISION_REQUIRED: '#dc2626',
    DRAFT: '#6b7280',
    CANCELLED: '#dc2626',
    REJECTED: '#dc2626',

    SCHEDULED: '#2563eb',
    IN_PRESS: '#7c3aed',
  }
  return map[status] || '#6b7280'
}

/**
 * getPeriodLabel — Tính nhãn tuần theo chuẩn ISO 8601 (vd: "2026-W21").
 *
 * @param {string} dateStr - Chuỗi ngày (định dạng YYYY-MM-DD)
 * @returns {string}       - Nhãn tuần dạng "YYYY-Www"
 *
 * Logic phức tạp:
 *   - Dùng công thức ISO week: tuần bắt đầu từ Thứ 2,
 *     tuần đầu năm là tuần có chứa Thứ 5 đầu tiên.
 *   - Để tính đúng, cần điều chỉnh ngày về Thứ 5 cùng tuần
 *     (utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7))).
 *   - Sau đó tính số tuần từ đầu năm: (số ngày lẻ + 1) / 7, làm tròn lên.
 */
export function getPeriodLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7)
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

/**
 * getPriorityColor — Trả về màu theo mức độ ưu tiên của task.
 *
 * @param {string} priority - 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'
 * @returns {string}        - Mã màu hex
 *
 *   URGENT → đỏ     (#dc2626)
 *   HIGH   → cam    (#ea580c)
 *   MEDIUM → xanh dương (#2563eb)
 *   LOW    → xám    (#6b7280)
 */
export function getPriorityColor(priority) {
  const map = {
    URGENT: '#dc2626',
    HIGH: '#ea580c',
    MEDIUM: '#2563eb',
    LOW: '#6b7280',
  }
  return map[priority] || '#6b7280'
}

/**
 * getRegionTypeColor — Trả về màu theo loại vùng (region type) trên trang manga.
 *
 * @param {string} type - 'BACKGROUND' | 'CHARACTER' | 'TEXT' | 'EFFECT' | 'TONE' | 'OTHER'
 * @returns {string}    - Mã màu hex
 *
 * NOTE: Bảng màu này trùng với REGION_COLORS trong constants.js.
 *       Cập nhật đồng bộ khi thay đổi.
 */
export function getRegionTypeColor(type) {
  const map = {
    BACKGROUND: '#00d4aa',
    CHARACTER: '#dc2626',
    TEXT: '#fbbf24',
    EFFECT: '#7c3aed',
    TONE: '#2563eb',
    OTHER: '#f472b6',
  }
  return map[type] || '#6b7280'
}

/**
 * getRankColor — Trả về màu theo thứ hạng (tier) của series.
 *
 * @param {string} tier - 'S' | 'A' | 'B' | 'C' | 'D'
 * @returns {string}    - Mã màu hex
 *
 *   S → vàng  (#fbbf24) — hạng cao nhất
 *   A → bạc   (#9ca3af)
 *   B → nâu   (#d97706)
 *   C → đỏ    (#dc2626)
 *   D → xám   (#6b7280) — hạng thấp nhất
 */
export function getRankColor(tier) {
  const map = {
    S: '#fbbf24',
    A: '#9ca3af',
    B: '#d97706',
    C: '#dc2626',
    D: '#6b7280',
  }
  return map[tier] || '#6b7280'
}
