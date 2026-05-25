import * as React from 'react'
import { cn } from '../../utils'

/*
 * ── Label ─────────────────────────────────────────────────────────────
 *  Component nhãn (label) cho form field, thường đi kèm với Input, Select, ...
 *  Tích hợp sẵn peer-disabled để tự động mờ khi input anh chị em (sibling)
 *  bị disabled (sử dụng class peer của Tailwind).
 * ─────────────────────────────────────────────────────────────────────
 *
 *  Props:
 *    - className : string (tuỳ chọn) — Class bổ sung.
 *    - children  : ReactNode — Nội dung text của label.
 *    - ...props  : Các thuộc tính HTML label còn lại (htmlFor, ...).
 *
 *  Style classes:
 *    - text-sm font-medium text-on-surface : Cỡ chữ nhỏ, font dày, màu tối.
 *    - leading-none                        : Line-height = 1, tránh dư khoảng.
 *    - peer-disabled:cursor-not-allowed     : Khi peer disabled → cursor x.
 *    - peer-disabled:opacity-70             : Khi peer disabled → mờ đi.
 *
 *  Cách dùng peer-disabled:
 *    <div className="peer">
 *      <Input disabled />
 *      <Label>...</Label>   ← tự động mờ khi Input bị disabled
 *    </div>
 *
 *  Component sử dụng React.forwardRef để hỗ trợ ref.
 */

const Label = React.forwardRef(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium text-on-surface leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    />
  ),
)
Label.displayName = 'Label'

export { Label }
