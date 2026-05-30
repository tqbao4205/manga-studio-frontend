import * as React from 'react'
import { cn } from '../../utils'

/*
 * ── Avatar ────────────────────────────────────────────────────────────
 *  Component hiển thị ảnh đại diện (avatar) của người dùng.
 *  Nếu có ảnh (src) thì hiển thị ảnh, nếu load ảnh lỗi hoặc không có ảnh
 *  thì fallback về chữ cái đầu của tên (getInitials).
 * ─────────────────────────────────────────────────────────────────────
 *
 *  Props:
 *    - src       : string (tuỳ chọn) — URL ảnh đại diện.
 *    - name      : string (bắt buộc) — Tên hiển thị, dùng để tạo chữ fallback.
 *    - size      : 'sm' | 'md' | 'lg' (mặc định: 'md') — Kích thước avatar.
 *    - className : string (tuỳ chọn) — Class bổ sung từ ngoài.
 *
 *  sizeClasses:
 *    - sm : 28px (w-7 h-7), chữ text-xs
 *    - md : 36px (w-9 h-9), chữ text-sm
 *    - lg : 48px (w-12 h-12), chữ text-base
 *
 *  Logic conditional className:
 *    - Luôn có các class nền: relative overflow-hidden flex-shrink-0 ...
 *    - `sizeClasses[size]` lấy class kích thước tương ứng.
 *    - `className` được merge cuối cùng để cho phép override.
 *
 *  Component sử dụng React.forwardRef để hỗ trợ ref từ component cha.
 */

const sizeClasses = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const Avatar = React.forwardRef(
  ({ src, name, size = 'md', className, ...props }, ref) => {
    const [imgError, setImgError] = React.useState(false)

    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden flex-shrink-0 flex items-center justify-center',
          'bg-surface-container-highest border border-outline-variant/30',
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {/*
         * Nếu có src và chưa load lỗi → hiển thị <img>.
         * onError sẽ set imgError = true để lần sau render fallback.
         */}
        {src && !imgError ? (
          <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <span className="font-medium text-on-surface-variant">{getInitials(name)}</span>
        )}
      </div>
    )
  },
)
Avatar.displayName = 'Avatar'

export { Avatar }
