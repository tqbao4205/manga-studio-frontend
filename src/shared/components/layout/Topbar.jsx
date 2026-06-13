import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, User, LogOut } from "lucide-react";
import { cn } from "../../utils";
import { useAuthStore } from "../../../app/stores/authStore";
import { useNotificationStore } from "../../../app/stores/notificationStore";
import { NotificationsPanel } from "./NotificationsPanel";

const breadcrumbMap = {
  '/dashboard': 'Dashboard',
  '/series': 'Series List',
  '/tasks': 'Tasks',
  '/profile': 'Profile',
}

export function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { unreadCount, fetchUnreadCount } = useNotificationStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profileAnim, setProfileAnim] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const openProfile = useCallback(() => {
    setShowNotifications(false);
    setShowProfileMenu(true);
    requestAnimationFrame(() => setProfileAnim(true));
  }, []);

  const closeProfile = useCallback(() => {
    setProfileAnim(false);
    setTimeout(() => setShowProfileMenu(false), 200);
  }, []);

  useEffect(() => {
    fetchUnreadCount()
  }, [])

  useEffect(() => {
    if (!showProfileMenu && !showNotifications) return;
    const handleClick = (e) => {
      if (showProfileMenu && profileRef.current && !profileRef.current.contains(e.target)) {
        closeProfile();
      }
      if (showNotifications && notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showProfileMenu, showNotifications, closeProfile]);

  const basePath = '/' + location.pathname.split('/')[1]
  const pageLabel = breadcrumbMap[basePath] || 'MangaFlow'

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-surface/80 backdrop-blur-md px-10 py-4 border-b border-outline-variant/30 rounded-bl-3xl shadow-sm shadow-black/5">
      {/* Subtle glow matching sidebar */}
      <div className="absolute -top-20 left-60 w-80 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Breadcrumb */}
      <div className="relative flex items-center gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
        <span className="text-sm text-on-surface-variant/80 font-geist tracking-wide">Production</span>
        <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
        <span className="text-sm text-white font-semibold font-geist">{pageLabel}</span>
      </div>

      {/* Right actions */}
      <div className="relative flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowProfileMenu(false); setShowNotifications(!showNotifications) }}
            className="relative w-10 h-10 flex items-center justify-center rounded-2xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-white transition-all duration-300 group"
          >
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 bg-surface-container-high transition-all duration-300 scale-95 group-hover:scale-100" />
            <span className="relative z-10 material-symbols-outlined text-xl">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 z-20 w-4 h-4 bg-status-danger text-[9px] font-bold text-white flex items-center justify-center rounded-full shadow-lg shadow-status-danger/30">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <div onClick={(e) => e.stopPropagation()}>
              <NotificationsPanel onClose={() => setShowNotifications(false)} />
            </div>
          )}
        </div>

        {/* User Profile */}
        {user && (
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => showProfileMenu ? closeProfile() : openProfile()}
              className="flex items-center gap-3 pl-3 pr-3 py-2 rounded-2xl hover:bg-surface-container-high transition-all duration-300 group"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden ring-2 ring-primary/20 shrink-0">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-primary">{user.displayName?.charAt(0) || '?'}</span>
                )}
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs font-semibold text-white leading-tight">{user.displayName}</span>
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-medium">
                  {user.role.replace(/_/g, ' ')}
                </span>
              </div>
            </button>

            {showProfileMenu && (
              <div className={cn(
                'fixed top-[72px] right-0 z-50 w-56 border border-outline-variant/40 bg-surface-container backdrop-blur-xl py-2 rounded-l-2xl shadow-2xl shadow-black/30 transition-all duration-200 ease-out origin-top-right',
                profileAnim ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none',
              )}>
                <div className="px-4 py-3 border-b border-outline-variant/10">
                  <p className="text-sm font-semibold text-white">{user.displayName}</p>
                  <p className="text-xs text-on-surface-variant/70 mt-0.5">{user.role.replace(/_/g, ' ')}</p>
                </div>
                <div className="py-1.5">
                  <button
                    onClick={() => { closeProfile(); navigate('/profile') }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface-variant hover:text-white hover:bg-primary/10 transition-all mx-1.5 rounded-xl"
                  >
                    <User size={15} className="shrink-0" />
                    <span>View Profile</span>
                  </button>
                  <button
                    onClick={() => { closeProfile(); logout() }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-status-danger hover:bg-status-danger/10 transition-all mx-1.5 rounded-xl"
                  >
                    <LogOut size={15} className="shrink-0" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}