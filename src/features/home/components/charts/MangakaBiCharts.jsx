/**
 * MangakaBiCharts.jsx — BI Analytics Charts for MANGAKA dashboard
 *
 * Charts:
 *  1. Series Portfolio Donut     — REAL  (series prop passed from panel)
 *  2. Task Pipeline Bar          — REAL  (GET /api/tasks via taskService)
 *  3. Ranking Trend (4 months)   — REAL  (GET /api/ranking/monthly ×4 months)
 *  4. Assistant Load Balance     — REAL  (derived from tasks per assistant)
 */

import { useMemo } from "react";
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
import { TrendingUp, Activity, Users, BarChart2, Layers } from "lucide-react";
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

// ── 1. Series Portfolio Donut ─────────────────────────────────────────────────
function SeriesStatusDonut({ mySeries }) {
  const data = useMemo(() => {
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
  }, [mySeries]);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (!total) return <EmptyChart label="No series yet" />;

  return (
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
  if (!data.length)
    return <EmptyChart label="No tasks yet" height="h-[160px]" />;

  return (
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
  );
}

// ── 3. Ranking Trend Line (last 4 months) ─────────────────────────────────────
const LINE_COLORS = [C.primary, C.gold, C.success, C.blue];

function RankingTrendChart({ mySeries }) {
  const months = useMemo(() => getLast4Months(), []);
  const seriesSlice = useMemo(() => mySeries.slice(0, 4), [mySeries]);

  const { data: historyData = [], isLoading } = useQuery({
    queryKey: ["bi", "ranking-history-4mo"],
    queryFn: async () => {
      const results = await Promise.all(
        months.map(({ key }) => rankingService.getMonthly(key).catch(() => [])),
      );
      return months.map(({ label }, i) => {
        const ranks = toArray(results[i]);
        const row = { month: label };
        seriesSlice.forEach((s) => {
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
    enabled: seriesSlice.length > 0,
  });

  if (!seriesSlice.length)
    return <EmptyChart label="No series to track" height="h-[180px]" />;
  if (isLoading) return <SkeletonBox height="h-[180px]" />;

  const keys = seriesSlice.map((s) => s.title?.slice(0, 14) || `S${s.id}`);

  return (
    <div className="h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={historyData}
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
                  <p className="font-semibold text-on-surface mb-1">{label}</p>
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
          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
          {keys.map((k, i) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={LINE_COLORS[i % 4]}
              strokeWidth={2}
              dot={{ r: 3, fill: LINE_COLORS[i % 4], strokeWidth: 0 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
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
  if (!data.length)
    return <EmptyChart label="No assistant task data yet" height="h-[180px]" />;

  return (
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
                  <p className="font-semibold text-on-surface mb-1">{label}</p>
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

        {/* 3. Ranking Trend */}
        <ChartCard
          title="Ranking Trend"
          subtitle="Monthly rank · last 4 months · lower = better"
          icon={TrendingUp}
          iconClass="text-[#4ade80]"
          className="md:col-span-2"
        >
          <RankingTrendChart mySeries={mySeries} />
        </ChartCard>
      </div>

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
