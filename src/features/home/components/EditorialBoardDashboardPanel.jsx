/**
 * EditorialBoardDashboardPanel — "La bàn thị hiếu"
 *
 * Layout: 2 columns (xl)
 *   LEFT  → Actionable Triggers
 *             · Decision Hub   (họp xét duyệt + bỏ phiếu series)
 *             · Axe List       (3-5 series chỉ số tệ nhất liên tục)
 *   RIGHT → Insightful Statistics
 *             · Reader Taste Radar (bảng xếp hạng với Double Tabs:
 *                 Thời gian: Tuần / Tháng  ×  Góc nhìn: Theo Series / Theo Thể loại)
 *
 * APIs used:
 *   · GET /api/meetings/user            → Decision Hub cards
 *   · GET /api/ranking/at-risk          → Axe List (primary source)
 *   · GET /api/series                   → enrich axe list + leaderboard
 *   · GET /api/ranking/monthly          → Reader Taste Radar — monthly view
 *   · GET /api/ranking/weekly           → Reader Taste Radar — weekly view
 *
 * ⚠️  Missing APIs (please request from backend):
 *   · GET /api/ranking/consecutive-decline?periods=3
 *       → Axe List: series with CONFIRMED 3-consecutive-period rank decline
 *         (current fallback: derive from at-risk + DOWN trend in monthly data)
 */

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Gavel,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  Calendar,
  PenLine,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EditorialBiCharts } from "./charts/EditorialBiCharts";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../../shared/components/ui/card";
