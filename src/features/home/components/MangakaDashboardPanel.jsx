/**
 * MangakaDashboardPanel — "Trợ lý ảo đôn đốc tiến độ"
 *
 * Layout: 2 columns (xl)
 *   LEFT  → Actionable Triggers
 *             · Urgent Deadlines  (chapters sắp đến ngày nộp)
 *             · Approval Queue    (tasks assistant vừa nộp, chờ duyệt)
 *   RIGHT → Insightful Statistics
 *             · Survival Radar    (thứ hạng series + cảnh báo AT_RISK)
 *
 * APIs used:
 *   · GET /api/v1/dashboard/stats          → upcomingDeadlines, currentRank, rankTrend
 *   · GET /api/tasks?status=IN_PROGRESS    → approval queue (tasks mangaka assigned)
 *   · GET /api/series                      → my series list for Survival Radar
 *   · GET /api/ranking/monthly             → rank per series
 *
 * ⚠️  Missing APIs (please request from backend):
 *   · GET /api/v1/series/{id}/reader-feedback
 *       → Notable reader comments/feedback for Survival Radar feedback highlight box
 *   · GET /api/tasks?hasSubmission=SUBMITTED
 *       → Filter tasks that specifically have a pending submission (vs generic IN_PROGRESS)
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  CheckSquare,
  ExternalLink,
  TrendingDown,
  TrendingUp,
  Minus,
  Siren,
  MessageSquare,
  LayoutGrid,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../../app/stores/authStore";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../../shared/components/ui/card";
import { Button } from "../../../shared/components/ui/button";
import { cn, formatDate } from "../../../shared/utils";
import dashboardService from "../../../services/dashboardService";
import taskService from "../../../services/taskService";
import seriesService from "../../../services/seriesService";
import rankingService from "../../../services/rankingService";
import { resolveSeriesOwnerId } from "../dashboardMappings";
import { MangakaBiCharts } from "./charts/MangakaBiCharts";

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

function daysLeftFromDeadline(deadline) {
  if (!deadline) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(deadline);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end - now) / 86_400_000);
}

function formatDaysLeft(days) {
  if (days == null) return "No deadline";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  return `${days} day${days === 1 ? "" : "s"} left`;
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

function SkeletonRows({ count = 3, height = "h-20" }) {
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
// Urgent Deadlines block
// ─────────────────────────────────────────────

function DeadlineRow({ item }) {
  const navigate = useNavigate();
  const days = item.daysLeft ?? daysLeftFromDeadline(item.deadline);
  const isOverdue = days != null && days < 0;
  const isUrgent = days != null && days >= 0 && days < 3;

  return (
    <div
      className={cn(
        "group rounded-2xl border p-4 transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lg",
        isOverdue
          ? "border-status-danger/40 bg-status-danger/5 hover:border-status-danger/70"
          : isUrgent
            ? "border-orange-500/35 bg-orange-500/5 hover:border-orange-400/60"
            : "border-outline-variant/25 bg-surface-container-low/50 hover:border-primary/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-on-surface">
            {item.seriesTitle || "Series"}
          </p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            {item.chapterNumber != null ? `Ch.${item.chapterNumber} · ` : ""}
            {item.title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
                isOverdue
                  ? "bg-status-danger/20 text-status-danger"
                  : isUrgent
                    ? "bg-orange-500/20 text-orange-400"
                    : "bg-accent-gold/15 text-accent-gold",
              )}
            >
              <Clock size={10} />
              {formatDaysLeft(days)}
            </span>
            {item.deadline && (
              <span className="text-[11px] text-on-surface-variant">
                {formatDate(item.deadline)}
              </span>
            )}
          </div>
        </div>

        <Button
          size="sm"
          className={cn(
            "h-8 shrink-0 px-3 text-xs font-semibold transition-all",
            "translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
            isUrgent || isOverdue
              ? "bg-status-danger text-white hover:bg-status-danger/90"
              : "bg-primary text-on-primary hover:bg-primary/90",
          )}
          onClick={() =>
            navigate(
              item.chapterId ? `/workspace/${item.chapterId}` : "/series",
            )
          }
        >
          <ExternalLink size={12} className="mr-1.5" />
          Go to Workspace
        </Button>
      </div>
    </div>
  );
}

function UrgentDeadlines({ deadlines, isLoading }) {
  if (isLoading) return <SkeletonRows count={3} />;
  if (!deadlines.length)
    return <EmptySlot message="No upcoming chapter deadlines. Great work!" />;
  return (
    <div className="space-y-3">
      {deadlines.slice(0, 6).map((item) => (
        <DeadlineRow key={item.chapterId ?? item.id} item={item} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Approval Queue block
// ─────────────────────────────────────────────

function TaskRow({ task }) {
  const navigate = useNavigate();
  const assistantName =
    task.assignedTo?.name ??
    task.assistant?.name ??
    task.assignedToName ??
    "Assistant";
  const regionLabel = task.regionType
    ? task.regionType.charAt(0) + task.regionType.slice(1).toLowerCase()
    : "Task";

  return (
    <div className="group rounded-2xl border border-outline-variant/25 bg-surface-container-low/50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-on-surface">
            {task.title || `Task #${task.id}`}
          </p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            <span className="font-medium text-primary">{assistantName}</span>
            {" · "}
            {regionLabel}
            {task.pageNumber != null ? ` · Page ${task.pageNumber}` : ""}
          </p>
          {task.dueDate && (
            <p className="mt-1.5 text-[11px] text-on-surface-variant">
              Due: {formatDate(task.dueDate)}
            </p>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          className={cn(
            "h-8 shrink-0 border-primary/30 px-3 text-xs font-semibold text-primary transition-all",
            "translate-x-1 opacity-0 hover:bg-primary/10 group-hover:translate-x-0 group-hover:opacity-100",
          )}
          onClick={() => navigate("/tasks")}
        >
          <CheckSquare size={12} className="mr-1.5" />
          Review
        </Button>
      </div>
    </div>
  );
}

function ApprovalQueue({ tasks, isLoading }) {
  if (isLoading) return <SkeletonRows count={3} />;
  if (!tasks.length)
    return (
      <EmptySlot message="No pending submissions. All tasks are up to date." />
    );
  return (
    <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
      {tasks.slice(0, 8).map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Survival Radar block
// ─────────────────────────────────────────────

function SeriesRadarCard({ series, rank }) {
  const navigate = useNavigate();
  const currentRank = rank?.rank ?? null;
  const trend = rank?.trend ?? null;
  const isAtRisk =
    series.status === "AT_RISK" || (currentRank != null && currentRank > 40);

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 transition-all duration-200",
        "cursor-pointer hover:-translate-y-0.5 hover:shadow-xl",
        isAtRisk
          ? "border-status-danger/30 bg-status-danger/5 hover:border-status-danger/50"
          : "border-outline-variant/25 bg-surface-container-low/50 hover:border-primary/25",
      )}
      onClick={() => navigate(`/series/${series.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/series/${series.id}`)}
    >
      {/* At-risk warning banner */}
      {isAtRisk && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-status-danger/15 px-3 py-2.5">
          <Siren size={14} className="mt-0.5 shrink-0 text-status-danger" />
          <p className="text-xs font-bold leading-snug text-status-danger">
            [CẢNH BÁO]: Series có nguy cơ bị huỷ.{" "}
            <span className="font-normal text-status-danger/80">
              Click để xem feedback chi tiết từ Tantou.
            </span>
          </p>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        {/* Series info */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight text-on-surface">
            {series.title}
          </p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            {series.genre ?? series.genres?.[0] ?? "—"}
          </p>
          <span
            className={cn(
              "mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              series.status === "ONGOING"
                ? "bg-status-success/15 text-status-success"
                : series.status === "AT_RISK"
                  ? "bg-status-danger/15 text-status-danger"
                  : series.status === "HIATUS"
                    ? "bg-accent-gold/15 text-accent-gold"
                    : "bg-outline-variant/20 text-on-surface-variant",
            )}
          >
            {series.status}
          </span>
        </div>

        {/* Rank display */}
        <div className="shrink-0 text-right">
          {currentRank != null ? (
            <>
              <p
                className={cn(
                  "text-3xl font-bold tabular-nums leading-none",
                  isAtRisk ? "text-status-danger" : "text-accent-gold",
                )}
              >
                #{currentRank}
              </p>
              <div className="mt-1.5 flex items-center justify-end gap-1 text-xs">
                {trend === "UP" ? (
                  <TrendingUp size={12} className="text-status-success" />
                ) : trend === "DOWN" ? (
                  <TrendingDown size={12} className="text-status-danger" />
                ) : (
                  <Minus size={12} className="text-on-surface-variant" />
                )}
                <span
                  className={cn(
                    "font-semibold",
                    trend === "UP"
                      ? "text-status-success"
                      : trend === "DOWN"
                        ? "text-status-danger"
                        : "text-on-surface-variant",
                  )}
                >
                  {trend ?? "FLAT"}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm italic text-on-surface-variant">Not ranked</p>
          )}
        </div>
      </div>

      {/* Reader feedback placeholder */}
      <div className="mt-4 rounded-xl border border-outline-variant/20 bg-surface-container/60 px-3 py-2.5">
        <p className="flex items-start gap-1.5 text-[11px] italic text-on-surface-variant">
          <MessageSquare
            size={11}
            className="mt-0.5 shrink-0 text-on-surface-variant/60"
          />
          {/* ⚠️ MISSING API: GET /api/v1/series/{id}/reader-feedback */}
          Reader feedback highlights — backend endpoint pending.
        </p>
      </div>
    </div>
  );
}

