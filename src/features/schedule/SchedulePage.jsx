/**
 * ── SchedulePage.jsx — Trang quản lý lịch xuất bản (Publication Schedule) ──
 *
 * 🎯 Mục đích:
 *   - Hiển thị danh sách lịch xuất bản dưới dạng bảng (DataTable)
 *   - Cho phép tìm kiếm, lọc theo trạng thái và loại lịch
 *   - Cho phép tạo lịch mới qua modal CreateScheduleModal
 *   - Cho phép pause/resume, reset miss count, xoá lịch
 *
 * 📦 Backend Model (ScheduleResponse):
 *   - id, seriesId, seriesTitle
 *   - scheduleType: "WEEKLY" | "MONTHLY"
 *   - dayOfWeek (1=Mon..7=Sun), dayOfMonth (1..31)
 *   - startDate, nextChapterNumber, missCount
 *   - status: "ACTIVE" | "PAUSED" | "COMPLETED"
 *
 * 🔄 Luồng dữ liệu:
 *   Schedules từ API → scheduleStore.fetchAll() → filtered (useMemo) → paged
 *                                                       ↓
 *                                          Bảng hiển thị (table)
 *                                                       ↓
 *                                         Actions: pause/resume/reset-miss/delete
 */

import { useState, useMemo, useEffect } from "react";
import {
  Search, Plus, Edit, PauseCircle, PlayCircle,
  RefreshCw, Trash2, Calendar, ChevronRight, Film, Play,
} from "lucide-react";
import { useScheduleStore } from "../../app/stores/scheduleStore";
import { useSeriesStore } from "../../app/stores/seriesStore";
import { useUIStore } from "../../app/stores/uiStore";
import { Button } from "../../shared/components/ui/button";
import { EmptyState } from "../../shared/components/shared/EmptyState";
import { Pagination } from "../../shared/components/shared/Pagination";
import { formatDate, cn } from "../../shared/utils";
import { ScheduleFormModal } from "./ScheduleFormModal";
import scheduleService from "../../services/scheduleService";

// ─── Cấu hình ────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Status" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
];

const PAGE_SIZE = 6;

// ─── Hàm phụ trợ ──────────────────────────────────────────

/**
 * Xác định tần suất xuất bản dựa trên scheduleType.
 * BACKEND: scheduleType = "WEEKLY" | "MONTHLY"
 *
 * @param {Object} schedule - Đối tượng schedule từ backend
 * @returns {string} "Weekly" hoặc "Monthly"
 */
function getFrequencyLabel(schedule) {
  if (schedule.scheduleType === "WEEKLY") return "Weekly";
  if (schedule.scheduleType === "MONTHLY") return "Monthly";
  return "Once";
}

/**
 * Render badge hiển thị tần suất xuất bản.
 *
 * @param {Object} schedule - Đối tượng schedule
 * @returns {JSX.Element} Badge component
 */
function getFrequencyBadge(schedule) {
  const freq = getFrequencyLabel(schedule);
  return (
    <span className="px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant/30 text-[13px]">
      {freq}
    </span>
  );
}

/**
 * Tính ngày phát hành tiếp theo dựa trên schedule pattern.
 *
 * WEEKLY  → Tìm thứ trong tuần (dayOfWeek) kể từ hôm nay
 * MONTHLY → Tìm ngày trong tháng (dayOfMonth) kể từ hôm nay
 *
 * @param {Object} schedule - Đối tượng schedule
 * @returns {Date|null} Ngày phát hành tiếp theo, hoặc null nếu không xác định được
 */
function computeNextRelease(schedule) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (schedule.scheduleType === "WEEKLY" && schedule.dayOfWeek != null) {
    // dayOfWeek: backend 1=Monday..7=Sunday
    // JS getDay(): 0=Sunday..6=Saturday
    const targetDay = schedule.dayOfWeek % 7; // 1→1(Mon), 2→2(Tue), ... 7→0(Sun)
    const currentDay = today.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7; // Nếu đã qua ngày đó trong tuần này → lấy tuần sau
    const next = new Date(today);
    next.setDate(today.getDate() + diff);
    return next;
  }

  if (schedule.scheduleType === "MONTHLY" && schedule.dayOfMonth != null) {
    const target = schedule.dayOfMonth;
    let next = new Date(today.getFullYear(), today.getMonth(), target);
    if (next <= today) {
      next = new Date(today.getFullYear(), today.getMonth() + 1, target);
    }
    return next;
  }

  return null;
}

// ─── ScheduleFormModal được import từ file riêng ─────────