import { Button } from "../../../shared/components/ui/button";
import { cn, formatDate } from "../../../shared/utils";
import { useAuthStore } from "../../../app/stores/authStore";
import { useUIStore } from "../../../app/stores/uiStore";
import meetingService from "../../../services/meetingService";
import rankingService from "../../../services/rankingService";
import seriesService from "../../../services/seriesService";
import { CreateMeetingModal } from "../../editorial/components/CreateMeetingModal";
import { ConfirmDecisionModal } from "../../editorial/components/ConfirmDecisionModal";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function toNumberId(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────
// Shared UI atoms
// ─────────────────────────────────────────────

function BlockHeader({
  icon: Icon,
  title,
  badge,
  iconClass = "text-primary",
  subtitle,
}) {
  return (
    <div className="mb-1">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          <Icon size={14} className={iconClass} />
          {title}
        </h3>
        {badge != null && (
          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
            {badge}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-[11px] text-on-surface-variant">{subtitle}</p>
      )}
    </div>
  );
}

function EmptySlot({ message }) {
  return (
    <div className="rounded-2xl border border-dashed border-outline-variant/30 px-4 py-8 text-center text-sm text-on-surface-variant">
      {message}
    </div>
  );
}

function SkeletonRows({ count = 3, height = "h-24" }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={cn(
            "animate-pulse rounded-2xl bg-surface-container-high/50",
            height,
          )}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Decision Hub — meeting cards
// ─────────────────────────────────────────────

function MeetingCard({ meeting }) {
  const navigate = useNavigate();
  const isPending = meeting.status === "PENDING";
  const isLive = meeting.status === "IN_PROGRESS";
  const pendingCount =
    meeting.voteSummary?.pendingCount ?? meeting.pendingVotes ?? 0;
  const scheduledAt =
    meeting.scheduledAt ?? meeting.startAt ?? meeting.createdAt;

  return (
    <div
      className={cn(
        "group rounded-2xl border p-5 transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-xl",
        isPending
          ? "border-accent-gold/30 bg-accent-gold/5 hover:border-accent-gold/60"
          : isLive
            ? "border-sky-400/30 bg-sky-500/5 hover:border-sky-400/60"
            : "border-outline-variant/25 bg-surface-container-low/50 hover:border-primary/20",
      )}
    >
      {/* Status badges */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            isPending
              ? "bg-accent-gold/15 text-accent-gold"
              : isLive
                ? "bg-sky-500/15 text-sky-300"
                : "bg-outline-variant/20 text-on-surface-variant",
          )}
        >
          {isPending ? "Vote Open" : isLive ? "Meeting Live" : "Completed"}
        </span>
        {isPending && pendingCount > 0 && (
          <span className="rounded-full bg-status-danger/15 px-2 py-0.5 text-[10px] font-bold text-status-danger">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Title */}
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-on-surface">
        {meeting.title}
      </p>

      {/* Time */}
      {scheduledAt && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-on-surface-variant">
          <Calendar size={11} />
          {formatDate(scheduledAt, { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}

      {/* CTA */}
      {(isPending || isLive) && (
        <div className="mt-4 flex justify-end">
          {isPending ? (
            <Button
              size="sm"
              className="h-8 px-4 text-xs font-bold"
              onClick={() => navigate(`/editorial/${meeting.id}/vote`)}
            >
              <PenLine size={13} className="mr-1.5" />
              Vote Now
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-sky-400/40 px-4 text-xs text-sky-300 hover:bg-sky-500/10"
              onClick={() => navigate("/editorial")}
            >
              Join Meeting
              <ChevronRight size={13} className="ml-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function DecisionHub({ meetings, isLoading }) {
  if (isLoading) return <SkeletonRows count={2} />;
  if (!meetings.length)
    return <EmptySlot message="No meetings scheduled. All clear." />;
  return (
    <div className="max-h-[480px] space-y-4 overflow-y-auto pr-1">
      {meetings.map((m) => (
        <MeetingCard key={m.id} meeting={m} />
      ))}
    </div>
  );
}

function ExecutiveQueueItem({ item, onCreateMeeting, onFinalizeDecision }) {
  return (
    <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-low/50 p-4 transition-all hover:border-primary/40 hover:bg-surface-container-high/20">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-high">
          {item.coverImageUrl ? (
            <img
              src={item.coverImageUrl}
              alt={item.seriesTitle}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-primary">
              {item.seriesTitle?.slice(0, 1)?.toUpperCase() || "S"}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-on-surface">
            {item.seriesTitle}
          </p>
          <p className="text-sm text-on-surface-variant">
            Tantou: {item.tantouName}
          </p>
        </div>

        {item.mode === "EB_PENDING" ? (
          <span className="rounded-lg bg-indigo-500/15 px-2 py-1 text-xs font-semibold text-indigo-300">
            EB Pending
          </span>
        ) : (
          <span className="rounded-lg bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">
            Voting Completed
          </span>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        {item.mode === "EB_PENDING" ? (
          <Button
            size="sm"
            className="bg-primary px-4 text-xs font-semibold text-on-primary hover:bg-primary/90"
            onClick={() => onCreateMeeting(item)}
          >
            Create Meeting
          </Button>
        ) : (
          <Button
            size="sm"
            className="bg-rose-200 px-4 text-xs font-semibold text-rose-900 hover:bg-rose-300"
            onClick={() => onFinalizeDecision(item)}
          >
            Final Decision
          </Button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Axe List widget
// ─────────────────────────────────────────────

function AxeRow({ series, rank }) {
  const navigate = useNavigate();
  return (
    <div
      className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-status-danger/20 bg-status-danger/5 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-status-danger/50 hover:bg-status-danger/10 hover:shadow-lg"
      onClick={() => navigate(`/series/${series.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/series/${series.id}`)}
    >
      {/* Cover thumbnail */}
      <div
        className="flex h-12 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 text-[8px] font-bold text-white"
        style={{ background: series.coverColor ?? "#7c3aed" }}
      >
        {series.coverImageUrl ? (
          <img
            src={series.coverImageUrl}
            alt={series.title}
            className="h-full w-full object-cover"
          />
        ) : (
          series.title
            ?.split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-on-surface">
          {series.title}
        </p>
        <p className="mt-0.5 text-xs text-on-surface-variant">
          {series.genre ?? series.genres?.[0] ?? "—"}
          {rank?.rank != null ? ` · Rank #${rank.rank}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <TrendingDown size={16} className="text-status-danger" />
        <ChevronRight
          size={14}
          className="text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>
    </div>
  );
}

function AxeList({ axeList, isLoading }) {
  if (isLoading) return <SkeletonRows count={3} height="h-16" />;
  if (!axeList.length)
    return <EmptySlot message="No series flagged for removal." />;
  return (
    <div className="space-y-3">
      {axeList.map(({ series, rank }) =>
        series ? <AxeRow key={series.id} series={series} rank={rank} /> : null,
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Root export
// ─────────────────────────────────────────────

export function EditorialBoardDashboardPanel() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [selectedSeriesForMeeting, setSelectedSeriesForMeeting] =
    useState(null);
  const [selectedDecisionItem, setSelectedDecisionItem] = useState(null);

  const isChiefEditor = user?.role === "CHIEF_EDITOR";

  const { data: rawMeetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ["dashboard", "meetings"],
    queryFn: async () => {
      const payload = await meetingService.getForUser();
      return toArray(payload);
    },
    staleTime: 30_000,
  });

  const { data: atRiskData = [], isLoading: atRiskLoading } = useQuery({
    queryKey: ["dashboard", "at-risk"],
    queryFn: async () => {
      const payload = await rankingService.getAtRisk();
      return toArray(payload);
    },
    staleTime: 120_000,
  });

  const { data: allSeries = [] } = useQuery({
    queryKey: ["dashboard", "editorial", "series"],
    queryFn: async () => {
      const payload = await seriesService.getAll({ page: 0, size: 100 });
      return toArray(payload);
    },
    staleTime: 60_000,
  });

  const { data: monthlyRanks = [] } = useQuery({
    queryKey: ["dashboard", "rankings", "monthly", currentMonthStr()],
    queryFn: async () => {
      const payload = await rankingService.getMonthly(currentMonthStr());
      return toArray(payload);
    },
    staleTime: 120_000,
  });

  // Sort meetings: pending first, then live, then completed
  const sortedMeetings = useMemo(() => {
    const order = { PENDING: 0, IN_PROGRESS: 1, COMPLETED: 2 };
    return [...rawMeetings].sort(
      (a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3),
    );
  }, [rawMeetings]);

  const activeMeetingCount = sortedMeetings.filter(
    (m) => m.status !== "COMPLETED",
  ).length;

  const finalizeDecisionMutation = useMutation({
    mutationFn: ({ meetingId, decision }) =>
      meetingService.makeDecision(meetingId, { decision }),
    onSuccess: () => {
      addToast({
        title: "Final decision submitted",
        description: "Series decision has been updated successfully.",
        variant: "success",
      });
      setSelectedDecisionItem(null);
      queryClient.invalidateQueries({ queryKey: ["dashboard", "meetings"] });
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "editorial", "series"],
      });
    },
    onError: () => {
      addToast({
        title: "Failed to submit decision",
        description: "Please try again.",
        variant: "error",
      });
    },
  });

  const executiveQueue = useMemo(() => {
    const completedBySeries = new Map();
    sortedMeetings
      .filter((meeting) => meeting.status === "COMPLETED" && !meeting.decision)
      .forEach((meeting) => {
        const sid = toNumberId(meeting.seriesId);
        if (sid != null) completedBySeries.set(sid, meeting);
      });

    const hasMeetingSeries = new Set(
      sortedMeetings
        .filter((meeting) => !meeting.decision)
        .map((meeting) => toNumberId(meeting.seriesId))
        .filter((v) => v != null),
    );

    const ebPending = allSeries
      .filter((series) => series.status === "PENDING_BOARD_VOTE")
      .filter((series) => !hasMeetingSeries.has(series.id))
      .map((series) => ({
        mode: "EB_PENDING",
        seriesId: series.id,
        seriesTitle: series.title,
        coverImageUrl: series.coverImageUrl,
        tantouName:
          series?.tantouEditor?.displayName ||
          series?.tantouEditor?.username ||
          "Unassigned Tantou",
      }));

    const votingCompleted = Array.from(completedBySeries.entries()).map(
      ([seriesId, meeting]) => {
        const series = allSeries.find((s) => s.id === seriesId);
        return {
          mode: "VOTING_COMPLETED",
          seriesId,
          seriesTitle:
            meeting.seriesTitle || series?.title || `Series #${seriesId}`,
          coverImageUrl: series?.coverImageUrl,
          tantouName:
            series?.tantouEditor?.displayName ||
            series?.tantouEditor?.username ||
            "Unknown Tantou",
          meeting,
        };
      },
    );

    return [...ebPending, ...votingCompleted];
  }, [allSeries, sortedMeetings]);

  const handleCreateMeeting = (item) => {
    setSelectedSeriesForMeeting(item.seriesId);
    setShowCreateMeeting(true);
  };

  const handleFinalizeDecision = (item) => {
    setSelectedDecisionItem(item);
  };

  const decisionSummary = useMemo(() => {
    if (!selectedDecisionItem?.meeting) return { yes: 0, no: 0, approval: 0 };
    const vs = selectedDecisionItem.meeting.voteSummary || {};
    const yes = vs.yesCount ?? 0;
    const no = vs.noCount ?? 0;
    const total = vs.totalVotes || yes + no;
    const approval = total > 0 ? Math.round((yes / total) * 100) : 0;
    return { yes, no, approval };
  }, [selectedDecisionItem]);

  // Build axe list: prefer dedicated at-risk API, fallback to DOWN trend
  const axeList = useMemo(() => {
    if (atRiskData.length > 0) {
      return atRiskData.slice(0, 5).map((item) => {
        const sid =
          toNumberId(item.seriesId) ??
          toNumberId(item.series?.id) ??
          toNumberId(item.id);
        const series =
          allSeries.find((s) => s.id === sid) ?? item.series ?? item;
        const rank = monthlyRanks.find(
          (r) => (toNumberId(r.seriesId) || toNumberId(r.series?.id)) === sid,
        );
        return { series, rank };
      });
    }
    // ⚠️ Fallback: derive from monthly rankings — requests consecutive-decline API from backend
    return monthlyRanks
      .filter((r) => r.trend === "DOWN")
      .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
      .slice(0, 5)
      .map((r) => {
        const sid = toNumberId(r.seriesId) || toNumberId(r.series?.id);
        const series = allSeries.find((s) => s.id === sid) ?? r.series;
        return { series: series ?? { id: sid, title: "Unknown" }, rank: r };
      })
      .filter((item) => item.series?.title !== "Unknown");
  }, [atRiskData, allSeries, monthlyRanks]);

  return (
    <>
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">
            Editorial Board
          </p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight text-on-surface">
            Board Command Center
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Voting decisions, axe list, and reader taste intelligence.
          </p>
        </div>

        {/* ── BI Analytics Section ── */}
        <EditorialBiCharts
          meetings={sortedMeetings}
          allSeries={allSeries}
          isChiefEditor={isChiefEditor}
        />

        <div className="space-y-8">
            {isChiefEditor && (
              <Card className="border-primary/25 bg-surface-container-low/40">
                <CardHeader className="border-b border-outline-variant/20 pb-5">
                  <BlockHeader
                    icon={Gavel}
                    title="Executive Decision Queue"
                    badge={`${executiveQueue.length} Actions Required`}
                    iconClass="text-primary"
                    subtitle="Series in board approval workflow requiring Chief Editor action"
                  />
                </CardHeader>
                <CardContent className="pb-6 pt-5">
                  {executiveQueue.length === 0 ? (
                    <EmptySlot message="No executive actions required right now." />
                  ) : (
                    <div className="space-y-3">
                      {executiveQueue.map((item) => (
                        <ExecutiveQueueItem
                          key={`${item.mode}-${item.seriesId}`}
                          item={item}
                          onCreateMeeting={handleCreateMeeting}
                          onFinalizeDecision={handleFinalizeDecision}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Decision Hub */}
            <Card className="border-outline-variant/30 bg-surface-container-low/40">
              <CardHeader className="border-b border-outline-variant/20 pb-5">
                <BlockHeader
                  icon={Gavel}
                  title="Decision Hub"
                  badge={activeMeetingCount}
                  iconClass="text-accent-gold"
                  subtitle="Pending votes and active board meetings requiring action"
                />
              </CardHeader>
              <CardContent className="pb-6 pt-5">
                <DecisionHub
                  meetings={sortedMeetings.filter(
                    (m) => m.status !== "COMPLETED",
                  )}
                  isLoading={meetingsLoading}
                />
              </CardContent>
            </Card>

            {/* Axe List */}
            <Card className="border-status-danger/20 bg-status-danger/5">
              <CardHeader className="border-b border-status-danger/15 pb-5">
                <BlockHeader
                  icon={AlertTriangle}
                  title="Axe List"
                  badge={axeList.length}
                  iconClass="text-status-danger"
                  subtitle="Series with continuously declining metrics — board decision required"
                />
              </CardHeader>
              <CardContent className="pb-6 pt-5">
                <AxeList axeList={axeList} isLoading={atRiskLoading} />
              </CardContent>
            </Card>
          </div>

        </div>
      {isChiefEditor && showCreateMeeting && (
        <CreateMeetingModal
          preselectedSeriesId={selectedSeriesForMeeting}
          onClose={() => {
            setShowCreateMeeting(false);
            setSelectedSeriesForMeeting(null);
            queryClient.invalidateQueries({
              queryKey: ["dashboard", "meetings"],
            });
            queryClient.invalidateQueries({
              queryKey: ["dashboard", "editorial", "series"],
            });
          }}
        />
      )}
      {isChiefEditor && selectedDecisionItem?.meeting && (
        <ConfirmDecisionModal
          meeting={selectedDecisionItem.meeting}
          seriesTitle={selectedDecisionItem.seriesTitle}
          summary={decisionSummary}
          onClose={() => setSelectedDecisionItem(null)}
          onConfirm={async (decision) => {
            await finalizeDecisionMutation.mutateAsync({
              meetingId: selectedDecisionItem.meeting.id,
              decision,
            });
          }}
        />
      )}
    </>
  );
}

export default EditorialBoardDashboardPanel;
