/*
  ============================================================
  PAGE: EditorialBoardPage
  ROUTE: /editorial
  MỤC ĐÍCH: Trang tổng quan của Editorial Board — hiển thị danh
  sách các cuộc họp và cho phép Chief Editor tạo meeting mới.
  QUYỀN TRUY CẬP: EDITORIAL_BOARD
  ============================================================

  STATE MACHINE (backend-driven):
    PENDING     → hiển thị badge vàng, click row → /editorial/:id/vote
    COMPLETED   → hiển thị badge xanh lá, click row → /editorial/:id/results
*/

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../app/stores/authStore";
import {
  useEditorialStore,
  isChiefEditor,
} from "../../../app/stores/editorialStore";
import { CreateMeetingModal } from "../components/CreateMeetingModal";

// ── Màu sắc badge theo trạng thái meeting ──
const STATUS_CONFIG = {
  PENDING: {
    label: "Pending Vote",
    badgeClass: "bg-amber-900/30 text-amber-400 border-amber-500/30",
    dotClass: "bg-amber-400",
  },
  COMPLETED: {
    label: "Completed",
    badgeClass: "bg-green-900/30 text-green-400 border-green-500/30",
    dotClass: "bg-green-400",
  },
};

// ── Màu sắc decision badge ──
const DECISION_CONFIG = {
  APPROVED: { label: "Approved", className: "text-green-400" },
  REJECTED: { label: "Rejected", className: "text-red-400" },
};

// ── Cover placeholder gradient theo seriesId ──
const COVER_COLORS = [
  "from-violet-900 to-indigo-900",
  "from-rose-900 to-pink-900",
  "from-emerald-900 to-teal-900",
  "from-amber-900 to-orange-900",
  "from-sky-900 to-cyan-900",
];

function CoverPlaceholder({ seriesId, seriesTitle, coverImageUrl, coverColor }) {
  const gradient = COVER_COLORS[(seriesId || 0) % COVER_COLORS.length];
  return (
    <div
      className={`w-20 h-28 rounded-lg flex items-center justify-center shrink-0 border border-outline-variant/20 shadow-md overflow-hidden ${coverImageUrl ? '' : `bg-gradient-to-br ${gradient}`}`}
    >
      {coverImageUrl ? (
        <img src={coverImageUrl} alt={seriesTitle} className="w-full h-full object-cover" />
      ) : (
        <span className="material-symbols-outlined text-white/40 text-3xl">
          auto_stories
        </span>
      )}
    </div>
  );
}