// ─── SchedulePage (trang chính) ───────────────────────────
export function SchedulePage() {
  const {
    schedules, isLoading, error,
    fetchAll, removeSchedule, toggleScheduleStatus,
  } = useScheduleStore();
  const addToast = useUIStore((s) => s.addToast);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    fetchAll();
    useSeriesStore.getState().fetchAll();
  }, []);

  const filtered = useMemo(() => {
    let result = [...schedules];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) =>
        s.seriesTitle?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "ALL") {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (typeFilter !== "ALL") {
      result = result.filter((s) => {
        if (typeFilter === "WEEKLY") return s.scheduleType === "WEEKLY";
        if (typeFilter === "MONTHLY") return s.scheduleType === "MONTHLY";
        return true;
      });
    }

    result.sort((a, b) => {
      const dateA = computeNextRelease(a);
      const dateB = computeNextRelease(b);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.getTime() - dateB.getTime();
    });

    return result;
  }, [schedules, search, statusFilter, typeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleDelete = async (schedule) => {
    try {
      await removeSchedule(schedule.id);
      addToast({
        type: "success",
        title: "Schedule removed",
        message: `${schedule.seriesTitle} schedule removed.`,
      });
    } catch (err) {
      addToast({
        type: "error",
        title: "Failed to remove schedule",
        message: err.message,
      });
    }
  };

  const handleTogglePause = async (schedule) => {
    try {
      const newStatus = schedule.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
      await toggleScheduleStatus(schedule.id, newStatus);
      addToast({
        type: "info",
        title: newStatus === "PAUSED" ? "Schedule paused" : "Schedule resumed",
        message: schedule.seriesTitle,
      });
    } catch (err) {
      addToast({
        type: "error",
        title: "Failed to update schedule",
        message: err.message,
      });
    }
  };

  const handleResetMiss = async (schedule) => {
    try {
      await scheduleService.resetMissCount(schedule.id);
      addToast({
        type: "success",
        title: "Miss count reset",
        message: `${schedule.seriesTitle} miss count reset to 0.`,
      });
      await fetchAll();
    } catch (err) {
      addToast({
        type: "error",
        title: "Failed to reset miss count",
        message: err.message,
      });
    }
  };

  const handleTriggerPublish = async () => {
    setTriggering(true);
    try {
      await scheduleService.triggerAutoPublish();
      addToast({
        type: "success",
        title: "Auto-publish triggered",
        message: "Processing schedules...",
      });
      await fetchAll();
    } catch (err) {
      addToast({
        type: "error",
        title: "Failed to trigger auto-publish",
        message: err.message,
      });
    } finally {
      setTriggering(false);
    }
  };

  const columns = [
    {
      id: "series",
      header: "Series",
      cell: (row) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-14 rounded-lg bg-surface-container overflow-hidden border border-outline-variant/30 group-hover:border-primary/50 transition-colors flex items-center justify-center text-on-surface-variant shrink-0">
              {row.seriesThumbnail ? (
                <img src={row.seriesThumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <Film size={18} />
              )}
            </div>
          <div>
            <p className="font-medium text-on-surface text-sm">{row.seriesTitle}</p>
            <p className="text-xs text-on-surface-variant">Ch. {row.nextChapterNumber}</p>
          </div>
        </div>
      ),
    },
    {
      id: "frequency",
      header: "Frequency",
      cell: (row) => getFrequencyBadge(row),
    },
    {
      id: "nextRelease",
      header: "Next Release",
      cell: (row) => {
        const next = computeNextRelease(row);
        return (
          <span className="text-on-surface">
            {next ? formatDate(next.toISOString().split("T")[0]) : "-"}
          </span>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => {
        const statusMap = {
          ACTIVE: { color: "bg-green-500", shadow: "shadow-[0_0_8px_rgba(34,197,94,0.4)]", label: "Active", glow: true },
          PAUSED: { color: "bg-amber-500", shadow: "shadow-[0_0_8px_rgba(245,158,11,0.4)]", label: "Paused", glow: true },
          COMPLETED: { color: "bg-outline-variant", shadow: "", label: "Completed", glow: false },
        };
        const cfg = statusMap[row.status] || { color: "bg-outline-variant", shadow: "", label: row.status, glow: false };
        return (
          <div className="flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.color, cfg.shadow)} />
            <span className={cn("text-sm", cfg.glow ? "text-on-surface" : "text-on-surface-variant")}>{cfg.label}</span>
          </div>
        );
      },
    },
    {
      id: "reliability",
      header: "Reliability",
      cell: (row) => (
        <span className="text-on-surface-variant text-sm">Miss count: {row.missCount ?? 0}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setEditingSchedule(row); setModalOpen(true); }}
            className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant hover:text-primary transition-all"
            title="Edit"
          >
            <Edit size={16} />
          </button>
          {row.status !== "COMPLETED" && (
            <button
              onClick={(e) => { e.stopPropagation(); handleTogglePause(row); }}
              className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant hover:text-primary transition-all"
              title={row.status === "ACTIVE" ? "Pause" : "Resume"}
            >
              {row.status === "ACTIVE" ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
            </button>
          )}
          {row.status === "ACTIVE" && (
            <button
              onClick={(e) => { e.stopPropagation(); handleResetMiss(row); }}
              className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant hover:text-primary transition-all"
              title="Reset miss count"
            >
              <RefreshCw size={16} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
            className="p-2 hover:bg-error/10 rounded-lg text-on-surface-variant hover:text-error transition-all"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-2">
            <span>Editorial Suite</span>
            <ChevronRight size={14} />
            <span className="text-primary">Publication Schedules</span>
          </nav>
          <h1 className="text-[32px] font-bold text-on-surface tracking-tight leading-tight">
            Publication Schedules
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerPublish}
            disabled={triggering}
            className="bg-surface-container-high text-on-surface border border-outline-variant/30 px-5 py-3 rounded-xl hover:bg-surface-container transition-all flex items-center gap-2 font-medium text-sm disabled:opacity-50"
          >
            <Play size={16} className={triggering ? "animate-spin" : ""} />
            {triggering ? "Publishing..." : "Trigger Publish"}
          </button>
          <button
            onClick={() => { setEditingSchedule(null); setModalOpen(true); }}
            className="bg-primary text-on-primary px-6 py-3 rounded-xl shadow-lg shadow-primary/10 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 font-medium text-sm"
          >
            <Plus size={18} />
            Create Schedule
          </button>
        </div>
      </div>

      <div className="rounded-2xl p-4 flex flex-wrap items-center gap-4"
        style={{
          background: "rgba(27, 27, 29, 0.7)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(73, 69, 79, 0.3)",
        }}
      >
        <div className="flex-1 min-w-[280px] relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={16} />
          <input
            placeholder="Search series names..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface placeholder-on-surface-variant/50 focus:border-primary focus:ring-0 transition-all outline-none"
            style={{ boxShadow: "none" }}
            onFocus={(e) => { e.target.style.boxShadow = "0 0 0 2px rgba(208, 188, 255, 0.2)"; }}
            onBlur={(e) => { e.target.style.boxShadow = "none"; }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2">
            <span className="text-xs text-on-surface-variant">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="bg-transparent border-none p-0 pr-8 text-sm text-on-surface focus:ring-0 cursor-pointer outline-none"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2">
            <span className="text-xs text-on-surface-variant">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
              className="bg-transparent border-none p-0 pr-8 text-sm text-on-surface focus:ring-0 cursor-pointer outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(27, 27, 29, 0.7)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(73, 69, 79, 0.3)",
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-on-surface-variant">Loading schedules...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-4">
            <EmptyState
              icon={<Calendar size={32} />}
              title="Failed to load schedules"
              description={error}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Calendar size={32} />}
              title="No schedules found"
              description={search || statusFilter !== "ALL" || typeFilter !== "ALL"
                ? "Try adjusting your search or filters."
                : "Create your first publication schedule to get started."
              }
              action={
                !search && statusFilter === "ALL" && typeFilter === "ALL" ? (
                  <Button onClick={() => setModalOpen(true)}>
                    <Plus className="mr-2" size={16} />
                    Create Schedule
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-high/50 border-b border-outline-variant/30">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.id}
                        className="px-6 py-4 text-xs font-medium text-on-surface-variant uppercase tracking-wider"
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {paged.map((row) => (
                    <tr key={row.id} className="hover:bg-primary/5 transition-colors group">
                      {columns.map((col) => (
                        <td key={col.id} className="px-6 py-4">
                          {col.cell ? col.cell(row) : row[col.accessorKey] ?? "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-outline-variant/30 flex items-center justify-between text-xs text-on-surface-variant bg-surface-container-low/30">
              <span>Showing {filtered.length} of {filtered.length} schedules</span>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      <ScheduleFormModal
        mode={editingSchedule ? "edit" : "create"}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingSchedule(null); }}
        onSuccess={fetchAll}
        scheduleData={editingSchedule}
        schedules={schedules}
        seriesList={useSeriesStore.getState().seriesList}
      />
    </div>
  );
}
