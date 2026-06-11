/*
  ============================================================
  PAGE: VotingPage
  ROUTE: /editorial/:meetingId/vote
  MỤC ĐÍCH: Giao diện bỏ phiếu cho các thành viên Editorial Board.
  QUYỀN TRUY CẬP: EDITORIAL_BOARD
  ============================================================

  STATE TRANSITION:
    Khi submit vote → meetingService.castVote()
    → Backend upsert vote + auto-complete nếu đủ EB vote
    → Navigate về /editorial
*/

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../app/stores/authStore";
import { useUIStore } from "../../../app/stores/uiStore";
import {
  useEditorialStore,
} from "../../../app/stores/editorialStore";
import meetingService from "../../../services/meetingService";

// ── Slider hiển thị điểm tiêu chí ──
function ScoreSlider({ label, weight, value, onChange, id }) {
  return (
    <div className="bg-surface-container-low border border-outline-variant/30 p-4 rounded-xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-base text-on-surface">{label}</p>
          {weight != null && (
            <p className="text-xs text-on-surface-variant">Weight: {weight}</p>
          )}
        </div>
        <span className="text-2xl font-semibold text-primary">{value}</span>
      </div>
      <input
        className="w-full accent-primary cursor-pointer"
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        id={id}
      />
      <div className="flex justify-between text-[10px] text-on-surface-variant mt-1">
        <span>1</span>
        <span>10</span>
      </div>
    </div>
  );
}

// ── Participant item (dùng participant info từ meeting response) ──
function ParticipantItem({ participant }) {
  if (!participant) return null;
  const name = participant.displayName || participant.username || "?";
  const initials = name[0].toUpperCase();
  return (
    <div className="flex items-center justify-between p-3 bg-surface-container-high/50 rounded-xl border border-outline-variant/20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full border border-primary/30 bg-primary-container/30 flex items-center justify-center text-primary font-bold">
          {initials}
        </div>
        <div>
          <p className="text-sm font-medium text-on-surface">
            {name}
          </p>
          <p className="text-[11px] text-on-surface-variant uppercase tracking-tighter">
            {participant.username}
          </p>
        </div>
      </div>
      <span
        className="material-symbols-outlined text-green-400"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        check_circle
      </span>
    </div>
  );
}

