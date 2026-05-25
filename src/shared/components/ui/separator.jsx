import * as React from 'react'
import { cn } from '../../utils'

/*
 * ── Separator ─────────────────────────────────────────────────────────
 *  Component đường kẻ ngang (horizontal rule) dùng để phân cách
 *  các section hoặc nhóm nội dung trong layout.
 * ─────────────────────────────────────────────────────────────────────
 *
 *  Props:
 *    - className : string (tuỳ chọn) — Class bổ sung.
 *      Có thể dùng để thay đổi màu sắc, margin, hoặc chuyển thành
 *      đường kẻ dọc (ví dụ: thêm h-full w-px thay vì h-px w-full).
 *    - ...props  : Các thuộc tính HTML div còn lại.
 *
 *  Style classes:
 *    - h-px         : Chiều cao 1px (đường kẻ ngang).
 *    - bg-border-light : Màu xám nhạt, hài hoà với bảng màu thiết kế.
 *
 *  Mở rộng:
 *    - Để tạo separator dọc, truyền className="h-full w-px".
 *
 *  Component sử dụng React.forwardRef để hỗ trợ ref.
 */

const Separator = React.forwardRef(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('h-px bg-border-light', className)} {...props} />
  ),
)
Separator.displayName = 'Separator'

export { Separator }
