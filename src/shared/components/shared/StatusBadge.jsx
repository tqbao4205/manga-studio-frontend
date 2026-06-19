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
 *   - DRAFT, PENDING_BOARD_APPROVAL, APPROVED
 *   - CANCELLED, COMPLETED
 *   - PLANNED, IN_PROGRESS, IN_REVIEW, REVISION_REQUIRED, PUBLISHED, REJECTED
 *   - PENDING, SUBMITTED, SCHEDULED
 *   - IN_PRESS, UPLOADED, REGIONS_DEFINED, IN_PRODUCTION
 *
 * Cách hoạt động:
 *   - Tra bảng labels để lấy tên hiển thị, fallback về chính status nếu không tìm thấy
 *   - Dùng getStatusColor() từ utils để lấy màu sắc động
 *   - Style badge: border + text cùng màu, background với độ trong suốt thấp
 */

const labels = {
  DRAFT: "Draft",
  PENDING_BOARD_APPROVAL: "Under Editorial Review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  REVISE: "Revise",
  REJECTED: "Rejected",
  PENDING: "Pending",
  SUBMITTED: "Submitted",
  REVISION_REQUIRED: "Revision Needed",
  SCHEDULED: "Scheduled",
  IN_PRESS: "In Press",
  UPLOADED: "Uploaded",
  REGIONS_DEFINED: "Regions Set",
  IN_PRODUCTION: "In Production",
  TODO: "Todo",
  DONE: "Done",
  PENDING_TANTOU: "Under Review",
  PENDING_BOARD_VOTE: "Under Editorial Review",
  ONGOING: "Ongoing",
  HIATUS: "Hiatus",
  AT_RISK: "At Risk",
};

export function StatusBadge({ status, className, size = "md" }) {
  const color = getStatusColor(status);
  const label = labels[status] || status;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium border rounded-full",
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
