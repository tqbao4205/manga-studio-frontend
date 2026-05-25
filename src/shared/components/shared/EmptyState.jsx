import { cn } from '../../utils'

/**
 * ── EmptyState: Component hiển thị trạng thái trống/dữ liệu chưa có ──
 *
 * Props:
 *   - icon        : Icon hiển thị phía trên tiêu đề (tuỳ chọn)
 *   - title       : Tiêu đề chính (bắt buộc)
 *   - description : Mô tả chi tiết (tuỳ chọn)
 *   - action      : Nút hoặc component hành động (tuỳ chọn), ví dụ nút "Tạo mới"
 *   - className   : Class CSS bổ sung từ ngoài
 *
 * Cách dùng:
 *   <EmptyState icon={<Inbox size={32} />} title="Chưa có dữ liệu" description="Hãy tạo bản ghi đầu tiên" action={<button>Thêm mới</button>} />
 */

export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4', className)}>
      {icon && <div className="text-on-surface-variant mb-4 opacity-50">{icon}</div>}
      <h3 className="text-lg font-medium text-on-surface mb-1">{title}</h3>
      {description && <p className="text-sm text-on-surface-variant text-center max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  )
}
