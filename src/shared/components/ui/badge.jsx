import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../utils'

/*
 * ── Badge ─────────────────────────────────────────────────────────────
 *  Component hiển thị nhãn/huy hiệu (badge) với nhiều màu sắc và kích thước.
 *  Sử dụng class-variance-authority (cva) để định nghĩa các biến thể.
 * ─────────────────────────────────────────────────────────────────────
 *
 *  Variants:
 *    variant:
 *      - default : Xanh chủ đạo (primary-container) — dùng phổ biến nhất.
 *      - success : Xanh lá — dùng cho trạng thái thành công.
 *      - warning : Vàng/cam — dùng cho cảnh báo.
 *      - danger  : Đỏ — dùng cho lỗi hoặc hành động nguy hiểm.
 *      - info    : Xanh dương — dùng cho thông tin.
 *
 *    size:
 *      - sm : 10px chữ, padding nhỏ.
 *      - md : 12px chữ, padding vừa (mặc định).
 *
 *  Props:
 *    - className : string (tuỳ chọn) — Class bổ sung.
 *    - variant   : keyof variants (mặc định: 'default') — Biến thể màu sắc.
 *    - size      : keyof sizes (mặc định: 'md') — Kích thước.
 *    - ...props  : Các thuộc tính HTML còn lại (onClick, id, ...).
 *
 *  Logic conditional className:
 *    - badgeVariants({ variant, size }) sinh class tương ứng.
 *    - className được merge sau để ghi đè nếu cần.
 */

const badgeVariants = cva(
  'inline-flex items-center font-medium border transition-colors',
  {
    variants: {
      variant: {
        default: 'border-primary/20 bg-primary-container/50 text-on-primary-container',
        success: 'border-status-success/30 bg-status-success/5 text-status-success',
        warning: 'border-status-warning/30 bg-status-warning/5 text-status-warning',
        danger: 'border-status-danger/30 bg-status-danger/5 text-status-danger',
        info: 'border-status-info/30 bg-status-info/5 text-status-info',
      },
      size: {
        sm: 'text-[10px] px-2 py-0.5 gap-1',
        md: 'text-xs px-2.5 py-0.5 gap-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

const Badge = React.forwardRef(
  ({ className, variant, size, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant, size }), className)} {...props} />
  ),
)
Badge.displayName = 'Badge'

export { Badge, badgeVariants }
