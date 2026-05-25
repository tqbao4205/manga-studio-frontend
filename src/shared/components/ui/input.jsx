import * as React from 'react'
import { cn } from '../../utils'

/*
 * ── Input ─────────────────────────────────────────────────────────────
 *  Component ô nhập liệu (text input) với style đồng bộ toàn bộ UI.
 *  Hỗ trợ tất cả các type HTML (text, email, password, number, ...).
 * ─────────────────────────────────────────────────────────────────────
 *
 *  Props:
 *    - className : string (tuỳ chọn) — Class bổ sung (vd: w-full cho layout).
 *    - type      : string (tuỳ chọn, mặc định: 'text') — Kiểu input HTML.
 *    - ...props  : Các thuộc tính HTML input còn lại (placeholder, value,
 *                  onChange, disabled, required, ...).
 *
 *  Style classes:
 *    - flex h-10 w-full          : Chiều cao cố định 40px, full width.
 *    - border border-primary      : Viền đen (ink stroke).
 *    - bg-white px-3 py-2 text-sm : Nền trắng, padding, font nhỏ.
 *    - text-on-surface            : Màu chữ tối.
 *    - placeholder:text-on-surface-variant : Màu placeholder xám.
 *    - focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
 *      : Khi focus, bỏ outline mặc định, thay bằng ring xanh chủ đạo.
 *    - disabled:cursor-not-allowed disabled:opacity-50
 *      : Khi disabled, hiển thị cursor not-allowed + mờ.
 *
 *  Component sử dụng React.forwardRef để hỗ trợ ref.
 */

const Input = React.forwardRef(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full border border-primary bg-white px-3 py-2 text-sm',
          'text-on-surface placeholder:text-on-surface-variant',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
