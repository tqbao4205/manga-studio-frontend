import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '../../utils'

/*
 * ── Button ────────────────────────────────────────────────────────────
 *  Component nút bấm với đa dạng biến thể (variant) và kích thước (size).
 *  Hỗ trợ asChild (Radix Slot) để render dưới dạng component khác (Link, ...).
 *  Sử dụng class-variance-authority (cva) để quản lý các biến thể style.
 * ─────────────────────────────────────────────────────────────────────
 *
 *  Variants:
 *    variant:
 *      - primary       : Nền xanh chủ đạo, chữ trắng — dùng cho hành động chính.
 *      - danger        : Nền đỏ, chữ trắng — dùng cho hành động nguy hiểm (xóa...).
 *      - ghost         : Trong suốt, đổi màu khi hover — dùng cho hành động phụ.
 *      - outline       : Viền xanh, nền trong suốt — nút viền outline.
 *      - outline-accent : Viền cyan, chữ cyan — nút outline màu nhấn.
 *
 *    size:
 *      - sm   : Chiều cao 32px (h-8), chữ text-xs.
 *      - md   : Chiều cao 36px (h-9), chữ text-sm (mặc định).
 *      - lg   : Chiều cao 40px (h-10), chữ text-sm.
 *      - icon : 36x36 (h-9 w-9) — dùng cho nút chỉ có icon.
 *
 *  Props:
 *    - className : string (tuỳ chọn) — Class bổ sung.
 *    - variant   : keyof variants (mặc định: 'primary') — Biến thể giao diện.
 *    - size      : keyof sizes (mặc định: 'md') — Kích thước.
 *    - asChild   : boolean (mặc định: false) — Nếu true, render component con
 *                  (dùng Slot của Radix) để cho phép custom element (Link, ...).
 *    - ...props  : Các thuộc tính HTML/React còn lại.
 *
 *  Logic conditional className:
 *    - buttonVariants({ variant, size, className }) sinh class chuẩn.
 *    - Lưu ý: className được truyền thẳng vào cva (không dùng cn riêng).
 *
 *  Hành vi disabled:
 *    - pointer-events-none + opacity-50 — tự động từ cva base classes.
 */

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary hover:bg-primary/90',
        danger: 'bg-status-danger text-white hover:bg-status-danger/90',
        ghost: 'text-on-surface-variant hover:bg-black/5 hover:text-on-surface',
        outline: 'border border-primary bg-transparent hover:bg-black/5 text-on-surface',
        'outline-accent': 'border border-accent-cyan text-accent-cyan hover:bg-accent-cyan/5',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
