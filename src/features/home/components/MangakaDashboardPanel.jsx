import { useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CircleAlert,
  Clock3,
  Sparkles,
  Users,
} from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../../app/stores/authStore";
import { Select } from "../../../shared/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../shared/components/ui/card";
import { cn, formatDate } from "../../../shared/utils";
import seriesService from "../../../services/seriesService";
import chapterService from "../../../services/chapterService";
import taskService from "../../../services/taskService";
import rankingService from "../../../services/rankingService";
import {
  ACTIVE_SERIES_STATUSES,
  resolveSeriesOwnerId,
} from "../dashboardMappings";

const SERIES_COLORS = ["#a855f7", "#fbbf24", "#22d3ee", "#f97316"];
const PERIODS = Array.from({ length: 12 }, (_, index) => `Issue ${42 + index}`);

function toNumberId(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function resolveRankingSeriesId(rank) {
  return toNumberId(rank?.seriesId) || toNumberId(rank?.series?.id) || null;
}

function mapArrayResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

function daysLeft(deadline) {
  if (!deadline) return Number.POSITIVE_INFINITY;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(deadline);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - start.getTime()) / 86400000);
}

function formatDays(deadline) {
  const diff = daysLeft(deadline);
  if (!Number.isFinite(diff)) return "No deadline";
  if (diff < 0)
    return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} overdue`;
  if (diff === 0) return "Due today";
  return `${diff} day${diff === 1 ? "" : "s"}`;
}

function getSeriesLabel(index) {
  return index === 0
    ? "Series A"
    : index === 1
      ? "Series B"
      : `Series ${index + 1}`;
}

function buildFallbackTrend(rank, seriesLabel) {
  const safeRank = Math.max(1, Number(rank) || 20);
  return PERIODS.map((period, index) => {
    const wave = Math.sin((index + 1) / 1.8) * 2.4;
    return {
      period,
      [seriesLabel]: Math.max(
        1,
        Math.round(safeRank + wave + (index - 6) * 0.25),
      ),
    };
  });
}

function MetricCard({ title, value, subtitle, icon: Icon, tone = "default" }) {
  return (
    <Card className="border-outline-variant/30 bg-gradient-to-br from-surface-container to-surface-container-low/70">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">
              {title}
            </p>
            <p
              className={cn(
                "mt-2 text-3xl font-semibold tabular-nums",
                tone === "warning"
                  ? "text-accent-gold"
                  : tone === "danger"
                    ? "text-status-danger"
                    : "text-on-surface",
              )}
            >
              {value}
            </p>
            {subtitle && (
              <p className="mt-1 text-xs text-on-surface-variant">{subtitle}</p>
            )}
          </div>
          <div
            className={cn(
              "rounded-2xl border p-3",
              tone === "warning"
                ? "border-accent-gold/20 bg-accent-gold/10 text-accent-gold"
                : tone === "danger"
                  ? "border-status-danger/20 bg-status-danger/10 text-status-danger"
                  : "border-primary/20 bg-primary/10 text-primary",
            )}
          >
            <Icon size={20} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MangakaDashboardPanel() {
  const user = useAuthStore((state) => state.user);
  const [selectedSeries, setSelectedSeries] = useState("ALL");

  const { data: allSeries = [] } = useQuery({
    queryKey: ["dashboard", "series", "all"],
    queryFn: async () => {
      const payload = await seriesService.getAll({ page: 0, size: 100 });
      return mapArrayResponse(payload);
    },
    staleTime: 30_000,
  });

  const userSeries = useMemo(() => {
    const userId = toNumberId(user?.id);
    if (!userId) return [];

    return allSeries
      .filter((series) => resolveSeriesOwnerId(series) === userId)
      .sort((left, right) => (left.id || 0) - (right.id || 0));
  }, [allSeries, user?.id]);

  const seriesOptions = useMemo(() => {
    const mapped = userSeries.slice(0, 3).map((series, index) => ({
      value: String(series.id),
      label: `${getSeriesLabel(index)} · ${series.title}`,
    }));
    return [{ value: "ALL", label: "All Series" }, ...mapped];
  }, [userSeries]);

  const filteredSeries = useMemo(() => {
    if (selectedSeries === "ALL") return userSeries.slice(0, 3);
    return userSeries.filter((series) => String(series.id) === selectedSeries);
  }, [selectedSeries, userSeries]);

  const seriesIdsKey = filteredSeries.map((series) => series.id).join(",");

  const { data: chapterRows = [] } = useQuery({
    queryKey: ["dashboard", "chapters", seriesIdsKey],
    enabled: filteredSeries.length > 0,
    queryFn: async () => {
      const groups = await Promise.all(
        filteredSeries.map(async (series) => {
          try {
            const payload = await chapterService.getBySeries(series.id);
            return mapArrayResponse(payload).map((chapter) => ({
              ...chapter,
              seriesId: series.id,
              seriesTitle: series.title,
            }));
          } catch {
            return [];
          }
        }),
      );
      return groups.flat();
    },
    staleTime: 20_000,
  });

  const { data: taskRows = [] } = useQuery({
    queryKey: ["dashboard", "tasks", seriesIdsKey],
    enabled: filteredSeries.length > 0,
    queryFn: async () => {
      const grouped = await Promise.all(
        filteredSeries.map(async (series) => {
          try {
            const payload = await taskService.getAll({
              seriesId: series.id,
              page: 0,
              size: 100,
            });
            return mapArrayResponse(payload);
          } catch {
            return [];
          }
        }),
      );

      const merged = grouped.flat();
      const uniqueById = new Map();
      merged.forEach((task) => {
        if (task?.id != null) uniqueById.set(task.id, task);
      });

      return Array.from(uniqueById.values());
    },
    staleTime: 20_000,
  });

  const { data: monthlyRanks = [] } = useQuery({
    queryKey: ["dashboard", "rankings", "monthly"],
    queryFn: async () => {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const payload = await rankingService.getMonthly(month);
      return mapArrayResponse(payload);
    },
    staleTime: 60_000,
  });

  const activeSeriesCount = filteredSeries.filter((series) =>
    ACTIVE_SERIES_STATUSES.has(series.status),
  ).length;

  const activeChapters = useMemo(() => {
    return chapterRows
      .filter((chapter) => (chapter.progressPercent || 0) < 100)
      .sort(
        (left, right) => daysLeft(left.deadline) - daysLeft(right.deadline),
      );
  }, [chapterRows]);

  const pendingTasks = useMemo(() => {
    const visibleSeriesIds = new Set(filteredSeries.map((series) => series.id));
    return taskRows
      .map((task) => {
        const chapterId = task.chapterId || task.chapter?.id || null;
        const chapter = chapterRows.find((item) => item.id === chapterId);
        return {
          ...task,
          chapter,
          seriesId:
            task.seriesId ||
            task.series?.id ||
            task.chapter?.seriesId ||
            chapter?.seriesId ||
            null,
        };
      })
      .filter(
        (task) =>
          visibleSeriesIds.has(task.seriesId) &&
          ["TODO", "IN_PROGRESS"].includes(task.status),
      );
  }, [chapterRows, filteredSeries, taskRows]);

  const nextDeadline = activeChapters[0];
  const latestChapter = activeChapters[0] || chapterRows[0] || null;

  const chartLines = useMemo(() => {
    return filteredSeries.map((series, index) => {
      const rank = monthlyRanks.find(
        (item) => resolveRankingSeriesId(item) === series.id,
      );
      const label = getSeriesLabel(index);
      return {
        label,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
        points: buildFallbackTrend(rank?.rank || 20, label),
      };
    });
  }, [filteredSeries, monthlyRanks]);

  const chartData = useMemo(() => {
    if (chartLines.length === 0) return [];
    return PERIODS.map((period, index) => {
      const row = { period };
      chartLines.forEach((line) => {
        row[line.label] = line.points[index]?.[line.label] || null;
      });
      return row;
    });
  }, [chartLines]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">
            Mangaka Dashboard
          </p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight text-on-surface">
            Production War Room
          </h2>
        </div>
        <div className="w-full lg:w-[300px]">
          <Select
            value={selectedSeries}
            onChange={(event) => setSelectedSeries(event.target.value)}
            options={seriesOptions}
            className="rounded-xl border-outline-variant/30 bg-surface-container text-on-surface"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Active Series"
          value={activeSeriesCount}
          subtitle="Running series in current scope"
          icon={BookOpen}
        />
        <MetricCard
          title="Pending Assistant Tasks"
          value={pendingTasks.length}
          subtitle="Waiting for mangaka review"
          icon={Users}
          tone={pendingTasks.length > 0 ? "warning" : "default"}
        />
        <MetricCard
          title="Days To Next Deadline"
          value={
            nextDeadline ? formatDays(nextDeadline.deadline) : "No deadline"
          }
          subtitle={
            nextDeadline
              ? `${nextDeadline.seriesTitle} · Ch.${nextDeadline.chapterNumber}`
              : "No active chapter"
          }
          icon={Clock3}
          tone={nextDeadline ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="border-outline-variant/30">
          <CardHeader className="border-b border-outline-variant/20 bg-surface-container-low/40">
            <CardTitle className="flex items-center gap-2 text-xl">
              <BarChart3 size={18} className="text-primary" /> Ranking Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[340px] p-4 md:p-6">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-outline-variant/30 text-sm text-on-surface-variant">
                No ranking data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 12, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: "#a8a29e", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    reversed
                    tick={{ fill: "#a8a29e", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[1, 60]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1e1e32",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 12,
                    }}
                  />
                  <Legend />
                  {chartLines.map((line) => (
                    <Line
                      key={line.label}
                      dataKey={line.label}
                      name={line.label}
                      type="monotone"
                      stroke={line.color}
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-outline-variant/30">
          <CardHeader className="border-b border-outline-variant/20 bg-surface-container-low/40">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CircleAlert size={18} className="text-accent-gold" /> Days To
              Next Deadline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 md:p-6">
            {activeChapters.slice(0, 5).map((chapter) => (
              <div
                key={`${chapter.seriesId}-${chapter.id}`}
                className="rounded-2xl border border-outline-variant/20 bg-surface-container-low/50 p-4"
              >
                <p className="text-sm font-medium text-on-surface">
                  {chapter.seriesTitle}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Ch.{chapter.chapterNumber} · {chapter.title}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-accent-gold font-semibold">
                    {formatDays(chapter.deadline)}
                  </span>
                  <span className="text-on-surface-variant">
                    {chapter.deadline ? formatDate(chapter.deadline) : "-"}
                  </span>
                </div>
              </div>
            ))}
            {activeChapters.length === 0 && (
              <div className="rounded-2xl border border-dashed border-outline-variant/30 p-6 text-center text-sm text-on-surface-variant">
                No chapter deadline data.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-outline-variant/30">
          <CardHeader className="border-b border-outline-variant/20 bg-surface-container-low/40">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles size={18} className="text-primary" /> Active Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {selectedSeries === "ALL" ? (
              <div className="space-y-4">
                {activeChapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className="space-y-2 rounded-2xl border border-outline-variant/20 bg-surface-container-low/50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-on-surface">
                          {chapter.seriesTitle}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          Ch.{chapter.chapterNumber} · {chapter.title}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-primary">
                        {chapter.progressPercent || 0}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent-pink"
                        style={{ width: `${chapter.progressPercent || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
                {activeChapters.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-outline-variant/30 p-6 text-center text-sm text-on-surface-variant">
                    No chapter progress data.
                  </div>
                )}
              </div>
            ) : latestChapter ? (
              <div className="grid gap-6 lg:grid-cols-[220px_1fr] items-center">
                <div className="relative">
                  <ResponsiveContainer width={220} height={220}>
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: "Done",
                            value: latestChapter.progressPercent || 0,
                          },
                          {
                            name: "Left",
                            value: Math.max(
                              0,
                              100 - (latestChapter.progressPercent || 0),
                            ),
                          },
                        ]}
                        dataKey="value"
                        innerRadius={72}
                        outerRadius={98}
                        startAngle={90}
                        endAngle={-270}
                        stroke="none"
                      >
                        <Cell fill="#7c3aed" />
                        <Cell fill="#334155" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-4xl font-semibold text-on-surface">
                      {latestChapter.progressPercent || 0}%
                    </p>
                    <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                      Complete
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                    Latest chapter
                  </p>
                  <p className="mt-1 text-lg font-semibold text-on-surface">
                    Ch.{latestChapter.chapterNumber} · {latestChapter.title}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-outline-variant/30 p-6 text-center text-sm text-on-surface-variant">
                No chapter data for selected series.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-outline-variant/30">
          <CardHeader className="border-b border-outline-variant/20 bg-surface-container-low/40">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users size={18} className="text-primary" /> Approval Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 md:p-6 max-h-[420px] overflow-y-auto">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-2xl border border-outline-variant/20 bg-surface-container-low/50 p-4"
              >
                <p className="text-sm font-medium text-on-surface">
                  {task.title || "Assistant Submission"}
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  {task.chapter
                    ? `Ch.${task.chapter.chapterNumber}`
                    : "Unknown chapter"}{" "}
                  · {task.regionType || "Task"}
                </p>
                <p className="mt-2 text-xs font-semibold text-accent-gold">
                  {formatDays(task.dueDate)}
                </p>
              </div>
            ))}
            {pendingTasks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-outline-variant/30 p-6 text-center text-sm text-on-surface-variant">
                No pending approvals.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default MangakaDashboardPanel;
