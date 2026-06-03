import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils'

/*
 * ── Dialog ────────────────────────────────────────────────────────────
 *  Component modal/overlay hiển thị nội dung popup ở trung tâm màn hình.
 *  Bao gồm: overlay backdrop mờ, header (title + description + nút đóng),
 *  và body (children).
 * ─────────────────────────────────────────────────────────────────────
 *
 *  Props:
 *    - open        : boolean (bắt buộc) — Trạng thái mở/đóng dialog.
 *    - onClose     : function (bắt buộc) — Callback đóng dialog.
 *    - title       : string (tuỳ chọn) — Tiêu đề dialog.
 *    - description : string (tuỳ chọn) — Mô tả phụ dưới tiêu đề.
 *    - children    : ReactNode (tuỳ chọn) — Nội dung chính bên trong.
 *    - className   : string (tuỳ chọn) — Class bổ sung cho container dialog.
 *    - size        : 'sm' | 'md' | 'lg' (mặc định: 'md') — Kích thước dialog.
 *
 *  sizeClasses:
 *    - sm : max-w-sm (384px)
 *    - md : max-w-lg (512px)
 *    - lg : max-w-2xl (672px)
 *
 *  Logic conditional className & rendering:
 *    - Nếu open === false → return null (không render gì).
 *    - Overlay backdrop: fixed inset-0, bg-black/40 + backdrop-blur-sm.
 *      Click vào overlay → gọi onClose.
 *    - Container dialog: glass-frost (style kính mờ + viền đen), z-50.
 *    - Header: border-bottom, chứa title + description bên trái,
 *      nút X (lucide-react) bên phải để đóng.
 *    - Body: children được bọc trong div p-4.
 *
 *  Component sử dụng React.forwardRef để hỗ trợ ref.
 */

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

const Dialog = React.forwardRef(
  ({ open, onClose, title, description, children, className, size = 'md' }, ref) => {
    if (!open) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
        {/*
         * Overlay tối + click ra ngoài để đóng.
         * backdrop-blur-sm làm mờ nền phía sau.
         */}
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <div
          ref={ref}
          className={cn(
            'relative z-50 w-full mx-3 bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-2xl shadow-black/50',
            sizeClasses[size],
            className,
          )}
        >
          {/*
           * Header: title + description (bên trái), nút X (bên phải).
           * border-bottom ngăn cách với body.
           */}
          <div className="flex items-start justify-between gap-4 p-5 pb-4">
            <div className="min-w-0 flex-1">
              {title && <h2 className="text-base font-semibold text-on-surface">{title}</h2>}
              {description && <p className="text-sm text-on-surface-variant/70 mt-1 leading-relaxed">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant/50 hover:text-on-surface hover:bg-surface-container transition-colors flex-shrink-0 -mr-1 -mt-1"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body: nội dung chính */}
          <div className="p-5">{children}</div>
        </div>
      </div>
    )
  },
)
Dialog.displayName = 'Dialog'

export { Dialog }
