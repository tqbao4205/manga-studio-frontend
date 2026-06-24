import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Clock3,
  Newspaper,
  PlayCircle,
  Vote,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Select } from "../../../shared/components/ui/select";
import { Tabs } from "../../../shared/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../shared/components/ui/card";
import { Button } from "../../../shared/components/ui/button";
import { cn, formatDate } from "../../../shared/utils";
import seriesService from "../../../services/seriesService";
import rankingService from "../../../services/rankingService";
import { useEditorialStore } from "../../../app/stores/editorialStore";

const PLATFORM_OPTIONS = [
  { value: "ALL", label: "All Platforms" },
  { value: "Shonen Weekly", label: "Shonen Weekly" },
  { value: "Seinen Monthly", label: "Seinen Monthly" },
  { value: "Manga App", label: "Manga App" },
];

const LEADERBOARD_TABS = [
  { value: "TOP_CHARTS", label: "Top Charts" },
  { value: "BY_GENRE", label: "By Genre" },
];

const ACTIVE_SERIES_STATUSES = new Set([
  "ONGOING",
  "AT_RISK",
  "HIATUS",
  "PUBLISHED",
]);

function toNumberId(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function resolveRankingSeriesId(rank) {
  return toNumberId(rank?.seriesId) || toNumberId(rank?.series?.id) || null;
}

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

function resolvePlatform(series) {
  if (series.publishFrequency === "WEEKLY") return "Shonen Weekly";
  if (series.publishFrequency === "MONTHLY") return "Seinen Monthly";
  return "Manga App";
}

function MetricCard({ title, value, subtitle, tone = "default", icon: Icon }) {
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

function LeaderboardRow({ entry }) {
  const series = entry.series;
  if (!series) return null;
  const cancelled = series.status === "CANCELLED";
  const trendUp = entry.trend === "UP";

  return (
    <tr
      className={cn(
        "border-b border-white/5 hover:bg-white/[0.02] transition-colors",
        cancelled && "opacity-40",
      )}
    >
      <td className="py-4 px-4 text-center text-sm font-semibold text-accent-gold">
        #{entry.rank}
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-16 rounded-lg border border-outline-variant/20 overflow-hidden bg-surface-container-high text-[10px] font-semibold text-white flex items-center justify-center"
            style={{ background: series.coverColor || "#7c3aed" }}
          >
            {series.coverImageUrl ? (
              <img
                src={series.coverImageUrl}
                alt={series.title}
                className="w-full h-full object-cover"
              />
            ) : (
              series.title
                .split(" ")
                .map((word) => word[0])
                .join("")
                .slice(0, 3)
            )}
          </div>
          <div className="min-w-0">
            <p
              className={cn(
                "text-sm font-semibold text-on-surface truncate",
                cancelled && "line-through",
              )}
            >
              {series.title}
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              {series.platform} · {series.genres?.[0] || "—"}
            </p>
          </div>
        </div>
      </td>
      <td className="py-4 px-4 text-right text-sm font-medium text-on-surface">
        {(entry.totalVotes || 0).toLocaleString()}
      </td>
      <td className="py-4 px-4 text-center">
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border",
            trendUp
              ? "border-status-success/20 bg-status-success/10 text-status-success"
              : entry.trend === "DOWN"
                ? "border-status-danger/20 bg-status-danger/10 text-status-danger"
                : "border-outline-variant/30 bg-white/5 text-on-surface-variant",
          )}
        >
          {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{" "}
          {entry.trend || "FLAT"}
        </span>
      </td>
      <td className="py-4 px-4 text-right">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
        >
          Review
        </Button>
      </td>
    </tr>
  );
}

function SessionCard({ session }) {
  const isVoting = session.status === "PENDING";
  const isInProgress = session.status === "IN_PROGRESS";
  const isCompleted = session.status === "COMPLETED";

  return (
    <div className="rounded-2xl border border-outline-variant/25 bg-surface-container-low/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-2.5 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-[0.18em]">
          [{session.platformLabel}]
        </span>
        <span
          className={cn(
            "px-2.5 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-[0.18em]",
            isVoting
              ? "border-accent-gold/30 bg-accent-gold/10 text-accent-gold"
              : isInProgress
                ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                : isCompleted
                  ? "border-status-success/30 bg-status-success/10 text-status-success"
                  : "border-outline-variant/30 bg-white/5 text-on-surface-variant",
          )}
        >
          {session.statusLabel}
        </span>
      </div>
      <h4 className="mt-3 text-base font-semibold text-on-surface">
        {session.title}
      </h4>
      <p className="mt-1 text-xs text-on-surface-variant">
        {formatDate(session.scheduledAt, {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-on-surface-variant">
          {isVoting
            ? `${session.pendingCount || 0} Pending`
            : isInProgress
              ? "Meeting is live"
              : isCompleted
                ? "Completed"
                : "Pending"}
        </span>
        {isVoting ? (
          <Button
            size="sm"
            className="h-8 px-3 text-xs bg-primary text-on-primary hover:bg-primary/90"
          >
            Vote Now ({session.pendingCount || 0} Pending)
          </Button>
        ) : isInProgress ? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs border-outline-variant/40 text-on-surface hover:bg-white/5"
          >
            Join Room
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function EditorialBoardDashboardPanel() {
  const [selectedPlatform, setSelectedPlatform] = useState("ALL");
  const [activeTab, setActiveTab] = useState("TOP_CHARTS");

  const meetings = useEditorialStore((state) => state.meetings);
  const fetchMeetings = useEditorialStore((state) => state.fetchMeetings);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const { data: seriesRows = [] } = useQuery({
    queryKey: ["dashboard", "editorial", "series"],
    queryFn: async () => {
      const payload = await seriesService.getAll({ page: 0, size: 100 });
      return toArray(payload).map((series) => ({
        ...series,
        platform: resolvePlatform(series),
      }));
    },
    staleTime: 30_000,
  });

  const { data: rankingRows = [] } = useQuery({
    queryKey: ["dashboard", "editorial", "rankings", "monthly"],
    queryFn: async () => {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const payload = await rankingService.getMonthly(month);
      return toArray(payload);
    },
    staleTime: 60_000,
  });

  const scopedSeries = useMemo(() => {
    if (selectedPlatform === "ALL") return seriesRows;
    return seriesRows.filter((series) => series.platform === selectedPlatform);
  }, [selectedPlatform, seriesRows]);

  const scopedSeriesIds = useMemo(
    () => new Set(scopedSeries.map((series) => series.id)),
    [scopedSeries],
  );

  const leaderboard = useMemo(() => {
    const merged = rankingRows
      .filter((rank) => scopedSeriesIds.has(resolveRankingSeriesId(rank)))
      .map((rank) => ({
        ...rank,
        series: scopedSeries.find(
          (series) => series.id === resolveRankingSeriesId(rank),
        ),
      }))
      .filter((entry) => entry.series);

    if (activeTab === "BY_GENRE") {
      return merged.sort(
        (left, right) =>
          (left.series.genres?.[0] || "").localeCompare(
            right.series.genres?.[0] || "",
          ) || left.rank - right.rank,
      );
    }
    if (activeTab === "TOP_GAINERS") {
      return merged
        .filter((entry) => entry.trend === "UP")
        .sort((left, right) => left.rank - right.rank);
    }
    if (activeTab === "TOP_LOSERS") {
      return merged
        .filter((entry) => entry.trend === "DOWN")
        .sort((left, right) => right.rank - left.rank);
    }
    return merged.sort((left, right) => left.rank - right.rank);
  }, [activeTab, rankingRows, scopedSeries, scopedSeriesIds]);

  const proposalsPending = scopedSeries.filter(
    (series) => series.status === "PENDING_APPROVAL",
  ).length;
  const activeSeries = scopedSeries.filter((series) =>
    ACTIVE_SERIES_STATUSES.has(series.status),
  ).length;
  const readerVotes = leaderboard.reduce(
    (sum, entry) => sum + (entry.totalVotes || 0),
    0,
  );

  const axeList = leaderboard
    .filter(
      (entry) => entry.trend === "DOWN" || entry.series.status === "CANCELLED",
    )
    .sort((left, right) => right.rank - left.rank)
    .slice(0, 4)
    .map((entry) => entry.series);

  const sessions = useMemo(() => {
    const mapped = meetings.map((meeting) => ({
      ...meeting,
      platform: meeting.platform || "Manga App",
      platformLabel: meeting.platform || "Digital App",
      statusLabel:
        meeting.status === "PENDING"
          ? "Voting Active"
          : meeting.status === "IN_PROGRESS"
            ? "In Progress"
            : meeting.status === "COMPLETED"
              ? "Completed"
              : "Pending",
      pendingCount:
        meeting.voteSummary?.pendingCount || meeting.pendingVotes || 0,
      scheduledAt:
        meeting.scheduledAt || meeting.startAt || new Date().toISOString(),
    }));

    if (selectedPlatform === "ALL") return mapped;
    return mapped.filter((meeting) => meeting.platform === selectedPlatform);
  }, [meetings, selectedPlatform]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">
            Editorial Dashboard
          </p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight text-on-surface">
            Editorial Board
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Using backend sources for series, rankings, and meetings.
          </p>
        </div>
        <div className="w-full lg:w-[280px]">
          <Select
            value={selectedPlatform}
            onChange={(event) => setSelectedPlatform(event.target.value)}
            options={PLATFORM_OPTIONS}
            className="rounded-xl border-outline-variant/30 bg-surface-container text-on-surface"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Active Series"
          value={activeSeries}
          subtitle="Across selected platform"
          icon={BookOpen}
        />
        <MetricCard
          title="Proposals Pending"
          value={proposalsPending}
          subtitle="Series in review"
          icon={AlertTriangle}
          tone={proposalsPending > 0 ? "warning" : "default"}
        />
        <MetricCard
          title="Reader Votes"
          value={readerVotes.toLocaleString()}
          subtitle="Current period total"
          icon={Vote}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="border-outline-variant/30">
          <CardHeader className="border-b border-outline-variant/20 bg-surface-container-low/40">
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Newspaper size={18} className="text-primary" /> Master
                Leaderboard
              </CardTitle>
            </div>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              tabs={LEADERBOARD_TABS}
            />
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="min-w-full text-left">
              <thead className="border-b border-outline-variant/20 bg-surface-container-low/60 text-xs uppercase tracking-[0.18em] text-on-surface-variant">
                <tr>
                  <th className="px-4 py-4 text-center">Rank</th>
                  <th className="px-4 py-4">Series</th>
                  <th className="px-4 py-4 text-right">Reader Votes</th>
                  <th className="px-4 py-4 text-center">Trend</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <LeaderboardRow
                    key={entry.id || `${entry.seriesId}-${entry.rank}`}
                    entry={entry}
                  />
                ))}
                {leaderboard.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-sm text-on-surface-variant"
                    >
                      No leaderboard data in this scope.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-outline-variant/30">
            <CardHeader className="border-b border-outline-variant/20 bg-surface-container-low/40">
              <CardTitle className="flex items-center gap-2 text-xl">
                <AlertTriangle size={18} className="text-status-danger" /> Axe
                List Priority
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 md:p-6">
              {axeList.map((series) => (
                <div
                  key={series.id}
                  className="rounded-2xl border border-outline-variant/20 bg-surface-container-low/50 p-4 flex items-center justify-between gap-3"
                >
                  <div>
                    <p
                      className={cn(
                        "text-sm font-medium text-on-surface",
                        series.status === "CANCELLED" &&
                          "line-through opacity-40",
                      )}
                    >
                      {series.title}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {series.genres?.[0] || "—"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs border-status-danger/20 text-status-danger hover:bg-status-danger/10"
                  >
                    Review
                  </Button>
                </div>
              ))}
              {axeList.length === 0 && (
                <div className="rounded-2xl border border-dashed border-outline-variant/30 p-6 text-center text-sm text-on-surface-variant">
                  No at-risk series.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-outline-variant/30">
            <CardHeader className="border-b border-outline-variant/20 bg-surface-container-low/40">
              <CardTitle className="flex items-center gap-2 text-xl">
                <PlayCircle size={18} className="text-primary" /> Upcoming
                Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 md:p-6 max-h-[480px] overflow-y-auto">
              {sessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
              {sessions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-outline-variant/30 p-6 text-center text-sm text-on-surface-variant">
                  No sessions in this platform.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default EditorialBoardDashboardPanel;
