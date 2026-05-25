import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '../../utils'

/**
 * ── DataTable: Bảng dữ liệu có hỗ trợ sắp xếp và click hàng ──
 *
 * Props:
 *   - columns      : Mảng cấu hình cột [{ id, header, accessorKey, cell, sortable, width }]
 *   - data         : Mảng dữ liệu hiển thị, mỗi phần tử cần có trường `id`
 *   - loading      : Boolean, true → hiển thị skeleton loading
 *   - onRowClick   : Hàm callback khi click vào một hàng, nhận row làm tham số
 *   - emptyMessage : Thông báo khi không có dữ liệu (mặc định 'No data found')
 *   - sortField    : Tên cột đang được sắp xếp
 *   - sortDirection : Hướng sắp xếp ('asc' | 'desc')
 *   - onSort       : Hàm callback khi click vào cột có sortable = true
 *
 * Các trạng thái:
 *   - loading   → hiển thị 5 dòng skeleton
 *   - data rỗng → hiển thị thông báo emptyMessage
 *   - có dữ liệu → render table đầy đủ
 */

export function DataTable({
  columns, data, loading, onRowClick,
  emptyMessage = 'No data found',
  sortField, sortDirection, onSort,
}) {
  // Trạng thái loading: hiển thị 5 dòng skeleton giả lập
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-black/5 animate-pulse" />
        ))}
      </div>
    )
  }

  // Trạng thái rỗng: không có dữ liệu
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-on-surface-variant text-sm">{emptyMessage}</div>
    )
  }

  // Render bảng chính
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-primary">
            {columns.map((col) => (
              <th
                key={col.id}
                className={cn(
                  'text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider py-3 px-4',
                  col.sortable && 'cursor-pointer hover:text-on-surface select-none',
                )}
                style={{ width: col.width }}
                onClick={() => col.sortable && onSort?.(col.id)}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {/* Icon sắp xếp: hiển thị trạng thái asc/desc hoặc mặc định */}
                  {col.sortable && (
                    <span className="text-on-surface-variant">
                      {sortField === col.id ? (
                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      ) : (
                        <ChevronsUpDown size={14} />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.id}
              className={cn(
                'border-b border-border-light/50 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-black/[0.02]',
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.id} className="py-3 px-4 text-sm text-on-surface">
                  {/* Nếu có custom cell renderer thì dùng, nếu không lấy từ accessorKey, fallback về '-' */}
                  {col.cell ? col.cell(row) : (row[col.accessorKey]) ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
