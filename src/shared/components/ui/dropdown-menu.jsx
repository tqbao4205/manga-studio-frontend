import * as React from 'react'
import { cn } from '../../utils'

/*
 * ── DropdownMenu ──────────────────────────────────────────────────────
 *  Component menu thả xuống với trigger tuỳ chỉnh.
 *  Bao gồm: DropdownMenu (container + logic mở/đóng),
 *           DropdownMenuItem (một mục trong menu),
 *           DropdownMenuSeparator (đường kẻ phân cách).
 * ─────────────────────────────────────────────────────────────────────
 *
 *  DropdownMenu:
 *    Props:
 *      - trigger   : ReactNode (bắt buộc) — Element để click mở menu.
 *      - children  : ReactNode — Các DropdownMenuItem và DropdownMenuSeparator.
 *      - align     : 'start' | 'end' (mặc định: 'start') — Căn menu theo
 *                    hướng left (start) hoặc right (end).
 *      - className : string (tuỳ chọn) — Class bổ sung cho menu panel.
 *
 *    Logic:
 *      - State open (boolean) quản lý đóng/mở.
 *      - Click trigger → toggle open.
 *      - Khi mở: render overlay transparent (fixed inset-0) để bắt click
 *        bên ngoài → đóng menu.
 *      - React.Children.map + cloneElement: gắn thêm onClick vào mỗi
 *        DropdownMenuItem để tự động đóng menu sau khi chọn.
 *
 *  DropdownMenuItem:
 *    Props:
 *      - className : string (tuỳ chọn) — Class bổ sung.
 *      - icon      : ReactNode (tuỳ chọn) — Icon hiển thị bên trái text.
 *      - danger    : boolean (tuỳ chọn) — Nếu true, style màu đỏ (nguy hiểm).
 *      - children  : ReactNode — Nội dung text của mục.
 *      - ...props  : Các thuộc tính HTML còn lại (onClick, ...).
 *
 *    Logic conditional className:
 *      - danger === true  → text-status-danger + hover:bg-status-danger/5
 *      - danger === false → text-on-surface-variant + hover:bg-black/5 + hover:text-on-surface
 *
 *  DropdownMenuSeparator:
 *    - Đường kẻ ngang (h-px) màu border-light, dùng để phân cách nhóm mục.
 */

const DropdownMenu = React.forwardRef(
  ({ trigger, children, align = 'start', className }, ref) => {
    const [open, setOpen] = React.useState(false)

    return (
      <div ref={ref} className="relative inline-block">
        {/*
         * Trigger: click vào element này để mở/toggle menu.
         * Ngăn event bubble để tránh xung đột với overlay.
         */}
        <div onClick={() => setOpen(!open)}>{trigger}</div>

        {open && (
          <>
            {/*
             * Overlay trong suốt phủ toàn màn hình, bắt click bên ngoài.
             * z-40 để nằm dưới menu panel (z-50).
             */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            {/*
             * Menu panel: absolute ngay dưới trigger.
             * min-w-[12rem] đảm bảo độ rộng tối thiểu.
             * Căn left/right dựa vào prop align.
             */}
            <div
              className={cn(
                'absolute z-50 mt-1 min-w-[12rem] border border-primary bg-white backdrop-blur-xl py-1.5',
                align === 'end' ? 'right-0' : 'left-0',
                className,
              )}
            >
              {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                  return React.cloneElement(child, {
                    onClick: (e) => {
                      child.props.onClick?.(e)
                      setOpen(false)
                    },
                  })
                }
                return child
              })}
            </div>
          </>
        )}
      </div>
    )
  },
)
DropdownMenu.displayName = 'DropdownMenu'

const DropdownMenuItem = React.forwardRef(
  ({ className, icon, children, danger, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer transition-colors',
        /*
         * danger === true:  style màu đỏ (xóa, thoát...)
         * danger === false: style trung tính, hover đổi màu
         */
        danger ? 'text-status-danger hover:bg-status-danger/5' : 'text-on-surface-variant hover:bg-black/5 hover:text-on-surface',
        className,
      )}
      {...props}
    >
      {icon && <span className="w-4 h-4 flex items-center justify-center">{icon}</span>}
      {children}
    </div>
  ),
)
DropdownMenuItem.displayName = 'DropdownMenuItem'

const DropdownMenuSeparator = React.forwardRef(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('h-px bg-border-light my-1.5', className)} {...props} />
  ),
)
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator'

export { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator }
