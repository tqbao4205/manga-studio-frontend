import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../utils'

/**
 * ── Pagination: Component phân trang ──
 *
 * Props:
 *   - page        : Trang hiện tại (0-indexed)
 *   - totalPages  : Tổng số trang
 *   - onPageChange: Callback khi chuyển trang, nhận page index (0-indexed) làm tham số
 *
 * Hiển thị:
 *   - Nếu totalPages <= 1 → không render gì
 *   - Nút Prev / Next (disabled ở biên)
 *   - Các nút số trang, rút gọn bằng dấu '...' khi có nhiều trang
 *
 * Cách rút gọn:
 *   - Luôn hiển thị trang đầu (0) và trang cuối (totalPages - 1)
 *   - Hiển thị tối đa range=2 trang xung quanh trang hiện tại
 *   - Khoảng cách giữa các cụm được thay bằng dấu '...'
 */

export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  // Xây dựng mảng các trang cần hiển thị (bao gồm cả '...')
  const pages = []
  const range = 2
  const start = Math.max(0, page - range)
  const end = Math.min(totalPages - 1, page + range)

  // Thêm trang đầu và dấu '...' nếu cần
  if (start > 0) {
    pages.push(0)
    if (start > 1) pages.push('...')
  }

  // Thêm các trang trong khoảng hiện tại
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  // Thêm trang cuối và dấu '...' nếu cần
  if (end < totalPages - 1) {
    if (end < totalPages - 2) pages.push('...')
    pages.push(totalPages - 1)
  }

  return (
    <div className="flex items-center justify-center gap-1">
      {/* Nút Prev */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        className="flex items-center justify-center w-8 h-8 text-xs text-on-surface-variant/60 hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={14} />
      </button>

      {/* Các nút trang và dấu '...' */}
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="w-8 text-center text-xs text-on-surface-variant/30">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              'flex items-center justify-center w-8 h-8 text-xs font-medium rounded transition-colors',
              p === page
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant/60 hover:text-on-surface hover:bg-black/[0.02]',
            )}
          >
            {p + 1}
          </button>
        )
      )}

      {/* Nút Next */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="flex items-center justify-center w-8 h-8 text-xs text-on-surface-variant/60 hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  )
}