export function VotingPage() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const getMeetingById = useEditorialStore((s) => s.getMeetingById);
  const fetchMeetingById = useEditorialStore((s) => s.fetchMeetingById);
  const criteria = useEditorialStore((s) => s.criteria);
  const fetchCriteria = useEditorialStore((s) => s.fetchCriteria);

  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);

  // Vote state
  const [voteChoice, setVoteChoice] = useState(null); // 'YES' | 'NO'
  const [comment, setComment] = useState("");
  // scores lưu dưới dạng Map<criterionId, score>
  const [scores, setScores] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Load meeting + criteria khi mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch meeting detail từ API (đảm bảo có data mới nhất)
        await fetchMeetingById(meetingId)
        // Fetch criteria
        await fetchCriteria()
      } catch (err) {
        console.error('Failed to load meeting:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [meetingId, fetchMeetingById, fetchCriteria])

  // Sync meeting từ store vào local state (để có thể render ngay cả khi chưa fetch xong)
  useEffect(() => {
    const m = getMeetingById(meetingId)
    if (m) {
      setMeeting(m)
      // Khởi tạo scores với giá trị mặc định 7 cho mỗi criterion
      if (criteria.length > 0) {
        setScores((prev) => {
          const initial = { ...prev }
          criteria.forEach((c) => {
            if (initial[c.id] == null) initial[c.id] = 7
          })
          return initial
        })
      }
    }
  }, [meetingId, getMeetingById, criteria])

  if (!meeting && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-on-surface-variant">
        <span className="material-symbols-outlined text-5xl opacity-30">
          search_off
        </span>
        <p>Không tìm thấy cuộc họp.</p>
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

  const participants = meeting.participants || [];
  const isValid = voteChoice !== null;

  // ── Submit vote → gọi API ──
  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);

    try {
      // Build scores array theo format backend yêu cầu
      const scoresArray = criteria.map((c) => ({
        criterionId: c.id,
        score: scores[c.id] || 7,
      }));

      const voteData = {
        vote: voteChoice,
        comment: comment.trim(),
        scores: scoresArray,
      };

      // Gọi API castVote (không cần userId — backend lấy từ JWT)
      await meetingService.castVote(meetingId, voteData);

      // Fetch lại meeting để cập nhật store
      await fetchMeetingById(meetingId);

      addToast({
        title: "Vote submitted!",
        description: `Phiếu bầu "${voteChoice}" của bạn đã được ghi nhận.`,
        variant: "success",
      });

      // Tự động quay về trang danh sách sau 1 giây
      setTimeout(() => {
        navigate("/editorial");
      }, 1000);
    } catch (err) {
      addToast({
        title: "Vote failed",
        description: err.message || "Không thể gửi phiếu bầu. Vui lòng thử lại.",
        variant: "error",
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 flex flex-col lg:flex-row gap-5 flex-grow bg-background min-h-[calc(100vh-4rem)]">
      {/* ── Left Panel (60%) ── */}
      <section className="lg:w-3/5 flex flex-col gap-5">
        {/* Back + Meeting Header */}
        <div className="border border-outline-variant/25 bg-[rgba(27,27,29,0.7)] backdrop-blur-md p-6 rounded-2xl flex flex-col gap-4">
          <button
            className="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors text-sm w-fit"
            onClick={() => navigate("/editorial")}
          >
            <span className="material-symbols-outlined text-base">
              arrow_back
            </span>
            Trở về danh sách
          </button>

          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-primary text-sm font-medium uppercase tracking-widest">
                  Editorial Board
                </span>
                <span className="w-1 h-1 rounded-full bg-outline-variant" />
                <span className="text-on-surface-variant text-sm">
                  {meeting.seriesTitle}
                </span>
              </div>
              <h1 className="text-2xl font-semibold text-on-surface">
                {meeting.title}
              </h1>
            </div>
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs border border-primary/20 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Pending Vote
            </span>
          </div>

          {meeting.scheduledAt && (
            <div className="flex items-center gap-6 text-on-surface-variant text-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">
                  calendar_today
                </span>
                <span>
                  {new Date(meeting.scheduledAt).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">
                  schedule
                </span>
                <span>
                  {new Date(meeting.scheduledAt).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          )}

          {meeting.description && (
            <p className="text-on-surface-variant text-sm leading-relaxed border-t border-outline-variant/20 pt-4">
              {meeting.description}
            </p>
          )}
        </div>

        {/* ── Voting Area ── */}
        <div className="border border-outline-variant/25 bg-[rgba(27,27,29,0.7)] backdrop-blur-md p-6 rounded-2xl flex flex-col gap-5">
          <h2 className="text-xl font-semibold text-on-surface">
            Cast Your Vote
          </h2>

          {/* YES / NO toggle */}
          <div className="flex gap-4">
            {/* YES */}
            <button
              className={`flex-1 flex flex-col items-center justify-center p-6 border rounded-xl cursor-pointer transition-all duration-200 ${
                voteChoice === "YES"
                  ? "border-green-500 bg-green-500/10 text-green-400 shadow-[0_0_20px_rgba(74,222,128,0.15)]"
                  : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-bright/5 hover:border-green-500/40"
              }`}
              type="button"
              onClick={() => setVoteChoice("YES")}
            >
              <span
                className="material-symbols-outlined text-5xl mb-2"
                style={
                  voteChoice === "YES"
                    ? { fontVariationSettings: "'FILL' 1" }
                    : {}
                }
              >
                thumb_up
              </span>
              <span className="text-2xl font-semibold">YES</span>
              <span className="text-sm opacity-70 mt-0.5">
                Approve Publication
              </span>
            </button>

            {/* NO */}
            <button
              className={`flex-1 flex flex-col items-center justify-center p-6 border rounded-xl cursor-pointer transition-all duration-200 ${
                voteChoice === "NO"
                  ? "border-red-500 bg-red-500/10 text-red-400 shadow-[0_0_20px_rgba(248,113,113,0.15)]"
                  : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-bright/5 hover:border-red-500/40"
              }`}
              type="button"
              onClick={() => setVoteChoice("NO")}
            >
              <span
                className="material-symbols-outlined text-5xl mb-2"
                style={
                  voteChoice === "NO"
                    ? { fontVariationSettings: "'FILL' 1" }
                    : {}
                }
              >
                thumb_down
              </span>
              <span className="text-2xl font-semibold">NO</span>
              <span className="text-sm opacity-70 mt-0.5">
                Requires Revision
              </span>
            </button>
          </div>

          {/* Feedback textarea */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-on-surface-variant">
              Reviewer Feedback
            </label>
            <textarea
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl p-4 text-base text-on-surface focus:outline-none focus:border-primary min-h-[120px] transition-all resize-none"
              placeholder="Provide detailed editorial notes for the creator..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>

        {/* ── Criterion Scores (dynamic từ API) ── */}
        {criteria.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-on-surface-variant uppercase tracking-widest px-1">
              Criterion Scores
            </h3>
            {criteria.map((c) => (
              <ScoreSlider
                key={c.id}
                id={`score-${c.id}`}
                label={c.name}
                weight={c.weight}
                value={scores[c.id] || 7}
                onChange={(v) =>
                  setScores((s) => ({ ...s, [c.id]: v }))
                }
              />
            ))}
          </div>
        )}

        {/* ── Submit Button ── */}
        <div className="mt-2">
          <button
            disabled={!isValid || submitting}
            className="w-full py-5 bg-primary text-on-primary font-semibold text-lg rounded-2xl shadow-xl shadow-primary/10 hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleSubmit}
          >
            <span className="material-symbols-outlined">send</span>
            {submitting ? "Đang gửi..." : "Submit Vote to Board"}
          </button>
          <p className="text-center mt-3 text-xs text-on-surface-variant">
            This action cannot be undone once submitted to the Board.
          </p>
        </div>
      </section>

      {/* ── Right Panel (40%) ── */}
      <aside className="lg:w-2/5 flex flex-col gap-5">
        {/* Series cover/info (không dùng mock) */}
        <div className="border border-outline-variant/25 bg-[rgba(27,27,29,0.7)] backdrop-blur-md rounded-2xl overflow-hidden">
          <div className="w-full h-48 flex items-center justify-center relative bg-surface-container-high">
            <span className="material-symbols-outlined text-white/20 text-8xl">
              auto_stories
            </span>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background to-transparent">
              <p className="text-sm font-medium text-on-surface">
                {meeting.seriesTitle}
              </p>
            </div>
          </div>
        </div>

        {/* Participants List (dùng participant info từ API) */}
        <div className="border border-outline-variant/25 bg-[rgba(27,27,29,0.7)] backdrop-blur-md p-6 rounded-2xl flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-on-surface">
              Participants
            </h3>
            <span className="text-sm text-on-surface-variant">
              {participants.length} invited
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {participants.map((p) => (
              <ParticipantItem key={p.userId} participant={p} />
            ))}
          </div>
        </div>

        {/* Meeting link */}
        {meeting.meetingLink && (
          <div className="border border-outline-variant/25 bg-[rgba(27,27,29,0.7)] backdrop-blur-md p-4 rounded-xl flex items-center gap-3">
            <span
              className="material-symbols-outlined text-primary text-2xl shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              video_call
            </span>
            <div className="min-w-0">
              <p className="text-xs text-on-surface-variant">Meeting Link</p>
              <p className="text-sm text-primary truncate">
                {meeting.meetingLink}
              </p>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
