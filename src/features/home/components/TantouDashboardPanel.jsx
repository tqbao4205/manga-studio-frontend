/**
 * TantouDashboardPanel.jsx
 *
 * Primary data source (no dependency):
 *   - GET /api/series (seriesService.getAll)
 *   - GET /api/series/{seriesId}/chapters (chapterService.getBySeries)
 *
 * This panel builds:
 *   1) Late Studios Alert
 *   2) Manuscript Review Queue
 *
 * Lightweight future fallback:
 *   - GET /api/v1/dashboard/stats (dashboardService.getStats)
 *     only used when it provides richer list fields and primary source is empty.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  Bell,
  CheckCircle2,
  Clock,
  FileSearch,
  FileText,
  Info,
  Loader2,
  MessageSquare,
  Siren,
} from "lucide-react";
import { useAuthStore } from "../../../app/stores/authStore";
import { useUIStore } from "../../../app/stores/uiStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../shared/components/ui/card";
import { Button } from "../../../shared/components/ui/button";
import { PageLoading } from "../../../shared/components/shared/LoadingSpinner";
import { cn, formatDate, formatRelativeTime } from "../../../shared/utils";
import dashboardService from "../../../services/dashboardService";
import seriesService from "../../../services/seriesService";
import chapterService from "../../../services/chapterService";
import { TantouBiCharts } from "./charts/TantouBiCharts";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function daysLeftLabel(daysLeft) {
  if (daysLeft === 0) return "Due today";
  if (daysLeft < 0)
    return `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} overdue`;
  return `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
}

function progressTone(percent) {
  if (percent < 25) return "danger";
  if (percent < 50) return "warning";
  return "default";
}

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function daysLeft(deadline) {
  if (!deadline) return Number.POSITIVE_INFINITY;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(deadline);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - start.getTime()) / 86400000);
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, tone = "default" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-on-surface-variant uppercase tracking-wide">
              {label}
            </p>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums mt-1",
                tone === "warning"
                  ? "text-status-warning"
                  : tone === "danger"
                    ? "text-status-danger"
                    : "text-on-surface",
              )}
            >
              {value}
            </p>
          </div>
          <div
            className={cn(
              "p-2.5 rounded-lg",
              tone === "warning"
                ? "bg-status-warning/10 text-status-warning"
                : tone === "danger"
                  ? "bg-status-danger/10 text-status-danger"
                  : "bg-primary/8 text-primary",
            )}
          >
            <Icon size={20} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── LateStudioItem ───────────────────────────────────────────────────────────
function LateStudioItem({ studio, onNudge, isNudging }) {
  const tone = progressTone(studio.progressPercent);
  const progressColor =
    tone === "danger"
      ? "bg-status-danger"
      : tone === "warning"
        ? "bg-status-warning"
        : "bg-primary";
  const progressGlow =
    tone === "danger"
      ? "shadow-[0_0_8px_rgba(239,68,68,0.4)]"
      : tone === "warning"
        ? "shadow-[0_0_8px_rgba(245,158,11,0.4)]"
        : "";

  return (
    <div
      className={cn(
        "group border rounded-lg p-4 transition-all duration-200",
        tone === "danger"
          ? "border-status-danger/40 hover:border-status-danger/70 hover:bg-status-danger/[0.02]"
          : "border-status-warning/40 hover:border-status-warning/60 hover:bg-status-warning/[0.02]",
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <AlertTriangle
              size={13}
              className={
                tone === "danger" ? "text-status-danger" : "text-status-warning"
              }
            />
            <h4 className="text-sm font-semibold text-on-surface truncate">
              {studio.displayName || studio.authorName}
            </h4>
          </div>
          <p className="text-xs text-on-surface-variant truncate">
            <span className="text-primary font-medium">
              {studio.seriesTitle}
            </span>
            {studio.chapterTitle && <> &mdash; {studio.chapterTitle}</>}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <span
            className={cn(
              "text-xs font-semibold",
              tone === "danger" ? "text-status-danger" : "text-status-warning",
            )}
          >
            {daysLeftLabel(studio.daysLeft)}
          </span>
          {studio.deadline && (
            <p className="text-[10px] text-on-surface-variant mt-0.5">
              {formatDate(studio.deadline, { month: "short", day: "numeric" })}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[11px] mb-1.5">
          <span className="text-on-surface-variant">
            Progress{studio.currentStage ? ` (${studio.currentStage})` : ""}
          </span>
          <span
            className={cn(
              "font-semibold",
              tone === "danger" ? "text-status-danger" : "text-status-warning",
            )}
          >
            {studio.progressPercent}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-outline-variant/20 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progressColor,
              progressGlow,
            )}
            style={{ width: `${Math.min(100, studio.progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Nudge button */}
      <Button
        size="sm"
        className="w-full gap-2 bg-status-danger text-white hover:brightness-90"
        onClick={() => onNudge(studio)}
        disabled={isNudging}
      >
        {isNudging ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Bell size={13} />
        )}
        Quick Nudge
      </Button>
    </div>
  );
}

