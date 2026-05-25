import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '../../utils'

/**
 * ── FilterDropdown: Dropdown chọn bộ lọc cho một nhóm ──
 *
 * Props (thông qua group):
 *   - group.id       : ID định danh nhóm
 *   - group.label    : Nhãn hiển thị (ví dụ: "Status")
 *   - group.value    : Giá trị đang được chọn ('ALL' hoặc giá trị cụ thể)
 *   - group.options  : Mảng các lựa chọn [{ value, label, count? }]
 *   - group.onChange : Callback khi chọn giá trị mới
 *
 * Hành vi:
 *   - Click button → mở/đóng dropdown
 *   - Click bên ngoài → tự động đóng
 *   - Button thay đổi style khi có filter đang active (value !== 'ALL')
 */

function FilterDropdown({ group }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Nhãn đang được chọn, fallback về 'All' nếu không tìm thấy
  const activeLabel = group.options.find(o => o.value === group.value)?.label || 'All'

  return (
    <div ref={ref} className="relative">
      {/* Nút trigger dropdown */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-xs font-medium border transition-all',
          group.value === 'ALL'
            ? 'border-primary text-on-surface-variant hover:text-on-surface hover:bg-black/[0.02]'
            : 'border-primary bg-primary text-on-primary',
        )}
      >
        <span>{group.label}:</span>
        <span className="font-semibold">{activeLabel}</span>
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {/* Menu dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[160px] border border-primary bg-white">
          {group.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { group.onChange(opt.value); setOpen(false) }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors',
                group.value === opt.value
                  ? 'bg-primary text-on-primary font-medium'
                  : 'text-on-surface-variant hover:bg-black/[0.02] hover:text-on-surface',
              )}
            >
              <span>{opt.label}</span>
              {/* Hiển thị số lượng nếu có */}
              {opt.count !== undefined && (
                <span className={cn('ml-3 tabular-nums', group.value === opt.value ? 'text-on-primary/60' : 'text-on-surface-variant/60')}>
                  {opt.count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * ── FilterBar: Thanh lọc dữ liệu với nhiều nhóm filter ──
 *
 * Props:
 *   - groups       : Mảng cấu hình các nhóm filter (xem FilterDropdown)
 *   - activeFilters: Mảng các filter đang active [{ groupId, value, groupLabel, label, onRemove }]
 *   - resultCount  : Số kết quả sau khi lọc (hiển thị bên cạnh active filter)
 *   - totalCount   : Tổng số bản ghi ban đầu
 *   - onClearAll   : Callback khi nhấn "Clear all" để xoá hết filter
 *   - className    : Class CSS bổ sung
 */

export function FilterBar({ groups, activeFilters, resultCount, totalCount, onClearAll, className }) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Các dropdown chọn bộ lọc */}
      <div className="flex flex-wrap items-center gap-2">
        {groups.map((g) => (
          <FilterDropdown key={g.id} group={g} />
        ))}
      </div>

      {/* Khu vực hiển thị các filter đang active */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeFilters.map((f) => (
            <span
              key={`${f.groupId}-${f.value}`}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-primary/20"
            >
              <span className="text-on-surface-variant/70">{f.groupLabel}:</span>
              <span className="font-medium text-on-surface">{f.label}</span>
              {/* Nút xoá từng filter */}
              <button onClick={f.onRemove} className="ml-0.5 text-on-surface-variant/50 hover:text-on-surface">
                <X size={12} />
              </button>
            </span>
          ))}
          {/* Thống kê số lượng kết quả */}
          {resultCount !== undefined && totalCount !== undefined && (
            <span className="text-xs text-on-surface-variant/60 ml-1 tabular-nums">
              {resultCount} of {totalCount}
            </span>
          )}
          {/* Nút xoá tất cả filter */}
          {onClearAll && (
            <button onClick={onClearAll} className="text-xs underline text-on-surface-variant/60 hover:text-on-surface ml-1">
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  )
}
