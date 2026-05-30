import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../../app/stores/authStore";
import { NotificationsPanel } from "./NotificationsPanel";

export function Topbar({ collapsed, onToggleSidebar, title, onAction }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);

  const pathParts = location.pathname.split("/").filter(Boolean);
  const isRoot = pathParts.length === 0;

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else {
      navigate("/series/new");
    }
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-surface/80 backdrop-blur-md px-6 py-4 border-b border-outline-variant">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant hover:text-white hover:bg-surface-container transition-all"
        >
          <span className="material-symbols-outlined text-xl transition-all duration-300" style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}>
            menu
          </span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-on-surface-variant font-geist">Production</span>
          <span className="text-on-surface-variant">/</span>
          <span className="text-sm text-white font-medium font-geist">
            {isRoot ? "Dashboard" : pathParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" / ")}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-all"
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
        </button>
        {showNotifications && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
            <div onClick={(e) => e.stopPropagation()}>
              <NotificationsPanel onClose={() => setShowNotifications(false)} />
            </div>
          </>
        )}

        {(user?.role === "MANGAKA" || !user) && (
          <button
            onClick={handleAction}
            className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all font-geist"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            Create Series
          </button>
        )}
      </div>
    </header>
  );
}
