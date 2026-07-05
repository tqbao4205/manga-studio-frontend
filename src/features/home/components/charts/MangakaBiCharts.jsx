/**
 * MangakaBiCharts.jsx — BI Analytics Charts for MANGAKA dashboard
 *
 * Charts:
 *  1. Series Portfolio Donut     — REAL  (series prop passed from panel)
 *  2. Task Pipeline Bar          — REAL  (GET /api/tasks via taskService)
 *  3. Ranking Trend (4 months)   — REAL  (GET /api/ranking/monthly ×4 months)
 *  4. Assistant Load Balance     — REAL  (derived from tasks per assistant)
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";
import { TrendingUp, Activity, Users, BarChart2, Layers, Search } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "../../../../shared/components/ui/card";
import { cn } from "../../../../shared/utils";
import taskService from "../../../../services/taskService";
import rankingService from "../../../../services/rankingService";

// ── Design-system chart palette ───────────────────────────────────────────────
const C = {
  primary: "#a078ff",
  gold: "#ffb869",
  success: "#4ade80",
  warning: "#fb923c",
  danger: "#f87171",
  muted: "#6b7280",
  blue: "#60a5fa",
  grid: "rgba(255,255,255,0.05)",
  tick: "#6b7280",
};

const SERIES_STATUS_COLORS = {
  ONGOING: C.primary,
  AT_RISK: C.danger,
  PENDING_APPROVAL: C.gold,
  PENDING_TANTOU: C.gold,
  PENDING_BOARD_VOTE: C.warning,
  APPROVED: C.success,
  REJECTED: "#374151",
  HIATUS: C.blue,
};

const TASK_STAGE_ORDER = [
  "TODO",
  "IN_PROGRESS",
  "SUBMITTED",
  "APPROVED",
  "REVISION_REQUIRED",
  "DONE",
  "REVISE",
];
const TASK_STAGE_LABELS = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REVISION_REQUIRED: "Revise",
  REVISE: "Revise",
  DONE: "Done",
};
const TASK_STAGE_COLORS = [
  C.muted,
  C.primary,
  C.gold,
  C.success,
  C.danger,
  C.success,
  C.danger,
];

function getLast4Months() {
  return [3, 2, 1, 0].map((n) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - n);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en", { month: "short" }),
    };
  });
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getLast4Weeks() {
  return [3, 2, 1, 0].map((n) => {
    const d = new Date();
    d.setDate(d.getDate() - n * 7);
    const wk = getISOWeek(d);
    return {
      key: `${d.getFullYear()}-W${String(wk).padStart(2, "0")}`,
      label: `W${wk}`,
    };
  });
}

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

// ── Shared UI atoms ───────────────────────────────────────────────────────────
function SectionDivider() {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="h-px flex-1 bg-outline-variant/25" />
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/55 select-none">
        <BarChart2 size={11} className="text-primary" />
        Analytics &amp; Insights
      </p>
      <div className="h-px flex-1 bg-outline-variant/25" />
    </div>
  );
}

function SkeletonBox({ height = "h-[180px]" }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-surface-container-high/40",
        height,
      )}
    />
  );
}

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  iconClass = "text-primary",
  children,
  className,
}) {
  return (
    <Card
      className={cn(
        "border-outline-variant/30 bg-surface-container-low/40",
        className,
      )}
    >
      <CardHeader className="border-b border-outline-variant/20 pb-4">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
          <Icon size={13} className={iconClass} />
          {title}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-on-surface-variant/55 mt-0.5">
            {subtitle}
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-4 pb-5">{children}</CardContent>
    </Card>
  );
}

function EmptyChart({ label, height = "h-[160px]" }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center text-sm text-on-surface-variant",
        height,
      )}
    >
      {label}
    </div>
  );
}

// ── Sample badge (shown when chart is rendering demo data) ──────────────────────
function SampleBadge() {
  return (
    <span className="inline-flex items-center rounded border border-[#a078ff]/30 bg-[#a078ff]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#a078ff]/70">
      Sample
    </span>
  );
}

// ── Mock data constants ───────────────────────────────────────────────────────
// Used as fallback when real API data is empty (demo / first-run).
// ⚠️ Remove mock fallbacks once real data flows through.
const MOCK_SERIES_STATUS_DATA = [
  { name: "ongoing", value: 3, color: C.primary },
  { name: "at risk", value: 1, color: C.danger },
  { name: "pending tantou", value: 1, color: C.gold },
  { name: "approved", value: 1, color: C.success },
];

// ── 1. Series Portfolio Donut ─────────────────────────────────────────────────
function SeriesStatusDonut({ mySeries }) {
  const usingSample = mySeries.length === 0;
  const data = useMemo(() => {
    if (usingSample) return MOCK_SERIES_STATUS_DATA;
    const m = {};
    mySeries.forEach((s) => {
      const k = s.status || "UNKNOWN";
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).map(([status, count]) => ({
      name: status.replace(/_/g, " "),
      value: count,
      color: SERIES_STATUS_COLORS[status] || C.muted,
    }));
  }, [mySeries, usingSample]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      {usingSample && (
        <div className="mb-2 flex justify-end">
          <SampleBadge />
        </div>
      )}
      <div className="flex items-center gap-6">
        <div className="h-[160px] w-[160px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-outline-variant/50 bg-surface-container-high px-3 py-2 text-xs shadow-lg">
                      <p className="font-semibold text-on-surface capitalize">
                        {d.name.toLowerCase()}
                      </p>
                      <p style={{ color: d.color }}>
                        {d.value} series (
                        {total > 0 ? Math.round((d.value / total) * 100) : 0}%)
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2.5 min-w-0">
          {data.map((d, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: d.color }}
                />
                <span className="text-xs text-on-surface-variant truncate capitalize">
                  {d.name.toLowerCase()}
                </span>
              </div>
              <span className="text-xs font-semibold text-on-surface tabular-nums">
                {d.value}
              </span>
            </div>
          ))}
          <div className="pt-1.5 border-t border-outline-variant/20 flex justify-between">
            <span className="text-xs text-on-surface-variant">Total</span>
            <span className="text-sm font-bold text-on-surface">{total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 2. Task Pipeline Bar ──────────────────────────────────────────────────────
function TaskPipelineChart({ userId }) {
  const { data: taskPage, isLoading } = useQuery({
    queryKey: ["bi", "mangaka-tasks-all", userId],
    queryFn: () => taskService.getAll({ size: 200 }),
    staleTime: 60_000,
    enabled: !!userId,
  });

  const data = useMemo(() => {
    const tasks = toArray(taskPage);
    const counts = {};
    tasks.forEach((t) => {
      const s = t.status || "TODO";
      counts[s] = (counts[s] || 0) + 1;
    });
    return TASK_STAGE_ORDER.filter((s) => counts[s] > 0).map((s, i) => ({
      name: TASK_STAGE_LABELS[s] || s,
      value: counts[s],
      fill: TASK_STAGE_COLORS[Math.min(i, TASK_STAGE_COLORS.length - 1)],
    }));
  }, [taskPage]);

  if (isLoading) return <SkeletonBox height="h-[160px]" />;
  if (!data.length) return <EmptyChart label="No tasks yet" height="h-[160px]" />;

  return (
    <div>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 0, right: 36, top: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: C.tick }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: "#c8c6c8" }}
              axisLine={false}
              tickLine={false}
              width={82}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-outline-variant/50 bg-surface-container-high px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-on-surface">{label}</p>
                    <p style={{ color: payload[0].payload.fill }}>
                      {payload[0].value} tasks
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {data.map((e, i) => (
                <Cell key={i} fill={e.fill} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                style={{ fontSize: 11, fill: "#c8c6c8" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── 3. Ranking Trend Line (shared rendering) ───────────────────────────────────
const LINE_COLORS = [C.primary, C.gold, C.success, C.blue, C.danger, '#f472b6', '#34d399', '#fbbf24', '#818cf8', '#e879f9'];

function RankingTrendLineChart({ displayData, keys }) {
  const [hoveredKey, setHoveredKey] = useState(null);
  const [hiddenKeys, setHiddenKeys] = useState(new Set());

  const toggleKey = (key) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visibleKeys = keys.filter((k) => !hiddenKeys.has(k));
  if (visibleKeys.length === 0) return <EmptyChart label="No ranking data yet" />;

  return (
    <div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={displayData}
            margin={{ left: 0, right: 8, top: 8, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={C.grid}
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: C.tick }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              reversed
              tick={{ fontSize: 10, fill: C.tick }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `#${v}`}
              width={28}
            />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.06)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-outline-variant/50 bg-surface-container-high px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-on-surface mb-1">
                      {label}
                    </p>
                    {payload
                      .filter((p) => p.value != null)
                      .map((p, i) => (
                        <p key={i} style={{ color: p.color }}>
                          {p.name}: #{p.value}
                        </p>
                      ))}
                  </div>
                );
              }}
            />
            <Legend
              content={({ payload }) => (
                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center pt-2">
                  {payload.map((entry) => {
                    const isHidden = hiddenKeys.has(entry.dataKey);
                    const isDimmed = hoveredKey && hoveredKey !== entry.dataKey;
                    return (
                      <button
                        key={entry.dataKey}
                        type="button"
                        onClick={() => toggleKey(entry.dataKey)}
                        className="flex items-center gap-1 text-xs transition-opacity"
                        style={{
                          color: isHidden ? "#6b7280" : entry.color,
                          textDecoration: isHidden ? "line-through" : "none",
                          opacity: isDimmed ? 0.4 : 1,
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: entry.color }}
                        />
                        {entry.value}
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {keys.map((k, i) => {
              const isHidden = hiddenKeys.has(k);
              const isDimmed = hoveredKey && hoveredKey !== k;
              return (
                <Line
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={isHidden ? 0 : isDimmed ? 1.5 : 2.5}
                  strokeOpacity={isHidden ? 0 : isDimmed ? 0.15 : 1}
                  dot={isHidden ? false : { r: isDimmed ? 2 : 4, fill: LINE_COLORS[i % LINE_COLORS.length], strokeWidth: 0 }}
                  activeDot={isHidden ? false : { r: 5, fill: LINE_COLORS[i % LINE_COLORS.length], strokeWidth: 0 }}
                  connectNulls={false}
                  onMouseEnter={() => setHoveredKey(k)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── 3a. Monthly Ranking Trend ─────────────────────────────────────────────────
function MonthlyRankingTrendChart({ mySeries }) {
  const [searchTerm, setSearchTerm] = useState("");
  const months = useMemo(() => getLast4Months(), []);

  const { data: historyData = [], isLoading } = useQuery({
    queryKey: ["bi", "ranking-history-4mo"],
    queryFn: async () => {
      const results = await Promise.all(
        months.map(({ key }) => rankingService.getMonthly(key).catch(() => [])),
      );
      return months.map(({ label }, i) => {
        const ranks = toArray(results[i]);
        const row = { month: label };
        mySeries.forEach((s) => {
          const r = ranks.find(
            (r) =>
              (r.seriesId != null && r.seriesId === s.id) ||
              (r.series?.id != null && r.series.id === s.id),
          );
          row[s.title?.slice(0, 14) || `S${s.id}`] = r?.rank ?? null;
        });
        return row;
      });
    },
    staleTime: 120_000,
    enabled: mySeries.length > 0,
  });

  const hasSeries = mySeries.length > 0;
  if (hasSeries && isLoading) return <SkeletonBox height="h-[280px]" />;

  const keys = mySeries.map((s) => s.title?.slice(0, 14) || `S${s.id}`);
  const activeKeys = keys.filter(k => historyData.some(row => row[k] != null));
  const isEmpty = !hasSeries || historyData.length === 0 || activeKeys.length === 0;
  if (isEmpty) return <EmptyChart label="No ranking data yet" height="h-[280px]" />;

  const latestRow = historyData[historyData.length - 1];
  const topDefaultKeys = [...activeKeys]
    .sort((a, b) => (latestRow[a] ?? 999) - (latestRow[b] ?? 999))
    .slice(0, 5);

  const trimmed = searchTerm.trim().toLowerCase();
  const visibleKeys = trimmed
    ? activeKeys.filter((k) => k.toLowerCase().includes(trimmed))
    : topDefaultKeys;

  return (
    <div>
      {activeKeys.length > 5 && (
        <div className="relative mb-3">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter series…"
            className="w-full rounded-lg border border-outline-variant/30 bg-surface-container/80 py-1.5 pl-7 pr-3 text-xs text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      )}
      <div className="text-[10px] text-on-surface-variant/60 mb-2 text-right">
        Showing {visibleKeys.length} of {activeKeys.length} series
      </div>
      {visibleKeys.length === 0
        ? <EmptyChart label="No series match your search" height="h-[160px]" />
        : <RankingTrendLineChart displayData={historyData} keys={visibleKeys} />}
    </div>
  );
}

// ── 3b. Weekly Ranking Trend ──────────────────────────────────────────────────
function WeeklyRankingTrendChart({ mySeries }) {
  const [searchTerm, setSearchTerm] = useState("");
  const weeks = useMemo(() => getLast4Weeks(), []);

  const { data: historyData = [], isLoading } = useQuery({
    queryKey: ["bi", "ranking-history-4wk"],
    queryFn: async () => {
      const results = await Promise.all(
        weeks.map(({ key }) => rankingService.getWeekly(key).catch(() => [])),
      );
      return weeks.map(({ label }, i) => {
        const ranks = toArray(results[i]);
        const row = { month: label };
        mySeries.forEach((s) => {
          const r = ranks.find(
            (r) =>
              (r.seriesId != null && r.seriesId === s.id) ||
              (r.series?.id != null && r.series.id === s.id),
          );
          row[s.title?.slice(0, 14) || `S${s.id}`] = r?.rank ?? null;
        });
        return row;
      });
    },
    staleTime: 120_000,
    enabled: mySeries.length > 0,
  });

  const hasSeries = mySeries.length > 0;
  if (hasSeries && isLoading) return <SkeletonBox height="h-[280px]" />;

  const keys = mySeries.map((s) => s.title?.slice(0, 14) || `S${s.id}`);
  const activeKeys = keys.filter(k => historyData.some(row => row[k] != null));
  const isEmpty = !hasSeries || historyData.length === 0 || activeKeys.length === 0;
  if (isEmpty) return <EmptyChart label="No ranking data yet" height="h-[280px]" />;

  const latestRow = historyData[historyData.length - 1];
  const topDefaultKeys = [...activeKeys]
    .sort((a, b) => (latestRow[a] ?? 999) - (latestRow[b] ?? 999))
    .slice(0, 5);

  const trimmed = searchTerm.trim().toLowerCase();
  const visibleKeys = trimmed
    ? activeKeys.filter((k) => k.toLowerCase().includes(trimmed))
    : topDefaultKeys;

  return (
    <div>
      {activeKeys.length > 5 && (
        <div className="relative mb-3">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter series…"
            className="w-full rounded-lg border border-outline-variant/30 bg-surface-container/80 py-1.5 pl-7 pr-3 text-xs text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      )}
      <div className="text-[10px] text-on-surface-variant/60 mb-2 text-right">
        Showing {visibleKeys.length} of {activeKeys.length} series
      </div>
      {visibleKeys.length === 0
        ? <EmptyChart label="No series match your search" height="h-[160px]" />
        : <RankingTrendLineChart displayData={historyData} keys={visibleKeys} />}
    </div>
  );
}

// ── 4. Assistant Load Balance ─────────────────────────────────────────────────
function AssistantLoadChart({ userId }) {
  const { data: taskPage, isLoading } = useQuery({
    queryKey: ["bi", "mangaka-tasks-all", userId],
    queryFn: () => taskService.getAll({ size: 200 }),
    staleTime: 60_000,
    enabled: !!userId,
  });

  const data = useMemo(() => {
    const byA = {};
    toArray(taskPage).forEach((t) => {
      const name =
        t.assistant?.displayName ||
        t.assistant?.username ||
        t.assignedToName ||
        null;
      if (!name) return;
      if (!byA[name]) byA[name] = { active: 0, done: 0 };
      if (t.status === "APPROVED" || t.status === "DONE") byA[name].done++;
      else byA[name].active++;
    });
    return Object.entries(byA)
      .map(([name, c]) => ({
        name: name.length > 11 ? `${name.slice(0, 11)}…` : name,
        Active: c.active,
        Done: c.done,
      }))
      .sort((a, b) => b.Active + b.Done - (a.Active + a.Done))
      .slice(0, 7);
  }, [taskPage]);

  if (isLoading) return <SkeletonBox height="h-[180px]" />;
  if (!data.length) return <EmptyChart label="No assistant task data" height="h-[180px]" />;

  return (
    <div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ left: 0, right: 4, top: 4, bottom: 4 }}
            barSize={14}
            barGap={2}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={C.grid}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: C.tick }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: C.tick }}
              axisLine={false}
              tickLine={false}
              width={22}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border border-outline-variant/50 bg-surface-container-high px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-on-surface mb-1">
                      {label}
                    </p>
                    {payload.map((p, i) => (
                      <p key={i} style={{ color: p.color }}>
                        {p.name}: {p.value}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar
              dataKey="Active"
              stackId="a"
              fill={C.primary}
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="Done"
              stackId="a"
              fill={C.success}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
export function MangakaBiCharts({ mySeries = [], userId }) {
  return (
    <div className="space-y-6">
      <SectionDivider />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* 1. Portfolio Status */}
        <ChartCard
          title="Series Portfolio"
          subtitle="Status breakdown"
          icon={Activity}
          className="md:col-span-1"
        >
          <SeriesStatusDonut mySeries={mySeries} />
        </ChartCard>

        {/* 2. Task Pipeline */}
        <ChartCard
          title="Task Pipeline"
          subtitle="All tasks by stage"
          icon={Layers}
          iconClass="text-[#ffb869]"
          className="md:col-span-1"
        >
          <TaskPipelineChart userId={userId} />
        </ChartCard>

        {/* 3a. Monthly Ranking Trend */}
        <ChartCard
          title="Monthly Trend"
          subtitle="Monthly rank · last 4 months · lower = better"
          icon={TrendingUp}
          iconClass="text-[#4ade80]"
          className="md:col-span-2"
        >
          <MonthlyRankingTrendChart mySeries={mySeries} />
        </ChartCard>
      </div>

      {/* 3b. Weekly Ranking Trend */}
      <ChartCard
        title="Weekly Trend"
        subtitle="Weekly rank · last 4 weeks · lower = better"
        icon={TrendingUp}
        iconClass="text-[#fb923c]"
      >
        <WeeklyRankingTrendChart mySeries={mySeries} />
      </ChartCard>

      {/* 4. Assistant Workload */}
      <ChartCard
        title="Assistant Load Balance"
        subtitle="Tasks per assistant — active vs completed"
        icon={Users}
      >
        <AssistantLoadChart userId={userId} />
      </ChartCard>
    </div>
  );
}

export default MangakaBiCharts;
