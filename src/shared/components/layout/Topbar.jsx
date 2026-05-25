import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Bell,
  LogOut,
  User as UserIcon,
  Settings,
  X,
} from "lucide-react";
import { useAuthStore } from "../../../app/stores/authStore";
import { useNotifications } from "../../hooks/useMockData";
import { Avatar } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { NotificationsPanel } from "./NotificationsPanel";

/**
 * ── Topbar: Thanh tiêu đề phía trên ──
 *
 * Props:
 *   - title: Tiêu đề trang hiện tại
 *
 * Các thành phần (từ trái sang phải):
 *   1. Tiêu đề trang (hoặc ô tìm kiếm thay thế)
 *   2. Nút tìm kiếm (toggle search bar)
 *   3. Nút thông báo (bell icon + badge số chưa đọc)
 *   4. Dropdown menu người dùng (avatar + tên)
 *
 * Các state:
 *   - showSearch     : Bật/tắt thanh tìm kiếm
 *   - searchQuery    : Nội dung tìm kiếm
 *   - showNotifications : Bật/tắt bảng thông báo
 *
 * Hành vi:
 *   - Nhấn Enter trong ô search → navigate /series?search=...
 *   - Thay đổi route → tự động đóng search và xoá query
 *   - Click overlay → đóng notifications panel
 *   - Dropdown người dùng: Profile, Settings, Sign Out
 */

export function Topbar({ title }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { data: notifications } = useNotifications();
  const unreadCount = (notifications || []).filter((n) => !n.isRead).length;
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef(null);

  // Auto focus vào ô search khi mở
  useEffect(() => {
    if (showSearch && searchRef.current) {
      searchRef.current.focus();
    }
  }, [showSearch]);

  // Đóng search khi chuyển trang
  useEffect(() => {
    setShowSearch(false);
    setSearchQuery("");
  }, [location.pathname]);

  // Xử lý submit tìm kiếm
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/series?search=${encodeURIComponent(searchQuery.trim())}`);
    setShowSearch(false);
    setSearchQuery("");
  };

  return (
    <header className="h-16 border-b border-primary bg-white/80 backdrop-blur-xl flex items-center justify-between px-6 relative">
      {/* Bên trái: Tiêu đề hoặc thanh tìm kiếm */}
      <div className="flex items-center gap-4 min-w-0">
        {showSearch ? (
          // Form tìm kiếm
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-2 flex-1"
          >
            <Search
              size={16}
              className="text-on-surface-variant flex-shrink-0"
            />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search series..."
              className="flex-1 text-sm text-on-surface bg-transparent border-none outline-none placeholder:text-on-surface-variant/50"
            />
            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
              className="text-on-surface-variant hover:text-on-surface"
            >
              <X size={16} />
            </button>
          </form>
        ) : (
          // Tiêu đề trang
          <h1 className="text-lg font-semibold text-on-surface truncate">
            {title || "Dashboard"}
          </h1>
        )}
      </div>

      {/* Bên phải: Các action buttons */}
      <div className="flex items-center gap-3">
        {/* Nút tìm kiếm */}
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-black/[0.05] transition-all"
        >
          <Search size={18} />
        </button>

        {/* Nút thông báo + badge */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-black/[0.05] transition-all"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-status-danger text-[9px] font-bold text-white flex items-center justify-center">
                {/* Giới hạn hiển thị tối đa 9+ */}
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {/* Overlay + Panel thông báo */}
          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div
                className="relative z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <NotificationsPanel
                  onClose={() => setShowNotifications(false)}
                />
              </div>
            </>
          )}
        </div>

        {/* Dropdown menu người dùng */}
        {user && (
          <DropdownMenu
            trigger={
              <button className="flex items-center gap-2.5 ml-2 px-2 py-1.5 hover:bg-black/[0.05] transition-all">
                <Avatar name={user.displayName} size="sm" />
                <span className="text-sm font-medium text-on-surface hidden sm:block">
                  {user.displayName}
                </span>
              </button>
            }
            align="end"
          >
            {/* Thông tin người dùng */}
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-on-surface">
                {user.displayName}
              </p>
              <p className="text-xs text-on-surface-variant">
                {user.role.replace(/_/g, " ")}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              icon={<UserIcon size={16} />}
              onClick={() => navigate("/profile")}
            >
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              icon={<Settings size={16} />}
              onClick={() => navigate("/profile")}
            >
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              icon={<LogOut size={16} />}
              danger
              onClick={logout}
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
