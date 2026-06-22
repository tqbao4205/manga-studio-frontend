import { useEffect } from "react";
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
import { useNotificationStore } from "../../../app/stores/notificationStore";
import chapterService from "../../../services/chapterService";
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
 *   - Lấy danh sách thông báo từ useNotificationStore
 *   - Mỗi thông báo hiển thị: icon, tiêu đề, message, thời gian
 *   - Click → markAsRead + điều hướng theo referenceType
 *   - Thông báo chưa đọc (!isRead) được làm nổi bật
 *
 * Các trạng thái:
 *   - Không có thông báo → hiển thị "No notifications yet"
 *   - Có thông báo → render danh sách, phân biệt đã đọc/chưa đọc
 */

export function NotificationsPanel({ onClose }) {
  const {
    notifications,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    fetchUnreadCount,
  } = useNotificationStore();
  const navigate = useNavigate();

  // Fetch notifications khi panel mở lần đầu
  useEffect(() => {
    fetchNotifications()
  }, [])

  const handleClose = () => {
    // Đồng bộ unreadCount khi đóng panel
    fetchUnreadCount()
    onClose()
  }

  const handleNotificationClick = (n) => {
    if (!n.isRead) markAsRead(n.id)
    handleClose()

    // Override: chưa accept series → navigate đến trang lời mời
    if (n.type === 'INVITATION_SENT' || n.type === 'TANTOU_INVITATION_SENT') {
      navigate('/team')
      return
    }

    switch (n.referenceType) {
      case 'TASK':
        navigate('/tasks')
        break
      case 'CHAPTER':
        chapterService.getById(n.referenceId)
          .then(chapter => navigate(`/series/${chapter.seriesId}`))
          .catch(() => navigate(`/series`))
        break
      case 'SERIES':
        navigate(`/series/${n.referenceId}`)
        break
      case 'COMMENT':
        navigate(`/workspace/${n.referenceId}`)
        break
    }
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-80 border border-outline-variant/40 bg-surface-container backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/30 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/10">
        <h3 className="text-sm font-semibold text-white">Notifications</h3>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-primary hover:underline"
            >
              Mark all as read
            </button>
          )}
          <button
            onClick={handleClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-white hover:bg-surface-container-high transition-all"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Danh sách thông báo */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-6 space-y-3">
            <div className="h-4 bg-surface-container-high rounded animate-pulse w-3/4" />
            <div className="h-4 bg-surface-container-high rounded animate-pulse w-1/2" />
            <div className="h-4 bg-surface-container-high rounded animate-pulse w-2/3" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <span className="material-symbols-outlined text-3xl text-outline/40 mb-2">notifications_off</span>
            <p className="text-sm text-on-surface-variant/60">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = iconMap[n.type] || AlertCircle;
            return (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-outline-variant/10 hover:bg-surface-container-high transition-all flex items-start gap-3 last:border-0",
                  !n.isRead && "bg-primary/[0.03]",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 w-8 h-8 flex items-center justify-center shrink-0 border rounded-xl",
                    !n.isRead
                      ? "border-primary/30 bg-primary/10"
                      : "border-outline-variant/20",
                  )}
                >
                  <Icon
                    size={14}
                    className={
                      !n.isRead ? "text-primary" : "text-on-surface-variant/60"
                    }
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm leading-snug",
                      !n.isRead
                        ? "font-semibold text-white"
                        : "text-on-surface-variant",
                    )}
                  >
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="text-xs text-on-surface-variant/70 mt-0.5 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                  )}
                  <p className="text-[10px] text-on-surface-variant/40 mt-1.5">
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
