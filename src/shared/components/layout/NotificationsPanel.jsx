import { useNavigate } from "react-router-dom";
import {
  X,
  Check,
  AlertCircle,
  Clock,
  ArrowUp,
  MessageSquare,
  FileText,
} from "lucide-react";
import { useNotifications } from "../../hooks/useMockData";
import { useAuthStore } from "../../../app/stores/authStore";
import { cn, formatRelativeTime } from "../../utils";

/**
 * ── iconMap: Ánh xạ loại thông báo → icon tương ứng ──
 *
 * Mỗi loại thông báo có một icon riêng để trực quan hoá:
 *   - TASK_ASSIGNED / DEADLINE_APPROACHING → Clock
 *   - TASK_SUBMITTED / CHAPTER_SUBMITTED → FileText
 *   - TASK_APPROVED / CHAPTER_APPROVED / COMMENT_RESOLVED / SERIES_APPROVED → Check
 *   - TASK_REVISION_REQUIRED / CHAPTER_REJECTED / SERIES_REJECTED / SERIES_CANCELLED / WARNING_ISSUED → AlertCircle
 *   - COMMENT_ADDED → MessageSquare
 *   - RANKING_CHANGED → ArrowUp
 *   - Mặc định → AlertCircle
 */

const iconMap = {
  TASK_ASSIGNED: Clock,
  TASK_SUBMITTED: FileText,
  TASK_APPROVED: Check,
  TASK_REVISION_REQUIRED: AlertCircle,
  COMMENT_ADDED: MessageSquare,
  COMMENT_RESOLVED: Check,
  CHAPTER_SUBMITTED: FileText,
  CHAPTER_APPROVED: Check,
  CHAPTER_REJECTED: AlertCircle,
  SERIES_APPROVED: Check,
  SERIES_REJECTED: AlertCircle,
  SERIES_CANCELLED: AlertCircle,
  RANKING_CHANGED: ArrowUp,
  WARNING_ISSUED: AlertCircle,
  DEADLINE_APPROACHING: Clock,
};

/**
 * ── NotificationsPanel: Bảng thông báo thả xuống ──
 *
 * Props:
 *   - onClose: Callback đóng bảng thông báo
 *
 * Cách hoạt động:
 *   - Lấy danh sách thông báo từ hook useNotifications
 *   - Lọc theo userId hiện tại từ authStore
 *   - Mỗi thông báo hiển thị: icon, tiêu đề, message, thời gian
 *   - Click vào thông báo loại CHAPTER → điều hướng đến /workspace/:id
 *   - Thông báo chưa đọc (!isRead) được làm nổi bật
 *
 * Các trạng thái:
 *   - Không có thông báo → hiển thị "No notifications yet"
 *   - Có thông báo → render danh sách, phân biệt đã đọc/chưa đọc
 */

export function NotificationsPanel({ onClose }) {
  const { data: notifications } = useNotifications();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  // Lọc thông báo chỉ dành cho user hiện tại
  const userNotifications = (notifications || []).filter(
    (n) => n.userId === user?.id,
  );

  return (
    <div className="absolute right-0 top-full mt-2 w-80 border border-primary bg-white z-50">
      {/* Header: tiêu đề + nút đóng */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary">
        <h3 className="text-sm font-semibold text-on-surface">Notifications</h3>
        <button
          onClick={onClose}
          className="text-on-surface-variant hover:text-on-surface"
        >
          <X size={16} />
        </button>
      </div>

      {/* Danh sách thông báo */}
      <div className="max-h-80 overflow-y-auto">
        {userNotifications.length === 0 ? (
          // Trạng thái rỗng
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-on-surface-variant">
              No notifications yet
            </p>
          </div>
        ) : (
          userNotifications.map((n) => {
            const Icon = iconMap[n.type] || AlertCircle;
            return (
              <button
                key={n.id}
                onClick={() => {
                  onClose();
                  n.referenceType === "CHAPTER" &&
                    navigate(`/workspace/${n.referenceId}`);
                }}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-border-light/30 hover:bg-black/[0.02] transition-colors flex items-start gap-3",
                  !n.isRead && "bg-black/[0.02]",
                )}
              >
                {/* Icon container, highlight nếu chưa đọc */}
                <div
                  className={cn(
                    "w-8 h-8 flex items-center justify-center flex-shrink-0 border",
                    !n.isRead
                      ? "border-primary bg-primary/5"
                      : "border-border-light",
                  )}
                >
                  <Icon
                    size={14}
                    className={
                      !n.isRead ? "text-primary" : "text-on-surface-variant"
                    }
                  />
                </div>
                {/* Nội dung thông báo */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm leading-snug",
                      !n.isRead
                        ? "font-medium text-on-surface"
                        : "text-on-surface-variant",
                    )}
                  >
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                  )}
                  <p className="text-[10px] text-on-surface-variant/60 mt-1">
                    {formatRelativeTime(n.createdAt)}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
