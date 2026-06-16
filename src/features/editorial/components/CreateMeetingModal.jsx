/*
  ============================================================
  COMPONENT: CreateMeetingModal
  MỤC ĐÍCH: Overlay modal để Chief Editor tạo cuộc họp mới.
  Sau khi submit → meeting được push vào editorialStore
  với status = 'IN_PROGRESS'.
  ============================================================
*/

import { useState, useEffect } from "react";
import { useAuthStore } from "../../../app/stores/authStore";
import { useUIStore } from "../../../app/stores/uiStore";
import { useEditorialStore } from "../../../app/stores/editorialStore";
import seriesService from "../../../services/seriesService";
import meetingService from "../../../services/meetingService";
import api from "../../../services/api";

// ── Avatar placeholder ──
function Avatar({ user, size = 10 }) {
  const initials = (user.displayName || user.username || "?")[0].toUpperCase();
  return (
    <div
      className={`w-${size} h-${size} rounded-full bg-primary-container/40 border border-outline-variant/40 flex items-center justify-center text-primary font-bold text-sm shrink-0`}
    >
      {initials}
    </div>
  );
}

// ── Role badge ──
function RoleBadge({ role }) {
  const styles = {
    EDITORIAL_BOARD:
      "bg-on-primary-container/20 text-on-primary-container border-on-primary-container/30",
    TANTOU_EDITOR:
      "bg-tertiary-container/20 text-tertiary-container border-tertiary-container/30",
  };
  return (
    <span
      className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
        styles[role] ||
        "bg-surface-container text-on-surface-variant border-outline-variant/30"
      }`}
    >
      {role.replace("_", " ")}
    </span>
  );
}

export function CreateMeetingModal({ onClose }) {
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const addMeeting = useEditorialStore((s) => s.addMeeting);

  // Danh sách series đã được Tantou Editor duyệt, đang chờ EB vote (PENDING_BOARD_VOTE)
  const [pendingSeries, setPendingSeries] = useState([]);
  const [seriesLoading, setSeriesLoading] = useState(true);

  // Danh sách user có thể mời (EDITORIAL_BOARD + TANTOU_EDITOR)
  const [availableUsers, setAvailableUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Fetch series PENDING_BOARD_VOTE
    setSeriesLoading(true);
    seriesService
      .getAll({ status: "PENDING_BOARD_VOTE", size: 100 })
      .then((res) => {
        if (!cancelled) setPendingSeries(res.content || []);
      })
      .catch(() => {
        if (!cancelled) setPendingSeries([]);
      })
      .finally(() => {
        if (!cancelled) setSeriesLoading(false);
      });

    // Fetch EDITORIAL_BOARD + TANTOU_EDITOR để chọn participant
    setUsersLoading(true);
    Promise.all([
      api.get('/users/board-members'),
      api.get('/users/tantou-editors'),
    ])
      .then(([boardMembers, tantouEditors]) => {
        if (!cancelled) {
          // Gộp 2 danh sách, loại bỏ trùng lặp (nếu có)
          const all = [...(boardMembers || []), ...(tantouEditors || [])];
          const unique = Array.from(
            new Map(all.map((u) => [u.id, u])).values()
          );
          setAvailableUsers(unique);
        }
      })
      .catch(() => {
        if (!cancelled) setAvailableUsers([]);
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const [form, setForm] = useState({
    seriesId: "",
    title: "",
    description: "",
    meetingLink: "meet.google.com/mng-flow-ync",
    scheduledAt: "",
  });
  const [selectedParticipants, setSelectedParticipants] = useState(
    user ? [user.id] : [],
  );
  const [submitting, setSubmitting] = useState(false);

  const isValid = form.seriesId && form.title.trim() && form.scheduledAt;

  const selectedSeries = pendingSeries.find(
    (s) => s.id === Number(form.seriesId),
  );

  const toggleParticipant = (userId) => {
    // Không cho bỏ chọn chính mình (user hiện tại luôn là người tạo)
    if (userId === user?.id) return;
    setSelectedParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);

    try {
      // Gọi API tạo meeting (không cần seriesTitle, createdBy — backend tự xử lý)
      await addMeeting({
        title: form.title.trim(),
        seriesId: Number(form.seriesId),
        description: form.description.trim(),
        meetingLink: form.meetingLink.trim(),
        startedAt: form.scheduledAt,
        participantIds: selectedParticipants,
      });

      addToast({
        title: "Meeting created",
        description: `"${form.title}" đã được tạo.`,
        variant: "success",
      });
      onClose();
    } catch (err) {
      addToast({
        title: "Failed to create meeting",
        description: err.message || "Không thể tạo cuộc họp.",
        variant: "error",
      });
      setSubmitting(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-surface/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal */}
      <div className="w-full max-w-2xl bg-surface-container-low border border-outline-variant/50 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-8 py-6 border-b border-outline-variant/30 flex justify-between items-center shrink-0">
          <h2 className="text-2xl font-semibold text-primary">
            New Editorial Meeting
          </h2>
          <button
            className="text-on-surface-variant hover:text-on-surface transition-colors"
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable form */}
        <form className="p-8 space-y-6 overflow-y-auto" onSubmit={handleSubmit}>
          {/* Series Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface-variant">
              Series{" "}
              <span className="text-xs text-on-surface-variant/60">
                (Tantou Editor đã duyệt — chờ EB quyết định)
              </span>
            </label>
            <div className="relative">
              <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 focus-within:border-primary/50 transition-all">
                {seriesLoading ? (
                  <>
                    <span className="material-symbols-outlined text-on-surface-variant/50 text-xl animate-spin">
                      progress_activity
                    </span>
                    <span className="flex-1 text-base text-on-surface-variant/50">
                      Đang tải series...
                    </span>
                  </>
                ) : selectedSeries ? (
                  <>
                    <div
                      className="w-8 h-10 rounded-sm shrink-0"
                      style={{
                        backgroundColor: selectedSeries.coverColor || "#4c4c56",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-base text-on-surface block truncate">
                        {selectedSeries.title}
                      </span>
                      {selectedSeries.genres?.[0] && (
                        <span className="text-xs text-on-surface-variant">
                          {selectedSeries.genres[0]}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-on-surface-variant text-xl">
                      auto_stories
                    </span>
                    <span className="flex-1 text-base text-on-surface-variant">
                      {pendingSeries.length === 0
                        ? "Không có series nào chờ duyệt"
                        : "Chọn series..."}
                    </span>
                  </>
                )}
                <span className="material-symbols-outlined text-on-surface-variant">
                  expand_more
                </span>
              </div>
              <select
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                value={form.seriesId}
                disabled={seriesLoading || pendingSeries.length === 0}
                onChange={(e) =>
                  setForm((f) => ({ ...f, seriesId: e.target.value }))
                }
                required
              >
                <option value="">-- Chọn series --</option>
                {pendingSeries.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                    {s.mangaka?.displayName
                      ? ` — ${s.mangaka.displayName}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
            {!seriesLoading && pendingSeries.length === 0 && (
              <p className="text-xs text-amber-400/80 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">info</span>
                Hiện không có series nào đã được Tantou Editor duyệt
                (PENDING_BOARD_VOTE).
              </p>
            )}
          </div>

          {/* Meeting Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface-variant">
              Meeting Title
            </label>
            <input
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-base text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              placeholder="e.g. Series Evaluation — Chapter 42"
              type="text"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface-variant">
              Description
            </label>
            <textarea
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-base text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none"
              placeholder="Define the objectives and agenda..."
              rows="3"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          {/* Link & Date row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Meeting Link */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface-variant">
                Meeting Link
              </label>
              <div className="relative flex items-center">
                <span
                  className="absolute left-4 material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  video_call
                </span>
                <input
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg pl-12 pr-4 py-3 text-base text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                  type="text"
                  value={form.meetingLink}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, meetingLink: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Scheduled Date & Time */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface-variant">
                Scheduled Date &amp; Time
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 material-symbols-outlined text-on-surface-variant">
                  calendar_today
                </span>
                <input
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg pl-12 pr-4 py-3 text-base text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all [color-scheme:dark]"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scheduledAt: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
          </div>

          {/* Invite Participants */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-on-surface-variant">
              Invite Participants
            </label>
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg overflow-hidden">
              <div className="max-h-52 overflow-y-auto">
                {usersLoading ? (
                  <div className="flex items-center justify-center py-6 text-on-surface-variant gap-2">
                    <span className="material-symbols-outlined text-base animate-spin">
                      progress_activity
                    </span>
                    <span className="text-sm">Đang tải danh sách...</span>
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="py-6 text-center text-on-surface-variant text-sm">
                    Không có thành viên nào.
                  </div>
                ) : (
                  availableUsers.map((member) => {
                    const isSelected = selectedParticipants.includes(member.id);
                    const isSelf = member.id === user?.id;
                    return (
                      <div
                        key={member.id}
                        className={`flex items-center gap-4 px-4 py-3 border-b border-outline-variant/10 transition-colors ${
                          isSelf
                            ? "opacity-60 cursor-default"
                            : "hover:bg-surface-variant/20 cursor-pointer"
                        }`}
                        onClick={() => toggleParticipant(member.id)}
                      >
                        {/* Avatar with online dot */}
                        <div className="relative">
                          <Avatar user={member} size={10} />
                          <div
                            className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-surface-container-lowest rounded-full ${
                              isSelected
                                ? "bg-primary"
                                : "bg-on-surface-variant/40"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-base text-on-surface">
                            {member.displayName}
                            {isSelf && (
                              <span className="text-xs text-on-surface-variant ml-1">
                                (you)
                              </span>
                            )}
                          </p>
                          <RoleBadge role={member.role} />
                        </div>
                        {/* Checkbox */}
                        {isSelected ? (
                          <div className="w-6 h-6 rounded border-2 border-primary bg-primary flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-on-primary text-sm font-bold">
                              check
                            </span>
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded border-2 border-outline-variant/50 shrink-0" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <p className="text-xs text-on-surface-variant">
              {selectedParticipants.length} người được mời
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="px-6 py-3 border border-outline-variant/50 text-on-surface-variant rounded-xl hover:bg-surface-variant/30 transition-all"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="px-8 py-3 bg-primary text-on-primary font-bold rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">
                add_circle
              </span>
              Create Meeting
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
