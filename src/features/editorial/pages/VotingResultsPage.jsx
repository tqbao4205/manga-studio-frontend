/*
  ============================================================
  PAGE: VotingResultsPage
  ROUTE: /editorial/:meetingId/results
  MỤC ĐÍCH: Dashboard kết quả vote — biểu đồ YES/NO, từng phiếu
  bầu chi tiết, và panel phê duyệt cuối cho Chief Editor.
  QUYỀN TRUY CẬP: EDITORIAL_BOARD + CHIEF_EDITOR
  ============================================================
*/

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../app/stores/authStore";
import { useUIStore } from "../../../app/stores/uiStore";
import {
  useEditorialStore,
  isChiefEditor,
} from "../../../app/stores/editorialStore";
import { ConfirmDecisionModal } from "../components/ConfirmDecisionModal";

// ── Score progress bar ──
function ScoreBar({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
        <span>{label}</span>
        <span className="text-primary">{value}/10</span>
      </div>
      <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700"
          style={{ width: `${value * 10}%` }}
        />
      </div>
    </div>
  );
}

// ── Individual voter card (dùng vote summary detail từ API) ──
function VoterCard({ detail, participants }) {
  // Tìm thông tin participant từ danh sách
  const participant = participants?.find((p) => p.userId === detail.voterId);
  const name = participant?.displayName || participant?.username || detail.voterName || "?";
  const initials = name[0].toUpperCase();

  const isYes = detail.vote === "YES";

  return (
    <div className="border border-outline-variant/25 bg-[rgba(27,27,29,0.7)] backdrop-blur-md p-5 rounded-2xl flex flex-col gap-4 hover:shadow-[0_0_20px_rgba(208,188,255,0.05)] transition-all">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 rounded-full border border-outline-variant/50 bg-primary-container/30 flex items-center justify-center text-primary font-bold text-lg shrink-0">
            {initials}
          </div>
          <div>
            <h4 className="text-lg font-semibold text-on-surface">
              {name}
            </h4>
          </div>
        </div>
        {/* Vote badge */}
        <div
          className={`px-4 py-1.5 rounded-lg font-bold tracking-widest text-sm border ${
            isYes
              ? "bg-green-400/10 border-green-400/30 text-green-400"
              : "bg-red-400/10 border-red-400/30 text-red-400"
          }`}
        >
          {detail.vote}
        </div>
      </div>

      {/* Comment */}
      {detail.comment && (
        <div className="bg-surface-container-lowest/50 p-3 rounded-xl border border-outline-variant/20 italic text-on-surface-variant text-sm leading-relaxed">
          "{detail.comment}"
        </div>
      )}

      {/* Score bars */}
      {detail.scores && detail.scores.length > 0 && (
        <div className="space-y-3 mt-1">
            {detail.scores.map((s) => (
            <ScoreBar key={s.criterionId} label={s.criterionName} value={s.score} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Decision badge ──
function DecisionBanner({ decision }) {
  if (!decision) return null;
  const isApproved = decision === "APPROVED";
  return (
    <div
      className={`flex items-center gap-3 px-6 py-4 rounded-xl border font-semibold text-base ${
        isApproved
          ? "bg-green-500/10 border-green-500/30 text-green-400"
          : "bg-red-500/10 border-red-500/30 text-red-400"
      }`}
    >
      <span
        className="material-symbols-outlined text-2xl"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {isApproved ? "verified" : "cancel"}
      </span>
      <span>
        Final Decision:{" "}
        <span className="uppercase tracking-wider">{decision}</span>
      </span>
    </div>
  );
}

export function VotingResultsPage() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const fetchMeetingById = useEditorialStore((s) => s.fetchMeetingById);
  const finalizeDecision = useEditorialStore((s) => s.finalizeDecision);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [localDecision, setLocalDecision] = useState(null);

  // Fetch meeting từ API khi mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await fetchMeetingById(meetingId);
      } catch (err) {
        console.error('Failed to load meeting results:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [meetingId, fetchMeetingById]);

  // Re-render khi WebSocket push MEETING_UPDATED / MEETING_COMPLETED
  // (store subscription tự động trigger re-render qua useEditorialStore)
  const meeting = useEditorialStore((s) => s.meetings.find((m) => m.id === Number(meetingId)));
  const isChief = isChiefEditor(user);

  // Tính summary từ voteSummary của backend
  const vs = meeting?.voteSummary;
  const total = vs?.totalVotes || 0;
  const yes = vs?.yesCount || 0;
  const no = vs?.noCount || 0;
  const approval = total > 0 ? Math.round((yes / total) * 100) : 0;
  const details = vs?.details || [];
  const participants = meeting?.participants || [];

  // Tổng số EB (không tính Tantou) — lấy từ backend hoặc fallback
  const totalEB = vs?.totalBoardMembers || participants.length || 0;

  if (!meeting && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-on-surface-variant">
        <span className="material-symbols-outlined text-5xl opacity-30">
          search_off
        </span>
        <p>Không tìm thấy kết quả cuộc họp.</p>
        <button
          className="text-primary hover:underline text-sm"
          onClick={() => navigate("/editorial")}
        >
          ← Quay về danh sách
        </button>
      </div>
    );
  }

  if (loading || !meeting) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-on-surface-variant">
        <span className="material-symbols-outlined text-4xl opacity-50 animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  const handleFinalizeDecision = async (decision) => {
    try {
      await finalizeDecision(meetingId, decision);
      setLocalDecision(decision);
      addToast({
        title: `Series ${decision === "APPROVED" ? "Approved" : "Rejected"}`,
        description:
          decision === "APPROVED"
            ? `"${meeting.seriesTitle}" đã được phê duyệt và sẽ chuyển sang ONGOING.`
            : `"${meeting.seriesTitle}" đã bị từ chối và trả về trạng thái DRAFT.`,
        variant: decision === "APPROVED" ? "success" : "error",
      });
      setShowConfirmModal(false);
    } catch (err) {
      addToast({
        title: "Decision failed",
        description: err?.response?.data?.message || err.message || "Cannot record decision.",
        variant: "error",
      });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto w-full flex flex-col gap-6">
      {/* Page Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <button
            className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors text-sm mb-3"
            onClick={() => navigate("/editorial")}
          >
            <span className="material-symbols-outlined text-base">
              arrow_back
            </span>
            Back to list
          </button>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="bg-tertiary-container/20 text-tertiary text-xs font-medium px-3 py-1 rounded-full border border-tertiary/30 uppercase tracking-wider">
              {meeting.decision
                ? `Decision: ${meeting.decision}`
                : "Awaiting Decision"}
            </span>
            <span className="text-on-surface-variant text-xs">
              {meeting.scheduledAt
                ? new Date(meeting.scheduledAt).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : ""}
            </span>
          </div>
          <h2 className="text-3xl font-semibold text-on-surface flex items-center gap-3 flex-wrap">
            {meeting.seriesCoverImageUrl && (
              <img src={meeting.seriesCoverImageUrl} alt="" className="w-10 h-14 rounded-lg object-cover border border-outline-variant/30" />
            )}
            {meeting.seriesTitle}
            <span className="text-on-surface-variant font-normal text-xl">
              —
            </span>
            <span className="text-xl text-on-surface-variant">
              {meeting.title}
            </span>
          </h2>
        </div>
        <div className="flex gap-2">
          <button className="bg-surface-container-high text-on-surface text-sm px-4 py-2 rounded-xl border border-outline-variant/30 flex items-center gap-2 hover:bg-surface-bright/20 transition-all">
            <span className="material-symbols-outlined text-lg">share</span>
            Share
          </button>
          <button className="bg-surface-container-high text-on-surface text-sm px-4 py-2 rounded-xl border border-outline-variant/30 flex items-center gap-2 hover:bg-surface-bright/20 transition-all">
            <span className="material-symbols-outlined text-lg">download</span>
            Export
          </button>
        </div>
      </section>

      {/* Final Decision Banner */}
      {(localDecision || meeting?.decision) && <DecisionBanner decision={localDecision || meeting.decision} />}

      {/* ── Vote Summary Bar ── */}
      <section className="border border-outline-variant/25 bg-[rgba(27,27,29,0.7)] backdrop-blur-md rounded-2xl p-6 overflow-hidden relative">
        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-6">
          <div className="flex flex-col">
            <span className="text-on-surface-variant text-xs font-medium mb-1">
              Total Participation
            </span>
              <span className="text-4xl font-bold text-on-surface">
              {total}{" "}
              <span className="text-base font-normal text-on-surface-variant">
                / {totalEB} Board Members
              </span>
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-on-surface-variant text-xs font-medium mb-1">
              Approval Rating
            </span>
            <span
              className={`text-4xl font-bold ${
                approval >= 60 ? "text-green-400" : "text-red-400"
              }`}
            >
              {approval}%
            </span>
          </div>
          <div className="flex flex-col items-start md:items-end">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <span
                className="material-symbols-outlined text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                thumb_up
              </span>
              <span className="text-sm font-medium">YES</span>
            </div>
            <span className="text-4xl font-bold text-on-surface">
              {String(yes).padStart(2, "0")}
            </span>
          </div>
          <div className="flex flex-col items-start md:items-end">
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <span
                className="material-symbols-outlined text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                thumb_down
              </span>
              <span className="text-sm font-medium">NO</span>
            </div>
            <span className="text-4xl font-bold text-on-surface">
              {String(no).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Bi-color vote bar (theo tỉ lệ trên tổng EB, không chỉ trên vote) */}
        <div className="w-full h-12 bg-surface-container-highest rounded-xl flex overflow-hidden border border-outline-variant/30">
          {totalEB > 0 ? (
            <>
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-1000 ease-out flex items-center justify-center text-white font-bold text-sm"
                style={{ width: `${(yes / totalEB) * 100}%` }}
              >
                {(yes / totalEB) * 100 > 15 && `${yes} YES`}
              </div>
              <div
                className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-1000 ease-out flex items-center justify-center text-white font-bold text-sm"
                style={{ width: `${(no / totalEB) * 100}%` }}
              >
                {(no / totalEB) * 100 > 15 && `${no} NO`}
              </div>
              {/* Phần chưa vote → xám */}
              <div
                className="h-full bg-surface-container-high transition-all duration-1000"
                style={{ width: `${((totalEB - total) / totalEB) * 100}%` }}
              />
            </>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-on-surface-variant text-sm">
              Chưa có phiếu bầu
            </div>
          )}
        </div>

        {/* Decorative glow */}
        <div className="absolute -right-20 -top-20 w-40 h-40 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
      </section>

      {/* ── Chief Editor: Finalize button ── */}
      {isChief && !meeting.decision && !localDecision && meeting.status === 'COMPLETED' && (
        <div className="flex justify-end">
          <button
            className="bg-primary text-on-primary py-3 px-8 rounded-xl font-bold active:scale-95 hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-primary/10"
            onClick={() => setShowConfirmModal(true)}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              gavel
            </span>
            Finalize Decision
          </button>
        </div>
      )}

      {/* ── Individual Vote Breakdown ── */}
      {details.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {details.map((d) => (
            <VoterCard
              key={d.voterId}
              detail={d}
              participants={participants}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-3 border border-outline-variant/25 rounded-2xl bg-surface-container-low/50">
          <span className="material-symbols-outlined text-5xl opacity-30">
            how_to_vote
          </span>
          <p className="text-sm">Chưa có phiếu bầu nào được ghi nhận.</p>
        </div>
      )}

      {/* Confirm Decision Modal */}
      {showConfirmModal && (
        <ConfirmDecisionModal
          meeting={meeting}
          seriesTitle={meeting.seriesTitle}
          summary={{ yes, no, total, approval }}
          onConfirm={handleFinalizeDecision}
          onClose={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
}
