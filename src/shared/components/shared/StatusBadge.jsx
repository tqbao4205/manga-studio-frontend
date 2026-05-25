import { cn, getStatusColor } from "../../utils";

/**
 * ── StatusBadge: Badge hiển thị trạng thái với màu sắc tương ứng ──
 *
 * Props:
 *   - status   : Mã trạng thái (ví dụ: 'DRAFT', 'APPROVED', 'ONGOING', ...)
 *   - className: Class CSS bổ sung
 *   - size     : Kích thước badge ('sm' | 'md'), mặc định 'md'
 *
 * Danh sách trạng thái hỗ trợ (labels):
 *   - DRAFT, PENDING_APPROVAL, PENDING_BOARD_APPROVAL, APPROVED
 *   - ONGOING, HIATUS, AT_RISK, CANCELLED, COMPLETED
 *   - PLANNED, IN_PROGRESS, IN_REVIEW, PUBLISHED, REJECTED
 *   - PENDING, SUBMITTED, REVISION_REQUIRED, SCHEDULED
 *   - IN_PRESS, REISSUED, UPLOADED, REGIONS_DEFINED, IN_PRODUCTION
 *
 * Cách hoạt động:
 *   - Tra bảng labels để lấy tên hiển thị, fallback về chính status nếu không tìm thấy
 *   - Dùng getStatusColor() từ utils để lấy màu sắc động
 *   - Style badge: border + text cùng màu, background với độ trong suốt thấp
 */

const labels = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending",
  PENDING_BOARD_APPROVAL: "Pending Board",
  APPROVED: "Approved",
  ONGOING: "Ongoing",
  HIATUS: "Hiatus",
  AT_RISK: "At Risk",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  PENDING: "Pending",
  SUBMITTED: "Submitted",
  REVISION_REQUIRED: "Revision",
  SCHEDULED: "Scheduled",
  IN_PRESS: "In Press",
  REISSUED: "Reissued",
  UPLOADED: "Uploaded",
  REGIONS_DEFINED: "Regions Set",
  IN_PRODUCTION: "In Production",
};

export function StatusBadge({ status, className, size = "md" }) {
  const color = getStatusColor(status);
  const label = labels[status] || status;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium border",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-0.5",
        className,
      )}
      style={{
        borderColor: color,
        color: color,
        background: `${color}08`,
      }}
    >
      {label}
    </span>
  );
}
