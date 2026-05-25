import * as React from 'react'
import { cn } from '../../utils'

/*
 * ── Select ────────────────────────────────────────────────────────────
 *  Component dropdown native (thẻ <select> HTML) với mảng options.
 *  Hỗ trợ placeholder làm option đầu tiên (disabled).
 * ─────────────────────────────────────────────────────────────────────
 *
 *  Props:
 *    - options    : Array<{ value: string | number, label: string }>
 *                   (bắt buộc) — Danh sách các lựa chọn.
 *    - placeholder: string (tuỳ chọn) — Text hiển thị khi chưa chọn gì.
 *                   Render thành <option value="" disabled>.
 *    - className  : string (tuỳ chọn) — Class bổ sung.
 *    - ...props   : Các thuộc tính HTML select còn lại
 *                   (value, onChange, disabled, required, ...).
 *
 *  Style classes:
 *    - Giống với Input để đồng bộ:
 *      flex h-10 w-full, border-primary, bg-white, text-sm, focus ring.
 *    - disabled:cursor-not-allowed disabled:opacity-50.
 *
 *  Lưu ý:
 *    - options[].value được dùng làm value của <option> (string).
 *    - options[].label là text hiển thị.
 *    - Nếu placeholder được cung cấp, nó sẽ là option đầu tiên (disabled).
 *
 *  Component sử dụng React.forwardRef để hỗ trợ ref.
 */

const Select = React.forwardRef(
  ({ className, options, placeholder, ...props }, ref) => (
    <select
      className={cn(
        'flex h-10 w-full border border-primary bg-white px-3 py-2 text-sm',
        'text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    >
      {/*
       * Placeholder: option đầu tiên bị disable, không có value,
       * dùng để hiển thị hướng dẫn (vd: "Chọn một giá trị").
       */}
      {placeholder && <option value="" disabled>{placeholder}</option>}

      {/*
       * Duyệt mảng options, mỗi phần tử là một <option>.
       * key = value để React tối ưu re-render.
       */}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
)
Select.displayName = 'Select'

export { Select }
