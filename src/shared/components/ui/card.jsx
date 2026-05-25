import * as React from 'react'
import { cn } from '../../utils'

/*
 * ── Card ──────────────────────────────────────────────────────────────
 *  Bộ component tạo thẻ (card) với layout chuẩn:
 *    Card → CardHeader → (CardTitle + CardDescription)
 *        → CardContent
 *        → CardFooter
 *  Sử dụng class "card-ink" cho style viền đen nét (ink stroke) + nền trắng.
 * ─────────────────────────────────────────────────────────────────────
 *
 *  Sub-components:
 *
 *  Card:
 *    - Container chính của card, áp dụng class "card-ink".
 *    - Props: className, ...props (HTML div attributes).
 *
 *  CardHeader:
 *    - Phần đầu card, layout flex-col, chứa title + description.
 *    - Padding: p-4, gap: space-y-1.5.
 *
 *  CardTitle:
 *    - Tiêu đề chính (thẻ <h3>).
 *    - Font semibold, tracking-tight (chữ dày, co cụm nhẹ).
 *
 *  CardDescription:
 *    - Mô tả phụ bên dưới title (thẻ <p>).
 *    - Cỡ chữ nhỏ (text-sm), màu on-surface-variant (xám hơn).
 *
 *  CardContent:
 *    - Nội dung chính bên trong card.
 *    - Padding: p-4, nhưng pt-0 để sát với header (nếu có).
 *
 *  CardFooter:
 *    - Phần chân card, layout flex, thường chứa actions/buttons.
 *    - Padding: p-4 pt-0.
 *
 *  Tất cả sub-component đều dùng React.forwardRef và merge className
 *  thông qua cn() để hỗ trợ custom style từ bên ngoài.
 */

const Card = React.forwardRef(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('card-ink', className)} {...props} />
  ),
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-4', className)} {...props} />
  ),
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('font-semibold text-on-surface leading-none tracking-tight', className)} {...props} />
  ),
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-on-surface-variant', className)} {...props} />
  ),
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-4 pt-0', className)} {...props} />
  ),
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-4 pt-0', className)} {...props} />
  ),
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
