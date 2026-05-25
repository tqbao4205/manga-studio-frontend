import * as React from 'react'
import { cn } from '../../utils'

/*
 * ── Tabs ─────────────────────────────────────────────────────────────
 *  Component thanh tab (tab bar) cho phép chuyển đổi giữa các view/page.
 *  Hiển thị danh sách tab dạng button, có active indicator (gạch chân)
 *  và tuỳ chọn hiển thị số đếm (count badge) bên cạnh label.
 * ─────────────────────────────────────────────────────────────────────
 *
 *  Props:
 *    - value        : string (bắt buộc) — Giá trị của tab đang active.
 *    - onValueChange: (value: string) => void (bắt buộc) — Callback khi
 *                     chuyển tab, nhận giá trị của tab được click.
 *    - tabs         : Array<{ value: string, label: string, count?: number }>
 *                     (bắt buộc) — Mảng định nghĩa các tab.
 *      - value : Giá trị định danh duy nhất của tab.
 *      - label : Text hiển thị trên tab.
 *      - count : (tuỳ chọn) Số đếm hiển thị dạng badge nhỏ bên cạnh label.
 *    - className    : string (tuỳ chọn) — Class bổ sung cho container.
 *
 *  Logic conditional className & rendering:
 *    - Container: flex, border-bottom (border-primary) ngăn cách với nội dung.
 *    - Với mỗi tab:
 *      - value === tab.value (active):
 *        → text-on-surface (chữ đậm)
 *        → Count badge: bg-primary + text-on-primary
 *        → Active indicator: div absolute h-0.5 bg-primary ở bottom
 *      - value !== tab.value (inactive):
 *        → text-on-surface-variant (chữ nhạt hơn)
 *        → Count badge: bg-black/10 + text-on-surface-variant
 *    - Hover: hover:text-on-surface cho cả active và inactive.
 *    - transition-all duration-200 cho hiệu ứng mượt khi chuyển tab.
 *
 *  Component sử dụng React.forwardRef để hỗ trợ ref.
 */

const Tabs = React.forwardRef(
  ({ value, onValueChange, tabs, className }, ref) => (
    <div ref={ref} className={cn('flex gap-0 border-b border-primary', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onValueChange(tab.value)}
          className={cn(
            'px-4 py-2.5 text-sm font-medium transition-all duration-200 relative',
            'hover:text-on-surface',
            /*
             * active  → text-on-surface (chữ đậm, tương phản cao)
             * inactive → text-on-surface-variant (chữ mờ hơn)
             */
            value === tab.value
              ? 'text-on-surface'
              : 'text-on-surface-variant',
          )}
        >
          {/* Label của tab */}
          {tab.label}

          {/*
           * Count badge: chỉ hiển thị nếu tab.count !== undefined.
           * active  → nền primary, chữ on-primary
           * inactive → nền đen 10%, chữ variant
           */}
          {tab.count !== undefined && (
            <span className={cn(
              'ml-2 px-1.5 py-0.5 text-xs',
              value === tab.value ? 'bg-primary text-on-primary' : 'bg-black/10 text-on-surface-variant',
            )}>
              {tab.count}
            </span>
          )}

          {/*
           * Active indicator: gạch chân dày 2px màu primary
           * chỉ hiển thị ở tab đang active.
           * absolute bottom-0 left-0 right-0 để căn sát đáy button.
           */}
          {value === tab.value && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      ))}
    </div>
  ),
)
Tabs.displayName = 'Tabs'

export { Tabs }