// ─── ManuscriptQueueItem ──────────────────────────────────────────────────────
function ManuscriptQueueItem({ chapter, onReview }) {
  return (
    <div className="group flex items-center gap-4 py-3 border-b border-outline-variant/20 last:border-0 hover:bg-surface-container-high/30 transition-colors -mx-1 px-1 rounded">
      {/* Chapter thumbnail placeholder */}
      <div className="w-10 h-14 bg-surface-container-highest rounded border border-outline-variant/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {chapter.thumbnailUrl ? (
          <img
            src={chapter.thumbnailUrl}
            alt={chapter.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileText size={16} className="text-outline-variant" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={cn(
              "w-2 h-2 rounded-full flex-shrink-0",
              chapter.isNew ? "bg-primary animate-pulse" : "bg-status-success",
            )}
          />
          <h4 className="text-sm font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
            {chapter.seriesTitle || "Unknown Series"} — Ch.
            {chapter.chapterNumber}
            {chapter.title ? ` "${chapter.title}"` : ""}
          </h4>
        </div>
        <p className="text-[11px] text-on-surface-variant">
          Submitted{" "}
          {chapter.submittedAt
            ? formatRelativeTime(chapter.submittedAt)
            : "recently"}
          {chapter.pageCount ? ` • ${chapter.pageCount} pages` : ""}
        </p>
      </div>

      {/* Action */}
      <Button
        size="sm"
        variant="outline"
        className="flex-shrink-0 gap-1.5 hover:bg-primary/5 hover:border-primary/40 hover:text-primary"
        onClick={() => onReview(chapter)}
      >
        <MessageSquare size={13} />
        Review
      </Button>
    </div>
  );
}

// ─── SeriesProposalItem (new) ───────────────────────────────────────────────
function SeriesProposalItem({ series, onApprove, onReject, loadingAction }) {
  const submittedAt =
    series?.submittedAt || series?.updatedAt || series?.createdAt;
  const mangakaName =
    series?.mangaka?.displayName || series?.mangaka?.username || "Unknown";

  return (
    <div
      className="group rounded-lg border border-outline-variant/30 p-4 transition-all hover:border-primary/40 hover:bg-surface-container-high/20"
      role="button"
      tabIndex={0}
      onClick={() => onApprove(series, true)}
      onKeyDown={(e) => e.key === "Enter" && onApprove(series, true)}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-on-surface">
            {series.title}
          </p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Mangaka: <span className="font-medium">{mangakaName}</span>
          </p>
          <p className="mt-1 text-[11px] text-on-surface-variant/80">
            Submitted: {submittedAt ? formatDate(submittedAt) : "-"}
          </p>
        </div>
        <span className="rounded-full border border-accent-gold/30 bg-accent-gold/10 px-2 py-0.5 text-[10px] font-bold text-accent-gold">
          Tantou Pending
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          size="sm"
          className="bg-status-success text-white hover:brightness-95"
          disabled={
            loadingAction === `approve-${series.id}` ||
            loadingAction === `reject-${series.id}`
          }
          onClick={(e) => {
            e.stopPropagation();
            onApprove(series);
          }}
        >
          {loadingAction === `approve-${series.id}` ? (
            <Loader2 size={14} className="mr-1.5 animate-spin" />
          ) : null}
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-status-danger/40 text-status-danger hover:bg-status-danger/10"
          disabled={
            loadingAction === `approve-${series.id}` ||
            loadingAction === `reject-${series.id}`
          }
          onClick={(e) => {
            e.stopPropagation();
            onReject(series);
          }}
        >
          {loadingAction === `reject-${series.id}` ? (
            <Loader2 size={14} className="mr-1.5 animate-spin" />
          ) : null}
          Reject
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function TantouDashboardPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const [nudgingId, setNudgingId] = useState(null);
  const [proposalActionId, setProposalActionId] = useState(null);

  // Primary source: series + chapters only
  const {
    data: tantouData,
    isLoading: tantouDataLoading,
    error: tantouDataError,
  } = useQuery({
    queryKey: ["dashboard", "tantou", "series-chapters", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const pageSize = 100;
      let page = 0;
      let totalPages = 1;
      const allSeries = [];

      // Fetch all pages so the tantou can see all assigned series
      while (page < totalPages) {
        const payload = await seriesService.getAll({
          page,
          size: pageSize,
          sort: "UPDATED_AT_DESC",
        });
        allSeries.push(...toArray(payload));
        totalPages = Math.max(1, toNumber(payload?.totalPages, 1));
        page += 1;
      }

      const assignedSeries = allSeries.filter(
        (series) =>
          toNumber(series?.tantouEditor?.id, -1) === toNumber(user?.id, -2),
      );

      const chapterBuckets = await Promise.all(
        assignedSeries.map(async (series) => {
          const chapters = toArray(await chapterService.getBySeries(series.id));
          return { series, chapters };
        }),
      );

      const mappedChapters = chapterBuckets.flatMap(({ series, chapters }) =>
        chapters.map((chapter) => {
          const remaining = daysLeft(chapter.deadline);
          return {
            ...chapter,
            chapterId: chapter.id,
            seriesId: series.id,
            seriesTitle: series.title,
            authorId: series?.mangaka?.id,
            authorName: series?.mangaka?.displayName || "Unknown Author",
            displayName: series?.mangaka?.displayName || "Unknown Author",
            progressPercent: toNumber(chapter.progressPercent, 0),
            daysLeft: remaining,
            submittedAt: chapter.updatedAt || chapter.createdAt,
          };
        }),
      );

      const lateStudios = mappedChapters
        .filter((chapter) => {
          const progress = toNumber(chapter.progressPercent, 0);
          // "duoi 3 ngay" means remaining days 0, 1, or 2
          return progress < 50 && chapter.daysLeft >= 0 && chapter.daysLeft < 3;
        })
        .sort(
          (a, b) =>
            a.daysLeft - b.daysLeft || a.progressPercent - b.progressPercent,
        );

      const chaptersInReview = mappedChapters
        .filter(
          (chapter) =>
            chapter.status === "IN_REVIEW" || chapter.status === "SUBMITTED",
        )
        .sort(
          (a, b) =>
            new Date(b.submittedAt || 0).getTime() -
            new Date(a.submittedAt || 0).getTime(),
        );

      return {
        assignedSeriesCount: assignedSeries.length,
        chaptersInReview,
        lateStudios,
        allChapters: mappedChapters,
        seriesStatusBreakdown: assignedSeries.reduce((acc, s) => {
          const k = s.status || "UNKNOWN";
          acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {}),
      };
    },
  });

  // Lightweight future fallback for dashboard list fields
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ["dashboard", "stats", user?.id],
    queryFn: () => dashboardService.getStats(),
    enabled: !!user,
    retry: false,
  });

  // New: Series Proposal Queue for Tantou
  const { data: proposalSeries = [], isLoading: proposalLoading } = useQuery({
    queryKey: ["dashboard", "tantou", "proposal-queue", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const payload = await seriesService.getAll({
        status: "PENDING_TANTOU",
        page: 0,
        size: 100,
      });
      const rows = toArray(payload);
      return rows
        .filter((series) => {
          const assignedId = toNumber(series?.tantouEditor?.id, null);
          return assignedId == null || assignedId === toNumber(user?.id, -1);
        })
        .sort(
          (a, b) =>
            new Date(
              b.submittedAt || b.updatedAt || b.createdAt || 0,
            ).getTime() -
            new Date(
              a.submittedAt || a.updatedAt || a.createdAt || 0,
            ).getTime(),
        );
    },
  });

  // ── Nudge mutation ─────────────────────────────────────────────────────
  const nudgeMutation = useMutation({
    mutationFn: ({ authorId, chapterId }) =>
      dashboardService.nudgeAuthor(authorId, {
        chapterId,
        message:
          "Your chapter deadline is approaching. Please pick up the pace!",
      }),
    onSuccess: (_, { authorId, studioName }) => {
      addToast({
        title: "Nudge sent",
        description: `Notification dispatched to ${studioName}`,
        variant: "success",
      });
      setNudgingId(null);
    },
    onError: () => {
      addToast({
        title: "Failed to send nudge",
        description: "nudgeAuthor API not yet available on backend",
        variant: "error",
      });
      setNudgingId(null);
    },
  });

  const tantouApproveMutation = useMutation({
    mutationFn: (seriesId) => seriesService.tantouApprove(seriesId),
    onSuccess: () => {
      addToast({
        title: "Series approved",
        description: "Series moved to Editorial Board voting queue.",
        variant: "success",
      });
      setProposalActionId(null);
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "tantou", "proposal-queue"],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "tantou", "series-chapters"],
      });
    },
    onError: () => {
      addToast({
        title: "Approve failed",
        description: "Could not approve this series. Please try again.",
        variant: "error",
      });
      setProposalActionId(null);
    },
  });

  const tantouRejectMutation = useMutation({
    mutationFn: (seriesId) => seriesService.tantouReject(seriesId),
    onSuccess: () => {
      addToast({
        title: "Series rejected",
        description: "Series returned to Mangaka for revision.",
        variant: "success",
      });
      setProposalActionId(null);
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "tantou", "proposal-queue"],
      });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "tantou", "series-chapters"],
      });
    },
    onError: () => {
      addToast({
        title: "Reject failed",
        description: "Could not reject this series. Please try again.",
        variant: "error",
      });
      setProposalActionId(null);
    },
  });

  if (tantouDataLoading) return <PageLoading />;

  // Primary list data from series+chapter, fallback to dashboard stats lists when needed
  const lateStudiosPrimary = toArray(tantouData?.lateStudios);
  const chaptersInReviewPrimary = toArray(tantouData?.chaptersInReview);
  const lateStudiosFallback = toArray(stats?.lateStudiosAlert);
  const chaptersInReviewFallback = toArray(stats?.chaptersInReviewList);

  const lateStudios =
    lateStudiosPrimary.length > 0 ? lateStudiosPrimary : lateStudiosFallback;

  const chaptersInReview =
    chaptersInReviewPrimary.length > 0
      ? chaptersInReviewPrimary
      : chaptersInReviewFallback;

  const handleNudge = (studio) => {
    if (!studio?.authorId) {
      addToast({
        title: "Missing author",
        description: "Cannot send nudge because authorId is missing",
        variant: "warning",
      });
      return;
    }
    setNudgingId(studio.authorId);
    nudgeMutation.mutate({
      authorId: studio.authorId,
      chapterId: studio.chapterId,
      studioName: studio.displayName || studio.authorName,
    });
  };

  const handleReview = (chapter) => {
    if (chapter.chapterId || chapter.id) {
      navigate(`/workspace/${chapter.chapterId ?? chapter.id}`);
    } else if (chapter.seriesId) {
      navigate(`/series/${chapter.seriesId}`);
    }
  };

  const handleProposalApprove = (series, goDetailOnly = false) => {
    if (goDetailOnly) {
      navigate(`/series/${series.id}`);
      return;
    }
    setProposalActionId(`approve-${series.id}`);
    tantouApproveMutation.mutate(series.id);
  };

  const handleProposalReject = (series) => {
    setProposalActionId(`reject-${series.id}`);
    tantouRejectMutation.mutate(series.id);
  };

  return (
    <div className="space-y-6">
      {/* ── New Block: Series Proposal Queue ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-primary" />
              <CardTitle>Series Proposal Queue</CardTitle>
            </div>
            <span className="rounded-full border border-outline-variant/40 bg-surface-container px-2 py-0.5 text-xs text-on-surface-variant">
              {proposalSeries.length} New
            </span>
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">
            New series concepts awaiting initial editorial review.
          </p>
        </CardHeader>
        <CardContent className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {proposalLoading && <PageLoading />}

          {!proposalLoading && proposalSeries.length === 0 && (
            <div className="py-8 text-center text-sm text-on-surface-variant">
              No pending series proposals.
            </div>
          )}

          {!proposalLoading &&
            proposalSeries.map((series) => (
              <SeriesProposalItem
                key={series.id}
                series={series}
                onApprove={handleProposalApprove}
                onReject={handleProposalReject}
                loadingAction={proposalActionId}
              />
            ))}
        </CardContent>
      </Card>

      {/* ── Stat Summary Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Assigned Series"
          value={tantouData?.assignedSeriesCount ?? stats?.assignedSeries ?? 0}
          icon={BookOpen}
        />
        <StatCard
          label="Chapters in Review"
          value={chaptersInReview.length}
          icon={FileSearch}
          tone={chaptersInReview.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Pending Comments"
          value={stats?.pendingComments ?? 0}
          icon={MessageSquare}
        />
      </div>

      {/* ── Main 2-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ══ LEFT COLUMN: Late Studios Alert ══ */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Siren size={16} className="text-status-danger" />
                <CardTitle>Late Studios Alert</CardTitle>
              </div>
              {lateStudios && lateStudios.length > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-status-danger/30 text-status-danger bg-status-danger/5">
                  Action Required
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Studios with &lt;50% progress and &lt;3 days to deadline
            </p>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto max-h-[520px] space-y-3 pr-1">
            {lateStudios.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <CheckCircle2
                  size={32}
                  className="text-status-success opacity-60"
                />
                <p className="text-sm text-on-surface-variant">
                  All studios are on schedule ✓
                </p>
              </div>
            )}

            {lateStudios.map((studio, index) => (
              <LateStudioItem
                key={`${studio.authorId || "author"}-${studio.chapterId || studio.id || index}`}
                studio={studio}
                onNudge={handleNudge}
                isNudging={nudgingId === studio.authorId}
              />
            ))}

            {tantouDataError && lateStudios.length === 0 && (
              <div className="mt-3 text-xs text-status-danger text-center">
                Failed to load chapter progress data.
              </div>
            )}
          </CardContent>
        </Card>

        {/* ══ RIGHT COLUMN: Manuscript Review Queue ══ */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSearch size={16} className="text-status-success" />
                <CardTitle>Manuscript Review Queue</CardTitle>
              </div>
              {chaptersInReview.length > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-status-success/30 text-status-success bg-status-success/5">
                  {chaptersInReview.length} Pending
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Complete chapters submitted by Mangaka awaiting editorial review
            </p>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto max-h-[520px] pr-1">
            {tantouDataError && chaptersInReview.length === 0 && (
              <div className="text-xs text-status-danger text-center py-8">
                Failed to load review queue. Please try again.
              </div>
            )}

            {!tantouDataError && chaptersInReview.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Clock size={32} className="text-outline-variant" />
                <p className="text-sm text-on-surface-variant">
                  No manuscripts pending review
                </p>
                <p className="text-xs text-on-surface-variant/60">
                  New submissions will appear here automatically
                </p>
              </div>
            )}

            {chaptersInReview.length > 0 && (
              <div>
                {chaptersInReview.map((chapter, index) => (
                  <ManuscriptQueueItem
                    key={chapter.id ?? chapter.chapterId ?? index}
                    chapter={chapter}
                    onReview={handleReview}
                  />
                ))}
              </div>
            )}

            {/* Optional hint only: fallback endpoint is unavailable */}
            {statsError && !statsLoading && (
              <div className="mt-4 p-3 rounded-lg border border-outline-variant/30 bg-surface-container-low">
                <p className="text-[10px] text-on-surface-variant/60 text-center leading-relaxed">
                  Optional fallback API is unavailable. Primary data is built
                  from series + chapter endpoints.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── BI Analytics Section ── */}
      <TantouBiCharts
        allChapters={tantouData?.allChapters ?? []}
        chaptersInReview={chaptersInReview}
        seriesStatusBreakdown={tantouData?.seriesStatusBreakdown ?? {}}
      />
    </div>
  );
}
