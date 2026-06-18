import { NavLink } from "react-router-dom";
import { useAuthStore } from "../../../app/stores/authStore";
import { useUIStore } from "../../../app/stores/uiStore";
import { APP_NAME } from "../../constants";
import { cn } from "../../utils";

const mainNav = [
  { label: "Dashboard", icon: "dashboard", path: "/dashboard", roles: ["ALL"] },
  { label: "Manga Series", icon: "book_2", path: "/series", roles: ["ALL"] },
];

const extraNav = [
  {
    label: "Tasks",
    icon: "checklist",
    path: "/tasks",
    roles: ["MANGAKA", "ASSISTANT"],
  },
  {
    label: "Invitations",
    icon: "mail",
    path: "/invitations",
    roles: ["ASSISTANT"],
  },
  {
    label: "Lead Editor Invitations",
    icon: "mail",
    path: "/tantou-invitations",
    roles: ["TANTOU_EDITOR"],
  },
  {
    label: "Editorial Reviews",
    icon: "groups",
    path: "/editorial",
    roles: ["EDITORIAL_BOARD", "CHIEF_EDITOR"],
  },
  {
    label: "Schedule",
    icon: "calendar_month",
    path: "/schedule",
    roles: ["EDITORIAL_BOARD", "CHIEF_EDITOR"],
  },
  {
    label: "Rankings",
    icon: "leaderboard",
    path: "/rankings",
    roles: ["EDITORIAL_BOARD", "CHIEF_EDITOR"],
  },

];

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          "w-[280px] h-screen fixed left-0 top-0 z-30 bg-surface flex flex-col shrink-0 shadow-2xl shadow-black/20 rounded-r-3xl border-r border-outline-variant/50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          collapsed ? "-translate-x-full" : "translate-x-0",
        )}
      >
        {/* Subtle gradient glow */}
        <div className="absolute -right-40 top-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -right-20 bottom-40 w-60 h-60 bg-primary/3 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative p-6 flex items-center gap-3">
          <div className="size-8 text-primary drop-shadow-lg shrink-0">
            <svg
              fill="currentColor"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z" />
            </svg>
          </div>
          <span
            className={cn(
              "text-xl font-bold tracking-tight text-white font-geist transition-opacity duration-300",
              collapsed && "opacity-0",
            )}
          >
            {APP_NAME}
          </span>
        </div>

        {/* Main Navigation */}
        <nav className="relative flex-1 px-3 space-y-0.5 mt-6 overflow-y-auto scrollbar-thin overflow-x-hidden">
          {mainNav
            .filter(
              (item) =>
                item.roles.includes("ALL") ||
                (user && item.roles.includes(user.role)),
            )
            .map((item) => (
              <NavLink
                key={item.path + item.label}
                to={item.path}
                end={item.path === "/dashboard"}
                className={({ isActive }) =>
                  cn(
                    "relative flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-300 group whitespace-nowrap",
                    isActive
                      ? "active-nav font-medium"
                      : "text-on-surface-variant hover:text-white",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {!isActive && user?.role !== 'MANGAKA' && user?.role !== 'ASSISTANT' && user?.role !== 'TANTOU_EDITOR' && (
                      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 bg-surface-container-high transition-all duration-300 scale-95 group-hover:scale-100" />
                    )}
                    <span className="relative z-10 material-symbols-outlined text-xl shrink-0">
                      {item.icon}
                    </span>
                    <span
                      className={cn(
                        "relative z-10 text-sm transition-opacity duration-300",
                        collapsed && "opacity-0",
                      )}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}

          {/* Extra Navigation (role-filtered) */}
          {extraNav
            .filter(
              (item) =>
                item.roles.includes("ALL") ||
                (user && item.roles.includes(user.role)),
            )
            .map((item) => (
              <NavLink
                key={item.path + item.label}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "relative flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-300 group whitespace-nowrap",
                    isActive
                      ? "active-nav font-medium"
                      : "text-on-surface-variant hover:text-white",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {!isActive && user?.role !== 'MANGAKA' && user?.role !== 'ASSISTANT' && user?.role !== 'TANTOU_EDITOR' && (
                      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 bg-surface-container-high transition-all duration-300 scale-95 group-hover:scale-100" />
                    )}
                    <span className="relative z-10 material-symbols-outlined text-xl shrink-0">
                      {item.icon}
                    </span>
                    <span
                      className={cn(
                        "relative z-10 text-sm transition-opacity duration-300",
                        collapsed && "opacity-0",
                      )}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
        </nav>

        {/* Bottom Section: Settings + Report */}
        <div
          className={cn(
            "relative p-4 border-t border-outline-variant/10 mt-auto transition-opacity duration-300",
            collapsed && "opacity-0",
          )}
        >
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-300 group",
                isActive
                  ? "active-nav font-medium"
                  : "text-on-surface-variant hover:text-white",
              )
            }
          >
            {({ isActive }) => (
              <>
                {!isActive && user?.role !== 'MANGAKA' && user?.role !== 'ASSISTANT' && user?.role !== 'TANTOU_EDITOR' && (
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 bg-surface-container-high transition-all duration-300 scale-95 group-hover:scale-100" />
                )}
                <span className="relative z-10 material-symbols-outlined text-xl">
                  settings
                </span>
                <span className="relative z-10 text-sm">Settings</span>
              </>
            )}
          </NavLink>
        </div>
      </aside>

      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "fixed z-40 w-6 h-12 flex items-center justify-center rounded-r-xl bg-surface-container border border-outline-variant/30 border-l-0 text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-lg shadow-black/10 top-1/2 -translate-y-1/2 group",
          collapsed ? "left-0" : "left-[280px]",
        )}
      >
        <span className="material-symbols-outlined text-lg transition-all duration-500 group-hover:scale-110">
          {collapsed ? "chevron_right" : "chevron_left"}
        </span>
      </button>
    </>
  );
}