// ── Single Meeting Row Card ──
function MeetingCard({ meeting, isChief }) {
  const navigate = useNavigate();
  const statusCfg = STATUS_CONFIG[meeting.status] || STATUS_CONFIG.PENDING;

  // Lấy vote summary từ MeetingResponse.voteSummary (backend trả về structured data)
  const vs = meeting.voteSummary;
  const yesCount = vs?.yesCount || 0;
  const noCount = vs?.noCount || 0;
  const totalBoard = vs?.totalBoardMembers || 0;
  // Thanh process hiển thị theo tỉ lệ trên tổng EB (không phải tỉ lệ YES/NO)
  const yesPct = totalBoard > 0 ? (yesCount / totalBoard) * 100 : 0;
  const noPct = totalBoard > 0 ? (noCount / totalBoard) * 100 : 0;
  const emptyPct = totalBoard > 0 ? Math.max(0, 100 - yesPct - noPct) : 100;

  const decision = meeting.decision ? DECISION_CONFIG[meeting.decision] : null;

  // Xử lý click vào card
  const handleCardClick = () => {
    if (meeting.status === "COMPLETED") {
      navigate(`/editorial/${meeting.id}/results`);
    } else if (meeting.status === "PENDING") {
      // Chief không có quyền vote, chỉ xem kết quả
      navigate(isChief ? `/editorial/${meeting.id}/results` : `/editorial/${meeting.id}/vote`);
    }
  };

  const isClickable =
    meeting.status === "PENDING" || meeting.status === "COMPLETED";

  return (
    <div
      className={`meeting-card flex flex-col lg:flex-row items-center gap-6 p-5 rounded-2xl transition-all duration-300 border border-outline-variant/25 bg-[rgba(27,27,29,0.7)] backdrop-blur-md ${
        isClickable
          ? "cursor-pointer hover:border-primary/50 hover:bg-[rgba(31,31,33,0.9)]"
          : ""
      }`}
      onClick={isClickable ? handleCardClick : undefined}
    >
      {/* Left: Cover + Info */}
      <div className="flex items-center gap-5 w-full">
        <CoverPlaceholder
          seriesId={meeting.seriesId}
          seriesTitle={meeting.seriesTitle}
          coverImageUrl={meeting.seriesCoverImageUrl}
          coverColor={meeting.seriesCoverColor}
        />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold text-tertiary uppercase tracking-wider">
            {meeting.seriesTitle}
          </span>
          <h3 className="font-semibold text-lg text-on-surface truncate mt-0.5">
            {meeting.title}
          </h3>
          <div className="flex items-center gap-3 mt-1.5 text-on-surface-variant text-sm">
            <span className="material-symbols-outlined text-base">
              calendar_today
            </span>
            <span>
              {meeting.scheduledAt
                ? new Date(meeting.scheduledAt).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </span>
            <span className="mx-1">•</span>
            <span className="material-symbols-outlined text-base">group</span>
            <span>{(meeting.participants || []).length} Participants</span>
          </div>
        </div>
      </div>

      {/* Right: Status + Vote bar + Action */}
      <div className="flex flex-wrap items-center gap-6 w-full lg:w-auto lg:ml-auto shrink-0">
        {/* Status badge + Decision */}
        <div className="flex flex-col items-start gap-2 min-w-[130px]">
          <span
            className={`px-3 py-1 border rounded-full text-[10px] font-bold uppercase tracking-tight ${statusCfg.badgeClass}`}
          >
            {statusCfg.label}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-on-surface-variant">Decision:</span>
            {decision ? (
              <span className={`text-xs font-bold ${decision.className}`}>
                {decision.label}
              </span>
            ) : (
              <span className="text-xs font-bold text-on-surface-variant">
                —
              </span>
            )}
          </div>
        </div>

        {/* Vote progress bar */}
        <div className="flex-1 lg:w-64 min-w-[160px]">
          <div className="flex justify-between text-[10px] font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
            <span>YES ({yesCount})</span>
            <span>NO ({noCount})</span>
          </div>
          <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden flex">
            <>
              <div
                className="h-full bg-green-500 transition-all duration-700"
                style={{ width: `${yesPct}%` }}
              />
              <div
                className="h-full bg-red-500 transition-all duration-700"
                style={{ width: `${noPct}%` }}
              />
              {emptyPct > 0 && (
                <div
                  className="h-full bg-surface-container-high transition-all duration-700"
                  style={{ width: `${emptyPct}%` }}
                />
              )}
            </>
          </div>
        </div>

        {/* Action button */}
        <div
          className="flex gap-2 items-center"
          onClick={(e) => e.stopPropagation()}
        >
          {meeting.status === "PENDING" && (
            <button
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-bright transition-colors border border-primary/30 text-primary"
              onClick={() => navigate(`/editorial/${meeting.id}/vote`)}
            >
              <span className="material-symbols-outlined">how_to_vote</span>
            </button>
          )}
          {meeting.status === "COMPLETED" && (
            <button
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-bright transition-colors border border-outline-variant/30"
              onClick={() => navigate(`/editorial/${meeting.id}/results`)}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
export function EditorialBoardPage() {
  const user = useAuthStore((s) => s.user);
  const meetings = useEditorialStore((s) => s.meetings);
  const loading = useEditorialStore((s) => s.loading);
  const fetchMeetings = useEditorialStore((s) => s.fetchMeetings);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState("ALL");

  const isChief = isChiefEditor(user);

  // Fetch meetings từ API khi mount component
  useEffect(() => {
    fetchMeetings()
  }, [fetchMeetings])

  // Lọc meetings theo tab
  const filteredMeetings = meetings.filter((m) => {
    if (activeFilter === "ALL") return true;
    return m.status === activeFilter;
  });

  const filters = [
    { key: "ALL", label: "All" },
    { key: "PENDING", label: "Pending" },
    { key: "COMPLETED", label: "Completed" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto w-full flex flex-col gap-5">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-primary tracking-tight">
            Editorial Board Meetings
          </h2>
          <p className="text-on-surface-variant text-sm mt-1">
            Review, deliberate, and approve new series submissions and chapter
            developments.
          </p>
        </div>
        {/* Chỉ Chief Editor mới thấy nút Create Meeting */}
        {isChief && (
          <button
            className="bg-gradient-to-r from-[#7c3aed] to-[#d0bcff] text-on-primary py-3 px-6 rounded-xl font-bold active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/10 shrink-0"
            onClick={() => setShowCreateModal(true)}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              add_circle
            </span>
            New Meeting
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px transition-all ${
              activeFilter === f.key
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-primary"
            }`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label}
            {f.key !== "ALL" && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                {meetings.filter((m) => m.status === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Meeting List */}
      <div className="flex flex-col gap-4">
        {filteredMeetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant gap-3">
            <span className="material-symbols-outlined text-5xl opacity-30">
              groups
            </span>
            <p className="text-sm">
              {activeFilter === "ALL"
                ? "Chưa có cuộc họp nào."
                : `Không có cuộc họp nào ở trạng thái "${filters.find((f) => f.key === activeFilter)?.label}".`}
            </p>
            {isChief && activeFilter === "ALL" && (
              <button
                className="mt-2 text-primary text-sm hover:underline"
                onClick={() => setShowCreateModal(true)}
              >
                Tạo cuộc họp đầu tiên →
              </button>
            )}
          </div>
        ) : (
          loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant gap-3">
              <span className="material-symbols-outlined text-5xl opacity-30 animate-spin">
                progress_activity
              </span>
              <p className="text-sm">Đang tải cuộc họp...</p>
            </div>
          ) : (
            filteredMeetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                isChief={isChief}
              />
            ))
          )
        )}
      </div>

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <CreateMeetingModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