function SurvivalRadar({ mySeries, rankings, isLoading }) {
  if (isLoading) return <SkeletonRows count={2} height="h-44" />;
  if (!mySeries.length)
    return <EmptySlot message="No series found under your account." />;
  return (
    <div className="space-y-4">
      {mySeries.map((series) => {
        const rank = rankings.find(
          (r) =>
            (toNumberId(r.seriesId) || toNumberId(r.series?.id)) === series.id,
        );
        return <SeriesRadarCard key={series.id} series={series} rank={rank} />;
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Root export
// ─────────────────────────────────────────────

export function MangakaDashboardPanel() {
  const user = useAuthStore((s) => s.user);
  const userId = toNumberId(user?.id);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => dashboardService.getStats(),
    staleTime: 60_000,
    enabled: !!user,
  });

  const { data: taskPage, isLoading: tasksLoading } = useQuery({
    queryKey: ["dashboard", "approval-queue"],
    queryFn: () =>
      taskService.getAll({ status: "IN_PROGRESS", page: 0, size: 10 }),
    staleTime: 30_000,
    enabled: !!user,
  });

  const { data: rawSeries = [] } = useQuery({
    queryKey: ["dashboard", "series", "all"],
    queryFn: async () => {
      const payload = await seriesService.getAll({ page: 0, size: 100 });
      return toArray(payload);
    },
    staleTime: 60_000,
    enabled: !!userId,
  });

  const { data: monthlyRanks = [] } = useQuery({
    queryKey: ["dashboard", "rankings", "monthly", currentMonthStr()],
    queryFn: async () => {
      const payload = await rankingService.getMonthly(currentMonthStr());
      return toArray(payload);
    },
    staleTime: 120_000,
    enabled: !!user,
  });

  const mySeries = useMemo(
    () => rawSeries.filter((s) => resolveSeriesOwnerId(s) === userId),
    [rawSeries, userId],
  );

  const deadlines = useMemo(() => {
    const list = Array.isArray(stats?.upcomingDeadlines)
      ? stats.upcomingDeadlines
      : [];
    return [...list].sort((a, b) => {
      const da = a.daysLeft ?? daysLeftFromDeadline(a.deadline) ?? 999;
      const db = b.daysLeft ?? daysLeftFromDeadline(b.deadline) ?? 999;
      return da - db;
    });
  }, [stats]);

  const approvalTasks = useMemo(() => toArray(taskPage), [taskPage]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">
          Mangaka Dashboard
        </p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-on-surface">
          Production Command
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          {statsLoading
            ? "Loading…"
            : `${mySeries.length} series active · ${deadlines.length} upcoming deadline${deadlines.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {/* 2-column grid */}
      <div className="grid gap-8 xl:grid-cols-2">
        {/* LEFT — Actionable Triggers */}
        <div className="space-y-8">
          <Card className="border-outline-variant/30 bg-surface-container-low/40">
            <CardHeader className="border-b border-outline-variant/20 pb-5">
              <BlockHeader
                icon={Clock}
                title="Urgent Deadlines"
                badge={deadlines.length}
                iconClass="text-status-danger"
                subtitle="Chapters approaching their print submission date"
              />
            </CardHeader>
            <CardContent className="pb-6 pt-5">
              <UrgentDeadlines deadlines={deadlines} isLoading={statsLoading} />
            </CardContent>
          </Card>

          <Card className="border-outline-variant/30 bg-surface-container-low/40">
            <CardHeader className="border-b border-outline-variant/20 pb-5">
              <BlockHeader
                icon={CheckSquare}
                title="Approval Queue"
                badge={approvalTasks.length}
                iconClass="text-accent-gold"
                subtitle="Artwork submitted by your assistants, awaiting your review"
              />
            </CardHeader>
            <CardContent className="pb-6 pt-5">
              <ApprovalQueue tasks={approvalTasks} isLoading={tasksLoading} />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — Survival Radar */}
        <Card className="border-outline-variant/30 bg-surface-container-low/40">
          <CardHeader className="border-b border-outline-variant/20 pb-5">
            <BlockHeader
              icon={LayoutGrid}
              title="Survival Radar"
              iconClass="text-accent-pink"
              subtitle="Latest rankings + at-risk signals for your active series"
            />
          </CardHeader>
          <CardContent className="pb-6 pt-5">
            <SurvivalRadar
              mySeries={mySeries}
              rankings={monthlyRanks}
              isLoading={!mySeries.length && statsLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── BI Analytics Section ── */}
      <MangakaBiCharts mySeries={mySeries} userId={userId} />
    </div>
  );
}

export default MangakaDashboardPanel;
